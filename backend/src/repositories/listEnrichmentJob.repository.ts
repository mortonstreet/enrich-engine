import { db } from "@/lib/db";
import { sql } from "kysely";
import { withIdAndTimestamps } from "./utils";
import { ListEnrichmentJobStatus } from "@shared/types/src";
import logger from "@/lib/logger";

export type CreateListEnrichmentJobData = {
  organizationId: string;
  userId: string;
  listId: string;
  vendor?: string;
  enrichmentType: string;
  totalRows: number;
};

export type CreateListEnrichmentJobItemData = {
  jobId: string;
  leadId: string;
  linkedinUrl: string;
};

export type FindJobsOptions = {
  page: number;
  limit: number;
  status?: ListEnrichmentJobStatus;
};

// ============================================
// Job Operations
// ============================================

export const createJob = async (data: CreateListEnrichmentJobData) => {
  return db
    .insertInto("list_enrichment_job")
    .values(withIdAndTimestamps(data, true))
    .returningAll()
    .executeTakeFirst();
};

export const findJobById = async (id: string) => {
  return db
    .selectFrom("list_enrichment_job")
    .where("id", "=", id)
    .selectAll()
    .executeTakeFirst();
};

export const findJobByIdWithList = async (id: string) => {
  return db
    .selectFrom("list_enrichment_job as job")
    .leftJoin("lead_list as list", "list.id", "job.listId")
    .where("job.id", "=", id)
    .select([
      "job.id",
      "job.organizationId",
      "job.userId",
      "job.listId",
      "job.vendor",
      "job.enrichmentType",
      "job.enrichmentStrategy",
      "job.status",
      "job.totalRows",
      "job.processedRows",
      "job.successCount",
      "job.errorCount",
      "job.creditsUsed",
      "job.guessSuccessCount",
      "job.fallbackCount",
      "job.createdAt",
      "job.updatedAt",
      "job.completedAt",
      "list.name as listName",
    ])
    .executeTakeFirst();
};

export const findJobsByOrganization = async (
  organizationId: string,
  options: FindJobsOptions
) => {
  let countQuery = db
    .selectFrom("list_enrichment_job")
    .where("organizationId", "=", organizationId);

  if (options.status) {
    countQuery = countQuery.where("status", "=", options.status);
  }

  const countResult = await countQuery
    .select(sql<number>`count(*)::int`.as("count"))
    .executeTakeFirst();

  const total = countResult?.count ?? 0;

  let dataQuery = db
    .selectFrom("list_enrichment_job as job")
    .leftJoin("lead_list as list", "list.id", "job.listId")
    .where("job.organizationId", "=", organizationId)
    .orderBy("job.createdAt", "desc")
    .limit(options.limit)
    .offset((options.page - 1) * options.limit);

  if (options.status) {
    dataQuery = dataQuery.where("job.status", "=", options.status);
  }

  const data = await dataQuery
    .select([
      "job.id",
      "job.organizationId",
      "job.userId",
      "job.listId",
      "job.vendor",
      "job.enrichmentType",
      "job.status",
      "job.totalRows",
      "job.processedRows",
      "job.successCount",
      "job.errorCount",
      "job.creditsUsed",
      "job.createdAt",
      "job.updatedAt",
      "job.completedAt",
      "list.name as listName",
    ])
    .execute();

  const totalPages = Math.ceil(total / options.limit);

  return {
    data,
    pagination: {
      page: options.page,
      limit: options.limit,
      total,
      totalPages,
      hasNextPage: options.page < totalPages,
      hasPrevPage: options.page > 1,
    },
  };
};

export const updateJob = async (
  id: string,
  data: {
    status?: string;
    processedRows?: number;
    successCount?: number;
    errorCount?: number;
    creditsUsed?: number;
    completedAt?: Date | null;
  }
) => {
  return db
    .updateTable("list_enrichment_job")
    .set({ ...data, updatedAt: new Date() })
    .where("id", "=", id)
    .returningAll()
    .executeTakeFirst();
};

