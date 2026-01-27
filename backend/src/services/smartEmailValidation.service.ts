import * as domainPatternRepository from "@/repositories/domainPattern.repository";
import { validateEmailRealtime, ValidationResult } from "@/clients/millionverifier.realtime.client";
import {
  validateEmailsBulk,
  mapBulkResultToStatus,
  BulkValidationResult,
} from "@/clients/millionverifier.bulk.client";
import { generateEmailCandidates } from "@/utils/emailPatternGenerator";
import logger from "@/lib/logger";

// ============================================
// Types
// ============================================

export interface SmartValidationResult {
  email: string | null;
  pattern: string | null;
  creditsUsed: number;
  source: "cached_pattern" | "sequential" | "bulk" | "not_found";
  isValid: boolean;
  isCatchAll: boolean;
}

export interface SmartValidationOptions {
  /**
   * Minimum confidence to use a cached pattern (0-1).
   * Default: 0.7 (70%)
   */
  patternConfidenceThreshold?: number;

  /**
   * Maximum patterns to try sequentially before giving up.
   * Default: 6
   */
  maxSequentialPatterns?: number;

  /**
   * Whether to accept catch-all results as valid.
   * Default: true
   */
  acceptCatchAll?: boolean;
}

/**
 * Default pattern priority based on industry data.
 * These are used when no domain-specific data is available.
 */
const DEFAULT_PATTERN_PRIORITY = [
  "first",       // 21% hit rate
  "flast",       // 10% hit rate
  "first.last",  // 7.5% hit rate
  "firstl",      // 2.4% hit rate
  "firstlast",   // 1.1% hit rate
  "last",        // 1% hit rate
];

// ============================================
// Smart Validation Logic
// ============================================

/**
 * Intelligently validates an email for a lead using pattern caching and
 * sequential validation to minimize API costs.
 *
 * Strategy:
 * 1. Check if domain has a known high-confidence pattern
 * 2. If yes, validate only that pattern (1 API call)
 * 3. If no, try patterns sequentially until one validates
 * 4. Stop on first valid or catch-all result
 *
 * @param firstName - Lead's first name
 * @param lastName - Lead's last name
 * @param domain - Company domain
 * @param apiKey - MillionVerifier API key
 * @param options - Validation options
 */
export async function smartValidateEmail(
  firstName: string | null | undefined,
  lastName: string | null | undefined,
  domain: string,
  apiKey: string,
  options: SmartValidationOptions = {}
): Promise<SmartValidationResult> {
  const {
    patternConfidenceThreshold = 0.7,
    maxSequentialPatterns = 6,
    acceptCatchAll = true,
  } = options;

  if (!firstName || !lastName) {
    logger.debug({ domain, firstName, lastName }, "Missing name for email validation");
    return {
      email: null,
      pattern: null,
      creditsUsed: 0,
      source: "not_found",
      isValid: false,
      isCatchAll: false,
    };
  }

  const normalizedDomain = domain.toLowerCase();
  let creditsUsed = 0;

  // Step 1: Check for known high-confidence pattern
  const knownPattern = await domainPatternRepository.findByDomain(normalizedDomain);

  if (knownPattern && knownPattern.successCount > 5) {
    const patterns =
      typeof knownPattern.patterns === "string"
        ? JSON.parse(knownPattern.patterns)
        : knownPattern.patterns;

    const topPattern = patterns[0];

    // Check if confidence is above threshold
    if (topPattern && topPattern.successRate >= patternConfidenceThreshold) {
      logger.debug(
        { domain: normalizedDomain, pattern: topPattern.pattern, confidence: topPattern.successRate },
        "Using cached high-confidence pattern"
      );

      // Generate only the known pattern
      const candidates = generateEmailCandidates(firstName, lastName, normalizedDomain, [
        topPattern.pattern,
      ]);

      if (candidates.length > 0) {
        const result = await validateEmailRealtime(candidates[0].email, apiKey);
        creditsUsed++;

        if (
          result.status === "valid" ||
          (result.status === "catch_all" && acceptCatchAll)
        ) {
          return {
            email: candidates[0].email,
            pattern: topPattern.pattern,
            creditsUsed,
            source: "cached_pattern",
            isValid: result.status === "valid",
            isCatchAll: result.status === "catch_all",
          };
        }

        // Cached pattern failed - fall through to sequential
        logger.debug(
          { domain: normalizedDomain, pattern: topPattern.pattern, result: result.status },
          "Cached pattern failed, falling back to sequential"
        );
      }
    }
  }

  // Step 2: Get prioritized patterns (known patterns first, then defaults)
  const prioritizedPatterns = await domainPatternRepository.getPrioritizedPatterns(normalizedDomain);
  const patternsToTry = prioritizedPatterns.length > 0
    ? Array.from(new Set([...prioritizedPatterns, ...DEFAULT_PATTERN_PRIORITY]))
    : DEFAULT_PATTERN_PRIORITY;

  // Limit patterns to try
  const limitedPatterns = patternsToTry.slice(0, maxSequentialPatterns);

  // Step 3: Generate all candidates
  const candidates = generateEmailCandidates(firstName, lastName, normalizedDomain, limitedPatterns);

  logger.debug(
    { domain: normalizedDomain, candidateCount: candidates.length },
    "Starting sequential validation"
  );

  // Step 4: Try each pattern sequentially until valid found
  for (const candidate of candidates) {
    const result = await validateEmailRealtime(candidate.email, apiKey);
    creditsUsed++;

    if (result.status === "valid") {
      logger.debug(
        { domain: normalizedDomain, pattern: candidate.pattern, email: candidate.email },
        "Sequential validation found valid email"
      );

      return {
        email: candidate.email,
        pattern: candidate.pattern,
        creditsUsed,
        source: "sequential",
        isValid: true,
        isCatchAll: false,
      };
    }

    if (result.status === "catch_all" && acceptCatchAll) {
      logger.debug(
        { domain: normalizedDomain, pattern: candidate.pattern, email: candidate.email },
        "Sequential validation found catch-all email"
      );

      return {
        email: candidate.email,
        pattern: candidate.pattern,
        creditsUsed,
        source: "sequential",
        isValid: false,
        isCatchAll: true,
      };
    }

    // Continue to next pattern if invalid/unknown
    logger.debug(
      { pattern: candidate.pattern, email: candidate.email, result: result.status },
      "Pattern invalid, trying next"
    );
  }

  // No valid email found
  logger.debug(
    { domain: normalizedDomain, creditsUsed },
    "Sequential validation found no valid email"
  );

  return {
    email: null,
    pattern: null,
    creditsUsed,
    source: "not_found",
    isValid: false,
    isCatchAll: false,
  };
}

