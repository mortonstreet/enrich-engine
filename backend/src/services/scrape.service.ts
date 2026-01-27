import * as scrapeJobRepository from "@/repositories/scrapeJob.repository";
import * as listRepository from "@/repositories/list.repository";
import * as leadRepository from "@/repositories/lead.repository";
import * as serperClient from "@/clients/serper.client";
import { isValidLinkedInProfileUrl } from "@/utils/linkedinValidator";
import { processBatch } from "@/utils/batchProcessor";
import { DomainMemo } from "@/utils/domainMemo";
import { QPS_CONFIG } from "@/config/qps.config";
import { getDomainCache } from "@/lib/cache";
import { extractCompaniesFromItems, prefetchDomains } from "@/lib/cache/cacheWarmer";
import { extractDomainFromUrl, extractCompanyFromLinkedIn } from "@/utils/domainExtractor";
import {
  ScrapeJobStatus,
  ScrapeItemStatus,
  ScrapeInputType,
  GetScrapeJobsRequest,
  CSVColumnValidation,
  ScrapeCSVRow,
  ScrapeJobsListResponse,
  ScrapeJobDetailResponse,
  CreateScrapeJobResponse,
  DeleteScrapeJobResponse,
  DBScrapeJob,
  DBScrapeJobItem,
  RoleConfig,
  CreateRerunJobResponse,
  RoleAnalytics,
  RoleAnalyticsResponse,
  ScrapeProgressPayload,
  channels,
  PUSHER_EVENTS,
} from "@shared/types/src";
import logger from "@/lib/logger";
import { sendPusherEvent } from "@/lib/pusher";

const NAME_REQUIRED_COLUMNS = ["first_name", "last_name"];
const ROLE_COLUMNS = ["role", "role1", "role2", "role3"];

/**
 * Extracts a usable company name from a URL or returns the value as-is.
 * Handles:
 * - LinkedIn company URLs (extracts company name from slug)
 * - Website URLs (extracts domain name without TLD)
 * - Plain text company names (returns as-is)
 */
function extractCompanyNameFromInput(companyInput: string): string {
  if (!companyInput || !companyInput.trim()) {
    return companyInput;
  }

  const trimmed = companyInput.trim();

  // Check if it's a URL
  try {
    const url = new URL(trimmed);

    // Check if it's a LinkedIn company URL
    if (url.hostname.includes("linkedin.com")) {
      const linkedinCompany = extractCompanyFromLinkedIn(trimmed);
      if (linkedinCompany) {
        // Capitalize first letter of each word for better search results
        return linkedinCompany
          .split(" ")
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(" ");
      }
    }

    // It's a regular website URL - extract domain and use as company identifier
    const domain = extractDomainFromUrl(trimmed);
    if (domain) {
      // Remove common TLDs and use the main part as company name
      const domainParts = domain.split(".");
      // Get the main part (e.g., "pearlstreetcp" from "pearlstreetcp.com")
      const mainPart = domainParts[0];
      // Return the domain as-is for search (works well with Google)
      return domain;
    }
  } catch {
    // Not a valid URL, return as-is
  }

  return trimmed;
}

const getRolesFromRow = (row: ScrapeCSVRow): string[] => {
  const roles: string[] = [];
  if (row.role?.trim()) roles.push(row.role.trim());
  if (row.role1?.trim()) roles.push(row.role1.trim());
  if (row.role2?.trim()) roles.push(row.role2.trim());
  if (row.role3?.trim()) roles.push(row.role3.trim());
  return roles;
};

// Generate a unique key for deduplication based on input type
const getDedupeKey = (inputData: Record<string, string>, inputType: ScrapeInputType): string => {
  if (inputType === ScrapeInputType.ROLE) {
    // For role-based: company + role combination
    const company = (inputData.company || "").toLowerCase().trim();
    const role = (inputData.role || "").toLowerCase().trim();
    return `${company}|${role}`;
  } else {
    // For name-based: first_name + last_name + company combination
    const firstName = (inputData.first_name || "").toLowerCase().trim();
    const lastName = (inputData.last_name || "").toLowerCase().trim();
    const company = (inputData.company || "").toLowerCase().trim();
    return `${firstName}|${lastName}|${company}`;
  }
};

export const validateCSVColumns = (columns: string[], roleConfigs?: RoleConfig[]): CSVColumnValidation => {
  const normalizedColumns = columns.map((c) => c.toLowerCase().trim());

  const hasNameColumns = NAME_REQUIRED_COLUMNS.every((col) =>
    normalizedColumns.includes(col)
  );
  const hasRoleColumns = normalizedColumns.includes("company") &&
    ROLE_COLUMNS.some((col) => normalizedColumns.includes(col));

  // If roleConfigs are provided from UI, only require company column
  const hasCompanyWithUIRoles = normalizedColumns.includes("company") &&
    roleConfigs && roleConfigs.length > 0;

  if (hasNameColumns) {
    return {
      isValid: true,
      inputType: ScrapeInputType.NAME,
      columns: normalizedColumns,
      missingColumns: [],
      errors: [],
    };
  }

  if (hasRoleColumns) {
    return {
      isValid: true,
      inputType: ScrapeInputType.ROLE,
      columns: normalizedColumns,
      missingColumns: [],
      errors: [],
    };
  }

  // Company CSV with roles configured in UI (not in CSV)
  if (hasCompanyWithUIRoles) {
    return {
      isValid: true,
      inputType: ScrapeInputType.ROLE,
      columns: normalizedColumns,
      missingColumns: [],
      errors: [],
    };
  }

  const missingNameCols = NAME_REQUIRED_COLUMNS.filter(
    (col) => !normalizedColumns.includes(col)
  );
  const missingRoleCols: string[] = [];
  if (!normalizedColumns.includes("company")) {
    missingRoleCols.push("company");
  }
  if (!ROLE_COLUMNS.some((col) => normalizedColumns.includes(col))) {
    missingRoleCols.push("role (or role1/role2/role3)");
  }

  return {
    isValid: false,
    inputType: null,
    columns: normalizedColumns,
    missingColumns: [...new Set([...missingNameCols, ...missingRoleCols])],
    errors: [
      `Missing required columns. For name-based search: ${NAME_REQUIRED_COLUMNS.join(", ")}. For role-based search: company + role (or role1/role2/role3).`,
    ],
  };
};

