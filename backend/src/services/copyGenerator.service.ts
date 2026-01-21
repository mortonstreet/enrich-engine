import * as copyGeneratorJobRepository from "@/repositories/copyGeneratorJob.repository";
import * as vendorApiKeyRepository from "@/repositories/vendorApiKey.repository";
import * as listRepository from "@/repositories/list.repository";
import * as leadRepository from "@/repositories/lead.repository";
import { decrypt } from "@/lib/encryption";
import { addCopyGeneratorJob } from "@/queues/copyGenerator.queue";
import { generateFirstLine } from "@/clients/openrouter.client";
import logger from "@/lib/logger";
import {
  CopyGeneratorJobResponse,
  CopyGeneratorJobsListResponse,
  CopyGeneratorJobDetailResponse,
  CopyGeneratorJobStatus,
  ListsForCopyGeneratorResponse,
  PreviewCopyGeneratorResponse,
} from "@shared/types/src";

// ============================================
// List Selection for Copy Generator
// ============================================

export async function getListsForCopyGenerator(
  organizationId: string
): Promise<ListsForCopyGeneratorResponse> {
  const lists = await listRepository.findListsByOrganizationId(organizationId);

  const listsWithStats = await Promise.all(
    lists.map(async (list) => {
      const leadsWithoutFirstLine =
        await copyGeneratorJobRepository.countLeadsWithoutFirstLine(list.id);

      return {
        id: list.id,
        name: list.name,
        leadCount: list.leadCount,
        totalLeads: list.leadCount, // Alias for consistency
        source: list.source as "uploaded" | "scraped",
        createdAt: list.createdAt.toISOString(),
        leadsWithoutFirstLine,
      };
    })
  );

  return { lists: listsWithStats };
}

// ============================================
// Job Management
// ============================================

