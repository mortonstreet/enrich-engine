import { db } from "@/lib/db";
import { withIdAndTimestamps } from "./utils";
import { ExternalApiScope } from "@shared/types/src";

export type CreateExternalApiKeyData = {
  organizationId: string;
  name: string;
  keyPrefix: string;
  hashedKey: string;
  scopes: ExternalApiScope[];
  createdById: string;
  expiresAt?: Date | null;
};

export const create = async (data: CreateExternalApiKeyData) => {
  return db
    .insertInto("external_api_key")
    .values(withIdAndTimestamps(data, true))
    .returningAll()
    .executeTakeFirst();
};

export const findById = async (id: string) => {
  return db
    .selectFrom("external_api_key")
    .where("id", "=", id)
    .selectAll()
    .executeTakeFirst();
};

export const findByPrefix = async (keyPrefix: string) => {
  return db
    .selectFrom("external_api_key")
    .where("keyPrefix", "=", keyPrefix)
    .where("isActive", "=", true)
    .selectAll()
    .executeTakeFirst();
};

export const findAllByOrganization = async (organizationId: string) => {
  return db
    .selectFrom("external_api_key")
    .where("organizationId", "=", organizationId)
    .where("isActive", "=", true)
    .orderBy("createdAt", "desc")
    .selectAll()
    .execute();
};

export const findByIdAndOrganization = async (
  id: string,
  organizationId: string
) => {
  return db
    .selectFrom("external_api_key")
    .where("id", "=", id)
    .where("organizationId", "=", organizationId)
    .selectAll()
    .executeTakeFirst();
};

export const update = async (
  id: string,
  data: {
    name?: string;
    scopes?: ExternalApiScope[];
    isActive?: boolean;
  }
) => {
  return db
    .updateTable("external_api_key")
    .set({ ...data, updatedAt: new Date() })
    .where("id", "=", id)
    .returningAll()
    .executeTakeFirst();
};

export const updateLastUsed = async (id: string) => {
  return db
    .updateTable("external_api_key")
    .set({ lastUsedAt: new Date(), updatedAt: new Date() })
    .where("id", "=", id)
    .execute();
};

export const deleteById = async (id: string, organizationId: string) => {
  // Soft delete by setting isActive to false
  return db
    .updateTable("external_api_key")
    .set({ isActive: false, updatedAt: new Date() })
    .where("id", "=", id)
    .where("organizationId", "=", organizationId)
    .returningAll()
    .executeTakeFirst();
};

export const getCreatorInfo = async (userId: string) => {
  return db
    .selectFrom("user")
    .where("id", "=", userId)
    .select(["id", "name", "email"])
    .executeTakeFirst();
};
