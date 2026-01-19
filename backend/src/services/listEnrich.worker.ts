import * as listEnrichmentJobRepository from "@/repositories/listEnrichmentJob.repository";
import * as vendorApiKeyRepository from "@/repositories/vendorApiKey.repository";
import * as leadRepository from "@/repositories/lead.repository";
import * as domainPatternRepository from "@/repositories/domainPattern.repository";
import * as emailValidationRepository from "@/repositories/emailValidation.repository";
import { decrypt } from "@/lib/encryption";
import { findEmailWithKey, findMobileWithKey } from "@/clients/prospeo.client";
import { validateEmail, mapMillionVerifierStatus } from "@/clients/millionverifier.client";
import { generateEmailCandidates } from "@/utils/emailPatternGenerator";
import { getCompanyDomain } from "@/utils/domainExtractor";
import { db } from "@/lib/db";
import logger from "@/lib/logger";
import { sendPusherEvent } from "@/lib/pusher";

const BATCH_SIZE = 50;
const RATE_LIMIT_DELAY_MS = 200;

export async function processListEnrichmentJob(jobId: string): Promise<void> {
  logger.info({ jobId }, "Starting list enrichment job processing");

  // Get job details
  const job = await listEnrichmentJobRepository.findJobById(jobId);
  if (!job) {
    throw new Error(`Job not found: ${jobId}`);
  }

  const strategy = job.enrichmentStrategy || "direct";
  const useEmailGuessing =
    job.enrichmentType === "email" &&
    (strategy === "guess_first" || strategy === "guess_only");

  // Get API keys based on strategy
  let prospeoApiKey: string | null = null;
  let millionVerifierApiKey: string | null = null;

  if (strategy !== "guess_only") {
    const prospeoKeyRecord = await vendorApiKeyRepository.findByOrgAndVendor(
      job.organizationId,
      "prospeo"
    );
    if (prospeoKeyRecord) {
      prospeoApiKey = decrypt(prospeoKeyRecord.encryptedKey);
    } else if (strategy === "direct") {
      throw new Error("Prospeo API key not configured");
    }
  }

  if (useEmailGuessing) {
    const millionVerifierKeyRecord = await vendorApiKeyRepository.findByOrgAndVendor(
      job.organizationId,
      "millionverifier"
    );
    if (millionVerifierKeyRecord) {
      millionVerifierApiKey = decrypt(millionVerifierKeyRecord.encryptedKey);
    } else {
      throw new Error("MillionVerifier API key not configured for email validation");
    }
  }

  // Update job status to processing
  await listEnrichmentJobRepository.updateJob(jobId, { status: "processing" });

  // Notify via Pusher
  await sendJobProgressUpdate(job.organizationId, jobId, {
    status: "processing",
    processedRows: 0,
    totalRows: job.totalRows,
  });

  // Process items in batches
  let hasMore = true;
  let processedCount = 0;

  while (hasMore) {
    const items = await listEnrichmentJobRepository.findPendingItems(
      jobId,
      BATCH_SIZE
    );

    if (items.length === 0) {
      hasMore = false;
      continue;
    }

    for (const item of items) {
      try {
        // Mark as processing
        await listEnrichmentJobRepository.updateItem(item.id, {
          status: "processing",
        });

        let enrichedEmail: string | null = null;
        let enrichedPhone: string | null = null;
        let prospeoResponse: object | null = null;
        let status: string = "completed";

        if (job.enrichmentType === "email") {
          if (useEmailGuessing && millionVerifierApiKey) {
            // Email guessing flow
            const result = await processEmailWithGuessing(
              item,
              millionVerifierApiKey,
              prospeoApiKey,
              strategy === "guess_only"
            );
            enrichedEmail = result.email;
            prospeoResponse = result.prospeoResponse;
            status = result.status;

            // Update job counters for guessing
            if (result.wasGuessed) {
              await incrementGuessSuccess(jobId, result.validationCredits);
            } else if (result.usedFallback) {
              await incrementFallbackCount(jobId);
            }
          } else {
            // Direct Prospeo flow
            if (!prospeoApiKey) {
              throw new Error("Prospeo API key not available");
            }
            const response = await findEmailWithKey(item.linkedinUrl, prospeoApiKey);
            prospeoResponse = response;

            if (response.success && response.response?.email?.email) {
              enrichedEmail = response.response.email.email;
            } else {
              status = "not_found";
            }
          }

          if (enrichedEmail) {
            await leadRepository.update(item.leadId, {
              email: enrichedEmail,
            });
          }
        } else {
          // Phone enrichment (always use Prospeo)
          if (!prospeoApiKey) {
            throw new Error("Prospeo API key not available for phone enrichment");
          }
          const response = await findMobileWithKey(item.linkedinUrl, prospeoApiKey);
          prospeoResponse = response;

          if (
            response.success &&
            response.response?.phone_numbers &&
            response.response.phone_numbers.length > 0
          ) {
            enrichedPhone = response.response.phone_numbers[0];

            await leadRepository.update(item.leadId, {
              phone: enrichedPhone,
            });
          } else {
            status = "not_found";
          }
        }

        // Update item
        await listEnrichmentJobRepository.updateItem(item.id, {
          status,
          enrichedEmail,
          enrichedPhone,
          prospeoResponse,
          processedAt: new Date(),
        });

        // Increment job progress
        await listEnrichmentJobRepository.incrementJobProgress(
          jobId,
          status === "completed"
        );

        processedCount++;

        // Send progress update
        if (processedCount % 10 === 0) {
          const updatedJob = await listEnrichmentJobRepository.findJobById(jobId);
          if (updatedJob) {
            await sendJobProgressUpdate(job.organizationId, jobId, {
              status: "processing",
              processedRows: updatedJob.processedRows,
              successCount: updatedJob.successCount,
              errorCount: updatedJob.errorCount,
              totalRows: updatedJob.totalRows,
            });
          }
        }

        // Rate limiting
        await new Promise((resolve) => setTimeout(resolve, RATE_LIMIT_DELAY_MS));
      } catch (error) {
        logger.error(
          { error, itemId: item.id, linkedinUrl: item.linkedinUrl },
          "Failed to process enrichment item"
        );

        // Update item as failed
        await listEnrichmentJobRepository.updateItem(item.id, {
          status: "failed",
          errorMessage:
            error instanceof Error ? error.message : "Unknown error",
          processedAt: new Date(),
        });

        // Increment error count
        await listEnrichmentJobRepository.incrementJobProgress(jobId, false);

        processedCount++;
      }
    }
  }

  // Mark job as completed
  await listEnrichmentJobRepository.updateJob(jobId, {
    status: "completed",
    completedAt: new Date(),
  });

  // Final progress update
  const finalJob = await listEnrichmentJobRepository.findJobById(jobId);
  if (finalJob) {
    await sendJobProgressUpdate(job.organizationId, jobId, {
      status: "completed",
      processedRows: finalJob.processedRows,
      successCount: finalJob.successCount,
      errorCount: finalJob.errorCount,
      totalRows: finalJob.totalRows,
    });
  }

  logger.info(
    { jobId, processedCount },
    "List enrichment job processing completed"
  );
}

