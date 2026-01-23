import * as enrichmentRepository from "@/repositories/enrichment.repository";
import * as bulkEnrichmentRepository from "@/repositories/bulkEnrichment.repository";
import * as prospeoClient from "@/clients/prospeo.client";
import {
  EnrichPersonRequest,
  GetEnrichmentHistoryRequest,
  EnrichmentStatus,
  BulkJobStatus,
  BulkItemStatus,
  BulkJobType,
  EnrichPersonResponse,
  EnrichmentHistoryResponse,
  BulkEnrichResponse,
  BulkJobStatusResponse,
} from "@shared/types/src";
import logger from "@/lib/logger";
import * as searchService from "@/services/search.service";

export const enrichPerson = async (
  organizationId: string,
  userId: string,
  request: EnrichPersonRequest,
): Promise<EnrichPersonResponse> => {
  // Create pending enrichment record
  const enrichment = await enrichmentRepository.create({
    organizationId,
    userId,
    linkedinUrl: request.linkedinUrl,
    status: EnrichmentStatus.PENDING,
    enrichMobile: request.enrichMobile,
  });

  if (!enrichment) {
    throw new Error("Failed to create enrichment record");
  }

  try {
    // Call Prospeo API
    const result = await prospeoClient.enrichPerson(
      request.linkedinUrl,
      request.enrichMobile,
    );

    if (result.success && result.response) {
      // Update with successful result
      const updated = await enrichmentRepository.update(enrichment.id, {
        status: EnrichmentStatus.COMPLETED,
        email: result.response.email?.email,
        emailVerified: result.response.email?.verified,
        mobile: result.response.mobile,
        firstName: result.response.first_name,
        lastName: result.response.last_name,
        title: result.response.title,
        companyName: result.response.company_name,
        companyDomain: result.response.company_domain,
        rawResponse: result,
        creditsCost: result.credits_used ?? 1,
        completedAt: new Date(),
      });

      return updated!;
    } else {
      // Update with not found or error
      const status =
        result.error_code === "not_found"
          ? EnrichmentStatus.NOT_FOUND
          : EnrichmentStatus.ERROR;

      const updated = await enrichmentRepository.update(enrichment.id, {
        status,
        errorCode: result.error_code || result.error,
        rawResponse: result,
        completedAt: new Date(),
      });

      return updated!;
    }
  } catch (error) {
    logger.error({ error, enrichmentId: enrichment.id }, "Enrichment failed");

    // Update with error status
    const updated = await enrichmentRepository.update(enrichment.id, {
      status: EnrichmentStatus.ERROR,
      errorCode: error instanceof Error ? error.message : "Unknown error",
      completedAt: new Date(),
    });

    return updated!;
  }
};

export const getEnrichmentHistory = async (
  organizationId: string,
  params: GetEnrichmentHistoryRequest,
): Promise<EnrichmentHistoryResponse> => {
  return enrichmentRepository.findByOrganizationId(organizationId, {
    page: params.page,
    limit: params.limit,
    status: params.status,
  });
};

export const createBulkJob = async (
  organizationId: string,
  userId: string,
  fileName: string,
  linkedinUrls: Array<{ identifier: string; linkedinUrl: string }>,
  enrichMobile: boolean = true,
  jobType: string = BulkJobType.LINKEDIN,
): Promise<BulkEnrichResponse> => {
  // Create the job
  const job = await bulkEnrichmentRepository.createJob({
    organizationId,
    userId,
    status: BulkJobStatus.PENDING,
    jobType,
    totalRecords: linkedinUrls.length,
    processedRecords: 0,
    matchedRecords: 0,
    failedRecords: 0,
    originalFileName: fileName,
    totalCreditsCost: 0,
    enrichMobile,
  });

  if (!job) {
    throw new Error("Failed to create bulk enrichment job");
  }

  // Create items
  const items = linkedinUrls.map((item) => ({
    jobId: job.id,
    identifier: item.identifier,
    linkedinUrl: item.linkedinUrl,
    status: BulkItemStatus.PENDING,
  }));

  await bulkEnrichmentRepository.createItems(items);

  return {
    job,
    message: `Bulk enrichment job created with ${linkedinUrls.length} records`,
  };
};