export const createScrapeJob = async (
  organizationId: string,
  userId: string,
  name: string,
  inputType: ScrapeInputType,
  rows: ScrapeCSVRow[],
  roleConfigs?: RoleConfig[],
): Promise<CreateScrapeJobResponse> => {
  const job = await scrapeJobRepository.create({
    organizationId,
    userId,
    name,
    totalRows: rows.length,
    inputType,
    status: ScrapeJobStatus.PENDING,
  });

  if (!job) {
    throw new Error("Failed to create scrape job");
  }

  // Expand rows with multiple role columns into separate items
  // For role-based scraping, track counts per company+role to support multiple people per role
  const items: Array<{
    jobId: string;
    rowIndex: number;
    inputData: Record<string, string>;
    status: ScrapeItemStatus;
  }> = [];

  // Track counts for multi-person same-role support
  // Key: company|role, Value: count of instances
  const roleInstanceCounts = new Map<string, number>();

  if (inputType === ScrapeInputType.ROLE) {
    // Check if roleConfigs are provided from UI (company CSV workflow)
    if (roleConfigs && roleConfigs.length > 0) {
      // Expand each company row with each role config
      rows.forEach((row) => {
        roleConfigs.forEach((config) => {
          // Create one item per count for each role
          for (let i = 0; i < config.count; i++) {
            const inputData = { ...row, role: config.roleName } as Record<string, string>;
            const companyRoleKey = getDedupeKey(inputData, inputType);

            // Get current instance count for this company+role
            const instanceIndex = roleInstanceCounts.get(companyRoleKey) ?? 0;
            roleInstanceCounts.set(companyRoleKey, instanceIndex + 1);

            // Store instance index in inputData for multi-person scraping
            inputData.roleInstanceIndex = instanceIndex.toString();

            items.push({
              jobId: job.id,
              rowIndex: items.length,
              inputData,
              status: ScrapeItemStatus.PENDING,
            });
          }
        });
      });
    } else {
      // Roles are in CSV columns (legacy behavior)
      rows.forEach((row) => {
        const roles = getRolesFromRow(row);
        roles.forEach((role) => {
          const inputData = { ...row, role } as Record<string, string>;
          const companyRoleKey = getDedupeKey(inputData, inputType);

          // Get current instance count for this company+role
          const instanceIndex = roleInstanceCounts.get(companyRoleKey) ?? 0;
          roleInstanceCounts.set(companyRoleKey, instanceIndex + 1);

          // Store instance index in inputData for multi-person scraping
          inputData.roleInstanceIndex = instanceIndex.toString();

          items.push({
            jobId: job.id,
            rowIndex: items.length,
            inputData,
            status: ScrapeItemStatus.PENDING,
          });
        });
      });
    }
  } else {
    // For name-based searches, deduplicate as before
    const seenKeys = new Set<string>();
    rows.forEach((row) => {
      const inputData = row as Record<string, string>;
      const dedupeKey = getDedupeKey(inputData, inputType);

      // Skip if we've already seen this name+company combination
      if (seenKeys.has(dedupeKey)) {
        return;
      }
      seenKeys.add(dedupeKey);

      items.push({
        jobId: job.id,
        rowIndex: items.length,
        inputData,
        status: ScrapeItemStatus.PENDING,
      });
    });
  }

  await scrapeJobRepository.createItems(items);

  // Update totalRows to reflect expanded item count
  if (items.length !== rows.length) {
    await scrapeJobRepository.update(job.id, { totalRows: items.length });
  }

  logger.info(
    { jobId: job.id, totalRows: items.length, inputType },
    "Scrape job created"
  );

  return {
    job: { ...job, totalRows: items.length },
    message: `Scrape job created with ${items.length} items`,
  };
};

export const getScrapeJobs = async (
  organizationId: string,
  params: GetScrapeJobsRequest,
): Promise<ScrapeJobsListResponse> => {
  return scrapeJobRepository.findByOrganizationId(organizationId, {
    page: params.page,
    limit: params.limit,
    status: params.status,
  });
};

export const getScrapeJob = async (
  jobId: string,
  organizationId: string,
): Promise<ScrapeJobDetailResponse> => {
  const { job, items } = await scrapeJobRepository.findByIdWithItems(jobId);

  if (!job) {
    throw new Error("Scrape job not found");
  }

  if (job.organizationId !== organizationId) {
    throw new Error("Unauthorized access to scrape job");
  }

  return {
    ...job,
    items,
  };
};

