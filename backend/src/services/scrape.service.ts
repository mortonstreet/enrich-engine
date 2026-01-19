import * as scrapeJobRepository from "@/repositories/scrapeJob.repository";
import * as listRepository from "@/repositories/list.repository";
import * as leadRepository from "@/repositories/lead.repository";
import * as serperClient from "@/clients/serper.client";
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

export const validateCSVColumns = (columns: string[]): CSVColumnValidation => {
  const normalizedColumns = columns.map((c) => c.toLowerCase().trim());

  const hasNameColumns = NAME_REQUIRED_COLUMNS.every((col) =>
    normalizedColumns.includes(col)
  );
  const hasRoleColumns = normalizedColumns.includes("company") &&
    ROLE_COLUMNS.some((col) => normalizedColumns.includes(col));

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

  // Expand rows with multiple role columns into separate items, with deduplication
  const items: Array<{
    jobId: string;
    rowIndex: number;
    inputData: Record<string, string>;
    status: ScrapeItemStatus;
  }> = [];
  const seenKeys = new Set<string>();

  if (inputType === ScrapeInputType.ROLE) {
    rows.forEach((row) => {
      const roles = getRolesFromRow(row);
      roles.forEach((role) => {
        const inputData = { ...row, role } as Record<string, string>;
        const dedupeKey = getDedupeKey(inputData, inputType);

        // Skip if we've already seen this company+role combination
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
    });
  } else {
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

        if (job.inputType === ScrapeInputType.NAME) {
          query = serperClient.buildNameQuery(
            inputData.first_name || "",
            inputData.last_name || "",
            inputData.company
          );
        } else {
          query = serperClient.buildRoleQuery(
            inputData.company || "",
            inputData.role || ""
          );
        }

        const { linkedinUrl, firstName, lastName, rawResponse } = await serperClient.searchLinkedIn(query);

        // Store the extracted name from search results (useful for role-based searches)
        const updatedInputData = { ...inputData };
        if (firstName && !inputData.first_name) {
          updatedInputData.first_name = firstName;
        }
        if (lastName && !inputData.last_name) {
          updatedInputData.last_name = lastName;
        }

        await scrapeJobRepository.updateItem(item.id, {
          status: linkedinUrl ? ScrapeItemStatus.COMPLETED : ScrapeItemStatus.NO_RESULT,
          linkedinUrl,
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

    const successfulItems = items.filter(
      (item) => item.status === ScrapeItemStatus.COMPLETED && item.linkedinUrl
    );

    logger.info(
      { jobId, totalItems: items.length, successfulItems: successfulItems.length },
      "Creating/updating result list"
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
): Promise<{ fileName: string; rows: Record<string, string>[] }> => {
  const { job, items } = await scrapeJobRepository.findByIdWithItems(jobId);

  if (!job) {
    throw new Error("Scrape job not found");
  }

  if (job.organizationId !== organizationId) {
    throw new Error("Unauthorized access to scrape job");
  }

  const rows = items.map((item) => {
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
