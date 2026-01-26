import * as listEnrichmentJobRepository from "@/repositories/listEnrichmentJob.repository";
import * as vendorApiKeyRepository from "@/repositories/vendorApiKey.repository";
import * as leadRepository from "@/repositories/lead.repository";
import * as domainPatternRepository from "@/repositories/domainPattern.repository";
import * as emailValidationRepository from "@/repositories/emailValidation.repository";
import * as userRepository from "@/repositories/user.repository";
import * as listRepository from "@/repositories/list.repository";
import { sendEnrichmentCompletedEmail } from "@/clients/email.client";
import { decrypt } from "@/lib/encryption";
import { findEmailWithKey, findMobileWithKey } from "@/clients/prospeo.client";
import {
  validateEmailsBulk,
  mapBulkResultToStatus,
  BulkFileStatus,
  BulkValidationResult,
} from "@/clients/millionverifier.bulk.client";
import { generateEmailCandidates, GeneratedEmail } from "@/utils/emailPatternGenerator";
import { getCompanyDomain } from "@/utils/domainExtractor";
import { db } from "@/lib/db";
import { sql } from "kysely";
import logger from "@/lib/logger";
import { sendPusherEvent } from "@/lib/pusher";

const BATCH_SIZE = 100; // Larger batches for bulk processing
const DOMAIN_LOOKUP_CONCURRENCY = 10; // Parallel domain lookups

// ============================================
// Types
// ============================================

interface LeadEmailCandidate {
  itemId: string;
  leadId: string;
  linkedinUrl: string;
  email: string;
  pattern: string;
  domain: string;
  patternIndex: number; // Lower = higher priority
}

interface ProcessedLead {
  itemId: string;
  leadId: string;
  email: string | null;
  pattern: string | null;
  domain: string | null;
  status: "completed" | "not_found" | "failed";
  wasGuessed: boolean;
  validationCredits: number;
}

// ============================================
// Main Job Processor
// ============================================

export async function processListEnrichmentJob(jobId: string): Promise<void> {
  logger.info({ jobId }, "Starting list enrichment job processing");

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
  await sendJobProgressUpdate(job.organizationId, jobId, {
    status: "processing",
    processedRows: 0,
    totalRows: job.totalRows,
  });

  try {
    if (job.enrichmentType === "email") {
      if (useEmailGuessing && millionVerifierApiKey) {
        // Bulk email guessing flow
        await processEmailGuessingBulk(
          jobId,
          job.organizationId,
          millionVerifierApiKey,
          prospeoApiKey,
          strategy === "guess_only"
        );
      } else {
        // Direct Prospeo flow (sequential for rate limiting)
        await processEmailsDirect(jobId, job.organizationId, prospeoApiKey!);
      }
    } else {
      // Phone enrichment (sequential)
      await processPhoneEnrichment(jobId, job.organizationId, prospeoApiKey!);
    }

    // Mark job as completed
    await listEnrichmentJobRepository.updateJob(jobId, {
      status: "completed",
      completedAt: new Date(),
    });

    const finalJob = await listEnrichmentJobRepository.findJobById(jobId);
    if (finalJob) {
      await sendJobProgressUpdate(job.organizationId, jobId, {
        status: "completed",
        processedRows: finalJob.processedRows,
        successCount: finalJob.successCount,
        errorCount: finalJob.errorCount,
        totalRows: finalJob.totalRows,
      });

      // Send email notification to user
      try {
        const user = await userRepository.findById(job.userId);
        const list = await listRepository.findListById(job.listId);

        if (user?.email) {
          await sendEnrichmentCompletedEmail({
            email: user.email,
            listName: list?.name || "Unknown List",
            enrichmentType: job.enrichmentType,
            totalRows: finalJob.totalRows,
            successCount: finalJob.successCount,
            errorCount: finalJob.errorCount,
          });
          logger.info({ jobId, userEmail: user.email }, "Enrichment completion email sent");
        }
      } catch (emailError) {
        logger.warn({ error: emailError, jobId }, "Failed to send enrichment completion email");
      }
    }

    logger.info({ jobId }, "List enrichment job completed successfully");
  } catch (error) {
    logger.error({ error, jobId }, "List enrichment job failed");

    await listEnrichmentJobRepository.updateJob(jobId, {
      status: "failed",
      completedAt: new Date(),
    });

    await sendJobProgressUpdate(job.organizationId, jobId, {
      status: "failed",
      processedRows: job.processedRows,
      totalRows: job.totalRows,
    });

    throw error;
  }
}