export const incrementJobProgress = async (
  id: string,
  success: boolean
) => {
  if (success) {
    return db
      .updateTable("list_enrichment_job")
      .set({
        processedRows: sql`"processedRows" + 1`,
        successCount: sql`"successCount" + 1`,
        creditsUsed: sql`"creditsUsed" + 1`,
        updatedAt: new Date(),
      })
      .where("id", "=", id)
      .returningAll()
      .executeTakeFirst();
  } else {
    return db
      .updateTable("list_enrichment_job")
      .set({
        processedRows: sql`"processedRows" + 1`,
        errorCount: sql`"errorCount" + 1`,
        updatedAt: new Date(),
      })
      .where("id", "=", id)
      .returningAll()
      .executeTakeFirst();
  }
};

export const deleteJob = async (id: string) => {
  return db
    .deleteFrom("list_enrichment_job")
    .where("id", "=", id)
    .executeTakeFirst();
};

// ============================================
// Job Item Operations
// ============================================

export const createJobItems = async (
  items: CreateListEnrichmentJobItemData[]
) => {
  if (items.length === 0) return [];

  const itemsWithIds = items.map((item) => withIdAndTimestamps(item, true));

  return db
    .insertInto("list_enrichment_job_item")
    .values(itemsWithIds)
    .returningAll()
    .execute();
};

export const findItemsByJobId = async (jobId: string) => {
  return db
    .selectFrom("list_enrichment_job_item as item")
    .leftJoin("lead", "lead.id", "item.leadId")
    .where("item.jobId", "=", jobId)
    .select([
      "item.id",
      "item.jobId",
      "item.leadId",
      "item.linkedinUrl",
      "item.status",
      "item.enrichedEmail",
      "item.enrichedPhone",
      "item.errorMessage",
      "item.createdAt",
      "item.processedAt",
      "lead.firstName",
      "lead.lastName",
      "lead.company",
      "lead.companyDomain",
    ])
    .execute();
};

export const findValidationAttemptsByJobItemIds = async (jobItemIds: string[]) => {
  if (jobItemIds.length === 0) return [];

  return db
    .selectFrom("email_validation_attempt")
    .where("jobItemId", "in", jobItemIds)
    .select([
      "id",
      "jobItemId",
      "leadId",
      "email",
      "pattern",
      "status",
      "createdAt",
      "processedAt",
    ])
    .orderBy("createdAt", "asc")
    .execute();
};

export const findPendingItems = async (
  jobId: string,
  limit: number,
  offset: number = 0
) => {
  return db
    .selectFrom("list_enrichment_job_item")
    .where("jobId", "=", jobId)
    .where("status", "=", "pending")
    .orderBy("createdAt", "asc")
    .limit(limit)
    .offset(offset)
    .selectAll()
    .execute();
};

export const findAllPendingItems = async (jobId: string) => {
  return db
    .selectFrom("list_enrichment_job_item")
    .where("jobId", "=", jobId)
    .where("status", "=", "pending")
    .orderBy("createdAt", "asc")
    .selectAll()
    .execute();
};

export const updateItem = async (
  id: string,
  data: {
    status?: string;
    enrichedEmail?: string | null;
    enrichedPhone?: string | null;
    prospeoResponse?: object | null;
    errorMessage?: string | null;
    processedAt?: Date | null;
  }
) => {
  return db
    .updateTable("list_enrichment_job_item")
    .set(data)
    .where("id", "=", id)
    .returningAll()
    .executeTakeFirst();
};

