import net from 'net';
import logger from '@/lib/logger';
import { getMxRecords, getPrimaryMxHost } from './DnsResolver';
import { waitForSlot, getDelayForDomain } from './DomainRateLimiter';
import { getConnectionPool } from './SmtpConnectionPool';
import {
  isDisposableDomain,
  isFreeEmailProvider,
  isRoleBasedEmail,
  validateEmailSyntax,
  extractDomain,
  normalizeEmail,
  generateRandomTestEmail,
} from './StaticDataService';
import type { SmtpVerificationResult, VerificationStatus, EmailBatch } from '@shared/types/src';

// ============================================
// SMTP Verifier Configuration
// ============================================

const SMTP_TIMEOUT = 15000; // 15 seconds
const GREETING_TIMEOUT = 10000; // 10 seconds
const RCPT_TIMEOUT = 10000; // 10 seconds

// SMTP response codes
const SMTP_CODES = {
  READY: 220,
  OK: 250,
  START_MAIL_INPUT: 354,
  SERVICE_NOT_AVAILABLE: 421,
  MAILBOX_UNAVAILABLE: 450,
  LOCAL_ERROR: 451,
  INSUFFICIENT_STORAGE: 452,
  SYNTAX_ERROR: 500,
  INVALID_PARAMETERS: 501,
  NOT_IMPLEMENTED: 502,
  BAD_SEQUENCE: 503,
  PARAMETER_NOT_IMPLEMENTED: 504,
  MAILBOX_NOT_FOUND: 550,
  USER_NOT_LOCAL: 551,
  EXCEEDED_STORAGE: 552,
  MAILBOX_NAME_INVALID: 553,
  TRANSACTION_FAILED: 554,
} as const;

// Map SMTP codes to verification status
function smtpCodeToStatus(code: number): VerificationStatus {
  if (code === SMTP_CODES.OK) {
    return 'valid';
  }
  if (code === SMTP_CODES.MAILBOX_NOT_FOUND ||
      code === SMTP_CODES.MAILBOX_NAME_INVALID ||
      code === SMTP_CODES.USER_NOT_LOCAL) {
    return 'invalid';
  }
  // Temporary failures and other codes are treated as unknown
  return 'unknown';
}

// ============================================
// Main SMTP Verification Class
// ============================================

export class SmtpVerifier {
  private senderEmail: string;
  private senderDomain: string;
  private concurrentLimit: number;

  constructor(options: {
    senderEmail?: string;
    concurrentLimit?: number;
  } = {}) {
    this.senderEmail = options.senderEmail || 'verify@enrich.com';
    this.senderDomain = extractDomain(this.senderEmail);
    this.concurrentLimit = options.concurrentLimit || 100;
  }

  // ============================================
  // Single Email Verification
  // ============================================

  async verifyEmail(email: string): Promise<SmtpVerificationResult> {
    const startTime = Date.now();
    const normalizedEmail = normalizeEmail(email);

    // Pre-verification checks
    if (!validateEmailSyntax(normalizedEmail)) {
      return this.createResult(email, 'invalid', startTime, {
        smtpMessage: 'Invalid email syntax',
      });
    }

    const domain = extractDomain(normalizedEmail);
    const isDisposable = isDisposableDomain(domain);
    const isFree = isFreeEmailProvider(domain);
    const isRoleBased = isRoleBasedEmail(normalizedEmail);

    if (isDisposable) {
      return this.createResult(email, 'invalid', startTime, {
        isDisposable: true,
        smtpMessage: 'Disposable email domain',
      });
    }

    // Get MX records
    let mxHost: string | null;
    try {
      mxHost = await getPrimaryMxHost(domain);
      if (!mxHost) {
        return this.createResult(email, 'invalid', startTime, {
          smtpMessage: 'No MX records found',
        });
      }
    } catch (error) {
      return this.createResult(email, 'unknown', startTime, {
        smtpMessage: 'DNS lookup failed',
      });
    }

    // Wait for rate limit slot
    const gotSlot = await waitForSlot(domain);
    if (!gotSlot) {
      return this.createResult(email, 'unknown', startTime, {
        smtpMessage: 'Rate limit timeout',
        mxHost,
      });
    }

    // Perform SMTP verification
    try {
      const smtpResult = await this.smtpProbe(normalizedEmail, mxHost);

      return this.createResult(email, smtpResult.status, startTime, {
        smtpCode: smtpResult.code,
        smtpMessage: smtpResult.message,
        mxHost,
        isCatchAll: smtpResult.isCatchAll,
        isDisposable,
        isRoleBased,
        isFreeProvider: isFree,
      });
    } catch (error: any) {
      logger.error({ email, mxHost, error: error.message }, 'SMTP verification failed');
      return this.createResult(email, 'unknown', startTime, {
        smtpMessage: error.message || 'SMTP error',
        mxHost,
      });
    }
  }

  // ============================================
  // Batch Email Verification
  // ============================================

