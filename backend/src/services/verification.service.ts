import { db } from "@/lib/db";
import logger from "@/lib/logger";
import * as listRepository from "@/repositories/list.repository";
import { addSmtpVerificationJob, addApplyDecisionJob, addApiVerificationJob } from "@/queues/hybridVerification.queue";
import type {
  VerificationMethod,
  VerificationStage,
  UserDecision,
  VerificationJobResponse,
  VerificationProgressResponse,
  VerificationEstimateResponse,
  DomainStatsResponse,
} from "@shared/types/src";

// Type for list enrichment job from database
interface ListEnrichmentJobRecord {
  id: string;
  listId: string;
  totalRows: number;
  processedRows: number;
  verificationStage: string;
  verificationMethod: string;
  smtpValidCount: number;
  smtpInvalidCount: number;
  smtpCatchAllCount: number;
  smtpUnknownCount: number;
  smtpCompletedAt: Date | null;
  userDecision: string | null;
  decisionMadeAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  completedAt: Date | null;
}

// ============================================
// Constants
// ============================================

const MILLION_VERIFIER_COST_PER_EMAIL = 0.0005;

// ============================================
// Job Creation
// ============================================

export async function createVerificationJob(
  organizationId: string,
  userId: string,
  listId: string,
  verificationMethod: VerificationMethod
): Promise<VerificationJobResponse> {
  // Verify list exists and belongs to org
  const list = await listRepository.findListById(listId);
  if (!list || list.organizationId !== organizationId) {
    throw new Error("List not found");
  }

  // Get leads with emails that need verification
  const leads = await db
    .selectFrom("lead")
    .where("listId", "=", listId)
    .where("email", "is not", null)
    .where("email", "!=", "")
    .selectAll()
    .execute();

  if (leads.length === 0) {
    throw new Error("No leads with emails to verify in this list");
  }

  // Create the verification job
  const job = await db
    .insertInto("list_enrichment_job")
    .values({
      id: crypto.randomUUID(),
      organizationId,
      userId,
      listId,
      vendor: "smtp_verifier",
      enrichmentType: "email",
      status: "pending",
      totalRows: leads.length,
      processedRows: 0,
      successCount: 0,
      errorCount: 0,
      creditsUsed: 0,
      enrichmentStrategy: "direct",
      verificationStage: "pending",
      verificationMethod,
      smtpValidCount: 0,
      smtpInvalidCount: 0,
      smtpCatchAllCount: 0,
      smtpUnknownCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returningAll()
    .executeTakeFirst();

  if (!job) {
    throw new Error("Failed to create verification job");
  }

  // Create job items for each lead
  const items = leads.map((lead) => ({
    id: crypto.randomUUID(),
    jobId: job.id,
    leadId: lead.id,
    linkedinUrl: lead.linkedinUrl || "",
    status: "pending",
    createdAt: new Date(),
  }));

  if (items.length > 0) {
    await db.insertInto("list_enrichment_job_item").values(items).execute();
  }

  // Queue the SMTP verification job
  await addSmtpVerificationJob(job.id);

  logger.info({ jobId: job.id, emailCount: leads.length, verificationMethod }, "Verification job created");

  return formatJobResponse(job, list.name);
}

// ============================================
// Job Retrieval
// ============================================

export async function getVerificationJob(
  organizationId: string,
  jobId: string
): Promise<VerificationJobResponse | null> {
  const job = await db
    .selectFrom("list_enrichment_job")
    .innerJoin("lead_list", "lead_list.id", "list_enrichment_job.listId")
    .where("list_enrichment_job.id", "=", jobId)
    .where("list_enrichment_job.organizationId", "=", organizationId)
    .select([
      "list_enrichment_job.id",
      "list_enrichment_job.listId",
      "lead_list.name as listName",
      "list_enrichment_job.verificationStage",
      "list_enrichment_job.verificationMethod",
      "list_enrichment_job.totalRows",
      "list_enrichment_job.processedRows",
      "list_enrichment_job.smtpValidCount",
      "list_enrichment_job.smtpInvalidCount",
      "list_enrichment_job.smtpCatchAllCount",
      "list_enrichment_job.smtpUnknownCount",
      "list_enrichment_job.smtpCompletedAt",
      "list_enrichment_job.userDecision",
      "list_enrichment_job.decisionMadeAt",
      "list_enrichment_job.createdAt",
      "list_enrichment_job.updatedAt",
      "list_enrichment_job.completedAt",
    ])
    .executeTakeFirst();

  if (!job) {
    return null;
  }

  return formatJobResponseFromQuery(job);
}

export async function getVerificationProgress(
  organizationId: string,
  jobId: string
): Promise<VerificationProgressResponse | null> {
  const job = await getVerificationJob(organizationId, jobId);
  if (!job) {
    return null;
  }

  // Get domain statistics grouped by domain
  const domainStatsRaw = await db
    .selectFrom("email_validation_attempt")
    .innerJoin(
      "list_enrichment_job_item",
      "list_enrichment_job_item.id",
      "email_validation_attempt.jobItemId"
    )
    .innerJoin("lead", "lead.id", "list_enrichment_job_item.leadId")
    .where("list_enrichment_job_item.jobId", "=", jobId)
    .select([
      "lead.companyDomain as domain",
      db.fn.count<number>("email_validation_attempt.id").as("totalEmails"),
      db.fn.countAll<number>().filterWhere("email_validation_attempt.status", "=", "valid").as("validCount"),
      db.fn.countAll<number>().filterWhere("email_validation_attempt.status", "=", "invalid").as("invalidCount"),
      db.fn.countAll<number>().filterWhere("email_validation_attempt.status", "=", "catch_all").as("catchAllCount"),
      db.fn.countAll<number>().filterWhere("email_validation_attempt.status", "=", "unknown").as("unknownCount"),
    ])
    .groupBy("lead.companyDomain")
    .orderBy(db.fn.count("email_validation_attempt.id"), "desc")
    .limit(50)
    .execute();

  const domainStats: DomainStatsResponse[] = domainStatsRaw.map((row) => {
    const total = Number(row.totalEmails) || 0;
    const valid = Number(row.validCount) || 0;
    const invalid = Number(row.invalidCount) || 0;
    const catchAllCount = Number(row.catchAllCount) || 0;

    return {
      domain: row.domain || "unknown",
      totalEmails: total,
      validCount: valid,
      invalidCount: invalid,
      catchAllCount,
      unknownCount: Number(row.unknownCount) || 0,
      isCatchAll: catchAllCount > 0 && valid === 0 && invalid === 0 ? true : null,
    };
  });

  return {
    job,
    domainStats,
  };
}

// ============================================
// User Decision
// ============================================

export async function submitDecision(
  organizationId: string,
  jobId: string,
  decision: UserDecision
): Promise<VerificationJobResponse | null> {
  // Verify job exists and belongs to org
  const job = await db
    .selectFrom("list_enrichment_job")
    .where("id", "=", jobId)
    .where("organizationId", "=", organizationId)
    .selectAll()
    .executeTakeFirst();

  if (!job) {
    return null;
  }

  // Verify job is in awaiting_decision stage
  if (job.verificationStage !== "awaiting_decision") {
    throw new Error(`Cannot submit decision for job in ${job.verificationStage} stage`);
  }

  // Queue the decision processing
  await addApplyDecisionJob(jobId, decision);

  // If user chose to fill gaps, also queue API verification
  if (decision !== "accept_current") {
    await addApiVerificationJob(jobId);
  }

  // Return updated job
  return getVerificationJob(organizationId, jobId);
}

// ============================================
// Cost Estimation
// ============================================

export async function getApiVerificationEstimate(
  organizationId: string,
  jobId: string
): Promise<VerificationEstimateResponse | null> {
  const job = await db
    .selectFrom("list_enrichment_job")
    .where("id", "=", jobId)
    .where("organizationId", "=", organizationId)
    .selectAll()
    .executeTakeFirst();

  if (!job) {
    return null;
  }

  const unknownCount = job.smtpUnknownCount;
  const catchAllCount = job.smtpCatchAllCount;
  const totalGapCount = unknownCount + catchAllCount;
  const totalVerified = job.smtpValidCount + job.smtpInvalidCount;
  const totalEmails = job.totalRows;

  const currentCoverage = totalEmails > 0
    ? ((totalVerified) / totalEmails) * 100
    : 0;

  const projectedCoverage = totalEmails > 0
    ? ((totalVerified + totalGapCount) / totalEmails) * 100
    : 0;

  return {
    jobId: job.id,
    unknownCount,
    catchAllCount,
    totalGapCount,
    costPerEmail: MILLION_VERIFIER_COST_PER_EMAIL,
    fillUnknownsCost: Math.round(unknownCount * MILLION_VERIFIER_COST_PER_EMAIL * 100) / 100,
    fillCatchAllCost: Math.round(catchAllCount * MILLION_VERIFIER_COST_PER_EMAIL * 100) / 100,
    fillAllGapsCost: Math.round(totalGapCount * MILLION_VERIFIER_COST_PER_EMAIL * 100) / 100,
    currentCoveragePercentage: Math.round(currentCoverage * 10) / 10,
    projectedCoveragePercentage: Math.round(projectedCoverage * 10) / 10,
  };
}

// ============================================
// Helper Functions
// ============================================

function formatJobResponse(job: ListEnrichmentJobRecord, listName: string): VerificationJobResponse {
  const totalVerified = (job.smtpValidCount || 0) + (job.smtpInvalidCount || 0);
  const totalEmails = job.totalRows || 0;
  const coveragePercentage = totalEmails > 0
    ? Math.round((totalVerified / totalEmails) * 1000) / 10
    : 0;

  return {
    id: job.id,
    listId: job.listId,
    listName,
    verificationStage: job.verificationStage as VerificationStage,
    verificationMethod: job.verificationMethod as VerificationMethod,
    totalEmails: job.totalRows,
    processedEmails: job.processedRows,
    smtpValidCount: job.smtpValidCount || 0,
    smtpInvalidCount: job.smtpInvalidCount || 0,
    smtpCatchAllCount: job.smtpCatchAllCount || 0,
    smtpUnknownCount: job.smtpUnknownCount || 0,
    smtpCompletedAt: job.smtpCompletedAt?.toISOString() || null,
    userDecision: job.userDecision as UserDecision | null,
    decisionMadeAt: job.decisionMadeAt?.toISOString() || null,
    totalValidCount: job.smtpValidCount || 0,
    totalInvalidCount: job.smtpInvalidCount || 0,
    coveragePercentage,
    createdAt: job.createdAt.toISOString(),
    updatedAt: job.updatedAt.toISOString(),
    completedAt: job.completedAt?.toISOString() || null,
  };
}

function formatJobResponseFromQuery(job: ListEnrichmentJobRecord & { listName: string }): VerificationJobResponse {
  const totalVerified = (job.smtpValidCount || 0) + (job.smtpInvalidCount || 0);
  const totalEmails = job.totalRows || 0;
  const coveragePercentage = totalEmails > 0
    ? Math.round((totalVerified / totalEmails) * 1000) / 10
    : 0;

  return {
    id: job.id,
    listId: job.listId,
    listName: job.listName,
    verificationStage: job.verificationStage as VerificationStage,
    verificationMethod: job.verificationMethod as VerificationMethod,
    totalEmails: job.totalRows,
    processedEmails: job.processedRows,
    smtpValidCount: job.smtpValidCount || 0,
    smtpInvalidCount: job.smtpInvalidCount || 0,
    smtpCatchAllCount: job.smtpCatchAllCount || 0,
    smtpUnknownCount: job.smtpUnknownCount || 0,
    smtpCompletedAt: job.smtpCompletedAt?.toISOString() || null,
    userDecision: job.userDecision as UserDecision | null,
    decisionMadeAt: job.decisionMadeAt?.toISOString() || null,
    totalValidCount: job.smtpValidCount || 0,
    totalInvalidCount: job.smtpInvalidCount || 0,
    coveragePercentage,
    createdAt: job.createdAt.toISOString(),
    updatedAt: job.updatedAt.toISOString(),
    completedAt: job.completedAt?.toISOString() || null,
  };
}
