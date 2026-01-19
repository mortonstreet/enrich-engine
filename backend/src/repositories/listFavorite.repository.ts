import { db } from "@/lib/db";
import { withIdAndTimestamps } from "./utils";
import { DBListFavorite } from "@shared/db/src/types";

export type CreateFavoriteData = {
  userId: string;
  listId?: string | null;
  folderId?: string | null;
};

export const create = async (data: CreateFavoriteData): Promise<DBListFavorite | undefined> => {
  return db
    .insertInto("list_favorite")
    .values({
      ...data,
      id: crypto.randomUUID(),
      createdAt: new Date(),
    })
    .returningAll()
    .executeTakeFirst();
};

export const findById = async (id: string): Promise<DBListFavorite | undefined> => {
  return db
    .selectFrom("list_favorite")
    .where("id", "=", id)
    .selectAll()
    .executeTakeFirst();
};

export const findByUserId = async (userId: string): Promise<DBListFavorite[]> => {
  return db
    .selectFrom("list_favorite")
    .where("userId", "=", userId)
    .orderBy("createdAt", "desc")
    .selectAll()
    .execute();
};

export const findByUserAndList = async (
  userId: string,
  listId: string,
): Promise<DBListFavorite | undefined> => {
  return db
    .selectFrom("list_favorite")
    .where("userId", "=", userId)
    .where("listId", "=", listId)
    .selectAll()
    .executeTakeFirst();
};

export const findByUserAndFolder = async (
  userId: string,
  folderId: string,
): Promise<DBListFavorite | undefined> => {
  return db
    .selectFrom("list_favorite")
    .where("userId", "=", userId)
    .where("folderId", "=", folderId)
    .selectAll()
    .executeTakeFirst();
};

export const deleteById = async (id: string) => {
  return db.deleteFrom("list_favorite").where("id", "=", id).executeTakeFirst();
};

export const deleteByUserAndList = async (userId: string, listId: string) => {
  return db
    .deleteFrom("list_favorite")
    .where("userId", "=", userId)
    .where("listId", "=", listId)
    .executeTakeFirst();
};

export const deleteByUserAndFolder = async (userId: string, folderId: string) => {
  return db
    .deleteFrom("list_favorite")
    .where("userId", "=", userId)
    .where("folderId", "=", folderId)
    .executeTakeFirst();
};

export const getListFavoriteIds = async (userId: string): Promise<string[]> => {
  const favorites = await db
    .selectFrom("list_favorite")
    .where("userId", "=", userId)
    .where("listId", "is not", null)
    .select("listId")
    .execute();
  return favorites.map((f) => f.listId!);
};

export const getFolderFavoriteIds = async (userId: string): Promise<string[]> => {
  const favorites = await db
    .selectFrom("list_favorite")
    .where("userId", "=", userId)
    .where("folderId", "is not", null)
    .select("folderId")
    .execute();
  return favorites.map((f) => f.folderId!);
};
