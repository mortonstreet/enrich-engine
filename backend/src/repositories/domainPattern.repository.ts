import { db } from "@/lib/db";
import { withIdAndTimestamps } from "./utils";

export interface DomainPatternData {
  pattern: string;
  successRate: number;
}

export interface CreateDomainPatternData {
  domain: string;
  patterns: DomainPatternData[];
}

// ============================================
// Domain Pattern Operations
// ============================================

export const findByDomain = async (domain: string) => {
  return db
    .selectFrom("domain_email_pattern")
    .where("domain", "=", domain.toLowerCase())
    .selectAll()
    .executeTakeFirst();
};

export const upsert = async (data: CreateDomainPatternData) => {
  const existingPattern = await findByDomain(data.domain);

  if (existingPattern) {
    return db
      .updateTable("domain_email_pattern")
      .set({
        patterns: JSON.stringify(data.patterns),
        updatedAt: new Date(),
      })
      .where("domain", "=", data.domain.toLowerCase())
      .returningAll()
      .executeTakeFirst();
  }

  return db
    .insertInto("domain_email_pattern")
    .values(
      withIdAndTimestamps(
        {
          domain: data.domain.toLowerCase(),
          patterns: JSON.stringify(data.patterns),
        },
        true
      )
    )
    .returningAll()
    .executeTakeFirst();
};

export const recordSuccess = async (domain: string, pattern: string) => {
  const existing = await findByDomain(domain);

  if (!existing) {
    // Create new entry with this pattern as the first success
    return db
      .insertInto("domain_email_pattern")
      .values(
        withIdAndTimestamps(
          {
            domain: domain.toLowerCase(),
            patterns: JSON.stringify([{ pattern, successRate: 1.0 }]),
            successCount: 1,
            totalAttempts: 1,
          },
          true
        )
      )
      .returningAll()
      .executeTakeFirst();
  }

  // Parse existing patterns
  const patterns = (
    typeof existing.patterns === "string"
      ? JSON.parse(existing.patterns)
      : existing.patterns
  ) as DomainPatternData[];

  // Update the pattern's success rate
  const patternIndex = patterns.findIndex((p) => p.pattern === pattern);
  if (patternIndex >= 0) {
    // Increase success count for this pattern
    const totalForPattern = (patterns[patternIndex].successRate * existing.totalAttempts) + 1;
    patterns[patternIndex].successRate = totalForPattern / (existing.totalAttempts + 1);
  } else {
    // Add new pattern with initial success rate
    patterns.push({ pattern, successRate: 1.0 / (existing.totalAttempts + 1) });
  }

  // Sort patterns by success rate (highest first)
  patterns.sort((a, b) => b.successRate - a.successRate);

  return db
    .updateTable("domain_email_pattern")
    .set({
      patterns: JSON.stringify(patterns),
      successCount: existing.successCount + 1,
      totalAttempts: existing.totalAttempts + 1,
      updatedAt: new Date(),
    })
    .where("domain", "=", domain.toLowerCase())
    .returningAll()
    .executeTakeFirst();
};

export const recordFailure = async (domain: string) => {
  const existing = await findByDomain(domain);

  if (!existing) {
    // Create new entry with zero success
    return db
      .insertInto("domain_email_pattern")
      .values(
        withIdAndTimestamps(
          {
            domain: domain.toLowerCase(),
            patterns: JSON.stringify([]),
            successCount: 0,
            totalAttempts: 1,
          },
          true
        )
      )
      .returningAll()
      .executeTakeFirst();
  }

  return db
    .updateTable("domain_email_pattern")
    .set({
      totalAttempts: existing.totalAttempts + 1,
      updatedAt: new Date(),
    })
    .where("domain", "=", domain.toLowerCase())
    .returningAll()
    .executeTakeFirst();
};

/**
 * Gets the prioritized patterns for a domain based on past success rates.
 */
export const getPrioritizedPatterns = async (
  domain: string
): Promise<string[]> => {
  const existing = await findByDomain(domain);

  if (!existing || !existing.patterns) {
    return [];
  }

  const patterns = (
    typeof existing.patterns === "string"
      ? JSON.parse(existing.patterns)
      : existing.patterns
  ) as DomainPatternData[];

  // Return pattern names sorted by success rate
  return patterns.map((p) => p.pattern);
};

/**
 * Checks if a domain is known to be a catch-all domain.
 * Catch-all domains accept any email, so validation is unreliable.
 */
export const isCatchAllDomain = async (domain: string): Promise<boolean> => {
  const existing = await findByDomain(domain);

  if (!existing) {
    return false;
  }

  // If we have a high failure rate despite many attempts, it might be catch-all
  const failureRate =
    (existing.totalAttempts - existing.successCount) / existing.totalAttempts;
  return existing.totalAttempts > 10 && failureRate < 0.1;
};
