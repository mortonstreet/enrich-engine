import * as icpClassificationJobRepository from "@/repositories/icpClassificationJob.repository";
import * as vendorApiKeyRepository from "@/repositories/vendorApiKey.repository";
import * as leadRepository from "@/repositories/lead.repository";
import * as enrichedContactRepository from "@/repositories/enrichedContact.repository";
import { decrypt } from "@/lib/encryption";
import { classifyICP, ICPContext } from "@/clients/openrouter.client";
import logger from "@/lib/logger";
import { sendPusherEvent } from "@/lib/pusher";

const BATCH_SIZE = 10;
const RATE_LIMIT_DELAY_MS = 500;

export async function processIcpClassificationJob(jobId: string): Promise<void> {
  logger.info({ jobId }, "ICP classification worker: Starting job processing");

  // Get job details
  const job = await icpClassificationJobRepository.findJobById(jobId);
  if (!job) {
    logger.error({ jobId }, "ICP classification worker: Job not found");
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
  await icpClassificationJobRepository.updateJob(jobId, { status: "processing" });

  await sendJobProgressUpdate(job.organizationId, jobId, {
    status: "processing",
    processedRows: 0,
    totalRows: job.totalRows,
  });

  try {
    // Get all leads from the list
    const leads = await leadRepository.findAllByListId(job.listId);

    logger.info(
      { jobId, leadCount: leads.length },
      "ICP classification worker: Fetched leads"
    );

    let processedCount = 0;
    let successCount = 0;
    let errorCount = 0;
    let totalTokensUsed = 0;

    // Process in batches
    for (let i = 0; i < leads.length; i += BATCH_SIZE) {
      const batch = leads.slice(i, i + BATCH_SIZE);

      for (const lead of batch) {
        try {
          // Skip leads that already have ICP classification
          if (lead.icpClassifiedAt) {
            logger.debug(
              { leadId: lead.id },
              "Lead already classified, skipping"
            );
            processedCount++;
            successCount++;
            continue;
          }

          // Classify the lead
          const result = await classifyICP(
            {
              firstName: lead.firstName,
              lastName: lead.lastName,
              role: lead.role,
              company: lead.company,
              companyDomain: lead.companyDomain,
              linkedinUrl: lead.linkedinUrl,
              userPrompt: job.userPrompt,
            },
            apiKey
          );

          // Update lead with ICP data
          await leadRepository.update(lead.id, {
            icpScore: result.icpScore,
            icpContext: result.icpContext as unknown as Record<string, unknown>,
            icpClassifiedAt: new Date(),
          });

          // Also update enriched contact cache if it exists
          if (lead.linkedinUrl) {
            const enrichedContact = await enrichedContactRepository.findByLinkedinUrl(
              job.organizationId,
              lead.linkedinUrl
            );
            if (enrichedContact) {
              await enrichedContactRepository.update(enrichedContact.id, {
                icpScore: result.icpScore,
                icpContext: result.icpContext as unknown as Record<string, unknown>,
              });
            }
          }

          totalTokensUsed += result.tokensUsed;
          successCount++;

          logger.debug(
            {
              leadId: lead.id,
              icpScore: result.icpScore,
              tokensUsed: result.tokensUsed,
            },
            "Lead classified successfully"
          );
        } catch (error) {
          logger.error(
            { error, leadId: lead.id },
            "Failed to classify lead"
          );
          errorCount++;
        }

        processedCount++;

        // Update job progress
        await icpClassificationJobRepository.incrementJobProgress(
          jobId,
          errorCount === 0,
          totalTokensUsed
        );

        // Send progress update every 5 leads
        if (processedCount % 5 === 0 || processedCount === leads.length) {
          await sendJobProgressUpdate(job.organizationId, jobId, {
            status: "processing",
            processedRows: processedCount,
            successCount,
            errorCount,
            totalRows: job.totalRows,
            tokensUsed: totalTokensUsed,
          });
        }

        // Rate limiting
        await new Promise((resolve) => setTimeout(resolve, RATE_LIMIT_DELAY_MS));
      }
    }

    // Mark job as completed
    await icpClassificationJobRepository.updateJob(jobId, {
      status: "completed",
      completedAt: new Date(),
    });

    await sendJobProgressUpdate(job.organizationId, jobId, {
      status: "completed",
      processedRows: processedCount,
      successCount,
      errorCount,
      totalRows: job.totalRows,
      tokensUsed: totalTokensUsed,
    });

    logger.info(
      { jobId, processedCount, successCount, errorCount, totalTokensUsed },
      "ICP classification job completed"
    );
  } catch (error) {
    logger.error({ error, jobId }, "ICP classification job failed");

    await icpClassificationJobRepository.updateJob(jobId, {
      status: "failed",
      completedAt: new Date(),
    });

    await sendJobProgressUpdate(job.organizationId, jobId, {
      status: "failed",
      processedRows: 0,
      totalRows: job.totalRows,
    });

    throw error;
  }
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
      "icp-classification-progress",
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
