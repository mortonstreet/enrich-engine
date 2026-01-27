import * as personalizationJobRepository from "@/repositories/personalizationJob.repository";
import * as vendorApiKeyRepository from "@/repositories/vendorApiKey.repository";
import * as listRepository from "@/repositories/list.repository";
import * as leadRepository from "@/repositories/lead.repository";
import { decrypt } from "@/lib/encryption";
import { addPersonalizationJob } from "@/queues/personalization.queue";
import {
  generateAllColumns,
  ColumnConfig,
  ICPContext,
} from "@/clients/openrouter.client";
import logger from "@/lib/logger";
import {
  PersonalizationJobResponse,
  PersonalizationJobsListResponse,
  PersonalizationJobDetailResponse,
  PersonalizationJobStatus,
  PreviewPersonalizationResponse,
} from "@shared/types/src/requests/personalization";

// ============================================
// Job Management
// ============================================

export async function createPersonalizationJob(
  organizationId: string,
  userId: string,
  listId: string,
  columnConfigs: ColumnConfig[],
  useIcpContext: boolean
): Promise<PersonalizationJobResponse> {
  logger.info(
    { organizationId, userId, listId, columnCount: columnConfigs.length, useIcpContext },
    "Creating personalization job"
  );

  // Verify list exists and belongs to org
  const list = await listRepository.findListById(listId);
  if (!list || list.organizationId !== organizationId) {
    throw new Error("List not found");
  }

  // Check for OpenRouter API key
  const apiKeyRecord = await vendorApiKeyRepository.findByOrgAndVendor(
    organizationId,
    "openrouter"
  );
  if (!apiKeyRecord) {
    throw new Error("OpenRouter API key not configured");
  }

  // Verify the API key can be decrypted
  try {
    decrypt(apiKeyRecord.encryptedKey);
  } catch {
    throw new Error("OpenRouter API key could not be decrypted");
  }

  // Get all leads from the list
  const leads = await leadRepository.findAllByListId(listId);
  if (leads.length === 0) {
    throw new Error("No leads in this list");
  }

  // Create the job
  const job = await personalizationJobRepository.createJob({
    organizationId,
    userId,
    listId,
    columnConfigs,
    useIcpContext,
    totalRows: leads.length,
  });

  if (!job) {
    throw new Error("Failed to create personalization job");
  }

  // Create job items for each lead
  const items = leads.map((lead) => ({
    jobId: job.id,
    leadId: lead.id,
  }));

  await personalizationJobRepository.bulkCreateItems(items);

  // Queue the job for processing
  try {
    await addPersonalizationJob(job.id);
    logger.info({ jobId: job.id }, "Personalization job queued");
  } catch (queueError) {
    logger.error({ queueError, jobId: job.id }, "Failed to queue personalization job");
    throw new Error("Failed to queue job for processing");
  }

  return {
    id: job.id,
    listId: job.listId,
    listName: list.name,
    columnConfigs,
    useIcpContext: job.useIcpContext,
    status: job.status as PersonalizationJobStatus,
    totalRows: job.totalRows,
    processedRows: job.processedRows,
    successCount: job.successCount,
    errorCount: job.errorCount,
    tokensUsed: job.tokensUsed,
    estimatedCost: job.estimatedCost,
    createdAt: job.createdAt.toISOString(),
    updatedAt: job.updatedAt.toISOString(),
    completedAt: job.completedAt?.toISOString() ?? null,
  };
}

export async function getPersonalizationJobs(
  organizationId: string,
  options: { page: number; limit: number; status?: PersonalizationJobStatus }
): Promise<PersonalizationJobsListResponse> {
  const allJobs = await personalizationJobRepository.findByOrganization(organizationId);

  // Filter by status if provided
  let filteredJobs = allJobs;
  if (options.status) {
    filteredJobs = allJobs.filter((j) => j.status === options.status);
  }

  // Paginate
  const total = filteredJobs.length;
  const totalPages = Math.ceil(total / options.limit);
  const start = (options.page - 1) * options.limit;
  const pagedJobs = filteredJobs.slice(start, start + options.limit);

  // Get list names
  const listIds = [...new Set(pagedJobs.map((j) => j.listId))];
  const lists = await Promise.all(listIds.map((id) => listRepository.findListById(id)));
  const listMap = new Map(lists.filter((l) => l).map((l) => [l!.id, l!.name]));

  const jobs = pagedJobs.map((job) => ({
    id: job.id,
    listId: job.listId,
    listName: listMap.get(job.listId) ?? "Unknown List",
    columnConfigs:
      typeof job.columnConfigs === "string"
        ? JSON.parse(job.columnConfigs)
        : job.columnConfigs,
    useIcpContext: job.useIcpContext,
    status: job.status as PersonalizationJobStatus,
    totalRows: job.totalRows,
    processedRows: job.processedRows,
    successCount: job.successCount,
    errorCount: job.errorCount,
    tokensUsed: job.tokensUsed,
    estimatedCost: job.estimatedCost,
    createdAt: job.createdAt.toISOString(),
    updatedAt: job.updatedAt.toISOString(),
    completedAt: job.completedAt?.toISOString() ?? null,
  }));

  return {
    jobs,
    pagination: {
      page: options.page,
      limit: options.limit,
      total,
      totalPages,
    },
  };
}

