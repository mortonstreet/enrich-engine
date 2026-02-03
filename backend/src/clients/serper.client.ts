import { config } from "@/config";
import logger from "@/lib/logger";
import { getSerperRateLimiter } from "@/lib/rateLimiter/serperRateLimiter";

import { AdaptiveRateLimiter, RateLimitHeaders } from "@/lib/adaptiveRateLimiter";
import { getDomainCache } from "@/lib/cache";

const SERPER_BASE_URL = "https://google.serper.dev/search";

// Create adaptive rate limiter instance for monitoring API response patterns
const adaptiveRateLimiter = new AdaptiveRateLimiter({
  baseTargetQps: 300,
  minTargetQps: 50,
  maxTargetQps: 300,
  onAdjust: (newQps, reason) => {
    logger.info({ newQps, reason }, "[Serper] Rate adjusted");
  },
});

export interface SerperSearchResult {
  title: string;
  link: string;
  snippet: string;
  position: number;
}

export interface SerperResponse {
  organic: SerperSearchResult[];
  searchParameters: {
    q: string;
  };
}

export async function serperPaginatedFetch(
  query: string,
  page: number = 1,
  num: number = 10
): Promise<SerperResponse> {
  const rateLimiter = getSerperRateLimiter();
  await rateLimiter.acquire(1);

  const response = await fetch(SERPER_BASE_URL, {
    method: "POST",
    headers: {
      "X-API-KEY": config.serper.apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      q: query,
      num,
      page,
    }),
  });

  const rateLimitHeaders: RateLimitHeaders = {
    'x-ratelimit-limit': response.headers.get('x-ratelimit-limit') ?? undefined,
    'x-ratelimit-remaining': response.headers.get('x-ratelimit-remaining') ?? undefined,
    'x-ratelimit-reset': response.headers.get('x-ratelimit-reset') ?? undefined,
    'retry-after': response.headers.get('retry-after') ?? undefined,
  };

  adaptiveRateLimiter.processResponse(rateLimitHeaders, response.status);

  if (!response.ok) {
    const errorText = await response.text();
    logger.error({ status: response.status, errorText }, "Serper API error (paginated)");
    throw new Error(`Serper API error: ${response.status} - ${errorText}`);
  }

  return response.json() as Promise<SerperResponse>;
}

const LINKEDIN_COMPANY_PATTERN = /^https?:\/\/([a-z]{2}\.|www\.)?linkedin\.com\/company\//;

export interface ExtractedCompanyResult {
  companyName: string;
  linkedinUrl: string;
  snippet: string;
  position: number;
}

/**
 * Extracts company name from a LinkedIn company page title.
 * Titles are typically: "Company Name | LinkedIn" or "Company Name - Overview | LinkedIn"
 */
export function extractCompanyNameFromTitle(title: string): string {
  let cleanTitle = title
    .replace(/\s*\|\s*LinkedIn\s*$/i, "")
    .replace(/\s*-\s*LinkedIn\s*$/i, "")
    .replace(/\s*-\s*Overview\s*$/i, "")
    .replace(/\s*-\s*Products\s*$/i, "")
    .replace(/\s*-\s*About\s*$/i, "")
    .trim();

  // If title still has a pipe, take the first part (company name)
  const pipeIndex = cleanTitle.indexOf(" | ");
  if (pipeIndex !== -1) {
    cleanTitle = cleanTitle.substring(0, pipeIndex).trim();
  }

  return cleanTitle;
}

/**
 * Extracts company results from Serper search results.
 * Only includes results linking to LinkedIn company pages.
 */
export function extractCompanyResults(results: SerperSearchResult[]): ExtractedCompanyResult[] {
  const companyResults: ExtractedCompanyResult[] = [];

  for (const result of results) {
    if (LINKEDIN_COMPANY_PATTERN.test(result.link)) {
      const companyName = extractCompanyNameFromTitle(result.title);
      if (companyName) {
        companyResults.push({
          companyName,
          linkedinUrl: result.link,
          snippet: result.snippet || "",
          position: result.position,
        });
      }
    }
  }

  return companyResults;
}