export const deleteScrapeJob = async (
  jobId: string,
  organizationId: string,
): Promise<DeleteScrapeJobResponse> => {
  const job = await scrapeJobRepository.findById(jobId);

  if (!job) {
    throw new Error("Scrape job not found");
  }

  if (job.organizationId !== organizationId) {
    throw new Error("Unauthorized access to scrape job");
  }

  if (job.status === ScrapeJobStatus.PROCESSING) {
    throw new Error("Cannot delete a job that is currently processing");
  }

  await scrapeJobRepository.deleteById(jobId);

  return {
    success: true,
    message: "Scrape job deleted successfully",
  };
};

export const pauseScrapeJob = async (
  jobId: string,
  organizationId: string,
): Promise<DBScrapeJob> => {
  const job = await scrapeJobRepository.findById(jobId);

  if (!job) {
    throw new Error("Scrape job not found");
  }

  if (job.organizationId !== organizationId) {
    throw new Error("Unauthorized access to scrape job");
  }

  if (job.status !== ScrapeJobStatus.PROCESSING && job.status !== ScrapeJobStatus.PENDING) {
    throw new Error("Can only pause pending or processing jobs");
  }

  const updatedJob = await scrapeJobRepository.update(jobId, {
    status: ScrapeJobStatus.PAUSED,
  });

  // Reset any items that were in processing state back to pending
  await scrapeJobRepository.resetStuckItems(jobId);

  // Create/update the result list so partially scraped leads are available for enrichment
  await createOrUpdateResultList(jobId);

  logger.info({ jobId }, "Scrape job paused");

  return updatedJob!;
};

export const resumeScrapeJob = async (
  jobId: string,
  organizationId: string,
): Promise<DBScrapeJob> => {
  const job = await scrapeJobRepository.findById(jobId);

  if (!job) {
    throw new Error("Scrape job not found");
  }

  if (job.organizationId !== organizationId) {
    throw new Error("Unauthorized access to scrape job");
  }

  if (job.status !== ScrapeJobStatus.PAUSED) {
    throw new Error("Can only resume paused jobs");
  }

  const updatedJob = await scrapeJobRepository.update(jobId, {
    status: ScrapeJobStatus.PENDING,
  });

  logger.info({ jobId }, "Scrape job resumed");

  return updatedJob!;
};

// How often to sync results to the list (every N batches)
const LIST_SYNC_BATCH_INTERVAL = 3;

/**
 * Send scrape progress update via Pusher to the organization channel
 */
async function sendScrapeProgressUpdate(
  orgId: string,
  jobId: string,
  data: Omit<ScrapeProgressPayload, "jobId">
): Promise<void> {
  try {
    const payload: ScrapeProgressPayload = {
      jobId,
      ...data,
    };
    await sendPusherEvent(
      channels.privateOrg(orgId),
      PUSHER_EVENTS.SCRAPE_PROGRESS,
      payload
    );
  } catch (error) {
    logger.warn({ error, orgId, jobId }, "Failed to send scrape progress update");
  }
}

interface ProcessItemResult {
  success: boolean;
  linkedinUrl?: string | null;
  companyDomain?: string | null;
  error?: unknown;
}

