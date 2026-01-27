import * as personalizationJobRepository from "@/repositories/personalizationJob.repository";
import * as vendorApiKeyRepository from "@/repositories/vendorApiKey.repository";
import * as leadRepository from "@/repositories/lead.repository";
import { decrypt } from "@/lib/encryption";
import {
  generateAllColumns,
  ColumnConfig,
  ICPContext,
} from "@/clients/openrouter.client";
import logger from "@/lib/logger";
import { sendPusherEvent } from "@/lib/pusher";

const BATCH_SIZE = 50;
const RATE_LIMIT_DELAY_MS = 200;

export async function processPersonalizationJob(jobId: string): Promise<void> {
  logger.info({ jobId }, "Personalization worker: Starting job processing");

  // Get job details
  const job = await personalizationJobRepository.findJobById(jobId);
  if (!job) {
    logger.error({ jobId }, "Personalization worker: Job not found");
    throw new Error(`Job not found: ${jobId}`);
  }

  // Parse column configs
  const columnConfigs: ColumnConfig[] =
    typeof job.columnConfigs === "string"
      ? JSON.parse(job.columnConfigs)
      : (job.columnConfigs as ColumnConfig[]);

  logger.info(
    {
      jobId,
      organizationId: job.organizationId,
      listId: job.listId,
      totalRows: job.totalRows,
      columnCount: columnConfigs.length,
      useIcpContext: job.useIcpContext,
    },
    "Personalization worker: Job details"
  );

  // Get OpenRouter API key
  const apiKeyRecord = await vendorApiKeyRepository.findByOrgAndVendor(
    job.organizationId,
    "openrouter"
  );
  if (!apiKeyRecord) {
    throw new Error("OpenRouter API key not configured");
  }

  const apiKey = decrypt(apiKeyRecord.encryptedKey);

  // Update job status to processing
  await personalizationJobRepository.updateJob(jobId, { status: "processing" });

  await sendJobProgressUpdate(job.organizationId, jobId, {
    status: "processing",
    processedRows: 0,
    totalRows: job.totalRows,
  });

  // Process items in batches
  let hasMore = true;
  let processedCount = 0;
  let totalTokensUsed = 0;

  while (hasMore) {
    const items = await personalizationJobRepository.findPendingItems(
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
        await personalizationJobRepository.updateItem(item.id, {
          status: "processing",
        });

        // Get lead details
        const lead = await leadRepository.findById(item.leadId);
        if (!lead) {
          throw new Error(`Lead not found: ${item.leadId}`);
        }

        // Get ICP context if enabled and available
        let icpContext: ICPContext | null = null;
        if (job.useIcpContext && lead.icpContext) {
          icpContext = lead.icpContext as unknown as ICPContext;
        }

        // Generate all columns for this lead
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

        // Map generated results to lead fields
        const leadUpdate: Record<string, unknown> = {};
        const generatedColumns: Record<string, string> = {};

        for (const config of columnConfigs) {
          const content = result.results[config.columnName];
          if (!content) continue;

          generatedColumns[config.columnName] = content;

          // Map to standard fields if applicable
          switch (config.columnType) {
            case "subject":
              leadUpdate.subject = content;
              break;
            case "firstLine":
              leadUpdate.firstLine = content;
              break;
            case "openingParagraph":
              leadUpdate.openingParagraph = content;
              break;
            case "followUp1":
              leadUpdate.followUp1 = content;
              break;
            case "followUp2":
              leadUpdate.followUp2 = content;
              break;
            case "followUp3":
              leadUpdate.followUp3 = content;
              break;
            case "callToAction":
              leadUpdate.callToAction = content;
              break;
            case "custom":
              // Store in personalizedFields JSON
              const existing = (lead.personalizedFields || {}) as Record<string, unknown>;
              leadUpdate.personalizedFields = {
                ...existing,
                [config.columnName]: content,
              };
              break;
          }
        }

        // Update lead with generated content
        if (Object.keys(leadUpdate).length > 0) {
          await leadRepository.update(item.leadId, leadUpdate);
        }

        // Update item as completed
        await personalizationJobRepository.updateItem(item.id, {
          status: "completed",
          generatedColumns: generatedColumns as unknown as Record<string, unknown>,
          tokensUsed: result.totalTokensUsed,
          processedAt: new Date(),
        });

        // Update job progress
        await personalizationJobRepository.incrementJobProgress(
          jobId,
          true,
          result.totalTokensUsed
        );

        totalTokensUsed += result.totalTokensUsed;
        processedCount++;

        logger.debug(
          {
            itemId: item.id,
            leadId: item.leadId,
            columnsGenerated: Object.keys(generatedColumns).length,
            tokensUsed: result.totalTokensUsed,
          },
          "Lead personalization completed"
        );

        // Send progress update every 10 items
        if (processedCount % 10 === 0) {
          const updatedJob = await personalizationJobRepository.findJobById(jobId);
          if (updatedJob) {
            await sendJobProgressUpdate(job.organizationId, jobId, {
              status: "processing",
              processedRows: updatedJob.processedRows,
              successCount: updatedJob.successCount,
              errorCount: updatedJob.errorCount,
              totalRows: updatedJob.totalRows,
              tokensUsed: updatedJob.tokensUsed,
            });
          }
        }

        // Rate limiting
        await new Promise((resolve) => setTimeout(resolve, RATE_LIMIT_DELAY_MS));
      } catch (error) {
        logger.error(
          { error, itemId: item.id, leadId: item.leadId },
          "Failed to process personalization item"
        );

        await personalizationJobRepository.updateItem(item.id, {
          status: "failed",
          errorMessage:
            error instanceof Error ? error.message : "Unknown error",
          processedAt: new Date(),
        });

        await personalizationJobRepository.incrementJobProgress(jobId, false);
        processedCount++;
      }
    }
  }

  // Mark job as completed
  await personalizationJobRepository.updateJob(jobId, {
    status: "completed",
    completedAt: new Date(),
  });

  // Final progress update
  const finalJob = await personalizationJobRepository.findJobById(jobId);
  if (finalJob) {
    await sendJobProgressUpdate(job.organizationId, jobId, {
      status: "completed",
      processedRows: finalJob.processedRows,
      successCount: finalJob.successCount,
      errorCount: finalJob.errorCount,
      totalRows: finalJob.totalRows,
      tokensUsed: finalJob.tokensUsed,
    });
  }

  logger.info(
    { jobId, processedCount, totalTokensUsed },
    "Personalization job processing completed"
  );
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
    tokensUsed?: number;
  }
) {
  try {
    await sendPusherEvent(
      `private-org-${organizationId}`,
      "personalization-progress",
      {
        jobId,
        ...data,
      }
    );
  } catch (error) {
    logger.warn(
      { error, organizationId, jobId },
      "Failed to send Pusher progress update"
    );
  }
}
