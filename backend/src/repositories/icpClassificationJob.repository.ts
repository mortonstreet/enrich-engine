import { db } from "@/lib/db";
import { sql } from "kysely";
import { withIdAndTimestamps } from "./utils";
import { DBIcpClassificationJob, UpdateDBIcpClassificationJob } from "@shared/db/src/types";

export type CreateIcpClassificationJobData = {
  organizationId: string;
  userId: string;
  listId: string;
  userPrompt: string;
  totalRows: number;
};

export const create = async (data: CreateIcpClassificationJobData): Promise<DBIcpClassificationJob | undefined> => {
  return db
    .insertInto("icp_classification_job")
    .values(withIdAndTimestamps(data, true))
    .returningAll()
    .executeTakeFirst();
};

export const findJobById = async (id: string): Promise<DBIcpClassificationJob | undefined> => {
  return db
    .selectFrom("icp_classification_job")
    .where("id", "=", id)
    .selectAll()
    .executeTakeFirst();
};

export const findByOrganization = async (organizationId: string) => {
  return db
    .selectFrom("icp_classification_job")
    .where("organizationId", "=", organizationId)
    .orderBy("createdAt", "desc")
    .selectAll()
    .execute();
};

export const findByListId = async (listId: string) => {
  return db
    .selectFrom("icp_classification_job")
    .where("listId", "=", listId)
    .orderBy("createdAt", "desc")
    .selectAll()
    .execute();
};

export const updateJob = async (
  id: string,
  data: Partial<UpdateDBIcpClassificationJob>
): Promise<DBIcpClassificationJob | undefined> => {
  return db
    .updateTable("icp_classification_job")
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
    .updateTable("icp_classification_job")
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

export const deleteById = async (id: string) => {
  return db.deleteFrom("icp_classification_job").where("id", "=", id).executeTakeFirst();
};