export const createPeopleSearchBulkJob = async (
  organizationId: string,
  userId: string,
  fileName: string,
  searchItems: Array<{
    identifier: string;
    company?: string;
    domain?: string;
    roles: string[];
  }>,
  enrichMobile: boolean = true,
): Promise<BulkEnrichResponse> => {
  // Calculate total records: each company/domain + role combination is one record
  const totalRecords = searchItems.reduce(
    (acc, item) => acc + item.roles.length,
    0,
  );

  // Create the job
  const job = await bulkEnrichmentRepository.createJob({
    organizationId,
    userId,
    status: BulkJobStatus.PENDING,
    jobType: BulkJobType.PEOPLE_SEARCH,
    totalRecords,
    processedRecords: 0,
    matchedRecords: 0,
    failedRecords: 0,
    originalFileName: fileName,
    totalCreditsCost: 0,
    enrichMobile,
  });

  if (!job) {
    throw new Error("Failed to create bulk enrichment job");
  }

  // Create items - one per company/domain + role combination
  const items: Array<{
    jobId: string;
    identifier: string;
    status: string;
    inputCompany?: string | null;
    inputDomain?: string | null;
    inputRole?: string | null;
  }> = [];

  for (const item of searchItems) {
    for (const role of item.roles) {
      items.push({
        jobId: job.id,
        identifier: `${item.identifier}-${role}`,
        status: BulkItemStatus.PENDING,
        inputCompany: item.company || null,
        inputDomain: item.domain || null,
        inputRole: role,
      });
    }
  }

  await bulkEnrichmentRepository.createItems(items);

  return {
    job,
    message: `Bulk people search job created with ${totalRecords} records`,
  };
};

export const getBulkJobStatus = async (
  jobId: string,
  organizationId: string,
): Promise<BulkJobStatusResponse> => {
  const job = await bulkEnrichmentRepository.findJobById(jobId);

  if (!job) {
    throw new Error("Bulk enrichment job not found");
  }

  if (job.organizationId !== organizationId) {
    throw new Error("Unauthorized access to bulk enrichment job");
  }

  const items = await bulkEnrichmentRepository.findItemsByJobId(jobId);

  return {
    job,
    items,
  };
};

export const processBulkJob = async (jobId: string): Promise<void> => {
  const job = await bulkEnrichmentRepository.findJobById(jobId);

  if (!job) {
    throw new Error("Bulk enrichment job not found");
  }

  // Update job status to processing
  await bulkEnrichmentRepository.updateJob(jobId, {
    status: BulkJobStatus.PROCESSING,
  });

  try {
    if (job.jobType === BulkJobType.PEOPLE_SEARCH) {
      await processPeopleSearchJob(jobId, job.enrichMobile);
    } else {
      await processLinkedInJob(jobId, job.enrichMobile);
    }

    // Mark job as completed
    await bulkEnrichmentRepository.updateJob(jobId, {
      status: BulkJobStatus.COMPLETED,
      completedAt: new Date(),
    });

    logger.info({ jobId, jobType: job.jobType }, "Bulk enrichment job completed");
  } catch (error) {
    logger.error({ error, jobId }, "Bulk enrichment job failed");

    await bulkEnrichmentRepository.updateJob(jobId, {
      status: BulkJobStatus.FAILED,
      completedAt: new Date(),
    });

    throw error;
  }
};

// Process LinkedIn URL-based bulk jobs
const processLinkedInJob = async (
  jobId: string,
  enrichMobile: boolean,
): Promise<void> => {
  const BATCH_SIZE = 50;
  let hasMoreItems = true;
  let totalCredits = 0;

  while (hasMoreItems) {
    const pendingItems =
      await bulkEnrichmentRepository.findPendingItemsByJobId(
        jobId,
        BATCH_SIZE,
      );

    if (pendingItems.length === 0) {
      hasMoreItems = false;
      break;
    }

    // Prepare batch request
    const batchData = pendingItems.map((item) => ({
      identifier: item.id,
      linkedin_url: item.linkedinUrl || "",
    }));

    // Call Prospeo bulk API
    const result = await prospeoClient.bulkEnrichPersons(batchData, enrichMobile);

    if (result.success && result.response) {
      // Update each item with results
      for (const responseItem of result.response) {
        const status =
          responseItem.status === "success"
            ? BulkItemStatus.MATCHED
            : responseItem.status === "not_found"
              ? BulkItemStatus.NOT_MATCHED
              : BulkItemStatus.ERROR;

        await bulkEnrichmentRepository.updateItem(responseItem.identifier, {
          status,
          email: responseItem.email?.email,
          mobile: responseItem.mobile,
          firstName: responseItem.first_name,
          lastName: responseItem.last_name,
          title: responseItem.title,
          companyName: responseItem.company_name,
          errorCode: responseItem.error_code,
          rawResponse: responseItem,
        });
      }

      totalCredits += result.credits_used ?? pendingItems.length;
    } else {
      // Mark all items as error
      for (const item of pendingItems) {
        await bulkEnrichmentRepository.updateItem(item.id, {
          status: BulkItemStatus.ERROR,
          errorCode: result.error || "Bulk API error",
        });
      }
    }

    // Update job progress
    const stats = await bulkEnrichmentRepository.getJobStats(jobId);
    await bulkEnrichmentRepository.updateJob(jobId, {
      processedRecords: stats.processed,
      matchedRecords: stats.matched,
      failedRecords: stats.failed,
      totalCreditsCost: totalCredits,
    });
  }
};

