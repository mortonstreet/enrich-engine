import { db } from "@/lib/db";
import { sql } from "kysely";
import { withIdAndTimestamps, withId } from "./utils";
import {
  DBCompanySearchJob,
  DBCompanySearchItem,
  UpdateDBCompanySearchJob,
  PaginatedResponse,
} from "@shared/types/src";

export type CreateCompanySearchJobData = {
  organizationId: string;
  userId: string;
  name: string;
  naturalLanguageQuery: string;
  generatedSearchQuery?: string;
  finalSearchQuery?: string;
  maxPages?: number;
  status?: string;
  queryVariations?: unknown;
};

export type CreateCompanySearchItemData = {
  jobId: string;
  companyName: string;
  linkedinUrl?: string | null;
  companyDomain?: string | null;
  source?: string | null;
  serperPosition?: number | null;
  isDuplicate?: boolean;
  duplicateOfId?: string | null;
  rawSnippet?: string | null;
};

export type FindByOrganizationOptions = {
  page: number;
  limit: number;
  status?: string;
};

// ============================================
// CompanySearchJob Operations
// ============================================

export const create = async (data: CreateCompanySearchJobData): Promise<DBCompanySearchJob | undefined> => {
  return db
    .insertInto("company_search_job")
    .values(withIdAndTimestamps(data, true))
    .returningAll()
    .executeTakeFirst();
};

export const findById = async (id: string): Promise<DBCompanySearchJob | undefined> => {
  return db
    .selectFrom("company_search_job")
    .where("id", "=", id)
    .selectAll()
    .executeTakeFirst();
};

export const findByIdWithItems = async (id: string): Promise<{
  job: DBCompanySearchJob | undefined;
  items: DBCompanySearchItem[];
}> => {
  const job = await findById(id);
  if (!job) {
    return { job: undefined, items: [] };
  }

  const items = await db
    .selectFrom("company_search_item")
    .where("jobId", "=", id)
    .where("isDuplicate", "=", false)
    .orderBy("createdAt", "asc")
    .selectAll()
    .execute();

  return { job, items };
};

export const findByOrganizationId = async (
  organizationId: string,
  options: FindByOrganizationOptions,
): Promise<PaginatedResponse<DBCompanySearchJob>> => {
  let countQuery = db
    .selectFrom("company_search_job")
    .where("organizationId", "=", organizationId);

  if (options.status) {
    countQuery = countQuery.where("status", "=", options.status);
  }

  const countResult = await countQuery
    .select(sql<number>`count(*)::int`.as("count"))
    .executeTakeFirst();

  const total = countResult?.count ?? 0;

  let dataQuery = db
    .selectFrom("company_search_job")
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

export const update = async (id: string, data: Partial<UpdateDBCompanySearchJob>): Promise<DBCompanySearchJob | undefined> => {
  return db
    .updateTable("company_search_job")
    .set({ ...data, updatedAt: new Date() })
    .where("id", "=", id)
    .returningAll()
    .executeTakeFirst();
};

export const deleteById = async (id: string) => {
  return db.deleteFrom("company_search_job").where("id", "=", id).executeTakeFirst();
};

// ============================================
// CompanySearchItem Operations
// ============================================

export const createItems = async (items: CreateCompanySearchItemData[]): Promise<DBCompanySearchItem[]> => {
  if (items.length === 0) return [];

  const values = items.map((item) => ({
    ...withId(item),
    createdAt: new Date(),
  }));

  return db
    .insertInto("company_search_item")
    .values(values)
    .returningAll()
    .execute();
};

export const findDedupedItemsByJobId = async (jobId: string): Promise<DBCompanySearchItem[]> => {
  return db
    .selectFrom("company_search_item")
    .where("jobId", "=", jobId)
    .where("isDuplicate", "=", false)
    .orderBy("createdAt", "asc")
    .selectAll()
    .execute();
};

export const findAllItemsByJobId = async (jobId: string): Promise<DBCompanySearchItem[]> => {
  return db
    .selectFrom("company_search_item")
    .where("jobId", "=", jobId)
    .orderBy("createdAt", "asc")
    .selectAll()
    .execute();
};

export const markDuplicates = async (
  itemIds: string[],
  duplicateOfId: string
): Promise<number> => {
  if (itemIds.length === 0) return 0;

  const result = await db
    .updateTable("company_search_item")
    .set({ isDuplicate: true, duplicateOfId })
    .where("id", "in", itemIds)
    .executeTakeFirst();

  return Number(result.numUpdatedRows ?? 0);
};

export const getJobProgress = async (jobId: string): Promise<{
  rawResultCount: number;
  dedupedResultCount: number;
}> => {
  const result = await db
    .selectFrom("company_search_item")
    .where("jobId", "=", jobId)
    .select([
      sql<number>`count(*)::int`.as("rawResultCount"),
      sql<number>`count(*) filter (where "isDuplicate" = false)::int`.as("dedupedResultCount"),
    ])
    .executeTakeFirst();

  return {
    rawResultCount: result?.rawResultCount ?? 0,
    dedupedResultCount: result?.dedupedResultCount ?? 0,
  };
};
