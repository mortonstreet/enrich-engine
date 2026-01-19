import { db } from "@/lib/db";
import { sql } from "kysely";
import { withIdAndTimestamps, withId } from "./utils";
import {
  DBScrapeJob,
  DBScrapeJobItem,
  UpdateDBScrapeJob,
  UpdateDBScrapeJobItem,
  PaginatedResponse,
} from "@shared/types/src";

export type CreateScrapeJobData = {
  organizationId: string;
  userId: string;
  name: string;
  totalRows: number;
  inputType: string;
  status?: string;
};

export type CreateScrapeJobItemData = {
  jobId: string;
  rowIndex: number;
  inputData: Record<string, string>;
  status?: string;
};

export type FindByOrganizationOptions = {
  page: number;
  limit: number;
  status?: string;
};

// ============================================
// ScrapeJob Operations
// ============================================

export const create = async (data: CreateScrapeJobData): Promise<DBScrapeJob | undefined> => {
  return db
    .insertInto("scrape_job")
    .values(withIdAndTimestamps(data, true))
    .returningAll()
    .executeTakeFirst();
};

export const findById = async (id: string): Promise<DBScrapeJob | undefined> => {
  return db
    .selectFrom("scrape_job")
    .where("id", "=", id)
    .selectAll()
    .executeTakeFirst();
};

export const findByIdWithItems = async (id: string): Promise<{
  job: DBScrapeJob | undefined;
  items: DBScrapeJobItem[];
}> => {
  const job = await findById(id);
  if (!job) {
    return { job: undefined, items: [] };
  }

  const items = await db
    .selectFrom("scrape_job_item")
    .where("jobId", "=", id)
    .orderBy("rowIndex", "asc")
    .selectAll()
    .execute();

  return { job, items };
};

export const findByOrganizationId = async (
  organizationId: string,
  options: FindByOrganizationOptions,
): Promise<PaginatedResponse<DBScrapeJob>> => {
  let countQuery = db
    .selectFrom("scrape_job")
    .where("organizationId", "=", organizationId);

  if (options.status) {
    countQuery = countQuery.where("status", "=", options.status);
  }

  const countResult = await countQuery
    .select(sql<number>`count(*)::int`.as("count"))
    .executeTakeFirst();

  const total = countResult?.count ?? 0;

  let dataQuery = db
    .selectFrom("scrape_job")
    .where("organizationId", "=", organizationId)
    .orderBy("createdAt", "desc")
    .limit(options.limit)
    .offset((options.page - 1) * options.limit);

  if (options.status) {
    dataQuery = dataQuery.where("status", "=", options.status);
  }

  const data = await dataQuery.selectAll().execute();

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

export const update = async (id: string, data: Partial<UpdateDBScrapeJob>): Promise<DBScrapeJob | undefined> => {
  return db
    .updateTable("scrape_job")
    .set({ ...data, updatedAt: new Date() })
    .where("id", "=", id)
    .returningAll()
    .executeTakeFirst();
};

export const deleteById = async (id: string) => {
  return db.deleteFrom("scrape_job").where("id", "=", id).executeTakeFirst();
};

// ============================================
// ScrapeJobItem Operations
// ============================================

export const createItem = async (data: CreateScrapeJobItemData): Promise<DBScrapeJobItem | undefined> => {
  return db
    .insertInto("scrape_job_item")
    .values({
      ...withId(data),
      createdAt: new Date(),
    })
    .returningAll()
    .executeTakeFirst();
};

export const createItems = async (items: CreateScrapeJobItemData[]): Promise<DBScrapeJobItem[]> => {
  if (items.length === 0) return [];

  const values = items.map((item) => ({
    ...withId(item),
    createdAt: new Date(),
  }));

  return db
    .insertInto("scrape_job_item")
    .values(values)
    .returningAll()
    .execute();
};

export const findItemById = async (id: string): Promise<DBScrapeJobItem | undefined> => {
  return db
    .selectFrom("scrape_job_item")
    .where("id", "=", id)
    .selectAll()
    .executeTakeFirst();
};

export const findItemsByJobId = async (jobId: string): Promise<DBScrapeJobItem[]> => {
  return db
    .selectFrom("scrape_job_item")
    .where("jobId", "=", jobId)
    .orderBy("rowIndex", "asc")
    .selectAll()
    .execute();
};

export const findPendingItems = async (jobId: string): Promise<DBScrapeJobItem[]> => {
  return db
    .selectFrom("scrape_job_item")
    .where("jobId", "=", jobId)
    .where("status", "=", "pending")
    .orderBy("rowIndex", "asc")
    .selectAll()
    .execute();
};

export const updateItem = async (id: string, data: Partial<UpdateDBScrapeJobItem>): Promise<DBScrapeJobItem | undefined> => {
  return db
    .updateTable("scrape_job_item")
    .set(data)
    .where("id", "=", id)
    .returningAll()
    .executeTakeFirst();
};

// Reset items stuck in 'processing' status back to 'pending' (for retry after crash/restart)
export const resetStuckItems = async (jobId: string): Promise<number> => {
  const result = await db
    .updateTable("scrape_job_item")
    .set({ status: "pending" })
    .where("jobId", "=", jobId)
    .where("status", "=", "processing")
    .executeTakeFirst();

  return Number(result.numUpdatedRows ?? 0);
};

// Mark items stuck in 'processing' status as 'failed' (when job fails)
export const failStuckItems = async (jobId: string): Promise<number> => {
  const result = await db
    .updateTable("scrape_job_item")
    .set({
      status: "failed",
      errorMessage: "Job failed while item was processing",
      processedAt: new Date(),
    })
    .where("jobId", "=", jobId)
    .where("status", "=", "processing")
    .executeTakeFirst();

  return Number(result.numUpdatedRows ?? 0);
};

export const getJobProgress = async (jobId: string): Promise<{
  totalRows: number;
  processedRows: number;
  successCount: number;
  errorCount: number;
}> => {
  const result = await db
    .selectFrom("scrape_job_item")
    .where("jobId", "=", jobId)
    .select([
      sql<number>`count(*)::int`.as("totalRows"),
      // Only count items that have finished processing (not pending or still processing)
      sql<number>`count(*) filter (where status in ('completed', 'failed', 'no_result'))::int`.as("processedRows"),
      sql<number>`count(*) filter (where status = 'completed')::int`.as("successCount"),
      sql<number>`count(*) filter (where status in ('failed', 'no_result'))::int`.as("errorCount"),
    ])
    .executeTakeFirst();

  return {
    totalRows: result?.totalRows ?? 0,
    processedRows: result?.processedRows ?? 0,
    successCount: result?.successCount ?? 0,
    errorCount: result?.errorCount ?? 0,
  };
};
