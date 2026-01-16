import * as enrichmentRepository from "@/repositories/enrichment.repository";
import * as bulkEnrichmentRepository from "@/repositories/bulkEnrichment.repository";
import * as prospeoClient from "@/clients/prospeo.client";
import {
  EnrichPersonRequest,
  GetEnrichmentHistoryRequest,
  EnrichmentStatus,
  BulkJobStatus,
  BulkItemStatus,
  EnrichPersonResponse,
  EnrichmentHistoryResponse,
  BulkEnrichResponse,
  BulkJobStatusResponse,
} from "@shared/types/src";
import logger from "@/lib/logger";

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
): Promise<BulkEnrichResponse> => {
  // Create the job
  const job = await bulkEnrichmentRepository.createJob({
    organizationId,
    userId,
    status: BulkJobStatus.PENDING,
    totalRecords: linkedinUrls.length,
    processedRecords: 0,
    matchedRecords: 0,
    failedRecords: 0,
    originalFileName: fileName,
    totalCreditsCost: 0,
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
    // Process in batches of 50 (Prospeo limit)
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
        linkedin_url: item.linkedinUrl,
      }));

      // Call Prospeo bulk API
      const result = await prospeoClient.bulkEnrichPersons(batchData, true);

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

    // Mark job as completed
    await bulkEnrichmentRepository.updateJob(jobId, {
      status: BulkJobStatus.COMPLETED,
      completedAt: new Date(),
    });

    logger.info({ jobId }, "Bulk enrichment job completed");
  } catch (error) {
    logger.error({ error, jobId }, "Bulk enrichment job failed");

    await bulkEnrichmentRepository.updateJob(jobId, {
      status: BulkJobStatus.FAILED,
      completedAt: new Date(),
    });

    throw error;
  }
};
