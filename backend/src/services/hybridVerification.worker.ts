import { db } from "@/lib/db";
import logger from "@/lib/logger";
import Pusher from "pusher";
import { config } from "@/config";
import { getSmtpVerifier } from "./smtp/SmtpVerifier";
import { extractDomain } from "./smtp/StaticDataService";
import type {
  SmtpVerificationResult,
  VerificationStage,
  UserDecision,
  VerificationStatus,
} from "@shared/types/src";

// ============================================
// Configuration
// ============================================

const BATCH_SIZE = 50;
const PUSHER_UPDATE_INTERVAL = 2000; // Send updates every 2 seconds

// Initialize Pusher for real-time updates
const pusher = new Pusher({
  appId: config.pusher?.appId || "",
  key: config.pusher?.key || "",
  secret: config.pusher?.secret || "",
  host: config.pusher?.host || "localhost",
  port: String(config.pusher?.port || 6001),
  useTLS: config.pusher?.useTLS || false,
});

// ============================================
// Main Job Processing Functions
// ============================================

export async function processSmtpVerification(jobId: string): Promise<void> {
  logger.info({ jobId }, "Starting SMTP verification");

  // Get job details
  const job = await db
    .selectFrom("list_enrichment_job")
    .where("id", "=", jobId)
    .selectAll()
    .executeTakeFirst();

  if (!job) {
    throw new Error(`Job not found: ${jobId}`);
  }

  // Update job status
  await updateJobStage(jobId, "smtp_verifying");

  // Get all emails to verify from the job items
  const items = await db
    .selectFrom("list_enrichment_job_item")
    .innerJoin("lead", "lead.id", "list_enrichment_job_item.leadId")
    .where("list_enrichment_job_item.jobId", "=", jobId)
    .where("lead.email", "is not", null)
    .where("lead.email", "!=", "")
    .select([
      "list_enrichment_job_item.id as itemId",
      "list_enrichment_job_item.leadId",
      "lead.email",
    ])
    .execute();

  if (items.length === 0) {
    logger.info({ jobId }, "No emails to verify");
    await updateJobStage(jobId, "completed");
    return;
  }

  logger.info({ jobId, emailCount: items.length }, "Found emails to verify");

  // Initialize SMTP verifier
  const verifier = getSmtpVerifier();

  // Track stats
  let validCount = 0;
  let invalidCount = 0;
  let catchAllCount = 0;
  let unknownCount = 0;
  let processedCount = 0;
  let lastPusherUpdate = Date.now();

  // Process in batches
  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const batch = items.slice(i, i + BATCH_SIZE);
    const emails = batch.map(item => item.email!);

    try {
      // Verify batch
      const results = await verifier.verifyBatch(emails);

      // Map results back to items and update database
      for (const result of results) {
        const item = batch.find(b => b.email?.toLowerCase() === result.email);
        if (!item) continue;

        // Update or create email validation attempt
        await db
          .insertInto("email_validation_attempt")
          .values({
            id: crypto.randomUUID(),
            jobItemId: item.itemId,
            leadId: item.leadId,
            email: result.email,
            pattern: "original",
            status: mapStatusToValidationStatus(result.status),
            verificationSource: "smtp",
            smtpCode: result.smtpCode,
            validationResponse: JSON.stringify({
              smtpMessage: result.smtpMessage,
              mxHost: result.mxHost,
              isCatchAll: result.isCatchAll,
              isDisposable: result.isDisposable,
              isRoleBased: result.isRoleBased,
              isFreeProvider: result.isFreeProvider,
              totalMs: result.totalMs,
            }),
            createdAt: new Date(),
            processedAt: new Date(),
          })
          .execute();

        // Update stats
        switch (result.status) {
          case "valid":
            validCount++;
            break;
          case "invalid":
            invalidCount++;
            break;
          case "catch_all":
            catchAllCount++;
            break;
          case "unknown":
            unknownCount++;
            break;
        }
        processedCount++;
      }

      // Update job progress
      await db
        .updateTable("list_enrichment_job")
        .set({
          smtpValidCount: validCount,
          smtpInvalidCount: invalidCount,
          smtpCatchAllCount: catchAllCount,
          smtpUnknownCount: unknownCount,
          processedRows: processedCount,
          updatedAt: new Date(),
        })
        .where("id", "=", jobId)
        .execute();

      // Send Pusher update periodically
      if (Date.now() - lastPusherUpdate > PUSHER_UPDATE_INTERVAL) {
        await sendPusherUpdate(jobId, job.organizationId, {
          stage: "smtp_verifying",
          processedCount,
          totalCount: items.length,
          validCount,
          invalidCount,
          catchAllCount,
          unknownCount,
        });
        lastPusherUpdate = Date.now();
      }

      logger.info(
        { jobId, batchIndex: i / BATCH_SIZE + 1, processed: processedCount },
        "Batch processed"
      );
    } catch (error) {
      logger.error({ jobId, error, batchIndex: i / BATCH_SIZE + 1 }, "Batch processing error");
      // Continue with next batch
    }
  }

  // Determine next stage based on verification method
  const method = job.verificationMethod || "smtp_only";

  if (method === "smtp_only") {
    // Complete immediately
    await updateJobStage(jobId, "completed", new Date());
  } else if (method === "smtp_api_fallback") {
    // Wait for user decision
    await db
      .updateTable("list_enrichment_job")
      .set({
        verificationStage: "awaiting_decision",
        smtpCompletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where("id", "=", jobId)
      .execute();

    await sendPusherUpdate(jobId, job.organizationId, {
      stage: "awaiting_decision",
      processedCount,
      totalCount: items.length,
      validCount,
      invalidCount,
      catchAllCount,
      unknownCount,
    });
  }

  logger.info(
    { jobId, validCount, invalidCount, catchAllCount, unknownCount },
    "SMTP verification completed"
  );
}

export async function processUserDecision(
  jobId: string,
  decision: UserDecision
): Promise<void> {
  logger.info({ jobId, decision }, "Processing user decision");

  // Update job with decision
  await db
    .updateTable("list_enrichment_job")
    .set({
      userDecision: decision,
      decisionMadeAt: new Date(),
      updatedAt: new Date(),
    })
    .where("id", "=", jobId)
    .execute();

  if (decision === "accept_current") {
    // User accepts current results, complete the job
    await updateJobStage(jobId, "completed", new Date());
  } else {
    // User wants API fallback, start API verification
    await updateJobStage(jobId, "api_verifying");
    // API verification will be triggered by the queue
  }
}

export async function processApiVerification(jobId: string): Promise<void> {
  logger.info({ jobId }, "Starting API verification for gaps");

  const job = await db
    .selectFrom("list_enrichment_job")
    .where("id", "=", jobId)
    .selectAll()
    .executeTakeFirst();

  if (!job) {
    throw new Error(`Job not found: ${jobId}`);
  }

  const decision = job.userDecision as UserDecision;

  // Determine which emails need API verification based on decision
  let statusesToVerify: string[] = [];

  switch (decision) {
    case "fill_all_gaps":
      statusesToVerify = ["unknown", "catch_all"];
      break;
    case "fill_unknowns_only":
      statusesToVerify = ["unknown"];
      break;
    case "fill_catchall_only":
      statusesToVerify = ["catch_all"];
      break;
    default:
      logger.warn({ jobId, decision }, "Unexpected decision for API verification");
      await updateJobStage(jobId, "completed", new Date());
      return;
  }

  // Get emails that need API verification
  const itemsToVerify = await db
    .selectFrom("email_validation_attempt")
    .innerJoin(
      "list_enrichment_job_item",
      "list_enrichment_job_item.id",
      "email_validation_attempt.jobItemId"
    )
    .where("list_enrichment_job_item.jobId", "=", jobId)
    .where("email_validation_attempt.verificationSource", "=", "smtp")
    .where("email_validation_attempt.status", "in", statusesToVerify)
    .select([
      "email_validation_attempt.id as attemptId",
      "email_validation_attempt.email",
      "email_validation_attempt.leadId",
      "list_enrichment_job_item.id as itemId",
    ])
    .execute();

  if (itemsToVerify.length === 0) {
    logger.info({ jobId }, "No emails need API verification");
    await updateJobStage(jobId, "completed", new Date());
    return;
  }

  logger.info({ jobId, count: itemsToVerify.length }, "Emails to verify via API");

  // TODO: Integrate with MillionVerifier API for actual verification
  // For now, we'll mark as unknown until API integration is complete
  // This is where the existing MillionVerifier integration would be called

  logger.warn({ jobId }, "API verification not yet implemented - completing job");
  await updateJobStage(jobId, "completed", new Date());
}

// ============================================
// Helper Functions
// ============================================

async function updateJobStage(
  jobId: string,
  stage: VerificationStage,
  completedAt?: Date
): Promise<void> {
  const updates: Record<string, any> = {
    verificationStage: stage,
    updatedAt: new Date(),
  };

  if (completedAt) {
    updates.completedAt = completedAt;
  }

  await db
    .updateTable("list_enrichment_job")
    .set(updates)
    .where("id", "=", jobId)
    .execute();
}

function mapStatusToValidationStatus(status: VerificationStatus): string {
  switch (status) {
    case "valid":
      return "valid";
    case "invalid":
      return "bounced";
    case "catch_all":
      return "catch_all";
    case "unknown":
    default:
      return "unknown";
  }
}

async function sendPusherUpdate(
  jobId: string,
  organizationId: string,
  data: {
    stage: string;
    processedCount: number;
    totalCount: number;
    validCount: number;
    invalidCount: number;
    catchAllCount: number;
    unknownCount: number;
  }
): Promise<void> {
  try {
    await pusher.trigger(`org-${organizationId}`, "verification-progress", {
      jobId,
      ...data,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error({ jobId, error }, "Failed to send Pusher update");
  }
}