// ============================================
// Email Guessing Helper Functions
// ============================================

interface EmailGuessResult {
  email: string | null;
  status: string;
  wasGuessed: boolean;
  usedFallback: boolean;
  validationCredits: number;
  prospeoResponse: object | null;
}

async function processEmailWithGuessing(
  item: { id: string; leadId: string; linkedinUrl: string },
  millionVerifierApiKey: string,
  prospeoApiKey: string | null,
  guessOnly: boolean
): Promise<EmailGuessResult> {
  // Get lead details for guessing
  const lead = await leadRepository.findById(item.leadId);
  if (!lead) {
    return {
      email: null,
      status: "failed",
      wasGuessed: false,
      usedFallback: false,
      validationCredits: 0,
      prospeoResponse: null,
    };
  }

  // Get or search for company domain
  const domain = await getCompanyDomain(
    lead.companyDomain,
    lead.company,
    lead.linkedinUrl,
    true // Use Serper search
  );

  if (!domain) {
    logger.info({ leadId: lead.id }, "No domain found for lead, falling back");

    if (guessOnly) {
      return {
        email: null,
        status: "not_found",
        wasGuessed: false,
        usedFallback: false,
        validationCredits: 0,
        prospeoResponse: null,
      };
    }

    // Fall back to Prospeo
    return await fallbackToProspeo(item.linkedinUrl, prospeoApiKey);
  }

  // Cache the domain on the lead
  if (!lead.companyDomain) {
    await leadRepository.update(item.leadId, { companyDomain: domain });
  }

  // Get prioritized patterns for this domain
  const prioritizedPatterns = await domainPatternRepository.getPrioritizedPatterns(domain);

  // Generate email candidates
  const candidates = generateEmailCandidates(
    lead.firstName,
    lead.lastName,
    domain,
    prioritizedPatterns
  );

  logger.info({
    leadId: lead.id,
    firstName: lead.firstName,
    lastName: lead.lastName,
    domain,
    candidateCount: candidates.length,
    candidates: candidates.map(c => c.email)
  }, "Generated email candidates");

  if (candidates.length === 0) {
    logger.info({ leadId: lead.id }, "No email candidates generated");

    if (guessOnly) {
      return {
        email: null,
        status: "not_found",
        wasGuessed: false,
        usedFallback: false,
        validationCredits: 0,
        prospeoResponse: null,
      };
    }

    return await fallbackToProspeo(item.linkedinUrl, prospeoApiKey);
  }

  // Try to validate each candidate
  let validationCredits = 0;

  logger.info({ candidateCount: candidates.length, leadId: item.leadId }, "Starting email validation loop");

  for (const candidate of candidates) {
    logger.info({ email: candidate.email, pattern: candidate.pattern }, "Trying email candidate");
    try {
      // Create validation attempt record
      await emailValidationRepository.create({
        jobItemId: item.id,
        leadId: item.leadId,
        email: candidate.email,
        pattern: candidate.pattern,
      });

      // Validate with MillionVerifier
      logger.info({ email: candidate.email }, "Calling MillionVerifier");
      const validationResult = await validateEmail(candidate.email, millionVerifierApiKey);
      logger.info({ email: candidate.email, result: validationResult.result, resultcode: validationResult.resultcode }, "MillionVerifier response");
      validationCredits++;

      const status = mapMillionVerifierStatus(validationResult);
      logger.info({ email: candidate.email, status }, "Mapped validation status");

      // Update validation attempt
      const attempts = await emailValidationRepository.findPendingByJobItemId(item.id);
      const attempt = attempts.find((a) => a.email === candidate.email);
      if (attempt) {
        await emailValidationRepository.updateStatus(
          attempt.id,
          status,
          validationResult
        );
      }

      if (status === "valid") {
        // Record success for pattern learning
        await domainPatternRepository.recordSuccess(domain, candidate.pattern);

        return {
          email: candidate.email,
          status: "completed",
          wasGuessed: true,
          usedFallback: false,
          validationCredits,
          prospeoResponse: null,
        };
      }

      if (status === "catch_all") {
        // Catch-all domains accept anything, so we can't validate
        // Use the first pattern as it's likely correct
        return {
          email: candidate.email,
          status: "completed",
          wasGuessed: true,
          usedFallback: false,
          validationCredits,
          prospeoResponse: null,
        };
      }

      // Rate limiting between validations
      await new Promise((resolve) => setTimeout(resolve, 100));
    } catch (error) {
      logger.error(
        { error, email: candidate.email, errorMessage: error instanceof Error ? error.message : String(error) },
        "Failed to validate email candidate - continuing to next"
      );
    }
  }

  logger.info({ leadId: item.leadId, validationCredits }, "Finished validation loop - all candidates exhausted");

  // All candidates bounced, record failure for domain
  await domainPatternRepository.recordFailure(domain);

  // Mark lead as having bounced emails
  await leadRepository.update(item.leadId, { emailBounced: true });

  if (guessOnly) {
    return {
      email: null,
      status: "not_found",
      wasGuessed: false,
      usedFallback: false,
      validationCredits,
      prospeoResponse: null,
    };
  }

  // Fall back to Prospeo
  const fallbackResult = await fallbackToProspeo(item.linkedinUrl, prospeoApiKey);
  return {
    ...fallbackResult,
    validationCredits,
  };
}