  async verifyBatch(emails: string[]): Promise<SmtpVerificationResult[]> {
    // Group emails by domain for efficient batch processing
    const batches = this.groupByDomain(emails);
    const results: SmtpVerificationResult[] = [];

    // Process batches with controlled concurrency
    const batchPromises: Promise<SmtpVerificationResult[]>[] = [];

    for (const batch of batches) {
      batchPromises.push(this.processDomainBatch(batch));

      // Limit concurrent domain batches
      if (batchPromises.length >= 10) {
        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults.flat());
        batchPromises.length = 0;
      }
    }

    // Process remaining batches
    if (batchPromises.length > 0) {
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults.flat());
    }

    return results;
  }

  private groupByDomain(emails: string[]): EmailBatch[] {
    const domainMap = new Map<string, string[]>();

    for (const email of emails) {
      const domain = extractDomain(normalizeEmail(email));
      if (!domainMap.has(domain)) {
        domainMap.set(domain, []);
      }
      domainMap.get(domain)!.push(email);
    }

    // Sort domains by email count (larger batches first for efficiency)
    const batches: EmailBatch[] = [];
    for (const [domain, domainEmails] of domainMap) {
      batches.push({
        domain,
        emails: domainEmails,
        priority: domainEmails.length,
      });
    }

    return batches.sort((a, b) => b.priority - a.priority);
  }

  private async processDomainBatch(batch: EmailBatch): Promise<SmtpVerificationResult[]> {
    const results: SmtpVerificationResult[] = [];
    const { domain, emails } = batch;

    // Check for disposable domain first
    if (isDisposableDomain(domain)) {
      for (const email of emails) {
        results.push(this.createResult(email, 'invalid', Date.now(), {
          isDisposable: true,
          smtpMessage: 'Disposable email domain',
        }));
      }
      return results;
    }

    // Get MX records
    let mxHost: string | null;
    try {
      mxHost = await getPrimaryMxHost(domain);
      if (!mxHost) {
        for (const email of emails) {
          results.push(this.createResult(email, 'invalid', Date.now(), {
            smtpMessage: 'No MX records found',
          }));
        }
        return results;
      }
    } catch (error) {
      for (const email of emails) {
        results.push(this.createResult(email, 'unknown', Date.now(), {
          smtpMessage: 'DNS lookup failed',
        }));
      }
      return results;
    }

    batch.mxHost = mxHost;

    // Test for catch-all first
    let isCatchAll = false;
    try {
      isCatchAll = await this.testCatchAll(domain, mxHost);
    } catch {
      // If catch-all test fails, continue with individual verification
    }

    if (isCatchAll) {
      // For catch-all domains, all emails are technically "deliverable"
      // but we can't confirm if the specific address exists
      for (const email of emails) {
        results.push(this.createResult(email, 'catch_all', Date.now(), {
          mxHost,
          isCatchAll: true,
          isFreeProvider: isFreeEmailProvider(domain),
          isRoleBased: isRoleBasedEmail(email),
        }));
      }
      return results;
    }

    // Verify each email with rate limiting
    const delay = getDelayForDomain(domain);

    for (const email of emails) {
      const startTime = Date.now();

      // Wait for rate limit slot
      const gotSlot = await waitForSlot(domain);
      if (!gotSlot) {
        results.push(this.createResult(email, 'unknown', startTime, {
          smtpMessage: 'Rate limit timeout',
          mxHost,
        }));
        continue;
      }

      try {
        const smtpResult = await this.smtpProbe(normalizeEmail(email), mxHost);

        results.push(this.createResult(email, smtpResult.status, startTime, {
          smtpCode: smtpResult.code,
          smtpMessage: smtpResult.message,
          mxHost,
          isCatchAll: false,
          isDisposable: false,
          isRoleBased: isRoleBasedEmail(email),
          isFreeProvider: isFreeEmailProvider(domain),
        }));
      } catch (error: any) {
        results.push(this.createResult(email, 'unknown', startTime, {
          smtpMessage: error.message || 'SMTP error',
          mxHost,
        }));
      }

      // Delay between emails for same domain
      if (delay > 0) {
        await this.sleep(delay);
      }
    }

    return results;
  }

  // ============================================
  // SMTP Protocol Implementation
  // ============================================

  private async smtpProbe(
    email: string,
    mxHost: string
  ): Promise<{ status: VerificationStatus; code: number; message: string; isCatchAll?: boolean }> {
    return new Promise((resolve, reject) => {
      const socket = net.createConnection({ host: mxHost, port: 25 });
      let buffer = '';
      let phase: 'greeting' | 'ehlo' | 'helo_fallback' | 'mail_from' | 'rcpt_to' | 'rset' | 'quit' | 'done' = 'greeting';
      let lastCode = 0;
      let lastMessage = '';

      const timeout = setTimeout(() => {
        socket.destroy();
        reject(new Error('SMTP timeout'));
      }, SMTP_TIMEOUT);

      const cleanup = () => {
        clearTimeout(timeout);
        socket.removeAllListeners();
        socket.destroy();
      };

      socket.on('data', (data) => {
        buffer += data.toString();

        // Check for complete response (ends with \r\n and has a space after code)
        const lines = buffer.split('\r\n');
        for (let i = 0; i < lines.length - 1; i++) {
          const line = lines[i];
          const match = line.match(/^(\d{3})([ -])(.*)$/);
          if (!match) continue;

          const code = parseInt(match[1], 10);
          const isMultiline = match[2] === '-';
          const message = match[3];

          if (isMultiline) continue;

          lastCode = code;
          lastMessage = message;

          // Handle response based on phase
          this.handleSmtpResponse(socket, phase, code, message, email)
            .then((nextPhase) => {
              if (nextPhase === 'done') {
                cleanup();
                resolve({ status: smtpCodeToStatus(lastCode), code: lastCode, message: lastMessage });
              } else {
                phase = nextPhase;
              }
            })
            .catch((error) => {
              cleanup();
              reject(error);
            });
        }

        // Keep only incomplete line
        buffer = lines[lines.length - 1];
      });

      socket.on('error', (error) => {
        cleanup();
        reject(error);
      });

      socket.on('close', () => {
        cleanup();
        if (lastCode > 0) {
          resolve({ status: smtpCodeToStatus(lastCode), code: lastCode, message: lastMessage });
        } else {
          reject(new Error('Connection closed unexpectedly'));
        }
      });
    });
  }

  private async handleSmtpResponse(
    socket: net.Socket,
    phase: 'greeting' | 'ehlo' | 'helo_fallback' | 'mail_from' | 'rcpt_to' | 'rset' | 'quit' | 'done',
    code: number,
    message: string,
    email: string
  ): Promise<'greeting' | 'ehlo' | 'helo_fallback' | 'mail_from' | 'rcpt_to' | 'rset' | 'quit' | 'done'> {
    const domain = extractDomain(email);

    switch (phase) {
      case 'greeting':
        if (code !== 220) {
          throw new Error(`SMTP greeting failed: ${code} ${message}`);
        }
        socket.write(`EHLO ${this.senderDomain}\r\n`);
        return 'ehlo';

      case 'ehlo':
        if (code !== 250) {
          // Try HELO as fallback
          socket.write(`HELO ${this.senderDomain}\r\n`);
          return 'helo_fallback';
        }
        socket.write(`MAIL FROM:<${this.senderEmail}>\r\n`);
        return 'mail_from';

      case 'helo_fallback':
        if (code !== 250) {
          throw new Error(`SMTP HELO failed: ${code} ${message}`);
        }
        socket.write(`MAIL FROM:<${this.senderEmail}>\r\n`);
        return 'mail_from';

      case 'mail_from':
        if (code !== 250) {
          throw new Error(`SMTP MAIL FROM rejected: ${code} ${message}`);
        }
        socket.write(`RCPT TO:<${email}>\r\n`);
        return 'rcpt_to';

      case 'rcpt_to':
        // This is the key response - determines email validity
        socket.write(`RSET\r\n`);
        return 'rset';

      case 'rset':
        socket.write(`QUIT\r\n`);
        return 'done';

      default:
        return 'done';
    }
  }

  // ============================================
  // Catch-All Detection
  // ============================================

  private async testCatchAll(domain: string, mxHost: string): Promise<boolean> {
    const randomEmail = generateRandomTestEmail(domain);

    try {
      const result = await this.smtpProbe(randomEmail, mxHost);
      // If random address is accepted, it's a catch-all
      return result.code === 250;
    } catch {
      // If verification fails, assume not catch-all
      return false;
    }
  }

  // ============================================
  // Helper Methods
  // ============================================

  private createResult(
    email: string,
    status: VerificationStatus,
    startTime: number,
    options: {
      smtpCode?: number;
      smtpMessage?: string;
      mxHost?: string;
      isCatchAll?: boolean;
      isDisposable?: boolean;
      isRoleBased?: boolean;
      isFreeProvider?: boolean;
    } = {}
  ): SmtpVerificationResult {
    return {
      email: normalizeEmail(email),
      status,
      smtpCode: options.smtpCode,
      smtpMessage: options.smtpMessage,
      mxHost: options.mxHost,
      isCatchAll: options.isCatchAll || false,
      isDisposable: options.isDisposable || false,
      isRoleBased: options.isRoleBased || false,
      isFreeProvider: options.isFreeProvider || false,
      totalMs: Date.now() - startTime,
    };
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// ============================================
// Factory Function
// ============================================

let verifierInstance: SmtpVerifier | null = null;

export function getSmtpVerifier(options?: { senderEmail?: string; concurrentLimit?: number }): SmtpVerifier {
  if (!verifierInstance || options) {
    verifierInstance = new SmtpVerifier(options);
  }
  return verifierInstance;
}