async function serperFetch(query: string): Promise<SerperResponse> {
  // Acquire rate limiter token before making request
  const rateLimiter = getSerperRateLimiter();
  await rateLimiter.acquire(1);

  const response = await fetch(SERPER_BASE_URL, {
    method: "POST",
    headers: {
      "X-API-KEY": config.serper.apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      q: query,
      num: 10,
    }),
  });

  // Extract rate limit headers for adaptive limiting
  const rateLimitHeaders: RateLimitHeaders = {
    'x-ratelimit-limit': response.headers.get('x-ratelimit-limit') ?? undefined,
    'x-ratelimit-remaining': response.headers.get('x-ratelimit-remaining') ?? undefined,
    'x-ratelimit-reset': response.headers.get('x-ratelimit-reset') ?? undefined,
    'retry-after': response.headers.get('retry-after') ?? undefined,
  };

  // Process response for adaptive rate adjustment
  adaptiveRateLimiter.processResponse(rateLimitHeaders, response.status);

  if (!response.ok) {
    const errorText = await response.text();
    logger.error({ status: response.status, errorText }, "Serper API error");
    throw new Error(`Serper API error: ${response.status} - ${errorText}`);
  }

  return response.json() as Promise<SerperResponse>;
}

const LINKEDIN_PATTERN = /^https?:\/\/(www\.)?linkedin\.com\/in\//;

export interface ExtractedLinkedInResult {
  linkedinUrl: string;
  firstName: string | null;
  lastName: string | null;
  title: string;
}

/**
 * Extracts the person's name from a LinkedIn search result title.
 * Titles are typically formatted as: "John Smith - Software Engineer at Company | LinkedIn"
 * Also handles: "Eddie Anderson, RAC US - Regulatory Affairs Manager at ..."
 */
function parseNameFromTitle(title: string): { firstName: string | null; lastName: string | null } {
  // Remove common suffixes
  let cleanTitle = title
    .replace(/\s*\|\s*LinkedIn\s*$/i, "")
    .replace(/\s*-\s*LinkedIn\s*$/i, "")
    .trim();

  // The name is usually before the first " - " separator
  const dashIndex = cleanTitle.indexOf(" - ");
  if (dashIndex !== -1) {
    cleanTitle = cleanTitle.substring(0, dashIndex).trim();
  }

  // Handle comma-separated credentials (e.g., "Eddie Anderson, RAC US")
  // The name is before the comma, credentials are after
  const commaIndex = cleanTitle.indexOf(",");
  if (commaIndex !== -1) {
    cleanTitle = cleanTitle.substring(0, commaIndex).trim();
  }

  // Split into words and try to extract first/last name
  const nameParts = cleanTitle.split(/\s+/).filter((part) => {
    // Filter out common non-name words and titles
    return (
      part.length > 0 &&
      !/^(dr|mr|mrs|ms|prof|phd|md|mba|ceo|cto|cfo|coo|vp|svp|evp|jr|sr|ii|iii|iv)\.?$/i.test(part)
    );
  });

  if (nameParts.length === 0) {
    return { firstName: null, lastName: null };
  }

  if (nameParts.length === 1) {
    return { firstName: nameParts[0], lastName: null };
  }

  // Assume first word is first name, last word is last name
  return {
    firstName: nameParts[0],
    lastName: nameParts[nameParts.length - 1],
  };
}

export function extractLinkedInUrl(results: SerperSearchResult[]): string | null {
  for (const result of results) {
    if (LINKEDIN_PATTERN.test(result.link)) {
      return result.link;
    }
  }
  return null;
}

export function extractLinkedInResult(results: SerperSearchResult[]): ExtractedLinkedInResult | null {
  for (const result of results) {
    if (LINKEDIN_PATTERN.test(result.link)) {
      const { firstName, lastName } = parseNameFromTitle(result.title);
      return {
        linkedinUrl: result.link,
        firstName,
        lastName,
        title: result.title,
      };
    }
  }
  return null;
}

/**
 * Extracts ALL LinkedIn profile URLs from search results.
 * Useful for multi-person same-role scraping where we need to find multiple people.
 */