export const processScrapeJob = async (jobId: string): Promise<void> => {
  const job = await scrapeJobRepository.findById(jobId);

  if (!job) {
    throw new Error("Scrape job not found");
  }

  await scrapeJobRepository.update(jobId, {
    status: ScrapeJobStatus.PROCESSING,
  });

  // Send initial processing update via Pusher
  await sendScrapeProgressUpdate(job.organizationId, jobId, {
    status: ScrapeJobStatus.PROCESSING,
    processedRows: job.processedRows,
    totalRows: job.totalRows,
    successCount: job.successCount,
    errorCount: job.errorCount,
  });

  logger.info({ jobId, batchSize: QPS_CONFIG.BATCH_SIZE, concurrency: QPS_CONFIG.QUEUE_CONCURRENCY }, "Starting scrape job processing with batch processing");

  try {
    // Reset any items stuck in 'processing' status from a previous failed/interrupted run
    await scrapeJobRepository.resetStuckItems(jobId);

    const items = await scrapeJobRepository.findPendingItems(jobId);

    if (items.length === 0) {
      await scrapeJobRepository.update(jobId, {
        status: ScrapeJobStatus.COMPLETED,
        completedAt: new Date(),
      });
      logger.info({ jobId }, "No pending items to process, marking job as completed");
      return;
    }

    // Initialize domain memo for this job (reduces duplicate API calls for same company)
    // Use Redis cache if available, falling back to in-memory DomainMemo
    const domainMemo = new DomainMemo();
    const redisCache = getDomainCache();

    // Pre-fetch domains for all companies in this job (Phase 3 optimization)
    if (redisCache) {
      try {
        const companies = extractCompaniesFromItems(
          items as Array<{ inputData: Record<string, string> }>
        );
        if (companies.length > 0) {
          const prefetchResult = await prefetchDomains(
            redisCache,
            companies,
            (company) => serperClient.searchCompanyWebsite(company),
            20 // Prefetch 20 at a time
          );
          logger.info(
            {
              jobId,
              cached: prefetchResult.cached,
              fetched: prefetchResult.fetched,
              failed: prefetchResult.failed,
            },
            "Domain prefetch complete"
          );
        }
      } catch (prefetchError) {
        logger.warn(
          { error: prefetchError, jobId },
          "Domain prefetch failed, will fetch on demand"
        );
      }
    }

    // Track used LinkedIn URLs per company+role for multi-person scraping
    // Key: company|role, Value: Set of used LinkedIn URLs (normalized)
    const usedUrlsByCompanyRole = new Map<string, Set<string>>();

    // Also track already-completed items' URLs from previous runs
    const { items: allItems } = await scrapeJobRepository.findByIdWithItems(jobId);
    for (const completedItem of allItems) {
      if (completedItem.status === ScrapeItemStatus.COMPLETED && completedItem.linkedinUrl) {
        const itemData = completedItem.inputData as Record<string, string>;
        const companyRoleKey = getDedupeKey(itemData, job.inputType as ScrapeInputType);
        if (!usedUrlsByCompanyRole.has(companyRoleKey)) {
          usedUrlsByCompanyRole.set(companyRoleKey, new Set());
        }
        const normalizedUrl = completedItem.linkedinUrl.toLowerCase().trim().replace(/\/$/, "");
        usedUrlsByCompanyRole.get(companyRoleKey)!.add(normalizedUrl);
      }
    }

    // Track if job was paused during processing
    let wasPaused = false;
    let processedCount = 0;

    // Process items in batches using the batch processor
    await processBatch({
      items,
      batchSize: QPS_CONFIG.BATCH_SIZE,
      delayBetweenItems: QPS_CONFIG.DELAY_BETWEEN_ITEMS_MS,
      delayBetweenBatches: QPS_CONFIG.DELAY_BETWEEN_BATCHES_MS,

      processor: async (item, index) => {
        // Check if job has been paused (check less frequently for batched processing)
        if (index % QPS_CONFIG.BATCH_SIZE === 0) {
          const currentJob = await scrapeJobRepository.findById(jobId);
          if (currentJob?.status === ScrapeJobStatus.PAUSED) {
            wasPaused = true;
            throw new Error("Job paused");
          }
        }

        return processItem(item, job, domainMemo, usedUrlsByCompanyRole);
      },

      onItemComplete: async (_result, _item, index) => {
        processedCount++;
        // Update progress periodically (every 10 items)
        if (index % 10 === 0) {
          await updateJobProgress(jobId);
        }
      },

      onBatchComplete: async (results, batchIndex) => {
        // Always update progress after each batch
        const updatedJob = await updateJobProgress(jobId);

        // Send real-time progress update via Pusher
        if (updatedJob) {
          await sendScrapeProgressUpdate(job.organizationId, jobId, {
            status: updatedJob.status,
            processedRows: updatedJob.processedRows,
            totalRows: updatedJob.totalRows,
            successCount: updatedJob.successCount,
            errorCount: updatedJob.errorCount,
          });
        }

        // Sync results to list periodically
        if ((batchIndex + 1) % LIST_SYNC_BATCH_INTERVAL === 0) {
          await createOrUpdateResultList(jobId);
        }

        logger.info({
          jobId,
          batchIndex: batchIndex + 1,
          successCount: results.filter(r => r.success).length,
          errorCount: results.filter(r => !r.success).length,
          domainCacheStats: domainMemo.getStats(),
          processedTotal: processedCount,
        }, "Batch complete");
      },
    });

    // Check if we stopped due to pause
    if (wasPaused) {
      logger.info({ jobId }, "Scrape job paused, stopping processing");
      return; // Exit without marking as completed or failed
    }

    // Final sync to ensure all results are in the list
    await createResultList(jobId);

    const completedJob = await scrapeJobRepository.update(jobId, {
      status: ScrapeJobStatus.COMPLETED,
      completedAt: new Date(),
    });

    // Send final completion update via Pusher
    if (completedJob) {
      await sendScrapeProgressUpdate(job.organizationId, jobId, {
        status: completedJob.status,
        processedRows: completedJob.processedRows,
        totalRows: completedJob.totalRows,
        successCount: completedJob.successCount,
        errorCount: completedJob.errorCount,
      });
    }

    logger.info({ jobId, domainCacheStats: domainMemo.getStats() }, "Scrape job completed");
  } catch (error) {
    // Check if this was a pause-related exit
    if (error instanceof Error && error.message === "Job paused") {
      logger.info({ jobId }, "Scrape job paused, stopping processing");
      return;
    }

    logger.error({ error, jobId }, "Scrape job failed");

    // Mark any items stuck in 'processing' as failed
    await scrapeJobRepository.failStuckItems(jobId);

    // Try to sync any results we have before marking as failed
    try {
      await createOrUpdateResultList(jobId);
    } catch (syncError) {
      logger.error({ error: syncError, jobId }, "Failed to sync results before marking job as failed");
    }

    const failedJob = await scrapeJobRepository.update(jobId, {
      status: ScrapeJobStatus.FAILED,
      completedAt: new Date(),
    });

    // Send failure update via Pusher
    if (failedJob) {
      await sendScrapeProgressUpdate(job.organizationId, jobId, {
        status: failedJob.status,
        processedRows: failedJob.processedRows,
        totalRows: failedJob.totalRows,
        successCount: failedJob.successCount,
        errorCount: failedJob.errorCount,
      });
    }

    throw error;
  }
};