export async function getPersonalizationJob(
  organizationId: string,
  jobId: string
): Promise<PersonalizationJobDetailResponse | null> {
  const job = await personalizationJobRepository.findJobById(jobId);
  if (!job || job.organizationId !== organizationId) {
    return null;
  }

  const list = await listRepository.findListById(job.listId);
  const items = await personalizationJobRepository.findItemsByJobId(jobId);

  // Get lead details for items
  const leadIds = items.map((i) => i.leadId);
  const leads = await leadRepository.findByIds(leadIds, organizationId);
  const leadMap = new Map(leads.map((l) => [l.id, l]));

  return {
    job: {
      id: job.id,
      listId: job.listId,
      listName: list?.name ?? "Unknown List",
      columnConfigs:
        typeof job.columnConfigs === "string"
          ? JSON.parse(job.columnConfigs)
          : job.columnConfigs,
      useIcpContext: job.useIcpContext,
      status: job.status as PersonalizationJobStatus,
      totalRows: job.totalRows,
      processedRows: job.processedRows,
      successCount: job.successCount,
      errorCount: job.errorCount,
      tokensUsed: job.tokensUsed,
      estimatedCost: job.estimatedCost,
      createdAt: job.createdAt.toISOString(),
      updatedAt: job.updatedAt.toISOString(),
      completedAt: job.completedAt?.toISOString() ?? null,
    },
    items: items.map((item) => {
      const lead = leadMap.get(item.leadId);
      return {
        id: item.id,
        leadId: item.leadId,
        leadFirstName: lead?.firstName ?? null,
        leadLastName: lead?.lastName ?? null,
        leadCompany: lead?.company ?? null,
        status: item.status as any,
        generatedColumns: item.generatedColumns as Record<string, string> | null,
        tokensUsed: item.tokensUsed,
        errorMessage: item.errorMessage,
        createdAt: item.createdAt.toISOString(),
        processedAt: item.processedAt?.toISOString() ?? null,
      };
    }),
  };
}

export async function deletePersonalizationJob(
  organizationId: string,
  jobId: string
): Promise<boolean> {
  const job = await personalizationJobRepository.findJobById(jobId);
  if (!job || job.organizationId !== organizationId) {
    return false;
  }

  await personalizationJobRepository.deleteJobById(jobId);
  return true;
}

// ============================================
// Preview
// ============================================

export async function previewPersonalization(
  organizationId: string,
  leadId: string,
  columnConfigs: ColumnConfig[],
  useIcpContext: boolean
): Promise<PreviewPersonalizationResponse> {
  // Get OpenRouter API key
  const apiKeyRecord = await vendorApiKeyRepository.findByOrgAndVendor(
    organizationId,
    "openrouter"
  );
  if (!apiKeyRecord) {
    throw new Error("OpenRouter API key not configured");
  }

  const apiKey = decrypt(apiKeyRecord.encryptedKey);

  // Get lead details
  const lead = await leadRepository.findById(leadId);
  if (!lead) {
    throw new Error("Lead not found");
  }

  // Get ICP context if enabled
  let icpContext: ICPContext | null = null;
  if (useIcpContext && lead.icpContext) {
    icpContext = lead.icpContext as unknown as ICPContext;
  }

  // Generate all columns
  const result = await generateAllColumns(
    {
      firstName: lead.firstName,
      lastName: lead.lastName,
      role: lead.role,
      company: lead.company,
      linkedinUrl: lead.linkedinUrl,
      icpContext,
    },
    columnConfigs,
    apiKey
  );

  return {
    generatedColumns: result.results,
    tokensUsed: result.totalTokensUsed,
  };
}