export function extractAllLinkedInResults(results: SerperSearchResult[]): ExtractedLinkedInResult[] {
  const linkedinResults: ExtractedLinkedInResult[] = [];
  for (const result of results) {
    if (LINKEDIN_PATTERN.test(result.link)) {
      const { firstName, lastName } = parseNameFromTitle(result.title);
      linkedinResults.push({
        linkedinUrl: result.link,
        firstName,
        lastName,
        title: result.title,
      });
    }
  }
  return linkedinResults;
}

/**
 * Extracts the Nth LinkedIn profile URL from search results.
 * Used to get different people for the same role at a company.
 * @param results - Search results from Serper
 * @param index - 0-based index of which result to return
 * @param excludeUrls - URLs to skip (already assigned to other items)
 */
export function extractLinkedInResultByIndex(
  results: SerperSearchResult[],
  index: number,
  excludeUrls: Set<string> = new Set()
): ExtractedLinkedInResult | null {
  let matchCount = 0;
  for (const result of results) {
    if (LINKEDIN_PATTERN.test(result.link)) {
      // Normalize URL for comparison
      const normalizedUrl = result.link.toLowerCase().trim().replace(/\/$/, "");

      // Skip if this URL is in the exclude list
      if (excludeUrls.has(normalizedUrl)) {
        continue;
      }

      if (matchCount === index) {
        const { firstName, lastName } = parseNameFromTitle(result.title);
        return {
          linkedinUrl: result.link,
          firstName,
          lastName,
          title: result.title,
        };
      }
      matchCount++;
    }
  }
  return null;
}

export function buildNameQuery(firstName: string, lastName: string, company?: string): string {
  let query = `site:linkedin.com/in/ "${firstName} ${lastName}"`;
  if (company) {
    query += ` "${company}"`;
  }
  return query;
}

export function buildRoleQuery(company: string, role: string): string {
  return `site:linkedin.com/in/ "${role}" "${company}"`;
}

// ============================================
// Role Hierarchy & Multi-Query Search
// ============================================

/**
 * Map from canonical roles to ordered lists of related titles.
 * Used for both query generation (finding variants) and result ranking.
 * Order matters: earlier entries are closer matches.
 */
export const ROLE_HIERARCHY: Record<string, string[]> = {
  // PE / Finance
  "Managing Partner": ["Partner", "Founding Partner", "Senior Partner", "General Partner"],
  "Partner": ["Managing Partner", "Founding Partner", "Senior Partner", "General Partner", "Principal"],
  "Founding Partner": ["Managing Partner", "Partner", "General Partner"],
  "General Partner": ["Managing Partner", "Partner", "Founding Partner"],
  "Senior Partner": ["Managing Partner", "Partner"],
  "Managing Director": ["Director", "Senior Managing Director", "Executive Director", "Partner"],
  "Principal": ["Vice President", "Senior Principal", "Partner", "Director"],
  "Head of Investments": ["Investment Director", "Chief Investment Officer", "Director of Investments", "Partner"],
  "Vice President": ["Senior Vice President", "Associate Vice President", "Principal", "Director"],
  "Senior Vice President": ["Vice President", "Executive Vice President", "Managing Director"],
  "Associate": ["Senior Associate", "Analyst", "Vice President"],
  "Investment Director": ["Head of Investments", "Director of Investments", "Principal"],

  // C-Suite / Leadership
  "CEO": ["Founder", "Co-Founder", "Managing Director", "President", "Chief Executive Officer"],
  "Founder": ["CEO", "Co-Founder", "Owner", "President"],
  "Co-Founder": ["Founder", "CEO", "Owner"],
  "President": ["CEO", "Managing Director", "General Manager"],
  "CTO": ["VP Engineering", "Chief Technology Officer", "Head of Engineering", "VP of Technology"],
  "CFO": ["VP Finance", "Chief Financial Officer", "Finance Director", "Head of Finance"],
  "COO": ["VP Operations", "Chief Operating Officer", "Operations Director"],
  "CMO": ["VP Marketing", "Chief Marketing Officer", "Head of Marketing"],
  "CRO": ["VP Sales", "Chief Revenue Officer", "Head of Sales"],

  // Tech / Engineering
  "VP Engineering": ["CTO", "Head of Engineering", "Engineering Director", "SVP Engineering"],
  "Head of Engineering": ["VP Engineering", "Engineering Director", "CTO", "Director of Engineering"],
  "Engineering Director": ["Head of Engineering", "VP Engineering", "Senior Engineering Manager"],

  // Sales / Revenue
  "VP Sales": ["Head of Sales", "Sales Director", "Chief Revenue Officer", "CRO"],
  "Head of Sales": ["VP Sales", "Sales Director", "Director of Sales"],

  // Marketing
  "VP Marketing": ["Head of Marketing", "Marketing Director", "CMO"],
  "Head of Marketing": ["VP Marketing", "Marketing Director", "Director of Marketing"],

  // Product
  "VP Product": ["Head of Product", "Product Director", "CPO", "Chief Product Officer"],
  "Head of Product": ["VP Product", "Product Director", "Director of Product"],

  // Growth
  "Head of Growth": ["VP Growth", "Growth Director", "Growth Lead"],
  "VP Growth": ["Head of Growth", "Growth Director", "Chief Growth Officer"],
};

