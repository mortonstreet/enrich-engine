import { db } from "@/lib/db";
import { sql } from "kysely";
import { withIdAndTimestamps } from "./utils";
import { EmailValidationStatus } from "@shared/types/src";

export type CreateEmailValidationAttemptData = {
  jobItemId: string;
  leadId: string;
  email: string;
  pattern: string;
};

// ============================================
// Email Validation Attempt Operations
// ============================================

export const create = async (data: CreateEmailValidationAttemptData) => {
  return db
    .insertInto("email_validation_attempt")
    .values(
      withIdAndTimestamps(
        {
          ...data,
          status: "pending",
        },
        true
      )
    )
    .returningAll()
    .executeTakeFirst();
};

export const bulkCreate = async (
  attempts: CreateEmailValidationAttemptData[]
) => {
  if (attempts.length === 0) return [];

  const attemptsWithIds = attempts.map((attempt) =>
    withIdAndTimestamps({ ...attempt, status: "pending" }, true)
  );

  return db
    .insertInto("email_validation_attempt")
    .values(attemptsWithIds)
    .returningAll()
    .execute();
};

export const findById = async (id: string) => {
  return db
    .selectFrom("email_validation_attempt")
    .where("id", "=", id)
    .selectAll()
    .executeTakeFirst();
};

export const findByJobItemId = async (jobItemId: string) => {
  return db
    .selectFrom("email_validation_attempt")
    .where("jobItemId", "=", jobItemId)
    .orderBy("createdAt", "asc")
    .selectAll()
    .execute();
};

export const findByLeadId = async (leadId: string) => {
  return db
    .selectFrom("email_validation_attempt")
    .where("leadId", "=", leadId)
    .orderBy("createdAt", "desc")
    .selectAll()
    .execute();
};

export const findPendingByJobItemId = async (jobItemId: string) => {
  return db
    .selectFrom("email_validation_attempt")
    .where("jobItemId", "=", jobItemId)
    .where("status", "=", "pending")
    .orderBy("createdAt", "asc")
    .selectAll()
    .execute();
};

export const updateStatus = async (
  id: string,
  status: EmailValidationStatus,
  validationResponse?: object
) => {
  return db
    .updateTable("email_validation_attempt")
    .set({
      status,
      validationResponse: validationResponse
        ? JSON.stringify(validationResponse)
        : null,
      processedAt: new Date(),
    })
    .where("id", "=", id)
    .returningAll()
    .executeTakeFirst();
};

export const findValidAttemptForLead = async (leadId: string) => {
  return db
    .selectFrom("email_validation_attempt")
    .where("leadId", "=", leadId)
    .where("status", "=", "valid")
    .orderBy("createdAt", "desc")
    .selectAll()
    .executeTakeFirst();
};

export const countByStatus = async (jobItemId: string) => {
  const result = await db
    .selectFrom("email_validation_attempt")
    .where("jobItemId", "=", jobItemId)
    .select([
      sql<number>`count(*) filter (where status = 'pending')::int`.as("pending"),
      sql<number>`count(*) filter (where status = 'valid')::int`.as("valid"),
      sql<number>`count(*) filter (where status = 'bounced')::int`.as("bounced"),
      sql<number>`count(*) filter (where status = 'catch_all')::int`.as("catchAll"),
      sql<number>`count(*) filter (where status = 'unknown')::int`.as("unknown"),
      sql<number>`count(*) filter (where status = 'error')::int`.as("error"),
    ])
    .executeTakeFirst();

  return (
    result ?? {
      pending: 0,
      valid: 0,
      bounced: 0,
      catchAll: 0,
      unknown: 0,
      error: 0,
    }
  );
};

export const deleteByJobItemId = async (jobItemId: string) => {
  return db
    .deleteFrom("email_validation_attempt")
    .where("jobItemId", "=", jobItemId)
    .execute();
};
