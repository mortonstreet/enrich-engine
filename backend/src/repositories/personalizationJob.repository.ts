import { db } from "@/lib/db";
import { sql } from "kysely";
import { withIdAndTimestamps } from "./utils";
import {
  DBPersonalizationJob,
  UpdateDBPersonalizationJob,
  DBPersonalizationJobItem,
  UpdateDBPersonalizationJobItem,
} from "@shared/db/src/types";

// ============================================
// Job Operations
// ============================================

export type CreatePersonalizationJobData = {
  organizationId: string;
  userId: string;
  listId: string;
  columnConfigs: object;
  useIcpContext?: boolean;
  totalRows: number;
};

export const createJob = async (
  data: CreatePersonalizationJobData
): Promise<DBPersonalizationJob | undefined> => {
  return db
    .insertInto("personalization_job")
    .values(
      withIdAndTimestamps(
        {
          ...data,
          columnConfigs: JSON.stringify(data.columnConfigs),
        },
        true
      )
    )
    .returningAll()
    .executeTakeFirst();
};

export const findJobById = async (id: string): Promise<DBPersonalizationJob | undefined> => {
  return db
    .selectFrom("personalization_job")
    .where("id", "=", id)
    .selectAll()
    .executeTakeFirst();
};

export const findByOrganization = async (organizationId: string) => {
  return db
    .selectFrom("personalization_job")
    .where("organizationId", "=", organizationId)
    .orderBy("createdAt", "desc")
    .selectAll()
    .execute();
};

export const findByListId = async (listId: string) => {
  return db
    .selectFrom("personalization_job")
    .where("listId", "=", listId)
    .orderBy("createdAt", "desc")
    .selectAll()
    .execute();
};

export const updateJob = async (
  id: string,
  data: Partial<UpdateDBPersonalizationJob>
): Promise<DBPersonalizationJob | undefined> => {
  return db
    .updateTable("personalization_job")
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
  await db
    .updateTable("personalization_job")
    .set({
      processedRows: sql`"processedRows" + 1`,
      successCount: success ? sql`"successCount" + 1` : sql`"successCount"`,
      errorCount: success ? sql`"errorCount"` : sql`"errorCount" + 1`,
      tokensUsed: sql`"tokensUsed" + ${tokensUsed}`,
      updatedAt: new Date(),
    })
    .where("id", "=", id)
    .execute();
};

export const deleteJobById = async (id: string) => {
  return db.deleteFrom("personalization_job").where("id", "=", id).executeTakeFirst();
};

// ============================================
// Job Item Operations
// ============================================

export type CreatePersonalizationJobItemData = {
  jobId: string;
  leadId: string;
};

export const createItem = async (
  data: CreatePersonalizationJobItemData
): Promise<DBPersonalizationJobItem | undefined> => {
  return db
    .insertInto("personalization_job_item")
    .values(withIdAndTimestamps(data, true))
    .returningAll()
    .executeTakeFirst();
};

export const bulkCreateItems = async (
  items: CreatePersonalizationJobItemData[]
): Promise<DBPersonalizationJobItem[]> => {
  if (items.length === 0) return [];
  return db
    .insertInto("personalization_job_item")
    .values(items.map((item) => withIdAndTimestamps(item, true)))
    .returningAll()
    .execute();
};

export const findPendingItems = async (
  jobId: string,
  limit: number
): Promise<DBPersonalizationJobItem[]> => {
  return db
    .selectFrom("personalization_job_item")
    .where("jobId", "=", jobId)
    .where("status", "=", "pending")
    .orderBy("createdAt", "asc")
    .limit(limit)
    .selectAll()
    .execute();
};

export const updateItem = async (
  id: string,
  data: Partial<UpdateDBPersonalizationJobItem>
): Promise<DBPersonalizationJobItem | undefined> => {
  return db
    .updateTable("personalization_job_item")
    .set(data)
    .where("id", "=", id)
    .returningAll()
    .executeTakeFirst();
};

export const findItemsByJobId = async (jobId: string): Promise<DBPersonalizationJobItem[]> => {
  return db
    .selectFrom("personalization_job_item")
    .where("jobId", "=", jobId)
    .orderBy("createdAt", "asc")
    .selectAll()
    .execute();
};
