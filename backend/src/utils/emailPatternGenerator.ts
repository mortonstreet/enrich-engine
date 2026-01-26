import { EMAIL_PATTERNS } from "@shared/types/src";

export interface GeneratedEmail {
  email: string;
  pattern: string;
}

/**
 * Normalizes a name for email generation by:
 * - Removing special characters and accents
 * - Converting to lowercase
 * - Removing numbers
 */
function normalizeName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove accents
    .toLowerCase()
    .replace(/[^a-z]/g, "") // Keep only letters
    .trim();
}

/**
 * Generates all possible email candidates for a lead based on common patterns.
 * @param firstName - The lead's first name
 * @param lastName - The lead's last name
 * @param domain - The company's email domain
 * @param prioritizedPatterns - Optional array of patterns to prioritize (from domain learning)
 * @returns Array of generated emails with their patterns
 */
export function generateEmailCandidates(
  firstName: string | null | undefined,
  lastName: string | null | undefined,
  domain: string,
  prioritizedPatterns?: string[]
): GeneratedEmail[] {
  const first = normalizeName(firstName || "");
  const last = normalizeName(lastName || "");

  if (!first || !last || !domain) {
    return [];
  }

  const firstInitial = first.charAt(0);
  const lastInitial = last.charAt(0);

  // Map pattern names to actual email formats
  // Ordered by hit rate - top 6 patterns capture 99.1% of valid emails
  const patternGenerators: Record<string, () => string> = {
    "first": () => `${first}@${domain}`,              // 21.03% hit rate
    "flast": () => `${firstInitial}${last}@${domain}`, // 9.86% hit rate
    "first.last": () => `${first}.${last}@${domain}`, // 7.52% hit rate
    "firstl": () => `${first}${lastInitial}@${domain}`, // 2.40% hit rate
    "firstlast": () => `${first}${last}@${domain}`,   // 1.11% hit rate
    "last": () => `${last}@${domain}`,                // 0.99% hit rate
  };

  // Generate all possible emails
  const allEmails: GeneratedEmail[] = EMAIL_PATTERNS.map((p) => ({
    email: patternGenerators[p.pattern]?.() || "",
    pattern: p.pattern,
  })).filter((e) => e.email);

  // If we have prioritized patterns (from domain learning), sort by them
  if (prioritizedPatterns && prioritizedPatterns.length > 0) {
    allEmails.sort((a, b) => {
      const aIndex = prioritizedPatterns.indexOf(a.pattern);
      const bIndex = prioritizedPatterns.indexOf(b.pattern);

      // If both are in prioritized list, sort by their order
      if (aIndex !== -1 && bIndex !== -1) {
        return aIndex - bIndex;
      }
      // Prioritized patterns come first
      if (aIndex !== -1) return -1;
      if (bIndex !== -1) return 1;
      // Otherwise keep original order
      return 0;
    });
  }

  return allEmails;
}

/**
 * Validates the format of an email address.
 */
export function isValidEmailFormat(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Extracts the domain from an email address.
 */
export function extractDomainFromEmail(email: string): string | null {
  const match = email.match(/@([^\s@]+)$/);
  return match ? match[1].toLowerCase() : null;
}