/**
 * Batch smart validation for multiple leads.
 * Groups leads by domain knowledge for optimal processing.
 *
 * Known domains: Generate only 1 email per lead (high confidence pattern)
 * Unknown domains: Use sequential validation
 *
 * @param leads - Array of leads to validate
 * @param apiKey - MillionVerifier API key
 * @param options - Validation options
 */
export async function smartValidateBatch(
  leads: Array<{
    id: string;
    firstName: string | null;
    lastName: string | null;
    domain: string;
  }>,
  apiKey: string,
  options: SmartValidationOptions = {}
): Promise<Map<string, SmartValidationResult>> {
  const results = new Map<string, SmartValidationResult>();
  const { patternConfidenceThreshold = 0.7, acceptCatchAll = true } = options;

  // Separate leads by domain knowledge
  const knownDomainLeads: typeof leads = [];
  const unknownDomainLeads: typeof leads = [];

  // Check domain knowledge for all leads
  const domains = [...new Set(leads.map((l) => l.domain.toLowerCase()))];
  const domainPatterns = new Map<string, {
    pattern: string;
    confidence: number;
  } | null>();

  for (const domain of domains) {
    const knownPattern = await domainPatternRepository.findByDomain(domain);

    if (knownPattern && knownPattern.successCount > 5) {
      const patterns =
        typeof knownPattern.patterns === "string"
          ? JSON.parse(knownPattern.patterns)
          : knownPattern.patterns;

      const topPattern = patterns[0];
      if (topPattern && topPattern.successRate >= patternConfidenceThreshold) {
        domainPatterns.set(domain, {
          pattern: topPattern.pattern,
          confidence: topPattern.successRate,
        });
        continue;
      }
    }

    domainPatterns.set(domain, null);
  }

  // Categorize leads
  for (const lead of leads) {
    const domainInfo = domainPatterns.get(lead.domain.toLowerCase());
    if (domainInfo) {
      knownDomainLeads.push(lead);
    } else {
      unknownDomainLeads.push(lead);
    }
  }

  logger.info(
    {
      totalLeads: leads.length,
      knownDomainCount: knownDomainLeads.length,
      unknownDomainCount: unknownDomainLeads.length,
    },
    "Categorized leads for smart validation"
  );

  // Process known domains with bulk API (1 email per lead - cheaper)
  if (knownDomainLeads.length > 0) {
    const knownEmails: Array<{ leadId: string; email: string; pattern: string }> = [];

    for (const lead of knownDomainLeads) {
      if (!lead.firstName || !lead.lastName) continue;

      const domainInfo = domainPatterns.get(lead.domain.toLowerCase());
      if (!domainInfo) continue;

      const candidates = generateEmailCandidates(
        lead.firstName,
        lead.lastName,
        lead.domain.toLowerCase(),
        [domainInfo.pattern]
      );

      if (candidates.length > 0) {
        knownEmails.push({
          leadId: lead.id,
          email: candidates[0].email,
          pattern: domainInfo.pattern,
        });
      }
    }

    if (knownEmails.length > 0) {
      logger.info(
        { count: knownEmails.length },
        "Validating known-domain leads with bulk API"
      );

      const bulkResults = await validateEmailsBulk(
        knownEmails.map((e) => e.email),
        apiKey
      );

      for (const item of knownEmails) {
        const bulkResult = bulkResults.get(item.email.toLowerCase());
        const status = bulkResult ? mapBulkResultToStatus(bulkResult) : "unknown";

        const isValid = status === "valid";
        const isCatchAll = status === "catch_all";

        results.set(item.leadId, {
          email:
            isValid || (isCatchAll && acceptCatchAll) ? item.email : null,
          pattern: item.pattern,
          creditsUsed: 1,
          source: "bulk",
          isValid,
          isCatchAll,
        });
      }
    }
  }

  // Process unknown domains with sequential validation
  for (const lead of unknownDomainLeads) {
    if (!lead.firstName || !lead.lastName) {
      results.set(lead.id, {
        email: null,
        pattern: null,
        creditsUsed: 0,
        source: "not_found",
        isValid: false,
        isCatchAll: false,
      });
      continue;
    }

    const result = await smartValidateEmail(
      lead.firstName,
      lead.lastName,
      lead.domain,
      apiKey,
      options
    );

    results.set(lead.id, result);
  }

  // Calculate savings
  const totalCreditsUsed = Array.from(results.values()).reduce(
    (sum, r) => sum + r.creditsUsed,
    0
  );
  const naiveCreditsWouldBe = leads.length * 6; // 6 patterns per lead
  const savings = naiveCreditsWouldBe - totalCreditsUsed;
  const savingsPercent = ((savings / naiveCreditsWouldBe) * 100).toFixed(1);

  logger.info(
    {
      totalLeads: leads.length,
      creditsUsed: totalCreditsUsed,
      naiveCredits: naiveCreditsWouldBe,
      savings,
      savingsPercent: `${savingsPercent}%`,
    },
    "Smart batch validation complete"
  );

  return results;
}