/**
 * Finds related roles for a given role title by looking up the hierarchy.
 * Tries exact match first, then case-insensitive, then partial match.
 */
export function findRelatedRoles(role: string): string[] {
  // Exact match
  if (ROLE_HIERARCHY[role]) {
    return ROLE_HIERARCHY[role];
  }

  // Case-insensitive match
  const lowerRole = role.toLowerCase();
  for (const [key, variants] of Object.entries(ROLE_HIERARCHY)) {
    if (key.toLowerCase() === lowerRole) {
      return variants;
    }
  }

  // Partial match: check if role contains or is contained by a key
  for (const [key, variants] of Object.entries(ROLE_HIERARCHY)) {
    if (lowerRole.includes(key.toLowerCase()) || key.toLowerCase().includes(lowerRole)) {
      return variants;
    }
  }

  return [];
}

/**
 * Generates multiple query variations for a role search.
 * Returns queries in priority order:
 *   0: Original exact-match query
 *   1..N: Related role variant queries
 *   99: Company-only fallback (catches any title)
 */
export function buildRoleQueries(
  company: string,
  role: string,
  maxQueries: number = 4
): Array<{ query: string; priority: number; roleVariant: string }> {
  const queries: Array<{ query: string; priority: number; roleVariant: string }> = [];

  // Priority 0: original exact-match query
  queries.push({
    query: buildRoleQuery(company, role),
    priority: 0,
    roleVariant: role,
  });

  // Priority 1+: related role variants
  const relatedRoles = findRelatedRoles(role);
  for (let i = 0; i < relatedRoles.length && queries.length < maxQueries - 1; i++) {
    queries.push({
      query: buildRoleQuery(company, relatedRoles[i]),
      priority: i + 1,
      roleVariant: relatedRoles[i],
    });
  }

  // Priority 99: company-only fallback
  if (queries.length < maxQueries) {
    queries.push({
      query: `site:linkedin.com/in/ "${company}"`,
      priority: 99,
      roleVariant: "__company_fallback__",
    });
  }

  return queries.slice(0, maxQueries);
}

/**
 * Ranks pooled LinkedIn results by relevance to the requested role.
 * Results from higher-priority queries come first,
 * then within same priority, prefer titles containing the requested role.
 */
export function rankResultsBySeniority(
  results: Array<ExtractedLinkedInResult & { queryPriority: number }>,
  requestedRole: string
): Array<ExtractedLinkedInResult & { queryPriority: number }> {
  const lowerRole = requestedRole.toLowerCase();
  return [...results].sort((a, b) => {
    // First sort by query priority (lower is better)
    if (a.queryPriority !== b.queryPriority) {
      return a.queryPriority - b.queryPriority;
    }
    // Within same priority, prefer titles containing the requested role
    const aHasRole = a.title.toLowerCase().includes(lowerRole) ? 0 : 1;
    const bHasRole = b.title.toLowerCase().includes(lowerRole) ? 0 : 1;
    return aHasRole - bHasRole;
  });
}

