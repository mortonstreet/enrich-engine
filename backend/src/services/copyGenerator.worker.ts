import * as copyGeneratorJobRepository from "@/repositories/copyGeneratorJob.repository";
import * as vendorApiKeyRepository from "@/repositories/vendorApiKey.repository";
import * as leadRepository from "@/repositories/lead.repository";
import { decrypt } from "@/lib/encryption";
import { generateFirstLine } from "@/clients/openrouter.client";
import logger from "@/lib/logger";
import { sendPusherEvent } from "@/lib/pusher";

const BATCH_SIZE = 50;
const RATE_LIMIT_DELAY_MS = 200;

export async function processCopyGeneratorJob(jobId: string): Promise<void> {
  logger.info({ jobId }, "Copy generator worker: Starting job processing");

  // Get job details
  const job = await copyGeneratorJobRepository.findJobById(jobId);
  if (!job) {
    logger.error({ jobId }, "Copy generator worker: Job not found");
    throw new Error(`Job not found: ${jobId}`);
  }
  logger.info(
    {
      jobId,
      organizationId: job.organizationId,
      listId: job.listId,
      totalRows: job.totalRows,
      userPromptLength: job.userPrompt?.length,
    },
    "Copy generator worker: Job found"
  );

  // Get OpenRouter API key
  logger.info(
    { jobId, organizationId: job.organizationId },
    "Copy generator worker: Looking up OpenRouter API key"
  );
  const apiKeyRecord = await vendorApiKeyRepository.findByOrgAndVendor(
    job.organizationId,
    "openrouter"
  );
  if (!apiKeyRecord) {
    logger.error(
      { jobId, organizationId: job.organizationId },
      "Copy generator worker: OpenRouter API key not configured"
    );
    throw new Error("OpenRouter API key not configured");
  }
  logger.info(
    {
      jobId,
      apiKeyId: apiKeyRecord.id,
      keyCreatedAt: apiKeyRecord.createdAt,
    },
    "Copy generator worker: OpenRouter API key record found"
  );

  let apiKey: string;
  try {
    apiKey = decrypt(apiKeyRecord.encryptedKey);
    logger.info(
      {
        jobId,
        keyLength: apiKey.length,
        keyPrefix: apiKey.substring(0, 10) + "...",
      },
      "Copy generator worker: API key decrypted successfully"
    );
  } catch (decryptError) {
    logger.error(
      { error: decryptError, jobId },
      "Copy generator worker: Failed to decrypt API key"
    );
    throw new Error("Failed to decrypt OpenRouter API key");
  }

  // Update job status to processing
  await copyGeneratorJobRepository.updateJob(jobId, { status: "processing" });
  logger.info({ jobId }, "Copy generator worker: Job status set to processing");

  // Notify via Pusher
  await sendJobProgressUpdate(job.organizationId, jobId, {
    status: "processing",
    processedRows: 0,
    totalRows: job.totalRows,
  });

  // Process items in batches
  let hasMore = true;
  let processedCount = 0;

  logger.info({ jobId }, "Copy generator worker: Starting item processing loop");

  while (hasMore) {
    const items = await copyGeneratorJobRepository.findPendingItems(
      jobId,
      BATCH_SIZE
    );

    logger.info(
      { jobId, pendingItemsCount: items.length },
      "Copy generator worker: Fetched pending items"
    );

    if (items.length === 0) {
      hasMore = false;
      logger.info({ jobId }, "Copy generator worker: No more pending items, exiting loop");
      continue;
    }

    for (const item of items) {
      try {
        // Mark as processing
        await copyGeneratorJobRepository.updateItem(item.id, {
          status: "processing",
        });

        logger.info(
          {
            jobId,
            itemId: item.id,
            leadId: item.leadId,
            firstName: item.firstName,
            lastName: item.lastName,
            company: item.company,
          },
          "Copy generator worker: Processing item, calling OpenRouter API"
        );

        // Generate first line
        const result = await generateFirstLine(
          {
            firstName: item.firstName,
            lastName: item.lastName,
            role: item.role,
            company: item.company,
            linkedinUrl: item.linkedinUrl,
            userPrompt: job.userPrompt,
          },
          apiKey
        );

        logger.info(
          {
            jobId,
            itemId: item.id,
            tokensUsed: result.tokensUsed,
            lineLength: result.generatedLine?.length,
          },
          "Copy generator worker: OpenRouter API call successful"
        );

        // Update item
        await copyGeneratorJobRepository.updateItem(item.id, {
          status: "completed",
          generatedLine: result.generatedLine,
          tokensUsed: result.tokensUsed,
          openrouterResponse: result.rawResponse as object,
          processedAt: new Date(),
        });

        // Update lead with the generated first line
        await leadRepository.update(item.leadId, {
          firstLine: result.generatedLine,
        });

        // Increment job progress
        await copyGeneratorJobRepository.incrementJobProgress(
          jobId,
          true,
          result.tokensUsed
        );

        processedCount++;

        // Send progress update every 10 items
        if (processedCount % 10 === 0) {
          const updatedJob = await copyGeneratorJobRepository.findJobById(jobId);
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
          "Failed to process copy generator item"
        );

        // Update item as failed
        await copyGeneratorJobRepository.updateItem(item.id, {
          status: "failed",
          errorMessage:
            error instanceof Error ? error.message : "Unknown error",
          processedAt: new Date(),
        });

        // Increment error count
        await copyGeneratorJobRepository.incrementJobProgress(jobId, false);

        processedCount++;
      }
    }
  }

  // Mark job as completed
  await copyGeneratorJobRepository.updateJob(jobId, {
    status: "completed",
    completedAt: new Date(),
  });

  // Final progress update
  const finalJob = await copyGeneratorJobRepository.findJobById(jobId);
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
    { jobId, processedCount },
    "Copy generator job processing completed"
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
      "copy-generator-progress",
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
