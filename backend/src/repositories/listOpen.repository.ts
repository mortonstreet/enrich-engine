import { db } from "@/lib/db";
import { DBListOpen } from "@shared/db/src/types";

export type CreateOpenData = {
  userId: string;
  listId?: string | null;
  folderId?: string | null;
};

export const create = async (data: CreateOpenData): Promise<DBListOpen | undefined> => {
  return db
    .insertInto("list_open")
    .values({
      ...data,
      id: crypto.randomUUID(),
      openedAt: new Date(),
    })
    .returningAll()
    .executeTakeFirst();
};

export const findByUserId = async (userId: string, limit: number = 20): Promise<DBListOpen[]> => {
  return db
    .selectFrom("list_open")
    .where("userId", "=", userId)
    .orderBy("openedAt", "desc")
    .limit(limit)
    .selectAll()
    .execute();
};

export const findRecentListIds = async (userId: string, limit: number = 20): Promise<string[]> => {
  const opens = await db
    .selectFrom("list_open")
    .where("userId", "=", userId)
    .where("listId", "is not", null)
    .orderBy("openedAt", "desc")
    .limit(limit)
    .select("listId")
    .distinct()
    .execute();
  return opens.map((o) => o.listId!);
};

export const findRecentFolderIds = async (userId: string, limit: number = 20): Promise<string[]> => {
  const opens = await db
    .selectFrom("list_open")
    .where("userId", "=", userId)
    .where("folderId", "is not", null)
    .orderBy("openedAt", "desc")
    .limit(limit)
    .select("folderId")
    .distinct()
    .execute();
  return opens.map((o) => o.folderId!);
};

export const getLastOpenedAt = async (
  userId: string,
  listId: string,
): Promise<Date | null> => {
  const open = await db
    .selectFrom("list_open")
    .where("userId", "=", userId)
    .where("listId", "=", listId)
    .orderBy("openedAt", "desc")
    .select("openedAt")
    .executeTakeFirst();
  return open?.openedAt ?? null;
};

export const getLastOpenedAtForFolder = async (
  userId: string,
  folderId: string,
): Promise<Date | null> => {
  const open = await db
    .selectFrom("list_open")
    .where("userId", "=", userId)
    .where("folderId", "=", folderId)
    .orderBy("openedAt", "desc")
    .select("openedAt")
    .executeTakeFirst();
  return open?.openedAt ?? null;
};

export const getLastOpenedAtMap = async (
  userId: string,
  listIds: string[],
): Promise<Map<string, Date>> => {
  if (listIds.length === 0) return new Map();

  const opens = await db
    .selectFrom("list_open")
    .where("userId", "=", userId)
    .where("listId", "in", listIds)
    .orderBy("openedAt", "desc")
    .select(["listId", "openedAt"])
    .execute();

  const map = new Map<string, Date>();
  for (const open of opens) {
    if (open.listId && !map.has(open.listId)) {
      map.set(open.listId, open.openedAt);
    }
  }
  return map;
};

export const getLastOpenedAtMapForFolders = async (
  userId: string,
  folderIds: string[],
): Promise<Map<string, Date>> => {
  if (folderIds.length === 0) return new Map();

  const opens = await db
    .selectFrom("list_open")
    .where("userId", "=", userId)
    .where("folderId", "in", folderIds)
    .orderBy("openedAt", "desc")
    .select(["folderId", "openedAt"])
    .execute();

  const map = new Map<string, Date>();
  for (const open of opens) {
    if (open.folderId && !map.has(open.folderId)) {
      map.set(open.folderId, open.openedAt);
    }
  }
  return map;
};
