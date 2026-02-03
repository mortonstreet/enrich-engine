import { db } from "@/lib/db";
import { sql } from "kysely";
import { withIdAndTimestamps } from "./utils";
import { DBLead, UpdateDBLead } from "@shared/db/src/types";
import { PaginatedResponse } from "@shared/types/src";

export type CreateLeadData = {
  listId: string;
  organizationId: string;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
  company?: string | null;
  role?: string | null;
  linkedinUrl?: string | null;
  companyDomain?: string | null;
  customFields?: Record<string, unknown>;
};

export type FindLeadsOptions = {
  page: number;
  limit: number;
  search?: string;
};

export const create = async (data: CreateLeadData): Promise<DBLead | undefined> => {
  return db
    .insertInto("lead")
    .values(withIdAndTimestamps(data, true))
    .returningAll()
    .executeTakeFirst();
};

export const findById = async (id: string): Promise<DBLead | undefined> => {
  return db
    .selectFrom("lead")
    .where("id", "=", id)
    .selectAll()
    .executeTakeFirst();
};

export const findByListId = async (
  listId: string,
  options: FindLeadsOptions,
): Promise<PaginatedResponse<DBLead>> => {
  let countQuery = db
    .selectFrom("lead")
    .where("listId", "=", listId);

  let dataQuery = db
    .selectFrom("lead")
    .where("listId", "=", listId);

  if (options.search) {
    const searchCondition = (eb: any) =>
      eb.or([
        eb("firstName", "ilike", `%${options.search}%`),
        eb("lastName", "ilike", `%${options.search}%`),
        eb("email", "ilike", `%${options.search}%`),
        eb("company", "ilike", `%${options.search}%`),
        eb("role", "ilike", `%${options.search}%`),
      ]);
    countQuery = countQuery.where(searchCondition);
    dataQuery = dataQuery.where(searchCondition);
  }

  const countResult = await countQuery
    .select(sql<number>`count(*)::int`.as("count"))
    .executeTakeFirst();

  const total = countResult?.count ?? 0;

  const data = await dataQuery
    .orderBy("createdAt", "desc")
    .limit(options.limit)
    .offset((options.page - 1) * options.limit)
    .selectAll()
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

export const update = async (
  id: string,
  data: Partial<UpdateDBLead>,
): Promise<DBLead | undefined> => {
  return db
    .updateTable("lead")
    .set({ ...data, updatedAt: new Date() })
    .where("id", "=", id)
    .returningAll()
    .executeTakeFirst();
};

export const deleteById = async (id: string) => {
  return db.deleteFrom("lead").where("id", "=", id).executeTakeFirst();
};

export const deleteByListId = async (listId: string) => {
  return db.deleteFrom("lead").where("listId", "=", listId).execute();
};

export const countByListId = async (listId: string): Promise<number> => {
  const result = await db
    .selectFrom("lead")
    .where("listId", "=", listId)
    .select(sql<number>`count(*)::int`.as("count"))
    .executeTakeFirst();
  return result?.count ?? 0;
};

export const findAllByListId = async (listId: string): Promise<DBLead[]> => {
  return db
    .selectFrom("lead")
    .where("listId", "=", listId)
    .orderBy("createdAt", "asc")
    .selectAll()
    .execute();
};

export const findByListIdWithLinkedin = async (listId: string): Promise<DBLead[]> => {
  return db
    .selectFrom("lead")
    .where("listId", "=", listId)
    .where("linkedinUrl", "is not", null)
    .where("linkedinUrl", "!=", "")
    .orderBy("createdAt", "asc")
    .selectAll()
    .execute();
};

export const hasLinkedinColumn = async (listId: string): Promise<boolean> => {
  const result = await db
    .selectFrom("lead")
    .where("listId", "=", listId)
    .where("linkedinUrl", "is not", null)
    .where("linkedinUrl", "!=", "")
    .select(sql<number>`1`.as("exists"))
    .limit(1)
    .executeTakeFirst();
  return !!result;
};

export const countLeadsWithLinkedin = async (listId: string): Promise<number> => {
  const result = await db
    .selectFrom("lead")
    .where("listId", "=", listId)
    .where("linkedinUrl", "is not", null)
    .where("linkedinUrl", "!=", "")
    .select(sql<number>`count(*)::int`.as("count"))
    .executeTakeFirst();
  return result?.count ?? 0;
};

export type FindAllLeadsOptions = {
  page: number;
  limit: number;
  search?: string;
  listId?: string;
};

export type LeadWithList = DBLead & { listName: string };

export const findAllByOrganization = async (
  organizationId: string,
  options: FindAllLeadsOptions,
): Promise<PaginatedResponse<LeadWithList>> => {
  let countQuery = db
    .selectFrom("lead")
    .innerJoin("lead_list", "lead.listId", "lead_list.id")
    .where("lead.organizationId", "=", organizationId);

  let dataQuery = db
    .selectFrom("lead")
    .innerJoin("lead_list", "lead.listId", "lead_list.id")
    .where("lead.organizationId", "=", organizationId);

  if (options.listId) {
    countQuery = countQuery.where("lead.listId", "=", options.listId);
    dataQuery = dataQuery.where("lead.listId", "=", options.listId);
  }

  if (options.search) {
    const searchCondition = (eb: any) =>
      eb.or([
        eb("lead.firstName", "ilike", `%${options.search}%`),
        eb("lead.lastName", "ilike", `%${options.search}%`),
        eb("lead.email", "ilike", `%${options.search}%`),
        eb("lead.company", "ilike", `%${options.search}%`),
        eb("lead.role", "ilike", `%${options.search}%`),
        eb("lead_list.name", "ilike", `%${options.search}%`),
      ]);
    countQuery = countQuery.where(searchCondition);
    dataQuery = dataQuery.where(searchCondition);
  }

  const countResult = await countQuery
    .select(sql<number>`count(*)::int`.as("count"))
    .executeTakeFirst();

  const total = countResult?.count ?? 0;

  const data = await dataQuery
    .orderBy("lead.createdAt", "desc")
    .limit(options.limit)
    .offset((options.page - 1) * options.limit)
    .select([
      "lead.id",
      "lead.listId",
      "lead.organizationId",
      "lead.firstName",
      "lead.lastName",
      "lead.email",
      "lead.phone",
      "lead.company",
      "lead.role",
      "lead.linkedinUrl",
      "lead.customFields",
      "lead.createdAt",
      "lead.updatedAt",
      "lead_list.name as listName",
    ])
    .execute();

  const totalPages = Math.ceil(total / options.limit);

  return {
    data: data as LeadWithList[],
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

export const findByIds = async (
  ids: string[],
  organizationId: string,
): Promise<DBLead[]> => {
  if (ids.length === 0) return [];
  return db
    .selectFrom("lead")
    .where("id", "in", ids)
    .where("organizationId", "=", organizationId)
    .selectAll()
    .execute();
};

export const bulkCreate = async (
  leads: CreateLeadData[],
): Promise<DBLead[]> => {
  if (leads.length === 0) return [];
  return db
    .insertInto("lead")
    .values(leads.map((lead) => withIdAndTimestamps(lead, true)))
    .returningAll()
    .execute();
};

// Check if LinkedIn URL already exists in organization (for global deduplication)
export const findByLinkedinUrlInOrganization = async (
  organizationId: string,
  linkedinUrl: string,
): Promise<DBLead | undefined> => {
  // Normalize URL for comparison (lowercase, no trailing slash)
  const normalizedUrl = linkedinUrl.toLowerCase().trim().replace(/\/$/, "");

  return db
    .selectFrom("lead")
    .where("organizationId", "=", organizationId)
    .where(sql`lower(trim(trailing '/' from "linkedinUrl"))`, "=", normalizedUrl)
    .selectAll()
    .executeTakeFirst();
};

// Get all LinkedIn URLs in organization for batch deduplication
export const getAllLinkedinUrlsInOrganization = async (
  organizationId: string,
): Promise<Set<string>> => {
  const leads = await db
    .selectFrom("lead")
    .where("organizationId", "=", organizationId)
    .where("linkedinUrl", "is not", null)
    .where("linkedinUrl", "!=", "")
    .select("linkedinUrl")
    .execute();

  return new Set(
    leads
      .filter((l) => l.linkedinUrl)
      .map((l) => l.linkedinUrl!.toLowerCase().trim().replace(/\/$/, ""))
  );
};

// Get counts of existing leads per company+role combination (for dedup pre-filtering)
export const getCompanyRoleCounts = async (
  organizationId: string,
  companyNames: string[],
  roleNames: string[],
): Promise<Map<string, number>> => {
  if (companyNames.length === 0 || roleNames.length === 0) return new Map();

  const results = await db
    .selectFrom("lead")
    .where("organizationId", "=", organizationId)
    .where("company", "in", companyNames)
    .where("role", "in", roleNames)
    .where("linkedinUrl", "is not", null)
    .where("linkedinUrl", "!=", "")
    .select(["company", "role"])
    .select(sql<number>`count(*)::int`.as("count"))
    .groupBy(["company", "role"])
    .execute();

  const map = new Map<string, number>();
  for (const row of results) {
    if (row.company && row.role) {
      map.set(`${row.company}|${row.role}`, row.count);
    }
  }

  return map;
};

// Advanced filtering for list building
export type FilterLeadsOptions = {
  page: number;
  limit: number;
  search?: string;
  listId?: string;
  company?: string;
  role?: string;
  hasEmail?: boolean;
  hasPhone?: boolean;
  hasLinkedinUrl?: boolean;
  createdAfter?: Date;
  createdBefore?: Date;
};

export const findAllByOrganizationWithFilters = async (
  organizationId: string,
  options: FilterLeadsOptions,
): Promise<PaginatedResponse<LeadWithList>> => {
  let countQuery = db
    .selectFrom("lead")
    .innerJoin("lead_list", "lead.listId", "lead_list.id")
    .where("lead.organizationId", "=", organizationId);

  let dataQuery = db
    .selectFrom("lead")
    .innerJoin("lead_list", "lead.listId", "lead_list.id")
    .where("lead.organizationId", "=", organizationId);

  // Apply filters
  if (options.listId) {
    countQuery = countQuery.where("lead.listId", "=", options.listId);
    dataQuery = dataQuery.where("lead.listId", "=", options.listId);
  }

  if (options.company) {
    countQuery = countQuery.where("lead.company", "ilike", `%${options.company}%`);
    dataQuery = dataQuery.where("lead.company", "ilike", `%${options.company}%`);
  }

  if (options.role) {
    countQuery = countQuery.where("lead.role", "ilike", `%${options.role}%`);
    dataQuery = dataQuery.where("lead.role", "ilike", `%${options.role}%`);
  }

  if (options.hasEmail === true) {
    countQuery = countQuery.where("lead.email", "is not", null).where("lead.email", "!=", "");
    dataQuery = dataQuery.where("lead.email", "is not", null).where("lead.email", "!=", "");
  } else if (options.hasEmail === false) {
    countQuery = countQuery.where((eb) => eb.or([
      eb("lead.email", "is", null),
      eb("lead.email", "=", "")
    ]));
    dataQuery = dataQuery.where((eb) => eb.or([
      eb("lead.email", "is", null),
      eb("lead.email", "=", "")
    ]));
  }

  if (options.hasPhone === true) {
    countQuery = countQuery.where("lead.phone", "is not", null).where("lead.phone", "!=", "");
    dataQuery = dataQuery.where("lead.phone", "is not", null).where("lead.phone", "!=", "");
  } else if (options.hasPhone === false) {
    countQuery = countQuery.where((eb) => eb.or([
      eb("lead.phone", "is", null),
      eb("lead.phone", "=", "")
    ]));
    dataQuery = dataQuery.where((eb) => eb.or([
      eb("lead.phone", "is", null),
      eb("lead.phone", "=", "")
    ]));
  }

  if (options.hasLinkedinUrl === true) {
    countQuery = countQuery.where("lead.linkedinUrl", "is not", null).where("lead.linkedinUrl", "!=", "");
    dataQuery = dataQuery.where("lead.linkedinUrl", "is not", null).where("lead.linkedinUrl", "!=", "");
  } else if (options.hasLinkedinUrl === false) {
    countQuery = countQuery.where((eb) => eb.or([
      eb("lead.linkedinUrl", "is", null),
      eb("lead.linkedinUrl", "=", "")
    ]));
    dataQuery = dataQuery.where((eb) => eb.or([
      eb("lead.linkedinUrl", "is", null),
      eb("lead.linkedinUrl", "=", "")
    ]));
  }

  if (options.createdAfter) {
    countQuery = countQuery.where("lead.createdAt", ">=", options.createdAfter);
    dataQuery = dataQuery.where("lead.createdAt", ">=", options.createdAfter);
  }

  if (options.createdBefore) {
    countQuery = countQuery.where("lead.createdAt", "<=", options.createdBefore);
    dataQuery = dataQuery.where("lead.createdAt", "<=", options.createdBefore);
  }

  if (options.search) {
    const searchCondition = (eb: any) =>
      eb.or([
        eb("lead.firstName", "ilike", `%${options.search}%`),
        eb("lead.lastName", "ilike", `%${options.search}%`),
        eb("lead.email", "ilike", `%${options.search}%`),
        eb("lead.company", "ilike", `%${options.search}%`),
        eb("lead.role", "ilike", `%${options.search}%`),
        eb("lead_list.name", "ilike", `%${options.search}%`),
      ]);
    countQuery = countQuery.where(searchCondition);
    dataQuery = dataQuery.where(searchCondition);
  }

  const countResult = await countQuery
    .select(sql<number>`count(*)::int`.as("count"))
    .executeTakeFirst();

  const total = countResult?.count ?? 0;

  const data = await dataQuery
    .orderBy("lead.createdAt", "desc")
    .limit(options.limit)
    .offset((options.page - 1) * options.limit)
    .select([
      "lead.id",
      "lead.listId",
      "lead.organizationId",
      "lead.firstName",
      "lead.lastName",
      "lead.email",
      "lead.phone",
      "lead.company",
      "lead.role",
      "lead.linkedinUrl",
      "lead.customFields",
      "lead.createdAt",
      "lead.updatedAt",
      "lead_list.name as listName",
    ])
    .execute();

  const totalPages = Math.ceil(total / options.limit);

  return {
    data: data as LeadWithList[],
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

// Get unique companies in organization for filtering
export const getUniqueCompanies = async (
  organizationId: string,
): Promise<string[]> => {
  const results = await db
    .selectFrom("lead")
    .where("organizationId", "=", organizationId)
    .where("company", "is not", null)
    .where("company", "!=", "")
    .select("company")
    .distinct()
    .orderBy("company", "asc")
    .limit(100)
    .execute();

  return results.map((r) => r.company!);
};

// Get unique roles in organization for filtering
export const getUniqueRoles = async (
  organizationId: string,
): Promise<string[]> => {
  const results = await db
    .selectFrom("lead")
    .where("organizationId", "=", organizationId)
    .where("role", "is not", null)
    .where("role", "!=", "")
    .select("role")
    .distinct()
    .orderBy("role", "asc")
    .limit(100)
    .execute();

  return results.map((r) => r.role!);
};
