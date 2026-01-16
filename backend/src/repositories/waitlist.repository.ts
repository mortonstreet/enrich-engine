import { db } from "@/lib/db";
import { withIdAndTimestamps } from "./utils";

export type CreateWaitlistData = {
  email: string;
  source?: string | null;
};

export const create = async (data: CreateWaitlistData) => {
  return db
    .insertInto("waitlist")
    .values(
      withIdAndTimestamps(
        { email: data.email, source: data.source ?? null },
        true,
      ),
    )
    .returningAll()
    .executeTakeFirst();
};

export const findByEmail = async (email: string) => {
  return db
    .selectFrom("waitlist")
    .where("email", "=", email)
    .selectAll()
    .executeTakeFirst();
};

export const findAll = async () => {
  return db
    .selectFrom("waitlist")
    .orderBy("createdAt", "desc")
    .selectAll()
    .execute();
};

export const deleteByEmail = async (email: string) => {
  return db
    .deleteFrom("waitlist")
    .where("email", "=", email)
    .executeTakeFirst();
};