export async function searchLinkedIn(query: string): Promise<{
  linkedinUrl: string | null;
  firstName: string | null;
  lastName: string | null;
  rawResponse: SerperResponse;
}> {
  logger.info({ query }, "Searching LinkedIn via Serper");

  const response = await serperFetch(query);
  const result = extractLinkedInResult(response.organic || []);

  logger.info(
    {
      query,
      found: !!result,
      linkedinUrl: result?.linkedinUrl,
      firstName: result?.firstName,
      lastName: result?.lastName,
    },
    "Serper search complete"
  );

  return {
    linkedinUrl: result?.linkedinUrl ?? null,
    firstName: result?.firstName ?? null,
    lastName: result?.lastName ?? null,
    rawResponse: response,
  };
}

// ============================================
// Company Domain Search Functions
// ============================================

/**
 * List of domains to skip when searching for company websites.
 * These are social media, job sites, and aggregator sites.
 */
const SKIP_DOMAINS = [
  "linkedin.com",
  "facebook.com",
  "twitter.com",
  "x.com",
  "instagram.com",
  "youtube.com",
  "wikipedia.org",
  "crunchbase.com",
  "glassdoor.com",
  "indeed.com",
  "bloomberg.com",
  "forbes.com",
  "reuters.com",
  "zoominfo.com",
  "dnb.com",
  "apollo.io",
  "pitchbook.com",
  "owler.com",
  "g2.com",
  "capterra.com",
  "trustpilot.com",
  "yelp.com",
  "bbb.org",
];

/**
 * Builds a search query to find a company's official website domain.
 * Uses the site:www. prefix to favor official company websites.
 *
 * @param companyName - The company name to search for
 * @returns Search query string
 */
export function buildDomainSearchQuery(companyName: string): string {
  // Use site:www. to find official company websites
  return `site:www. "${companyName}"`;
}

/**
 * Extracts a clean domain from a URL.
 *
 * @param url - The URL to extract the domain from
 * @returns The domain (without www. prefix) or null if invalid
 */
export function extractDomainFromUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    // Remove www. prefix if present
    return parsed.hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return null;
  }
}

/**
 * Checks if a domain should be skipped (social media, job sites, etc.)
 *
 * @param domain - The domain to check
 * @returns true if the domain should be skipped
 */
function shouldSkipDomain(domain: string): boolean {
  const lowerDomain = domain.toLowerCase();
  return SKIP_DOMAINS.some((skip) => lowerDomain.includes(skip));
}

/**
 * Searches for a company's official website domain using Serper.
 * Returns the first non-social-media domain found in search results.
 * Uses Redis cache to reduce API calls.
 *
 * @param companyName - The company name to search for
 * @returns The company domain or null if not found
 */
export async function searchCompanyWebsite(companyName: string): Promise<string | null> {
  if (!companyName || !companyName.trim()) {
    return null;
  }

  // Check Redis cache first
  const cache = getDomainCache();
  if (cache) {
    const cached = await cache.get(companyName);
    if (cached !== undefined) {
      logger.debug({ companyName, domain: cached, cached: true }, "Company domain from cache");
      return cached; // Return cached value (including null for "not found")
    }
  }

  const query = buildDomainSearchQuery(companyName);
  logger.info({ query, companyName }, "Searching for company domain via Serper");

  try {
    const response = await serperFetch(query);

    if (!response.organic || response.organic.length === 0) {
      logger.info({ companyName }, "No search results for company domain");
      // Cache the null result to avoid repeated lookups
      if (cache) {
        await cache.set(companyName, null);
      }
      return null;
    }

    // Find the first valid domain from search results
    for (const result of response.organic) {
      const domain = extractDomainFromUrl(result.link);

      if (domain && !shouldSkipDomain(domain)) {
        logger.info(
          { companyName, domain, resultUrl: result.link },
          "Found company domain via Serper"
        );
        // Cache the result
        if (cache) {
          await cache.set(companyName, domain);
        }
        return domain;
      }
    }

    logger.info({ companyName }, "No valid company domain found in search results");
    // Cache the null result
    if (cache) {
      await cache.set(companyName, null);
    }
    return null;
  } catch (error) {
    logger.error(
      { error, companyName },
      "Failed to search for company domain"
    );
    return null;
  }
}

/**
 * Gets the current state of the adaptive rate limiter for monitoring
 */
export function getAdaptiveRateLimiterState() {
  return adaptiveRateLimiter.getState();
}