// ============================================
// Bulk Email Guessing (Fast Path)
// ============================================

async function processEmailGuessingBulk(
  jobId: string,
  organizationId: string,
  millionVerifierApiKey: string,
  prospeoApiKey: string | null,
  guessOnly: boolean
): Promise<void> {
  logger.info({ jobId }, "Starting bulk email guessing");

  // Step 1: Get all pending items
  const allItems = await listEnrichmentJobRepository.findAllPendingItems(jobId);
  logger.info({ jobId, itemCount: allItems.length }, "Fetched pending items");

  if (allItems.length === 0) {
    return;
  }

  // Step 2: Get lead details for all items
  const leadIds = allItems.map((item) => item.leadId);
  const leads = await leadRepository.findByIds(leadIds, organizationId);
  const leadMap = new Map(leads.map((lead) => [lead.id, lead]));

  logger.info({ jobId, leadCount: leads.length }, "Fetched lead details");

  // Step 3: Resolve domains for all leads (parallel with concurrency limit)
  await sendJobProgressUpdate(organizationId, jobId, {
    status: "processing",
    statusMessage: "Resolving company domains...",
    processedRows: 0,
    totalRows: allItems.length,
  });

  const domainMap = await resolveDomainsBatch(leads, DOMAIN_LOOKUP_CONCURRENCY);
  logger.info({ jobId, domainsResolved: domainMap.size }, "Resolved domains");

  // Step 4: Generate all email candidates
  const allCandidates: LeadEmailCandidate[] = [];
  const leadsWithoutDomain: string[] = [];
  const itemToLeadMap = new Map(allItems.map((item) => [item.id, item.leadId]));

  for (const item of allItems) {
    const lead = leadMap.get(item.leadId);
    if (!lead) continue;

    const domain = domainMap.get(lead.id);
    if (!domain) {
      leadsWithoutDomain.push(item.id);
      continue;
    }

    // Get prioritized patterns for this domain
    const prioritizedPatterns = await domainPatternRepository.getPrioritizedPatterns(domain);

    // Generate candidates
    const candidates = generateEmailCandidates(
      lead.firstName,
      lead.lastName,
      domain,
      prioritizedPatterns
    );

    candidates.forEach((candidate, index) => {
      allCandidates.push({
        itemId: item.id,
        leadId: item.leadId,
        linkedinUrl: item.linkedinUrl,
        email: candidate.email,
        pattern: candidate.pattern,
        domain,
        patternIndex: index,
      });
    });
  }

  logger.info(
    { jobId, candidateCount: allCandidates.length, leadsWithoutDomain: leadsWithoutDomain.length },
    "Generated email candidates"
  );

  // Step 5: Create validation attempt records
  const validationAttempts = allCandidates.map((c) => ({
    jobItemId: c.itemId,
    leadId: c.leadId,
    email: c.email,
    pattern: c.pattern,
  }));

  if (validationAttempts.length > 0) {
    await emailValidationRepository.bulkCreate(validationAttempts);
  }

  // Step 6: Upload to bulk API and validate
  await sendJobProgressUpdate(organizationId, jobId, {
    status: "processing",
    statusMessage: "Validating emails...",
    processedRows: 0,
    totalRows: allItems.length,
  });

  const uniqueEmails = [...new Set(allCandidates.map((c) => c.email))];
  logger.info({ jobId, uniqueEmailCount: uniqueEmails.length }, "Starting bulk validation");

  let validationResults: Map<string, BulkValidationResult>;

  if (uniqueEmails.length > 0) {
    validationResults = await validateEmailsBulk(
      uniqueEmails,
      millionVerifierApiKey,
      (status: BulkFileStatus) => {
        // Progress callback
        sendJobProgressUpdate(organizationId, jobId, {
          status: "processing",
          statusMessage: `Validating emails... ${status.percent}%`,
          processedRows: Math.floor((status.percent / 100) * allItems.length),
          totalRows: allItems.length,
        });
      }
    );
  } else {
    validationResults = new Map();
  }

  logger.info({ jobId, resultsCount: validationResults.size }, "Bulk validation complete");

  // Step 7: Process results and find valid emails for each lead
  const processedLeads = await processValidationResults(
    allItems,
    allCandidates,
    validationResults,
    leadMap,
    domainMap
  );

  // Step 8: Update leads and job items
  let successCount = 0;
  let errorCount = 0;
  let guessSuccessCount = 0;
  let totalValidationCredits = uniqueEmails.length;

  for (const result of processedLeads) {
    try {
      // Update lead with email if found
      if (result.email) {
        await leadRepository.update(result.leadId, { email: result.email });
        successCount++;
        guessSuccessCount++;

        // Record pattern success for domain learning
        if (result.domain && result.pattern) {
          await domainPatternRepository.recordSuccess(result.domain, result.pattern);
        }
      } else {
        // Mark lead as bounced if no email found
        await leadRepository.update(result.leadId, { emailBounced: true });

        // Record failure for domain
        if (result.domain) {
          await domainPatternRepository.recordFailure(result.domain);
        }

        errorCount++;
      }

      // Update job item
      await listEnrichmentJobRepository.updateItem(result.itemId, {
        status: result.email ? "completed" : "not_found",
        enrichedEmail: result.email,
        processedAt: new Date(),
      });
    } catch (error) {
      logger.error({ error, itemId: result.itemId }, "Failed to update lead/item");
      errorCount++;
    }
  }

  // Step 9: Handle leads without domains (fallback to Prospeo if allowed)
  if (leadsWithoutDomain.length > 0 && !guessOnly && prospeoApiKey) {
    logger.info(
      { jobId, count: leadsWithoutDomain.length },
      "Processing leads without domains via Prospeo fallback"
    );

    for (const itemId of leadsWithoutDomain) {
      const item = allItems.find((i) => i.id === itemId);
      if (!item) continue;

      try {
        const response = await findEmailWithKey(item.linkedinUrl, prospeoApiKey);

        if (response.success && response.response?.email?.email) {
          await leadRepository.update(item.leadId, {
            email: response.response.email.email,
          });

          await listEnrichmentJobRepository.updateItem(itemId, {
            status: "completed",
            enrichedEmail: response.response.email.email,
            prospeoResponse: response,
            processedAt: new Date(),
          });

          successCount++;
          await incrementFallbackCount(jobId);
        } else {
          await listEnrichmentJobRepository.updateItem(itemId, {
            status: "not_found",
            prospeoResponse: response,
            processedAt: new Date(),
          });
          errorCount++;
        }
      } catch (error) {
        logger.error({ error, itemId }, "Prospeo fallback failed");
        await listEnrichmentJobRepository.updateItem(itemId, {
          status: "failed",
          errorMessage: error instanceof Error ? error.message : "Unknown error",
          processedAt: new Date(),
        });
        errorCount++;
      }

      // Small delay for Prospeo rate limiting
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  } else if (leadsWithoutDomain.length > 0) {
    // Mark items without domains as not_found
    for (const itemId of leadsWithoutDomain) {
      await listEnrichmentJobRepository.updateItem(itemId, {
        status: "not_found",
        processedAt: new Date(),
      });
      errorCount++;
    }
  }

  // Step 10: Update job counters
  await db
    .updateTable("list_enrichment_job")
    .set({
      processedRows: allItems.length,
      successCount,
      errorCount,
      guessSuccessCount,
      validationCredits: totalValidationCredits,
      updatedAt: new Date(),
    })
    .where("id", "=", jobId)
    .execute();

  logger.info(
    { jobId, successCount, errorCount, guessSuccessCount, validationCredits: totalValidationCredits },
    "Bulk email guessing complete"
  );
}

// ============================================
// Helper Functions
// ============================================

/**
 * Resolves company domains for a batch of leads with concurrency control.
 */
async function resolveDomainsBatch(
  leads: Array<{ id: string; companyDomain: string | null; company: string | null; linkedinUrl: string | null }>,
  concurrency: number
): Promise<Map<string, string>> {
  const domainMap = new Map<string, string>();
  const queue = [...leads];
  const inProgress: Promise<void>[] = [];

  async function processLead(lead: typeof leads[0]): Promise<void> {
    try {
      const domain = await getCompanyDomain(
        lead.companyDomain,
        lead.company,
        lead.linkedinUrl,
        true
      );

      if (domain) {
        domainMap.set(lead.id, domain);

        // Cache domain on lead if not already set
        if (!lead.companyDomain) {
          await leadRepository.update(lead.id, { companyDomain: domain });
        }
      }
    } catch (error) {
      logger.error({ error, leadId: lead.id }, "Failed to resolve domain");
    }
  }

  while (queue.length > 0 || inProgress.length > 0) {
    // Fill up to concurrency limit
    while (queue.length > 0 && inProgress.length < concurrency) {
      const lead = queue.shift()!;
      const promise = processLead(lead).then(() => {
        const index = inProgress.indexOf(promise);
        if (index > -1) inProgress.splice(index, 1);
      });
      inProgress.push(promise);
    }

    // Wait for at least one to complete
    if (inProgress.length > 0) {
      await Promise.race(inProgress);
    }
  }

  return domainMap;
}

/**
 * Processes validation results and finds the best valid email for each lead.
 */
async function processValidationResults(
  items: Array<{ id: string; leadId: string; linkedinUrl: string }>,
  candidates: LeadEmailCandidate[],
  validationResults: Map<string, BulkValidationResult>,
  leadMap: Map<string, { id: string; firstName: string | null; lastName: string | null }>,
  domainMap: Map<string, string>
): Promise<ProcessedLead[]> {
  const results: ProcessedLead[] = [];

  // Group candidates by item/lead
  const candidatesByItem = new Map<string, LeadEmailCandidate[]>();
  for (const candidate of candidates) {
    const existing = candidatesByItem.get(candidate.itemId) || [];
    existing.push(candidate);
    candidatesByItem.set(candidate.itemId, existing);
  }

  for (const item of items) {
    const itemCandidates = candidatesByItem.get(item.id) || [];
    const domain = domainMap.get(item.leadId) || null;

    // Sort by pattern index (priority order)
    itemCandidates.sort((a, b) => a.patternIndex - b.patternIndex);

    let foundEmail: string | null = null;
    let foundPattern: string | null = null;
    let validationCredits = 0;

    // Find first valid or catch-all email
    for (const candidate of itemCandidates) {
      const result = validationResults.get(candidate.email.toLowerCase());
      validationCredits++;

      if (result) {
        const status = mapBulkResultToStatus(result);

        // Update validation attempt record
        const attempts = await emailValidationRepository.findByJobItemId(item.id);
        const attempt = attempts.find((a) => a.email === candidate.email);
        if (attempt) {
          await emailValidationRepository.updateStatus(attempt.id, status, result);
        }

        if (status === "valid" || status === "catch_all") {
          foundEmail = candidate.email;
          foundPattern = candidate.pattern;
          break;
        }
      }
    }

    results.push({
      itemId: item.id,
      leadId: item.leadId,
      email: foundEmail,
      pattern: foundPattern,
      domain,
      status: foundEmail ? "completed" : "not_found",
      wasGuessed: !!foundEmail,
      validationCredits,
    });
  }

  return results;
}

// ============================================
// Direct Prospeo Flow (Sequential)
// ============================================

async function processEmailsDirect(
  jobId: string,
  organizationId: string,
  prospeoApiKey: string
): Promise<void> {
  logger.info({ jobId }, "Starting direct Prospeo email enrichment");

  let processedCount = 0;

  while (true) {
    const items = await listEnrichmentJobRepository.findPendingItems(jobId, BATCH_SIZE);
    if (items.length === 0) break;

    for (const item of items) {
      try {
        await listEnrichmentJobRepository.updateItem(item.id, { status: "processing" });

        const response = await findEmailWithKey(item.linkedinUrl, prospeoApiKey);
        let enrichedEmail: string | null = null;
        let status = "not_found";

        if (response.success && response.response?.email?.email) {
          enrichedEmail = response.response.email.email;
          status = "completed";

          await leadRepository.update(item.leadId, { email: enrichedEmail });
        }

        await listEnrichmentJobRepository.updateItem(item.id, {
          status,
          enrichedEmail,
          prospeoResponse: response,
          processedAt: new Date(),
        });

        await listEnrichmentJobRepository.incrementJobProgress(jobId, status === "completed");
        processedCount++;

        if (processedCount % 10 === 0) {
          const updatedJob = await listEnrichmentJobRepository.findJobById(jobId);
          if (updatedJob) {
            await sendJobProgressUpdate(organizationId, jobId, {
              status: "processing",
              processedRows: updatedJob.processedRows,
              successCount: updatedJob.successCount,
              errorCount: updatedJob.errorCount,
              totalRows: updatedJob.totalRows,
            });
          }
        }

        // Rate limiting for Prospeo
        await new Promise((resolve) => setTimeout(resolve, 200));
      } catch (error) {
        logger.error({ error, itemId: item.id }, "Failed to process email item");

        await listEnrichmentJobRepository.updateItem(item.id, {
          status: "failed",
          errorMessage: error instanceof Error ? error.message : "Unknown error",
          processedAt: new Date(),
        });

        await listEnrichmentJobRepository.incrementJobProgress(jobId, false);
        processedCount++;
      }
    }
  }

  logger.info({ jobId, processedCount }, "Direct Prospeo enrichment complete");
}

// ============================================
// Phone Enrichment (Sequential)
// ============================================

async function processPhoneEnrichment(
  jobId: string,
  organizationId: string,
  prospeoApiKey: string
): Promise<void> {
  logger.info({ jobId }, "Starting phone enrichment");

  let processedCount = 0;

  while (true) {
    const items = await listEnrichmentJobRepository.findPendingItems(jobId, BATCH_SIZE);
    if (items.length === 0) break;

    for (const item of items) {
      try {
        await listEnrichmentJobRepository.updateItem(item.id, { status: "processing" });

        const response = await findMobileWithKey(item.linkedinUrl, prospeoApiKey);
        let enrichedPhone: string | null = null;
        let status = "not_found";

        if (
          response.success &&
          response.response?.phone_numbers &&
          response.response.phone_numbers.length > 0
        ) {
          enrichedPhone = response.response.phone_numbers[0];
          status = "completed";

          await leadRepository.update(item.leadId, { phone: enrichedPhone });
        }

        await listEnrichmentJobRepository.updateItem(item.id, {
          status,
          enrichedPhone,
          prospeoResponse: response,
          processedAt: new Date(),
        });

        await listEnrichmentJobRepository.incrementJobProgress(jobId, status === "completed");
        processedCount++;

        if (processedCount % 10 === 0) {
          const updatedJob = await listEnrichmentJobRepository.findJobById(jobId);
          if (updatedJob) {
            await sendJobProgressUpdate(organizationId, jobId, {
              status: "processing",
              processedRows: updatedJob.processedRows,
              successCount: updatedJob.successCount,
              errorCount: updatedJob.errorCount,
              totalRows: updatedJob.totalRows,
            });
          }
        }

        // Rate limiting for Prospeo
        await new Promise((resolve) => setTimeout(resolve, 200));
      } catch (error) {
        logger.error({ error, itemId: item.id }, "Failed to process phone item");

        await listEnrichmentJobRepository.updateItem(item.id, {
          status: "failed",
          errorMessage: error instanceof Error ? error.message : "Unknown error",
          processedAt: new Date(),
        });

        await listEnrichmentJobRepository.incrementJobProgress(jobId, false);
        processedCount++;
      }
    }
  }

  logger.info({ jobId, processedCount }, "Phone enrichment complete");
}

// ============================================
// Utility Functions
// ============================================

async function incrementFallbackCount(jobId: string) {
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
    statusMessage?: string;
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
    logger.warn({ error, organizationId, jobId }, "Failed to send Pusher progress update");
  }
}