// Process people search bulk jobs (company/domain + role)
const processPeopleSearchJob = async (
  jobId: string,
  enrichMobile: boolean,
): Promise<void> => {
  const BATCH_SIZE = 10; // Smaller batch for search + enrich
  let hasMoreItems = true;
  let totalCredits = 0;

  while (hasMoreItems) {
    const pendingItems =
      await bulkEnrichmentRepository.findPendingItemsByJobId(
        jobId,
        BATCH_SIZE,
      );

    if (pendingItems.length === 0) {
      hasMoreItems = false;
      break;
    }

    // Process each item: search for LinkedIn profile, then enrich
    for (const item of pendingItems) {
      try {
        // Mark as searching
        await bulkEnrichmentRepository.updateItem(item.id, {
          status: BulkItemStatus.SEARCHING,
        });

        // Search for LinkedIn profile
        const company = item.inputCompany || item.inputDomain || "";
        const role = item.inputRole || "";

        logger.info(
          { itemId: item.id, company, role },
          "Searching for LinkedIn profile",
        );

        const searchResult = await searchService.searchPeople({
          company,
          role,
          page: 1,
          limit: 1, // We only need the top result
        });

        if (searchResult.results.length === 0) {
          // No LinkedIn profile found
          await bulkEnrichmentRepository.updateItem(item.id, {
            status: BulkItemStatus.NOT_MATCHED,
            errorCode: "no_profile_found",
          });
          continue;
        }

        const linkedinUrl = searchResult.results[0].linkedinUrl;

        // Update item with found LinkedIn URL
        await bulkEnrichmentRepository.updateItem(item.id, {
          linkedinUrl,
        });

        // Now enrich the profile
        const enrichResult = await prospeoClient.enrichPerson(
          linkedinUrl,
          enrichMobile,
        );

        if (enrichResult.success && enrichResult.response) {
          await bulkEnrichmentRepository.updateItem(item.id, {
            status: BulkItemStatus.MATCHED,
            email: enrichResult.response.email?.email,
            mobile: enrichResult.response.mobile,
            firstName: enrichResult.response.first_name,
            lastName: enrichResult.response.last_name,
            title: enrichResult.response.title,
            companyName: enrichResult.response.company_name,
            rawResponse: enrichResult,
          });

          totalCredits += enrichResult.credits_used ?? 1;
        } else {
          const status =
            enrichResult.error_code === "not_found"
              ? BulkItemStatus.NOT_MATCHED
              : BulkItemStatus.ERROR;

          await bulkEnrichmentRepository.updateItem(item.id, {
            status,
            errorCode: enrichResult.error_code || enrichResult.error,
            rawResponse: enrichResult,
          });
        }
      } catch (error) {
        logger.error(
          { error, itemId: item.id },
          "Error processing people search item",
        );

        await bulkEnrichmentRepository.updateItem(item.id, {
          status: BulkItemStatus.ERROR,
          errorCode: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    // Update job progress
    const stats = await bulkEnrichmentRepository.getJobStats(jobId);
    await bulkEnrichmentRepository.updateJob(jobId, {
      processedRecords: stats.processed,
      matchedRecords: stats.matched,
      failedRecords: stats.failed,
      totalCreditsCost: totalCredits,
    });
  }
};
