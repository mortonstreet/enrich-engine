import logger from "@/lib/logger";
import { config } from "@/config";

const SERPER_BASE_URL = "https://google.serper.dev";

interface SerperSearchResult {
  organic?: Array<{
    title: string;
    link: string;
    snippet: string;
    domain?: string;
  }>;
}

/**
 * Extracts a clean domain from a URL.
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
 * Extracts domain from a LinkedIn URL (company page).
 */
export function extractCompanyFromLinkedIn(linkedinUrl: string): string | null {
  if (!linkedinUrl) return null;

  // Pattern for company pages: linkedin.com/company/company-name
  const companyMatch = linkedinUrl.match(
    /linkedin\.com\/company\/([^\/\?]+)/i
  );
  if (companyMatch) {
    // Convert company slug to company name (replace dashes with spaces)
    return companyMatch[1].replace(/-/g, " ");
  }

  return null;
}

/**
 * Common domain suffixes to try first.
 */
const COMMON_DOMAIN_SUFFIXES = [".com", ".io", ".co", ".org", ".net"];

/**
 * Tries to guess a company domain based on the company name.
 * This is a simple heuristic approach.
 */
export function guessCompanyDomain(companyName: string): string | null {
  if (!companyName) return null;

  // Clean the company name
  const cleaned = companyName
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "") // Remove special chars
    .replace(/\s+/g, "") // Remove spaces
    .replace(
      /(inc|llc|ltd|corp|corporation|company|co|limited|pvt|private)/g,
      ""
    ) // Remove common suffixes
    .trim();

  if (!cleaned) return null;

  // Return the most likely domain
  return `${cleaned}.com`;
}

/**
 * Searches for a company's domain using Serper (Google Search API).
 * @param companyName - The company name to search for
 * @param apiKey - Optional API key (uses config default if not provided)
 * @returns The most likely company domain, or null if not found
 */
export async function searchCompanyDomain(
  companyName: string,
  apiKey?: string
): Promise<string | null> {
  if (!companyName) return null;

  const key = apiKey || config.serper.apiKey;
  if (!key) {
    logger.warn("No Serper API key configured");
    return null;
  }

  try {
    const searchQuery = `${companyName} company official website`;

    const response = await fetch(`${SERPER_BASE_URL}/search`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-KEY": key,
      },
      body: JSON.stringify({
        q: searchQuery,
        num: 5,
      }),
    });

    if (!response.ok) {
      logger.error(
        { status: response.status },
        "Serper search failed"
      );
      return null;
    }

    const data = (await response.json()) as SerperSearchResult;

    if (!data.organic || data.organic.length === 0) {
      logger.info({ companyName }, "No search results for company domain");
      return null;
    }

    // Try to find the most relevant domain
    for (const result of data.organic) {
      const domain = result.domain || extractDomainFromUrl(result.link);
      if (domain) {
        // Skip social media and common non-company sites
        const skipDomains = [
          "linkedin.com",
          "facebook.com",
          "twitter.com",
          "instagram.com",
          "youtube.com",
          "wikipedia.org",
          "crunchbase.com",
          "glassdoor.com",
          "indeed.com",
          "bloomberg.com",
          "forbes.com",
          "reuters.com",
        ];

        if (!skipDomains.some((skip) => domain.includes(skip))) {
          logger.info(
            { companyName, domain },
            "Found company domain via search"
          );
          return domain;
        }
      }
    }

    // Fallback to guessing
    const guessed = guessCompanyDomain(companyName);
    if (guessed) {
      logger.info(
        { companyName, domain: guessed },
        "Using guessed company domain"
      );
      return guessed;
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
 * Attempts to get a company domain from multiple sources.
 * Priority:
 * 1. Existing companyDomain on the lead
 * 2. Domain from LinkedIn company URL
 * 3. Serper search
 * 4. Simple guess based on company name
 */
export async function getCompanyDomain(
  companyDomain: string | null | undefined,
  companyName: string | null | undefined,
  linkedinUrl: string | null | undefined,
  searchWithSerper: boolean = true
): Promise<string | null> {
  // 1. Use existing domain if available
  if (companyDomain) {
    return companyDomain.toLowerCase().trim();
  }

  // 2. Try to get company name from LinkedIn for search
  const linkedinCompany = linkedinUrl
    ? extractCompanyFromLinkedIn(linkedinUrl)
    : null;

  // Use company name from lead or extracted from LinkedIn
  const searchName = companyName || linkedinCompany;

  if (!searchName) {
    return null;
  }

  // 3. Search with Serper if enabled
  if (searchWithSerper) {
    const searchedDomain = await searchCompanyDomain(searchName);
    if (searchedDomain) {
      return searchedDomain;
    }
  }

  // 4. Fall back to simple guess
  return guessCompanyDomain(searchName);
}
