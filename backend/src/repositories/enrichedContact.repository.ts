import { db } from "@/lib/db";
import { sql } from "kysely";
import { withIdAndTimestamps } from "./utils";
import { DBEnrichedContact, UpdateDBEnrichedContact } from "@shared/db/src/types";
import * as crypto from "crypto";

export type CreateEnrichedContactData = {
  organizationId: string;
  linkedinUrl?: string | null;
  emailNormalized?: string | null;
  nameHash?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
  company?: string | null;
  companyDomain?: string | null;
  role?: string | null;
  emailPattern?: string | null;
  emailSource?: string | null;
  icpScore?: number | null;
  icpContext?: Record<string, unknown> | null;
};

/**
 * Normalize a LinkedIn URL for consistent deduplication
 */
export function normalizeLinkedinUrl(url: string | null | undefined): string | null {
  if (!url) return null;

  // Lowercase, trim, remove trailing slash
  let normalized = url.toLowerCase().trim().replace(/\/$/, "");

  // Extract just the profile path (e.g., /in/username)
  const match = normalized.match(/linkedin\.com(\/in\/[^/?#]+)/);
  if (match) {
    normalized = `https://www.linkedin.com${match[1]}`;
  }

  return normalized;
}

/**
 * Normalize an email for consistent deduplication
 */
export function normalizeEmail(email: string | null | undefined): string | null {
  if (!email) return null;
  return email.toLowerCase().trim();
}

/**
 * Generate a name hash for deduplication when no LinkedIn URL available
 */
export function generateNameHash(
  firstName: string | null | undefined,
  lastName: string | null | undefined,
  company: string | null | undefined
): string | null {
  if (!firstName || !lastName || !company) return null;

  const normalized = `${firstName.toLowerCase().trim()}|${lastName.toLowerCase().trim()}|${company.toLowerCase().trim()}`;
  return crypto.createHash("md5").update(normalized).digest("hex");
}

/**
 * Find an enriched contact by LinkedIn URL
 */
export const findByLinkedinUrl = async (
  organizationId: string,
  linkedinUrl: string
): Promise<DBEnrichedContact | undefined> => {
  const normalized = normalizeLinkedinUrl(linkedinUrl);
  if (!normalized) return undefined;

  return db
    .selectFrom("enriched_contact")
    .where("organizationId", "=", organizationId)
    .where("linkedinUrl", "=", normalized)
    .selectAll()
    .executeTakeFirst();
};

/**
 * Find an enriched contact by email
 */
export const findByEmail = async (
  organizationId: string,
  email: string
): Promise<DBEnrichedContact | undefined> => {
  const normalized = normalizeEmail(email);
  if (!normalized) return undefined;

  return db
    .selectFrom("enriched_contact")
    .where("organizationId", "=", organizationId)
    .where("emailNormalized", "=", normalized)
    .selectAll()
    .executeTakeFirst();
};

/**
 * Find an enriched contact by name hash
 */
export const findByNameHash = async (
  organizationId: string,
  firstName: string,
  lastName: string,
  company: string
): Promise<DBEnrichedContact | undefined> => {
  const hash = generateNameHash(firstName, lastName, company);
  if (!hash) return undefined;

  return db
    .selectFrom("enriched_contact")
    .where("organizationId", "=", organizationId)
    .where("nameHash", "=", hash)
    .selectAll()
    .executeTakeFirst();
};

/**
 * Batch check for existing enriched contacts by LinkedIn URLs
 * Returns a Map of normalized LinkedIn URL -> EnrichedContact
 */
export const findExistingByLinkedinUrls = async (
  organizationId: string,
  linkedinUrls: string[]
): Promise<Map<string, DBEnrichedContact>> => {
  if (linkedinUrls.length === 0) return new Map();

  const normalizedUrls = linkedinUrls
    .map(normalizeLinkedinUrl)
    .filter((url): url is string => url !== null);

  if (normalizedUrls.length === 0) return new Map();

  const results = await db
    .selectFrom("enriched_contact")
    .where("organizationId", "=", organizationId)
    .where("linkedinUrl", "in", normalizedUrls)
    .selectAll()
    .execute();

  const map = new Map<string, DBEnrichedContact>();
  for (const contact of results) {
    if (contact.linkedinUrl) {
      map.set(contact.linkedinUrl, contact);
    }
  }

  return map;
};

/**
 * Batch check for existing enriched contacts by name hashes
 * Returns a Map of name hash -> EnrichedContact
 */
export const findExistingByNameHashes = async (
  organizationId: string,
  leads: Array<{ firstName?: string | null; lastName?: string | null; company?: string | null }>
): Promise<Map<string, DBEnrichedContact>> => {
  const hashes = leads
    .map((l) => generateNameHash(l.firstName, l.lastName, l.company))
    .filter((h): h is string => h !== null);

  if (hashes.length === 0) return new Map();

  const results = await db
    .selectFrom("enriched_contact")
    .where("organizationId", "=", organizationId)
    .where("nameHash", "in", hashes)
    .selectAll()
    .execute();

  const map = new Map<string, DBEnrichedContact>();
  for (const contact of results) {
    if (contact.nameHash) {
      map.set(contact.nameHash, contact);
    }
  }

  return map;
};

/**
 * Create a new enriched contact
 */
export const create = async (data: CreateEnrichedContactData): Promise<DBEnrichedContact | undefined> => {
  const insertData = {
    ...data,
    linkedinUrl: normalizeLinkedinUrl(data.linkedinUrl),
    emailNormalized: normalizeEmail(data.email),
    nameHash: generateNameHash(data.firstName, data.lastName, data.company),
    enrichedAt: new Date(),
  };

  return db
    .insertInto("enriched_contact")
    .values(withIdAndTimestamps(insertData, true))
    .returningAll()
    .executeTakeFirst();
};

/**
 * Upsert an enriched contact (create or update)
 * Primary lookup: LinkedIn URL, fallback: email, then name hash
 */
export const upsert = async (data: CreateEnrichedContactData): Promise<DBEnrichedContact | undefined> => {
  const normalizedLinkedin = normalizeLinkedinUrl(data.linkedinUrl);
  const normalizedEmail = normalizeEmail(data.email);
  const nameHash = generateNameHash(data.firstName, data.lastName, data.company);

  // Try to find existing record
  let existing: DBEnrichedContact | undefined;

  if (normalizedLinkedin) {
    existing = await findByLinkedinUrl(data.organizationId, normalizedLinkedin);
  }

  if (!existing && normalizedEmail) {
    existing = await findByEmail(data.organizationId, normalizedEmail);
  }

  if (!existing && nameHash) {
    existing = await db
      .selectFrom("enriched_contact")
      .where("organizationId", "=", data.organizationId)
      .where("nameHash", "=", nameHash)
      .selectAll()
      .executeTakeFirst();
  }

  if (existing) {
    // Update existing record
    const updateData: Partial<UpdateDBEnrichedContact> = {
      ...data,
      linkedinUrl: normalizedLinkedin ?? existing.linkedinUrl,
      emailNormalized: normalizedEmail ?? existing.emailNormalized,
      nameHash: nameHash ?? existing.nameHash,
      enrichedAt: new Date(),
      updatedAt: new Date(),
    };

    // Only update non-null values to avoid overwriting
    const cleanUpdate = Object.fromEntries(
      Object.entries(updateData).filter(([_, v]) => v !== null && v !== undefined)
    );

    return db
      .updateTable("enriched_contact")
      .set(cleanUpdate)
      .where("id", "=", existing.id)
      .returningAll()
      .executeTakeFirst();
  }

  // Create new record
  return create(data);
};

/**
 * Bulk upsert enriched contacts
 */
export const bulkUpsert = async (
  contacts: CreateEnrichedContactData[]
): Promise<{ created: number; updated: number }> => {
  let created = 0;
  let updated = 0;

  for (const contact of contacts) {
    const normalizedLinkedin = normalizeLinkedinUrl(contact.linkedinUrl);

    // Check if exists
    let existing: DBEnrichedContact | undefined;
    if (normalizedLinkedin) {
      existing = await findByLinkedinUrl(contact.organizationId, normalizedLinkedin);
    }

    if (existing) {
      await upsert(contact);
      updated++;
    } else {
      await create(contact);
      created++;
    }
  }

  return { created, updated };
};

/**
 * Update an enriched contact
 */
export const update = async (
  id: string,
  data: Partial<UpdateDBEnrichedContact>
): Promise<DBEnrichedContact | undefined> => {
  return db
    .updateTable("enriched_contact")
    .set({ ...data, updatedAt: new Date() })
    .where("id", "=", id)
    .returningAll()
    .executeTakeFirst();
};

/**
 * Delete an enriched contact
 */
export const deleteById = async (id: string) => {
  return db.deleteFrom("enriched_contact").where("id", "=", id).executeTakeFirst();
};

/**
 * Count enriched contacts for an organization
 */
export const countByOrganization = async (organizationId: string): Promise<number> => {
  const result = await db
    .selectFrom("enriched_contact")
    .where("organizationId", "=", organizationId)
    .select(sql<number>`count(*)::int`.as("count"))
    .executeTakeFirst();
  return result?.count ?? 0;
};

/**
 * Find all enriched contacts with emails for a domain
 * Useful for pattern learning
 */
export const findByDomain = async (
  organizationId: string,
  domain: string
): Promise<DBEnrichedContact[]> => {
  return db
    .selectFrom("enriched_contact")
    .where("organizationId", "=", organizationId)
    .where("companyDomain", "=", domain.toLowerCase())
    .where("email", "is not", null)
    .selectAll()
    .execute();
};