/**
 * Process a single scrape item with domain memoization
 */
async function processItem(
  item: DBScrapeJobItem,
  job: DBScrapeJob,
  domainMemo: DomainMemo,
  usedUrlsByCompanyRole: Map<string, Set<string>>
): Promise<ProcessItemResult> {
  const inputData = item.inputData as Record<string, string>;

  try {
    await scrapeJobRepository.updateItem(item.id, {
      status: ScrapeItemStatus.PROCESSING,
    });

    let linkedinUrl: string | null = null;
    let firstName: string | null = null;
    let lastName: string | null = null;
    let rawResponse: serperClient.SerperResponse | null = null;

    if (job.inputType === ScrapeInputType.NAME) {
      const query = serperClient.buildNameQuery(
        inputData.first_name || "",
        inputData.last_name || "",
        inputData.company
      );
      const result = await serperClient.searchLinkedIn(query);
      linkedinUrl = result.linkedinUrl;
      firstName = result.firstName;
      lastName = result.lastName;
      rawResponse = result.rawResponse;
    } else {
      // Role-based search with multi-person support
      // Extract company name from URL if input is a URL
      const companyName = extractCompanyNameFromInput(inputData.company || "");
      const query = serperClient.buildRoleQuery(
        companyName,
        inputData.role || ""
      );

      // Get the instance index for this company+role
      const roleInstanceIndex = parseInt(inputData.roleInstanceIndex || "0", 10);
      const companyRoleKey = getDedupeKey(inputData, job.inputType as ScrapeInputType);

      // Get or create the set of used URLs for this company+role
      if (!usedUrlsByCompanyRole.has(companyRoleKey)) {
        usedUrlsByCompanyRole.set(companyRoleKey, new Set());
      }
      const usedUrls = usedUrlsByCompanyRole.get(companyRoleKey)!;

      // Search and get the appropriate result
      const searchResponse = await fetch("https://google.serper.dev/search", {
        method: "POST",
        headers: {
          "X-API-KEY": (await import("@/config")).config.serper.apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ q: query, num: 10 }),
      });

      if (!searchResponse.ok) {
        throw new Error(`Serper API error: ${searchResponse.status}`);
      }

      rawResponse = await searchResponse.json() as serperClient.SerperResponse;

      // Extract the Nth result that hasn't been used yet
      const extractedResult = serperClient.extractLinkedInResultByIndex(
        rawResponse.organic || [],
        roleInstanceIndex,
        usedUrls
      );

      if (extractedResult) {
        linkedinUrl = extractedResult.linkedinUrl;
        firstName = extractedResult.firstName;
        lastName = extractedResult.lastName;

        // Add to used URLs
        const normalizedUrl = linkedinUrl.toLowerCase().trim().replace(/\/$/, "");
        usedUrls.add(normalizedUrl);
      }

      logger.debug({
        itemId: item.id,
        company: inputData.company,
        role: inputData.role,
        roleInstanceIndex,
        usedUrlsCount: usedUrls.size,
        foundUrl: linkedinUrl,
      }, "Processed role-based search with multi-person support");
    }

    // Store the extracted name from search results (useful for role-based searches)
    const updatedInputData = { ...inputData };
    if (firstName && !inputData.first_name) {
      updatedInputData.first_name = firstName;
    }
    if (lastName && !inputData.last_name) {
      updatedInputData.last_name = lastName;
    }

    // Search for company domain if we have a company name (with caching)
    // Redis cache is checked inside searchCompanyWebsite (Phase 3)
    // DomainMemo provides in-process deduplication for concurrent requests
    let companyDomain: string | null = null;
    if (inputData.company && linkedinUrl) {
      try {
        // First check if the company input is a URL - if so, extract domain directly
        const directDomain = extractDomainFromUrl(inputData.company);
        if (directDomain) {
          // Input is a URL, use the extracted domain directly
          companyDomain = directDomain;
          logger.debug(
            { itemId: item.id, company: inputData.company, companyDomain },
            "Company domain extracted directly from URL input"
          );
        } else if (QPS_CONFIG.DOMAIN_CACHE_ENABLED) {
          // Use domain memoization for in-process deduplication
          // The actual Redis cache is checked inside searchCompanyWebsite
          companyDomain = await domainMemo.getOrFetch(
            inputData.company,
            () => serperClient.searchCompanyWebsite(inputData.company)
          );
          logger.debug(
            { itemId: item.id, company: inputData.company, companyDomain },
            "Company domain search result"
          );
        } else {
          companyDomain = await serperClient.searchCompanyWebsite(inputData.company);
          logger.debug(
            { itemId: item.id, company: inputData.company, companyDomain },
            "Company domain search result"
          );
        }
      } catch (domainError) {
        logger.warn(
          { error: domainError, company: inputData.company },
          "Failed to search for company domain, continuing without it"
        );
      }
    }

    await scrapeJobRepository.updateItem(item.id, {
      status: linkedinUrl ? ScrapeItemStatus.COMPLETED : ScrapeItemStatus.NO_RESULT,
      linkedinUrl,
      companyDomain,
      inputData: updatedInputData,
      serperResponse: rawResponse,
      processedAt: new Date(),
    });

    return { success: true, linkedinUrl, companyDomain };
  } catch (error) {
    logger.error({ error, itemId: item.id }, "Failed to process scrape item");

    await scrapeJobRepository.updateItem(item.id, {
      status: ScrapeItemStatus.FAILED,
      errorMessage: error instanceof Error ? error.message : "Unknown error",
      processedAt: new Date(),
    });

    return { success: false, error };
  }
}

