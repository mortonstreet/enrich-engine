import { db } from "@/lib/db";
import { sql } from "kysely";
import { withIdAndTimestamps } from "./utils";
import {
  UpdateDBBulkEnrichmentJob,
  UpdateDBBulkEnrichmentItem,
} from "@shared/types/src";

export type CreateBulkJobData = {
  organizationId: string;
  userId: string;
  status: string;
  totalRecords: number;
  processedRecords?: number;
  matchedRecords?: number;
  failedRecords?: number;
  originalFileName: string;
  totalCreditsCost?: number;
  completedAt?: Date | null;
};

export type CreateBulkItemData = {
  jobId: string;
  identifier: string;
  linkedinUrl: string;
  status: string;
};

// ============================================
// Bulk Enrichment Job
// ============================================

export const createJob = async (data: CreateBulkJobData) => {
  return db
    .insertInto("bulk_enrichment_job")
    .values(withIdAndTimestamps(data, true))
    .returningAll()
    .executeTakeFirst();
};

export const findJobById = async (id: string) => {
  return db
    .selectFrom("bulk_enrichment_job")
    .where("id", "=", id)
    .selectAll()
    .executeTakeFirst();
};

export const findJobsByOrganizationId = async (organizationId: string) => {
  return db
    .selectFrom("bulk_enrichment_job")
    .where("organizationId", "=", organizationId)
    .orderBy("createdAt", "desc")
    .selectAll()
    .execute();
};

export const findPendingJobs = async (limit: number = 10) => {
  return db
    .selectFrom("bulk_enrichment_job")
    .where("status", "=", "pending")
    .orderBy("createdAt", "asc")
    .limit(limit)
    .selectAll()
    .execute();
};

export const updateJob = async (
  id: string,
  data: Partial<UpdateDBBulkEnrichmentJob>,
) => {
  return db
    .updateTable("bulk_enrichment_job")
    .set({ ...data, updatedAt: new Date() })
    .where("id", "=", id)
    .returningAll()
    .executeTakeFirst();
};

export const deleteJobById = async (id: string) => {
  return db
    .deleteFrom("bulk_enrichment_job")
    .where("id", "=", id)
    .executeTakeFirst();
};

// ============================================
// Bulk Enrichment Items
// ============================================

export const createItem = async (data: CreateBulkItemData) => {
  return db
    .insertInto("bulk_enrichment_item")
    .values(withIdAndTimestamps(data, true))
    .returningAll()
    .executeTakeFirst();
};

export const createItems = async (items: CreateBulkItemData[]) => {
  if (items.length === 0) return [];

  const itemsWithMeta = items.map((item) => withIdAndTimestamps(item, true));

  return db
    .insertInto("bulk_enrichment_item")
    .values(itemsWithMeta)
    .returningAll()
    .execute();
};

export const findItemById = async (id: string) => {
  return db
    .selectFrom("bulk_enrichment_item")
    .where("id", "=", id)
    .selectAll()
    .executeTakeFirst();
};

export const findItemsByJobId = async (jobId: string) => {
  return db
    .selectFrom("bulk_enrichment_item")
    .where("jobId", "=", jobId)
    .orderBy("createdAt", "asc")
    .selectAll()
    .execute();
};

export const findPendingItemsByJobId = async (
  jobId: string,
  limit: number = 50,
) => {
  return db
    .selectFrom("bulk_enrichment_item")
    .where("jobId", "=", jobId)
    .where("status", "=", "pending")
    .orderBy("createdAt", "asc")
    .limit(limit)
    .selectAll()
    .execute();
};

export const updateItem = async (
  id: string,
  data: Partial<UpdateDBBulkEnrichmentItem>,
) => {
  return db
    .updateTable("bulk_enrichment_item")
    .set({ ...data, updatedAt: new Date() })
    .where("id", "=", id)
    .returningAll()
    .executeTakeFirst();
};

export const updateItemsByJobId = async (
  jobId: string,
  data: Partial<UpdateDBBulkEnrichmentItem>,
) => {
  return db
    .updateTable("bulk_enrichment_item")
    .set({ ...data, updatedAt: new Date() })
    .where("jobId", "=", jobId)
    .execute();
};

export const getJobStats = async (jobId: string) => {
  const result = await db
    .selectFrom("bulk_enrichment_item")
    .where("jobId", "=", jobId)
    .select([
      sql<number>`count(*)::int`.as("total"),
      sql<number>`count(*) filter (where status != 'pending')::int`.as(
        "processed",
      ),
      sql<number>`count(*) filter (where status = 'matched')::int`.as(
        "matched",
      ),
      sql<number>`count(*) filter (where status = 'error' or status = 'not_matched')::int`.as(
        "failed",
      ),
    ])
    .executeTakeFirst();

  return {
    total: result?.total ?? 0,
    processed: result?.processed ?? 0,
    matched: result?.matched ?? 0,
    failed: result?.failed ?? 0,
  };
};