export const countItemsByStatus = async (jobId: string) => {
  const result = await db
    .selectFrom("list_enrichment_job_item")
    .where("jobId", "=", jobId)
    .select([
      sql<number>`count(*) filter (where status = 'pending')::int`.as("pending"),
      sql<number>`count(*) filter (where status = 'processing')::int`.as("processing"),
      sql<number>`count(*) filter (where status = 'completed')::int`.as("completed"),
      sql<number>`count(*) filter (where status = 'failed')::int`.as("failed"),
      sql<number>`count(*) filter (where status = 'not_found')::int`.as("notFound"),
    ])
    .executeTakeFirst();

  return result ?? { pending: 0, processing: 0, completed: 0, failed: 0, notFound: 0 };
};

/**
 * Find lead IDs that have already been successfully enriched for a given list and enrichment type.
 * This is used to prevent duplicate enrichments.
 */
export const findEnrichedLeadIdsByList = async (
  listId: string,
  enrichmentType: string
): Promise<Set<string>> => {
  const results = await db
    .selectFrom("list_enrichment_job_item as item")
    .innerJoin("list_enrichment_job as job", "job.id", "item.jobId")
    .where("job.listId", "=", listId)
    .where("job.enrichmentType", "=", enrichmentType)
    .where("item.status", "=", "completed")
    .select("item.leadId")
    .execute();

  return new Set(results.map((r) => r.leadId));
};

/**
 * Count unenriched leads with LinkedIn URLs for a given list and enrichment type.
 * Uses a subquery instead of NOT IN for better performance with large datasets.
 */
export const countUnenrichedLeadsByList = async (
  listId: string,
  enrichmentType: string
): Promise<number> => {
  // Use NOT EXISTS subquery for better performance with large datasets
  const result = await db
    .selectFrom("lead")
    .where("listId", "=", listId)
    .where("linkedinUrl", "is not", null)
    .where("linkedinUrl", "!=", "")
    .where(({ not, exists, selectFrom }) =>
      not(
        exists(
          selectFrom("list_enrichment_job_item as item")
            .innerJoin("list_enrichment_job as job", "job.id", "item.jobId")
            .whereRef("item.leadId", "=", "lead.id")
            .where("job.listId", "=", listId)
            .where("job.enrichmentType", "=", enrichmentType)
            .where("item.status", "=", "completed")
            .select(sql`1`.as("exists"))
        )
      )
    )
    .select(sql<number>`count(*)::int`.as("count"))
    .executeTakeFirst();

  return result?.count ?? 0;
};

/**
 * Count email validation attempts by status for a given job.
 * Returns breakdown of valid, catch_all, bounced, unknown, and error counts.
 */
export const countValidationAttemptsByStatus = async (jobId: string): Promise<{
  valid: number;
  catchAll: number;
  bounced: number;
  unknown: number;
  error: number;
  total: number;
}> => {
  // First get all job item IDs
  const jobItems = await db
    .selectFrom("list_enrichment_job_item")
    .where("jobId", "=", jobId)
    .select("id")
    .execute();

  if (jobItems.length === 0) {
    return { valid: 0, catchAll: 0, bounced: 0, unknown: 0, error: 0, total: 0 };
  }

  const jobItemIds = jobItems.map((item) => item.id);

  const result = await db
    .selectFrom("email_validation_attempt")
    .where("jobItemId", "in", jobItemIds)
    .select([
      sql<number>`count(*) filter (where status = 'valid')::int`.as("valid"),
      sql<number>`count(*) filter (where status = 'catch_all')::int`.as("catchAll"),
      sql<number>`count(*) filter (where status = 'bounced')::int`.as("bounced"),
      sql<number>`count(*) filter (where status = 'unknown')::int`.as("unknown"),
      sql<number>`count(*) filter (where status = 'error')::int`.as("error"),
      sql<number>`count(*)::int`.as("total"),
    ])
    .executeTakeFirst();

  return {
    valid: result?.valid ?? 0,
    catchAll: result?.catchAll ?? 0,
    bounced: result?.bounced ?? 0,
    unknown: result?.unknown ?? 0,
    error: result?.error ?? 0,
    total: result?.total ?? 0,
  };
};