/**
 * Estimates the credit cost for validating a batch of leads.
 * Useful for showing users expected costs before processing.
 */
export async function estimateValidationCost(
  leads: Array<{
    firstName: string | null;
    lastName: string | null;
    domain: string;
  }>
): Promise<{
  estimatedCredits: number;
  naiveCredits: number;
  expectedSavingsPercent: number;
}> {
  // Estimate based on domain knowledge
  const domains = [...new Set(leads.map((l) => l.domain.toLowerCase()))];
  let knownDomainCount = 0;
  let unknownDomainCount = 0;

  for (const domain of domains) {
    const knownPattern = await domainPatternRepository.findByDomain(domain);
    if (knownPattern && knownPattern.successCount > 5) {
      const patterns =
        typeof knownPattern.patterns === "string"
          ? JSON.parse(knownPattern.patterns)
          : knownPattern.patterns;
      if (patterns[0]?.successRate >= 0.7) {
        knownDomainCount++;
        continue;
      }
    }
    unknownDomainCount++;
  }

  // Count leads per category
  const leadsWithKnownDomains = leads.filter((l) => {
    // This is a simplification - in practice we'd need to track
    return true;
  }).length;

  // Estimate credits:
  // Known domains: 1 credit per lead
  // Unknown domains: average 2.5 credits per lead (stop early on success)
  const estimatedCredits = Math.ceil(
    (knownDomainCount / domains.length) * leads.length * 1 +
    (unknownDomainCount / domains.length) * leads.length * 2.5
  );

  const naiveCredits = leads.length * 6;
  const expectedSavingsPercent = Math.round(
    ((naiveCredits - estimatedCredits) / naiveCredits) * 100
  );

  return {
    estimatedCredits,
    naiveCredits,
    expectedSavingsPercent,
  };
}
