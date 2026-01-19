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
  logger.info({ jobId }, "Starting copy generator job processing");

  // Get job details
  const job = await copyGeneratorJobRepository.findJobById(jobId);
  if (!job) {
    throw new Error(`Job not found: ${jobId}`);
  }

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
  await copyGeneratorJobRepository.updateJob(jobId, { status: "processing" });

  // Notify via Pusher
  await sendJobProgressUpdate(job.organizationId, jobId, {
    status: "processing",
    processedRows: 0,
    totalRows: job.totalRows,
  });

  // Process items in batches
  let hasMore = true;
  let processedCount = 0;

  while (hasMore) {
    const items = await copyGeneratorJobRepository.findPendingItems(
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
        await copyGeneratorJobRepository.updateItem(item.id, {
          status: "processing",
        });

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
