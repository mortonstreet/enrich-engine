import { db } from "@/lib/db";
import { sql } from "kysely";
import { withIdAndTimestamps, withId } from "./utils";
import { DBLeadList, DBLead, UpdateDBLeadList } from "@shared/types/src";

export type CreateLeadListData = {
  organizationId: string;
  createdById: string;
  name: string;
  description?: string;
  folderId?: string;
  source?: string;
  scrapeJobId?: string;
};

export type CreateLeadData = {
  listId: string;
  organizationId: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  company?: string;
  role?: string;
  linkedinUrl?: string;
  customFields?: Record<string, unknown>;
};

export const createList = async (data: CreateLeadListData): Promise<DBLeadList | undefined> => {
  return db
    .insertInto("lead_list")
    .values(withIdAndTimestamps(data, true))
    .returningAll()
    .executeTakeFirst();
};

export const updateList = async (id: string, data: Partial<UpdateDBLeadList>): Promise<DBLeadList | undefined> => {
  const result = await db
    .updateTable("lead_list")
    .set({ ...data, updatedAt: new Date() })
    .where("id", "=", id)
    .returning(["id"])
    .executeTakeFirst();

  if (!result) {
    return undefined;
  }

  // Re-fetch the list to get the dynamically calculated leadCount
  return findListById(id);
};

export const createLead = async (data: CreateLeadData): Promise<DBLead | undefined> => {
  return db
    .insertInto("lead")
    .values(withIdAndTimestamps(data, true))
    .returningAll()
    .executeTakeFirst();
};

export const createLeads = async (leads: CreateLeadData[]): Promise<DBLead[]> => {
  if (leads.length === 0) return [];

  const values = leads.map((lead) => ({
    ...withId(lead),
    customFields: lead.customFields ?? {},
    createdAt: new Date(),
    updatedAt: new Date(),
  }));

  return db
    .insertInto("lead")
    .values(values)
    .returningAll()
    .execute();
};

export type FindListsOptions = {
  folderId?: string | null;
  search?: string;
  ownerId?: string;
};

export const findListById = async (id: string): Promise<DBLeadList | undefined> => {
  const result = await db
    .selectFrom("lead_list")
    .leftJoin(
      db
        .selectFrom("lead")
        .select(["listId", sql<number>`count(*)::int`.as("actualCount")])
        .groupBy("listId")
        .as("lead_counts"),
      "lead_counts.listId",
      "lead_list.id"
    )
    .where("lead_list.id", "=", id)
    .select([
      "lead_list.id",
      "lead_list.organizationId",
      "lead_list.createdById",
      "lead_list.name",
      "lead_list.description",
      "lead_list.folderId",
      "lead_list.importStatus",
      "lead_list.source",
      "lead_list.scrapeJobId",
      "lead_list.createdAt",
      "lead_list.updatedAt",
      sql<number>`coalesce(lead_counts."actualCount", 0)`.as("leadCount"),
    ])
    .executeTakeFirst();

  return result as DBLeadList | undefined;
};

export const findListsByOrganizationId = async (
  organizationId: string,
  options: FindListsOptions = {},
): Promise<DBLeadList[]> => {
  let query = db
    .selectFrom("lead_list")
    .leftJoin(
      db
        .selectFrom("lead")
        .select(["listId", sql<number>`count(*)::int`.as("actualCount")])
        .groupBy("listId")
        .as("lead_counts"),
      "lead_counts.listId",
      "lead_list.id"
    )
    .where("lead_list.organizationId", "=", organizationId);

  if (options.folderId !== undefined) {
    if (options.folderId === null) {
      query = query.where("lead_list.folderId", "is", null);
    } else {
      query = query.where("lead_list.folderId", "=", options.folderId);
    }
  }

  if (options.search) {
    query = query.where((eb) =>
      eb.or([
        eb("lead_list.name", "ilike", `%${options.search}%`),
        eb("lead_list.description", "ilike", `%${options.search}%`),
      ]),
    );
  }

  if (options.ownerId) {
    query = query.where("lead_list.createdById", "=", options.ownerId);
  }

  const results = await query
    .orderBy("lead_list.createdAt", "desc")
    .select([
      "lead_list.id",
      "lead_list.organizationId",
      "lead_list.createdById",
      "lead_list.name",
      "lead_list.description",
      "lead_list.folderId",
      "lead_list.importStatus",
      "lead_list.source",
      "lead_list.scrapeJobId",
      "lead_list.createdAt",
      "lead_list.updatedAt",
      sql<number>`coalesce(lead_counts."actualCount", 0)`.as("leadCount"),
    ])
    .execute();

  return results as DBLeadList[];
};

export const deleteList = async (id: string) => {
  return db.deleteFrom("lead_list").where("id", "=", id).executeTakeFirst();
};

// Find list by scrapeJobId (for ensuring we don't create duplicate lists)
export const findListByScrapeJobId = async (scrapeJobId: string): Promise<DBLeadList | undefined> => {
  const result = await db
    .selectFrom("lead_list")
    .leftJoin(
      db
        .selectFrom("lead")
        .select(["listId", sql<number>`count(*)::int`.as("actualCount")])
        .groupBy("listId")
        .as("lead_counts"),
      "lead_counts.listId",
      "lead_list.id"
    )
    .where("lead_list.scrapeJobId", "=", scrapeJobId)
    .select([
      "lead_list.id",
      "lead_list.organizationId",
      "lead_list.createdById",
      "lead_list.name",
      "lead_list.description",
      "lead_list.folderId",
      "lead_list.importStatus",
      "lead_list.source",
      "lead_list.scrapeJobId",
      "lead_list.createdAt",
      "lead_list.updatedAt",
      sql<number>`coalesce(lead_counts."actualCount", 0)`.as("leadCount"),
    ])
    .executeTakeFirst();

  return result as DBLeadList | undefined;
};

export const incrementLeadCount = async (id: string, amount: number = 1) => {
  return db
    .updateTable("lead_list")
    .set((eb) => ({
      leadCount: eb("leadCount", "+", amount),
      updatedAt: new Date(),
    }))
    .where("id", "=", id)
    .returningAll()
    .executeTakeFirst();
};

export const updateImportStatus = async (id: string, status: string) => {
  return db
    .updateTable("lead_list")
    .set({ importStatus: status, updatedAt: new Date() })
    .where("id", "=", id)
    .returningAll()
    .executeTakeFirst();
};
