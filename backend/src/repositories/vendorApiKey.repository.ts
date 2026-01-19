import { db } from "@/lib/db";
import { withIdAndTimestamps } from "./utils";
import { EnrichmentVendor } from "@shared/types/src";

export type CreateVendorApiKeyData = {
  organizationId: string;
  vendor: string;
  encryptedKey: string;
  createdById: string;
};

export const create = async (data: CreateVendorApiKeyData) => {
  return db
    .insertInto("vendor_api_key")
    .values(withIdAndTimestamps(data, true))
    .returningAll()
    .executeTakeFirst();
};

export const findByOrgAndVendor = async (
  organizationId: string,
  vendor: string
) => {
  return db
    .selectFrom("vendor_api_key")
    .where("organizationId", "=", organizationId)
    .where("vendor", "=", vendor)
    .where("isActive", "=", true)
    .selectAll()
    .executeTakeFirst();
};

export const findAllByOrganization = async (organizationId: string) => {
  return db
    .selectFrom("vendor_api_key")
    .where("organizationId", "=", organizationId)
    .where("isActive", "=", true)
    .selectAll()
    .execute();
};

export const update = async (
  organizationId: string,
  vendor: string,
  data: { encryptedKey?: string; isActive?: boolean }
) => {
  return db
    .updateTable("vendor_api_key")
    .set({ ...data, updatedAt: new Date() })
    .where("organizationId", "=", organizationId)
    .where("vendor", "=", vendor)
    .returningAll()
    .executeTakeFirst();
};

export const upsert = async (data: CreateVendorApiKeyData) => {
  // Try to find existing
  const existing = await findByOrgAndVendor(data.organizationId, data.vendor);

  if (existing) {
    return update(data.organizationId, data.vendor, {
      encryptedKey: data.encryptedKey,
      isActive: true,
    });
  }

  return create(data);
};

export const deleteByOrgAndVendor = async (
  organizationId: string,
  vendor: string
) => {
  // Soft delete by setting isActive to false
  return db
    .updateTable("vendor_api_key")
    .set({ isActive: false, updatedAt: new Date() })
    .where("organizationId", "=", organizationId)
    .where("vendor", "=", vendor)
    .returningAll()
    .executeTakeFirst();
};