export const updateJobProgress = async (jobId: string): Promise<DBScrapeJob | undefined> => {
  const progress = await scrapeJobRepository.getJobProgress(jobId);

  return scrapeJobRepository.update(jobId, {
    processedRows: progress.processedRows,
    successCount: progress.successCount,
    errorCount: progress.errorCount,
  });
};

// Normalize LinkedIn URL for consistent deduplication
const normalizeLinkedinUrl = (url: string): string => {
  let normalized = url.toLowerCase().trim();
  // Remove trailing slash
  if (normalized.endsWith("/")) {
    normalized = normalized.slice(0, -1);
  }
  // Ensure consistent format
  normalized = normalized.replace("http://", "https://");
  // Only add www. if not already present
  if (!normalized.includes("www.linkedin.com")) {
    normalized = normalized.replace("linkedin.com/", "www.linkedin.com/");
  }
  return normalized;
};

// Track which jobs are currently being processed to prevent race conditions
const processingJobs = new Set<string>();

export const createOrUpdateResultList = async (jobId: string): Promise<void> => {
  // Prevent concurrent calls for the same job from creating duplicate lists
  if (processingJobs.has(jobId)) {
    logger.info({ jobId }, "Skipping createOrUpdateResultList - already processing");
    return;
  }

  processingJobs.add(jobId);

  try {
    const { job, items } = await scrapeJobRepository.findByIdWithItems(jobId);

    if (!job) {
      throw new Error("Scrape job not found");
    }

    // Filter to completed items with valid LinkedIn profile URLs
    // This excludes company pages (/company/), school pages (/school/), etc.
    const successfulItems = items.filter(
      (item) =>
        item.status === ScrapeItemStatus.COMPLETED &&
        item.linkedinUrl &&
        isValidLinkedInProfileUrl(item.linkedinUrl)
    );

    // Count items that were completed but had invalid URLs
    const completedButInvalidCount = items.filter(
      (item) =>
        item.status === ScrapeItemStatus.COMPLETED &&
        item.linkedinUrl &&
        !isValidLinkedInProfileUrl(item.linkedinUrl)
    ).length;

    logger.info(
      {
        jobId,
        totalItems: items.length,
        successfulItems: successfulItems.length,
        completedButInvalid: completedButInvalidCount,
      },
      "Creating/updating result list (filtered by valid LinkedIn profile URLs)"
    );

    if (successfulItems.length === 0) {
      logger.info({ jobId }, "No successful results to create/update list");
      return;
    }

    // Check if a result list already exists for this job
    // First try by resultListId, then fallback to scrapeJobId lookup
    let list = job.resultListId
      ? await listRepository.findListById(job.resultListId)
      : undefined;

    // Fallback: Try to find by scrapeJobId if resultListId lookup failed
    if (!list) {
      list = await listRepository.findListByScrapeJobId(jobId);
      if (list) {
        // Update the job's resultListId to match the found list
        await scrapeJobRepository.update(jobId, {
          resultListId: list.id,
        });
        logger.info({ jobId, listId: list.id }, "Found existing list by scrapeJobId, linked to job");
      }
    }

    if (!list) {
      // Double-check by re-fetching the job in case another call just created a list
      const freshJob = await scrapeJobRepository.findById(jobId);
      if (freshJob?.resultListId) {
        list = await listRepository.findListById(freshJob.resultListId);
        if (list) {
          logger.info({ jobId, listId: list.id }, "Found list via re-fetched job resultListId");
        }
      }
    }

    if (!list) {
      // Also check by scrapeJobId one more time to catch race conditions
      list = await listRepository.findListByScrapeJobId(jobId);
      if (list) {
        await scrapeJobRepository.update(jobId, {
          resultListId: list.id,
        });
        logger.info({ jobId, listId: list.id }, "Found existing list by scrapeJobId on second check");
      }
    }

    if (!list) {
      // Create a new list only if no existing list was found
      list = await listRepository.createList({
        organizationId: job.organizationId,
        createdById: job.userId,
        name: job.name,
        source: "scraped",
        scrapeJobId: job.id,
      });

      if (!list) {
        throw new Error("Failed to create result list");
      }

      await scrapeJobRepository.update(jobId, {
        resultListId: list.id,
      });

      logger.info({ jobId, listId: list.id }, "Created new result list for scrape job");
    }

    // Get existing leads in the list to avoid duplicates
    const existingLeads = await leadRepository.findAllByListId(list.id);
    const existingLinkedinUrls = new Set(
      existingLeads
        .filter((l) => l.linkedinUrl)
        .map((l) => normalizeLinkedinUrl(l.linkedinUrl!))
    );

    // Deduplicate leads by LinkedIn URL (checking against existing and within batch)
    const seenLinkedinUrls = new Set<string>(existingLinkedinUrls);
    const newLeads: Array<{
      listId: string;
      organizationId: string;
      firstName?: string;
      lastName?: string;
      company?: string;
      role?: string;
      linkedinUrl: string;
      companyDomain?: string;
    }> = [];

    let skippedDuplicates = 0;
    for (const item of successfulItems) {
      const normalizedUrl = normalizeLinkedinUrl(item.linkedinUrl!);

      // Skip if we've already seen this LinkedIn URL
      if (seenLinkedinUrls.has(normalizedUrl)) {
        skippedDuplicates++;
        continue;
      }
      seenLinkedinUrls.add(normalizedUrl);

      const inputData = item.inputData as Record<string, string>;
      newLeads.push({
        listId: list.id,
        organizationId: job.organizationId,
        firstName: inputData.first_name,
        lastName: inputData.last_name,
        company: inputData.company,
        role: inputData.role,
        linkedinUrl: normalizedUrl, // Store normalized URL for consistency
        companyDomain: item.companyDomain ?? undefined, // Include scraped company domain
      });
    }

    if (newLeads.length > 0) {
      await listRepository.createLeads(newLeads);
      logger.info({ jobId, listId: list.id, newLeadsCreated: newLeads.length }, "Created new leads");
    }

    // Recalculate lead count from actual leads in the database for accuracy
    const actualLeadCount = await leadRepository.countByListId(list.id);
    await listRepository.updateList(list.id, {
      leadCount: actualLeadCount,
      importStatus: "completed",
    });

    logger.info(
      {
        jobId,
        listId: list.id,
        newLeadsCount: newLeads.length,
        skippedDuplicates,
        totalLeadCount: actualLeadCount
      },
      "Created/updated result list from scrape job"
    );
  } finally {
    // Always remove the job from processing set when done
    processingJobs.delete(jobId);
  }
};

