/**
 * LinkedIn URL Validation Utilities
 *
 * Validates LinkedIn profile URLs to ensure they are:
 * 1. Properly formatted
 * 2. Personal profile URLs (/in/) not company pages (/company/)
 * 3. Not malformed or empty
 */

/**
 * Pattern for valid LinkedIn profile URLs.
 * Matches:
 * - https://linkedin.com/in/username
 * - https://www.linkedin.com/in/username
 * - http://linkedin.com/in/username (will be normalized)
 * - With or without trailing slash
 * - Allows alphanumeric, hyphens, and underscores in username
 */
const LINKEDIN_PROFILE_PATTERN = /^https?:\/\/(www\.)?linkedin\.com\/in\/[\w\-]+\/?$/i;

/**
 * Pattern for LinkedIn company pages (should be excluded)
 */
const LINKEDIN_COMPANY_PATTERN = /linkedin\.com\/company\//i;

/**
 * Pattern for LinkedIn school pages (should be excluded)
 */
const LINKEDIN_SCHOOL_PATTERN = /linkedin\.com\/school\//i;

/**
 * Pattern for LinkedIn showcase pages (should be excluded)
 */
const LINKEDIN_SHOWCASE_PATTERN = /linkedin\.com\/showcase\//i;

/**
 * Validates that a URL is a valid LinkedIn personal profile URL.
 *
 * Valid: https://www.linkedin.com/in/john-smith
 * Invalid:
 * - https://linkedin.com/company/acme-corp (company page)
 * - https://linkedin.com/school/harvard (school page)
 * - https://linkedin.com (no path)
 * - null, undefined, empty string
 *
 * @param url - The URL to validate
 * @returns true if the URL is a valid LinkedIn profile URL
 */
export function isValidLinkedInProfileUrl(url: string | null | undefined): boolean {
  if (!url) return false;

  const trimmedUrl = url.trim();
  if (!trimmedUrl) return false;

  // Must match the profile pattern
  if (!LINKEDIN_PROFILE_PATTERN.test(trimmedUrl)) {
    return false;
  }

  // Should NOT be a company, school, or showcase page
  if (LINKEDIN_COMPANY_PATTERN.test(trimmedUrl)) {
    return false;
  }
  if (LINKEDIN_SCHOOL_PATTERN.test(trimmedUrl)) {
    return false;
  }
  if (LINKEDIN_SHOWCASE_PATTERN.test(trimmedUrl)) {
    return false;
  }

  return true;
}

/**
 * Normalizes a LinkedIn URL to a consistent format.
 * - Ensures https://
 * - Adds www. if missing
 * - Removes trailing slash
 * - Lowercases the domain
 *
 * @param url - The URL to normalize
 * @returns Normalized URL or null if invalid
 */
export function normalizeLinkedInUrl(url: string | null | undefined): string | null {
  if (!url) return null;

  let normalized = url.trim().toLowerCase();

  // Replace http with https
  normalized = normalized.replace(/^http:\/\//, 'https://');

  // Add www. if not present
  if (normalized.includes('linkedin.com') && !normalized.includes('www.linkedin.com')) {
    normalized = normalized.replace('linkedin.com', 'www.linkedin.com');
  }

  // Remove trailing slash
  if (normalized.endsWith('/')) {
    normalized = normalized.slice(0, -1);
  }

  return normalized;
}

/**
 * Extracts the LinkedIn username/slug from a profile URL.
 *
 * @param url - The LinkedIn profile URL
 * @returns The username/slug or null if invalid
 */
export function extractLinkedInUsername(url: string | null | undefined): string | null {
  if (!isValidLinkedInProfileUrl(url)) return null;

  const match = url!.match(/linkedin\.com\/in\/([^\/\?]+)/i);
  return match ? match[1] : null;
}

/**
 * Result of filtering leads by LinkedIn URL validity
 */
export interface LinkedInFilterResult {
  validLeads: Array<{ id: string; linkedinUrl: string }>;
  invalidLeads: Array<{ id: string; linkedinUrl: string | null | undefined; reason: string }>;
}

/**
 * Filters an array of leads, separating those with valid LinkedIn profile URLs
 * from those with invalid or missing URLs.
 *
 * @param leads - Array of leads with id and linkedinUrl properties
 * @returns Object containing validLeads and invalidLeads arrays
 */
export function filterLeadsByLinkedInUrl<T extends { id: string; linkedinUrl: string | null | undefined }>(
  leads: T[]
): { validLeads: T[]; invalidLeads: Array<T & { invalidReason: string }> } {
  const validLeads: T[] = [];
  const invalidLeads: Array<T & { invalidReason: string }> = [];

  for (const lead of leads) {
    if (!lead.linkedinUrl) {
      invalidLeads.push({ ...lead, invalidReason: 'Missing LinkedIn URL' });
    } else if (LINKEDIN_COMPANY_PATTERN.test(lead.linkedinUrl)) {
      invalidLeads.push({ ...lead, invalidReason: 'Company page, not personal profile' });
    } else if (LINKEDIN_SCHOOL_PATTERN.test(lead.linkedinUrl)) {
      invalidLeads.push({ ...lead, invalidReason: 'School page, not personal profile' });
    } else if (!isValidLinkedInProfileUrl(lead.linkedinUrl)) {
      invalidLeads.push({ ...lead, invalidReason: 'Invalid LinkedIn URL format' });
    } else {
      validLeads.push(lead);
    }
  }

  return { validLeads, invalidLeads };
}