async function fallbackToProspeo(
  linkedinUrl: string,
  prospeoApiKey: string | null
): Promise<EmailGuessResult> {
  if (!prospeoApiKey) {
    return {
      email: null,
      status: "not_found",
      wasGuessed: false,
      usedFallback: false,
      validationCredits: 0,
      prospeoResponse: null,
    };
  }

  try {
    const response = await findEmailWithKey(linkedinUrl, prospeoApiKey);

    if (response.success && response.response?.email?.email) {
      return {
        email: response.response.email.email,
        status: "completed",
        wasGuessed: false,
        usedFallback: true,
        validationCredits: 0,
        prospeoResponse: response,
      };
    }

    return {
      email: null,
      status: "not_found",
      wasGuessed: false,
      usedFallback: true,
      validationCredits: 0,
      prospeoResponse: response,
    };
  } catch (error) {
    logger.error({ error, linkedinUrl }, "Prospeo fallback failed");
    return {
      email: null,
      status: "failed",
      wasGuessed: false,
      usedFallback: true,
      validationCredits: 0,
      prospeoResponse: null,
    };
  }
}

async function incrementGuessSuccess(jobId: string, validationCreditsCount: number) {
  const { sql } = await import("kysely");
  await db
    .updateTable("list_enrichment_job")
    .set({
      guessSuccessCount: sql`"guessSuccessCount" + 1`,
      validationCredits: sql`"validationCredits" + ${validationCreditsCount}`,
      updatedAt: new Date(),
    })
    .where("id", "=", jobId)
    .execute();
}

async function incrementFallbackCount(jobId: string) {
  const { sql } = await import("kysely");
  await db
    .updateTable("list_enrichment_job")
    .set({
      fallbackCount: sql`"fallbackCount" + 1`,
      updatedAt: new Date(),
    })
    .where("id", "=", jobId)
    .execute();
}

async function sendJobProgressUpdate(
  organizationId: string,
  jobId: string,
  data: {
    status: string;
    processedRows: number;
    successCount?: number;
    errorCount?: number;
    totalRows: number;
  }
) {
  try {
    await sendPusherEvent(`private-org-${organizationId}`, "enrichment-progress", {
      jobId,
      ...data,
    });
  } catch (error) {
    logger.warn(
      { error, organizationId, jobId },
      "Failed to send Pusher progress update"
    );
  }
}
