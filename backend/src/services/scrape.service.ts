import * as scrapeJobRepository from "@/repositories/scrapeJob.repository";
import * as listRepository from "@/repositories/list.repository";
import * as leadRepository from "@/repositories/lead.repository";
import * as serperClient from "@/clients/serper.client";
import { isValidLinkedInProfileUrl } from "@/utils/linkedinValidator";
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
  RoleConfig,
} from "@shared/types/src";
import logger from "@/lib/logger";

const NAME_REQUIRED_COLUMNS = ["first_name", "last_name"];
const ROLE_COLUMNS = ["role", "role1", "role2", "role3"];

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

// How often to sync results to the list (every N items)
const LIST_SYNC_INTERVAL = 50;

export const processScrapeJob = async (jobId: string): Promise<void> => {
  const job = await scrapeJobRepository.findById(jobId);

  if (!job) {
    throw new Error("Scrape job not found");
  }

  await scrapeJobRepository.update(jobId, {
    status: ScrapeJobStatus.PROCESSING,
  });

  logger.info({ jobId }, "Starting scrape job processing");

  try {
    // Reset any items stuck in 'processing' status from a previous failed/interrupted run
    await scrapeJobRepository.resetStuckItems(jobId);

    const items = await scrapeJobRepository.findPendingItems(jobId);
    let processedSinceLastSync = 0;

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

    for (const item of items) {
      // Check if job has been paused before processing each item
      const currentJob = await scrapeJobRepository.findById(jobId);
      if (currentJob?.status === ScrapeJobStatus.PAUSED) {
        logger.info({ jobId }, "Scrape job paused, stopping processing");
        return; // Exit without marking as completed or failed
      }

      try {
        await scrapeJobRepository.updateItem(item.id, {
          status: ScrapeItemStatus.PROCESSING,
        });

        const inputData = item.inputData as Record<string, string>;
        let query: string;
        let linkedinUrl: string | null = null;
        let firstName: string | null = null;
        let lastName: string | null = null;
        let rawResponse: serperClient.SerperResponse | null = null;

        if (job.inputType === ScrapeInputType.NAME) {
          query = serperClient.buildNameQuery(
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
          query = serperClient.buildRoleQuery(
            inputData.company || "",
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

          logger.info({
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

        // Search for company domain if we have a company name
        let companyDomain: string | null = null;
        if (inputData.company && linkedinUrl) {
          try {
            companyDomain = await serperClient.searchCompanyWebsite(inputData.company);
            logger.info(
              { itemId: item.id, company: inputData.company, companyDomain },
              "Company domain search result"
            );
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

        await updateJobProgress(jobId);
        processedSinceLastSync++;

        // Periodically sync results to the list so partial results are available
        if (processedSinceLastSync >= LIST_SYNC_INTERVAL) {
          await createOrUpdateResultList(jobId);
          processedSinceLastSync = 0;
        }

        // Rate limiting
        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch (error) {
        logger.error({ error, itemId: item.id }, "Failed to process scrape item");

        await scrapeJobRepository.updateItem(item.id, {
          status: ScrapeItemStatus.FAILED,
          errorMessage: error instanceof Error ? error.message : "Unknown error",
          processedAt: new Date(),
        });

        await updateJobProgress(jobId);
        processedSinceLastSync++;
      }
    }

    // Final sync to ensure all results are in the list
    await createResultList(jobId);

    await scrapeJobRepository.update(jobId, {
      status: ScrapeJobStatus.COMPLETED,
      completedAt: new Date(),
    });

    logger.info({ jobId }, "Scrape job completed");
  } catch (error) {
    logger.error({ error, jobId }, "Scrape job failed");

    // Mark any items stuck in 'processing' as failed
    await scrapeJobRepository.failStuckItems(jobId);

    // Try to sync any results we have before marking as failed
    try {
      await createOrUpdateResultList(jobId);
    } catch (syncError) {
      logger.error({ error: syncError, jobId }, "Failed to sync results before marking job as failed");
    }

    await scrapeJobRepository.update(jobId, {
      status: ScrapeJobStatus.FAILED,
      completedAt: new Date(),
    });

    throw error;
  }
};

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
