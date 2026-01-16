import { db } from "@/lib/db";
import { sql } from "kysely";
import { withIdAndTimestamps } from "./utils";
import {
  DBEnrichment,
  UpdateDBEnrichment,
  PaginatedResponse,
} from "@shared/types/src";

export type CreateEnrichmentData = {
  organizationId: string;
  userId: string;
  linkedinUrl: string;
  status: string;
  enrichMobile?: boolean;
};

export type FindByOrganizationOptions = {
  page: number;
  limit: number;
  status?: string;
};

export const create = async (data: CreateEnrichmentData) => {
  return db
    .insertInto("enrichment")
    .values(withIdAndTimestamps(data, true))
    .returningAll()
    .executeTakeFirst();
};

export const findById = async (id: string) => {
  return db
    .selectFrom("enrichment")
    .where("id", "=", id)
    .selectAll()
    .executeTakeFirst();
};

export const findByOrganizationId = async (
  organizationId: string,
  options: FindByOrganizationOptions,
): Promise<PaginatedResponse<DBEnrichment>> => {
  // Get total count
  let countQuery = db
    .selectFrom("enrichment")
    .where("organizationId", "=", organizationId);

  if (options.status) {
    countQuery = countQuery.where("status", "=", options.status);
  }

  const countResult = await countQuery
    .select(sql<number>`count(*)::int`.as("count"))
    .executeTakeFirst();

  const total = countResult?.count ?? 0;

  // Get paginated data
  let dataQuery = db
    .selectFrom("enrichment")
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

export const update = async (id: string, data: Partial<UpdateDBEnrichment>) => {
  return db
    .updateTable("enrichment")
    .set({ ...data, updatedAt: new Date() })
    .where("id", "=", id)
    .returningAll()
    .executeTakeFirst();
};

export const deleteById = async (id: string) => {
  return db.deleteFrom("enrichment").where("id", "=", id).executeTakeFirst();
};