export async function createCopyGeneratorJob(
  organizationId: string,
  userId: string,
  listId: string,
  userPrompt: string
): Promise<CopyGeneratorJobResponse> {
  logger.info(
    { organizationId, userId, listId, userPromptLength: userPrompt.length },
    "Creating copy generator job - START"
  );

  // Verify list exists and belongs to org
  const list = await listRepository.findListById(listId);
  if (!list || list.organizationId !== organizationId) {
    logger.warn({ listId, organizationId }, "Copy generator job failed: List not found");
    throw new Error("List not found");
  }
  logger.info({ listId, listName: list.name }, "Copy generator job: List verified");

  // Check for OpenRouter API key
  logger.info({ organizationId }, "Copy generator job: Checking for OpenRouter API key");
  const apiKeyRecord = await vendorApiKeyRepository.findByOrgAndVendor(
    organizationId,
    "openrouter"
  );
  if (!apiKeyRecord) {
    logger.warn(
      { organizationId },
      "Copy generator job failed: OpenRouter API key not configured"
    );
    throw new Error("OpenRouter API key not configured");
  }
  logger.info(
    {
      organizationId,
      apiKeyId: apiKeyRecord.id,
      keyCreatedAt: apiKeyRecord.createdAt,
      keyUpdatedAt: apiKeyRecord.updatedAt,
    },
    "Copy generator job: OpenRouter API key found"
  );

  // Verify the API key can be decrypted
  try {
    const decryptedKey = decrypt(apiKeyRecord.encryptedKey);
    logger.info(
      {
        organizationId,
        keyLength: decryptedKey.length,
        keyPrefix: decryptedKey.substring(0, 10) + "...",
      },
      "Copy generator job: OpenRouter API key decrypted successfully"
    );
  } catch (decryptError) {
    logger.error(
      { error: decryptError, organizationId },
      "Copy generator job failed: Could not decrypt OpenRouter API key"
    );
    throw new Error("OpenRouter API key could not be decrypted. Please re-enter your API key.");
  }

  // Get leads that need first lines
  const leads = await copyGeneratorJobRepository.findLeadsWithoutFirstLine(
    listId
  );
  logger.info({ listId, leadsCount: leads.length }, "Copy generator job: Found leads needing first lines");

  if (leads.length === 0) {
    throw new Error("All leads in this list already have first lines generated");
  }

  // Create the job
  const job = await copyGeneratorJobRepository.createJob({
    organizationId,
    userId,
    listId,
    userPrompt,
    totalRows: leads.length,
  });

  if (!job) {
    logger.error({ organizationId, listId }, "Copy generator job failed: Could not create job record");
    throw new Error("Failed to create copy generator job");
  }
  logger.info({ jobId: job.id, totalRows: job.totalRows }, "Copy generator job: Job record created");

  // Create job items for each lead
  const items = leads.map((lead) => ({
    jobId: job.id,
    leadId: lead.id,
  }));

  await copyGeneratorJobRepository.createJobItems(items);
  logger.info({ jobId: job.id, itemsCount: items.length }, "Copy generator job: Job items created");

  // Queue the job for processing
  try {
    logger.info({ jobId: job.id }, "Copy generator job: Queueing job for processing");
    await addCopyGeneratorJob(job.id);
    logger.info({ jobId: job.id }, "Copy generator job: Successfully queued for processing");
  } catch (queueError) {
    logger.error({ queueError, jobId: job.id }, "Failed to queue copy generator job");
    throw new Error("Failed to queue job for processing");
  }

  return {
    id: job.id,
    listId: job.listId,
    listName: list.name,
    userPrompt: job.userPrompt,
    status: job.status as CopyGeneratorJobStatus,
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

export async function getCopyGeneratorJobs(
  organizationId: string,
  options: { page: number; limit: number; status?: CopyGeneratorJobStatus }
): Promise<CopyGeneratorJobsListResponse> {
  const result = await copyGeneratorJobRepository.findJobsByOrganization(
    organizationId,
    options
  );

  const jobs = result.data.map((job) => ({
    id: job.id,
    listId: job.listId,
    listName: job.listName ?? "Unknown List",
    userPrompt: job.userPrompt,
    status: job.status as CopyGeneratorJobStatus,
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
      page: result.pagination.page,
      limit: result.pagination.limit,
      total: result.pagination.total,
      totalPages: result.pagination.totalPages,
    },
  };
}

export async function getCopyGeneratorJob(
  organizationId: string,
  jobId: string
): Promise<CopyGeneratorJobDetailResponse | null> {
  const job = await copyGeneratorJobRepository.findJobByIdWithList(jobId);
  if (!job || job.organizationId !== organizationId) {
    return null;
  }

  const items = await copyGeneratorJobRepository.findItemsByJobId(jobId);

  return {
    job: {
      id: job.id,
      listId: job.listId,
      listName: job.listName ?? "Unknown List",
      userPrompt: job.userPrompt,
      status: job.status as CopyGeneratorJobStatus,
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
    items: items.map((item) => ({
      id: item.id,
      leadId: item.leadId,
      leadFirstName: item.leadFirstName,
      leadLastName: item.leadLastName,
      leadCompany: item.leadCompany,
      status: item.status as any,
      generatedLine: item.generatedLine,
      tokensUsed: item.tokensUsed,
      errorMessage: item.errorMessage,
      createdAt: item.createdAt.toISOString(),
      processedAt: item.processedAt?.toISOString() ?? null,
    })),
  };
}

export async function deleteCopyGeneratorJob(
  organizationId: string,
  jobId: string
): Promise<boolean> {
  const job = await copyGeneratorJobRepository.findJobById(jobId);
  if (!job || job.organizationId !== organizationId) {
    return false;
  }

  await copyGeneratorJobRepository.deleteJob(jobId);
  return true;
}

// ============================================
// Preview
// ============================================

export async function previewFirstLine(
  organizationId: string,
  leadId: string,
  userPrompt: string
): Promise<PreviewCopyGeneratorResponse> {
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

  // Generate first line
  const result = await generateFirstLine(
    {
      firstName: lead.firstName,
      lastName: lead.lastName,
      role: lead.role,
      company: lead.company,
      linkedinUrl: lead.linkedinUrl,
      userPrompt,
    },
    apiKey
  );

  return {
    generatedLine: result.generatedLine,
    tokensUsed: result.tokensUsed,
  };
}