// Backwards compatibility alias
export const createResultList = createOrUpdateResultList;

export const syncScrapeJobToList = async (
  jobId: string,
  organizationId: string,
): Promise<{ success: boolean; listId: string | null; leadsCount: number; message: string }> => {
  const job = await scrapeJobRepository.findById(jobId);

  if (!job) {
    throw new Error("Scrape job not found");
  }

  if (job.organizationId !== organizationId) {
    throw new Error("Unauthorized access to scrape job");
  }

  // Get current count of successful items
  const { items } = await scrapeJobRepository.findByIdWithItems(jobId);
  const successfulItems = items.filter(
    (item) => item.status === ScrapeItemStatus.COMPLETED && item.linkedinUrl
  );

  if (successfulItems.length === 0) {
    return {
      success: false,
      listId: null,
      leadsCount: 0,
      message: "No successful results to sync",
    };
  }

  // Create or update the list
  await createOrUpdateResultList(jobId);

  // Get the updated job to get the list ID
  const updatedJob = await scrapeJobRepository.findById(jobId);

  logger.info({ jobId, listId: updatedJob?.resultListId, leadsCount: successfulItems.length }, "Scrape job results synced to list");

  return {
    success: true,
    listId: updatedJob?.resultListId ?? null,
    leadsCount: successfulItems.length,
    message: `Synced ${successfulItems.length} leads to list`,
  };
};

export const renameScrapeJob = async (
  jobId: string,
  organizationId: string,
  name: string,
): Promise<DBScrapeJob> => {
  const job = await scrapeJobRepository.findById(jobId);

  if (!job) {
    throw new Error("Scrape job not found");
  }

  if (job.organizationId !== organizationId) {
    throw new Error("Unauthorized access to scrape job");
  }

  const updatedJob = await scrapeJobRepository.update(jobId, { name });

  if (!updatedJob) {
    throw new Error("Failed to rename scrape job");
  }

  // Also update the associated list name if it exists
  if (job.resultListId) {
    await listRepository.updateList(job.resultListId, { name });
  }

  logger.info({ jobId, name }, "Scrape job renamed");

  return updatedJob;
};

export const getDownloadData = async (
  jobId: string,
  organizationId: string,
  foundOnly: boolean = false,
): Promise<{ fileName: string; rows: Record<string, string>[] }> => {
  const { job, items } = await scrapeJobRepository.findByIdWithItems(jobId);

  if (!job) {
    throw new Error("Scrape job not found");
  }

  if (job.organizationId !== organizationId) {
    throw new Error("Unauthorized access to scrape job");
  }

  // Filter items if foundOnly is true
  const filteredItems = foundOnly
    ? items.filter((item) => item.status === ScrapeItemStatus.COMPLETED && item.linkedinUrl)
    : items;

  const rows = filteredItems.map((item) => {
    const inputData = item.inputData as Record<string, string>;
    return {
      ...inputData,
      linkedin_url: item.linkedinUrl || "",
      status: item.status,
    };
  });

  return {
    fileName: `${job.name.replace(/[^a-zA-Z0-9]/g, "_")}_results.csv`,
    rows,
  };
};

// ============================================
// Re-run Not-Found Items
// ============================================

