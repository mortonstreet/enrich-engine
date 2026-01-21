import { db } from "@/lib/db";
import { sql } from "kysely";
import { v4 as uuidv4 } from "uuid";
import { withIdAndTimestamps } from "./utils";
import { CopyGeneratorJobStatus } from "@shared/types/src";

export type CreateCopyGeneratorJobData = {
  organizationId: string;
  userId: string;
  listId: string;
  userPrompt: string;
  totalRows: number;
};

export type CreateCopyGeneratorJobItemData = {
  jobId: string;
  leadId: string;
};

export type FindJobsOptions = {
  page: number;
  limit: number;
  status?: CopyGeneratorJobStatus;
};

// ============================================
// Job Operations
// ============================================

export const createJob = async (data: CreateCopyGeneratorJobData) => {
  return db
    .insertInto("copy_generator_job")
    .values(withIdAndTimestamps(data, true))
    .returningAll()
    .executeTakeFirst();
};

export const findJobById = async (id: string) => {
  return db
    .selectFrom("copy_generator_job")
    .where("id", "=", id)
    .selectAll()
    .executeTakeFirst();
};

export const findJobByIdWithList = async (id: string) => {
  return db
    .selectFrom("copy_generator_job as job")
    .leftJoin("lead_list as list", "list.id", "job.listId")
    .where("job.id", "=", id)
    .select([
      "job.id",
      "job.organizationId",
      "job.userId",
      "job.listId",
      "job.userPrompt",
      "job.status",
      "job.totalRows",
      "job.processedRows",
      "job.successCount",
      "job.errorCount",
      "job.tokensUsed",
      "job.estimatedCost",
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
    .selectFrom("copy_generator_job")
    .where("organizationId", "=", organizationId);

  if (options.status) {
    countQuery = countQuery.where("status", "=", options.status);
  }

  const countResult = await countQuery
    .select(sql<number>`count(*)::int`.as("count"))
    .executeTakeFirst();

  const total = countResult?.count ?? 0;

  let dataQuery = db
    .selectFrom("copy_generator_job as job")
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
      "job.userPrompt",
      "job.status",
      "job.totalRows",
      "job.processedRows",
      "job.successCount",
      "job.errorCount",
      "job.tokensUsed",
      "job.estimatedCost",
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
    tokensUsed?: number;
    estimatedCost?: number;
    completedAt?: Date | null;
  }
) => {
  return db
    .updateTable("copy_generator_job")
    .set({ ...data, updatedAt: new Date() })
    .where("id", "=", id)
    .returningAll()
    .executeTakeFirst();
};

export const incrementJobProgress = async (
  id: string,
  success: boolean,
  tokensUsed: number = 0
) => {
  if (success) {
    return db
      .updateTable("copy_generator_job")
      .set({
        processedRows: sql`"processedRows" + 1`,
        successCount: sql`"successCount" + 1`,
        tokensUsed: sql`"tokensUsed" + ${tokensUsed}`,
        updatedAt: new Date(),
      })
      .where("id", "=", id)
      .returningAll()
      .executeTakeFirst();
  } else {
    return db
      .updateTable("copy_generator_job")
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
    .deleteFrom("copy_generator_job")
    .where("id", "=", id)
    .executeTakeFirst();
};

// ============================================
// Job Item Operations
// ============================================

export const createJobItems = async (
  items: CreateCopyGeneratorJobItemData[]
) => {
  if (items.length === 0) return [];

  // Note: copy_generator_job_item doesn't have updatedAt column
  const itemsWithIds = items.map((item) => ({
    ...item,
    id: uuidv4(),
    status: "pending",
    createdAt: new Date(),
  }));

  return db
    .insertInto("copy_generator_job_item")
    .values(itemsWithIds)
    .returningAll()
    .execute();
};

export const findItemsByJobId = async (jobId: string) => {
  return db
    .selectFrom("copy_generator_job_item as item")
    .leftJoin("lead", "lead.id", "item.leadId")
    .where("item.jobId", "=", jobId)
    .select([
      "item.id",
      "item.jobId",
      "item.leadId",
      "item.status",
      "item.generatedLine",
      "item.tokensUsed",
      "item.errorMessage",
      "item.createdAt",
      "item.processedAt",
      "lead.firstName as leadFirstName",
      "lead.lastName as leadLastName",
      "lead.company as leadCompany",
    ])
    .execute();
};

export const findPendingItems = async (
  jobId: string,
  limit: number,
  offset: number = 0
) => {
  return db
    .selectFrom("copy_generator_job_item as item")
    .leftJoin("lead", "lead.id", "item.leadId")
    .where("item.jobId", "=", jobId)
    .where("item.status", "=", "pending")
    .orderBy("item.createdAt", "asc")
    .limit(limit)
    .offset(offset)
    .select([
      "item.id",
      "item.jobId",
      "item.leadId",
      "item.status",
      "lead.firstName",
      "lead.lastName",
      "lead.role",
      "lead.company",
      "lead.linkedinUrl",
    ])
    .execute();
};

export const updateItem = async (
  id: string,
  data: {
    status?: string;
    generatedLine?: string | null;
    tokensUsed?: number;
    openrouterResponse?: object | null;
    errorMessage?: string | null;
    processedAt?: Date | null;
  }
) => {
  return db
    .updateTable("copy_generator_job_item")
    .set(data)
    .where("id", "=", id)
    .returningAll()
    .executeTakeFirst();
};

export const countItemsByStatus = async (jobId: string) => {
  const result = await db
    .selectFrom("copy_generator_job_item")
    .where("jobId", "=", jobId)
    .select([
      sql<number>`count(*) filter (where status = 'pending')::int`.as("pending"),
      sql<number>`count(*) filter (where status = 'processing')::int`.as(
        "processing"
      ),
      sql<number>`count(*) filter (where status = 'completed')::int`.as(
        "completed"
      ),
      sql<number>`count(*) filter (where status = 'failed')::int`.as("failed"),
    ])
    .executeTakeFirst();

  return (
    result ?? { pending: 0, processing: 0, completed: 0, failed: 0 }
  );
};

/**
 * Count leads in a list that don't have firstLine generated yet.
 */
export const countLeadsWithoutFirstLine = async (
  listId: string
): Promise<number> => {
  const result = await db
    .selectFrom("lead")
    .where("listId", "=", listId)
    .where((eb) =>
      eb.or([eb("firstLine", "is", null), eb("firstLine", "=", "")])
    )
    .select(sql<number>`count(*)::int`.as("count"))
    .executeTakeFirst();

  return result?.count ?? 0;
};

/**
 * Get leads from a list that don't have firstLine generated.
 */
export const findLeadsWithoutFirstLine = async (listId: string) => {
  return db
    .selectFrom("lead")
    .where("listId", "=", listId)
    .where((eb) =>
      eb.or([eb("firstLine", "is", null), eb("firstLine", "=", "")])
    )
    .select(["id", "firstName", "lastName", "role", "company", "linkedinUrl"])
    .execute();
};
