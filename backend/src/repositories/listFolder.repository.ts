import { db } from "@/lib/db";
import { withIdAndTimestamps } from "./utils";
import { DBLeadListFolder, UpdateDBLeadListFolder } from "@shared/db/src/types";

export type CreateFolderData = {
  organizationId: string;
  createdById: string;
  name: string;
  parentId?: string | null;
  order?: number;
};

export type FindFoldersOptions = {
  parentId?: string | null;
  search?: string;
  ownerId?: string;
};

export const create = async (data: CreateFolderData): Promise<DBLeadListFolder | undefined> => {
  return db
    .insertInto("lead_list_folder")
    .values(withIdAndTimestamps(data, true))
    .returningAll()
    .executeTakeFirst();
};

export const findById = async (id: string): Promise<DBLeadListFolder | undefined> => {
  return db
    .selectFrom("lead_list_folder")
    .where("id", "=", id)
    .selectAll()
    .executeTakeFirst();
};

export const findByOrganizationId = async (
  organizationId: string,
  options: FindFoldersOptions = {},
): Promise<DBLeadListFolder[]> => {
  let query = db
    .selectFrom("lead_list_folder")
    .where("organizationId", "=", organizationId);

  if (options.parentId !== undefined) {
    if (options.parentId === null) {
      query = query.where("parentId", "is", null);
    } else {
      query = query.where("parentId", "=", options.parentId);
    }
  }

  if (options.search) {
    query = query.where("name", "ilike", `%${options.search}%`);
  }

  if (options.ownerId) {
    query = query.where("createdById", "=", options.ownerId);
  }

  return query.orderBy("order", "asc").orderBy("createdAt", "desc").selectAll().execute();
};

export const update = async (
  id: string,
  data: Partial<UpdateDBLeadListFolder>,
): Promise<DBLeadListFolder | undefined> => {
  return db
    .updateTable("lead_list_folder")
    .set({ ...data, updatedAt: new Date() })
    .where("id", "=", id)
    .returningAll()
    .executeTakeFirst();
};

export const deleteById = async (id: string) => {
  return db.deleteFrom("lead_list_folder").where("id", "=", id).executeTakeFirst();
};

export const findAllByOrganizationId = async (
  organizationId: string,
): Promise<DBLeadListFolder[]> => {
  return db
    .selectFrom("lead_list_folder")
    .where("organizationId", "=", organizationId)
    .orderBy("order", "asc")
    .orderBy("name", "asc")
    .selectAll()
    .execute();
};