export const createRerunJob = async (
  sourceJobId: string,
  organizationId: string,
  userId: string,
  name: string | undefined,
  roleConfigs: RoleConfig[],
): Promise<CreateRerunJobResponse> => {
  // Get the source job and verify ownership
  const sourceJob = await scrapeJobRepository.findById(sourceJobId);

  if (!sourceJob) {
    throw new Error("Source scrape job not found");
  }

  if (sourceJob.organizationId !== organizationId) {
    throw new Error("Unauthorized access to scrape job");
  }

  // Get not-found items from the source job
  const notFoundItems = await scrapeJobRepository.findNotFoundItems(sourceJobId);

  if (notFoundItems.length === 0) {
    throw new Error("No not-found items to re-run");
  }

  // Extract unique companies from not-found items
  const uniqueCompanies = new Set<string>();
  for (const item of notFoundItems) {
    const inputData = item.inputData as Record<string, string>;
    if (inputData.company) {
      uniqueCompanies.add(inputData.company);
    }
  }

  if (uniqueCompanies.size === 0) {
    throw new Error("No companies found in not-found items");
  }

  // Create rows for the new job (one row per company)
  const rows: ScrapeCSVRow[] = Array.from(uniqueCompanies).map((company) => ({
    company,
  }));

  // Generate job name
  const jobName = name || `${sourceJob.name} - Re-run`;

  // Create the new job with the new role configs
  const result = await createScrapeJob(
    organizationId,
    userId,
    jobName,
    ScrapeInputType.ROLE,
    rows,
    roleConfigs
  );

  logger.info(
    {
      sourceJobId,
      newJobId: result.job.id,
      notFoundCount: notFoundItems.length,
      uniqueCompanies: uniqueCompanies.size,
      newItemCount: result.job.totalRows,
    },
    "Created re-run job from not-found items"
  );

  return {
    job: result.job,
    message: `Created re-run job with ${result.job.totalRows} items from ${uniqueCompanies.size} companies`,
    notFoundCount: notFoundItems.length,
    newItemCount: result.job.totalRows,
  };
};

// ============================================
// Role Analytics
// ============================================

// Mapping of roles to similar alternatives for suggestions
const SIMILAR_ROLES: Record<string, string[]> = {
  "CEO": ["Founder", "Co-Founder", "Managing Director", "President"],
  "Founder": ["CEO", "Co-Founder", "Owner", "President"],
  "Co-Founder": ["Founder", "CEO", "Owner"],
  "CTO": ["VP Engineering", "Chief Technology Officer", "Head of Engineering"],
  "CFO": ["VP Finance", "Chief Financial Officer", "Finance Director"],
  "COO": ["VP Operations", "Chief Operating Officer", "Operations Director"],
  "VP Sales": ["Head of Sales", "Sales Director", "Chief Revenue Officer", "CRO"],
  "Head of Sales": ["VP Sales", "Sales Director", "Director of Sales"],
  "VP Marketing": ["Head of Marketing", "Marketing Director", "CMO"],
  "Head of Marketing": ["VP Marketing", "Marketing Director", "Director of Marketing"],
  "VP Engineering": ["CTO", "Head of Engineering", "Engineering Director"],
  "Head of Engineering": ["VP Engineering", "Engineering Director", "CTO"],
  "VP Product": ["Head of Product", "Product Director", "CPO"],
  "Head of Product": ["VP Product", "Product Director", "Director of Product"],
  "Head of Growth": ["VP Growth", "Growth Director", "Growth Lead"],
  "VP Growth": ["Head of Growth", "Growth Director", "Chief Growth Officer"],
};

export const getRoleAnalytics = async (
  jobId: string,
  organizationId: string,
): Promise<RoleAnalyticsResponse> => {
  const job = await scrapeJobRepository.findById(jobId);

  if (!job) {
    throw new Error("Scrape job not found");
  }

  if (job.organizationId !== organizationId) {
    throw new Error("Unauthorized access to scrape job");
  }

  // Only return analytics for role-based jobs
  if (job.inputType !== ScrapeInputType.ROLE) {
    return {
      analytics: [],
      suggestions: [],
    };
  }

  const rawAnalytics = await scrapeJobRepository.getRoleAnalytics(jobId);

  const analytics: RoleAnalytics[] = rawAnalytics.map((row) => ({
    roleName: row.roleName,
    total: row.total,
    found: row.found,
    notFound: row.notFound,
    hitRate: row.total > 0 ? Math.round((row.found / row.total) * 100) : 0,
  }));

  // Generate suggestions for low hit-rate roles (< 40%)
  const suggestions: Array<{
    originalRole: string;
    suggestedRoles: string[];
    reason: string;
  }> = [];

  for (const role of analytics) {
    if (role.hitRate < 40 && role.notFound > 0) {
      const normalizedRole = role.roleName.trim();

      // Find similar roles
      let suggestedRoles: string[] = [];
      for (const [key, alternatives] of Object.entries(SIMILAR_ROLES)) {
        if (normalizedRole.toLowerCase().includes(key.toLowerCase()) ||
            key.toLowerCase().includes(normalizedRole.toLowerCase())) {
          suggestedRoles = alternatives.filter((alt) =>
            !analytics.some((a) => a.roleName.toLowerCase() === alt.toLowerCase())
          );
          break;
        }
      }

      if (suggestedRoles.length > 0) {
        suggestions.push({
          originalRole: role.roleName,
          suggestedRoles: suggestedRoles.slice(0, 3),
          reason: `Low hit rate (${role.hitRate}%) - try alternative titles`,
        });
      }
    }
  }

  return {
    analytics,
    suggestions,
  };
};
