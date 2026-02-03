import {
  buildRoleQuery,
  buildRoleQueries,
  extractAllLinkedInResults,
  ExtractedLinkedInResult,
  rankResultsBySeniority,
} from "@/clients/serper.client";
import { SearchResultPerson, SearchPeopleResponse } from "@shared/types/src";
import logger from "@/lib/logger";

const SERPER_BASE_URL = "https://google.serper.dev/search";

interface SerperSearchResult {
  title: string;
  link: string;
  snippet: string;
  position: number;
}

interface SerperResponse {
  organic: SerperSearchResult[];
  searchParameters: {
    q: string;
  };
}

async function serperFetch(query: string, num: number = 20): Promise<SerperResponse> {
  const { config } = await import("@/config");

  const response = await fetch(SERPER_BASE_URL, {
    method: "POST",
    headers: {
      "X-API-KEY": config.serper.apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      q: query,
      num: Math.min(num, 100),
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    logger.error({ status: response.status, errorText }, "Serper API error in search");
    throw new Error(`Serper API error: ${response.status} - ${errorText}`);
  }

  return response.json() as Promise<SerperResponse>;
}

/**
 * Parses a free-text query to extract role and company if present.
 * Handles common patterns like "VP of Sales at Anthropic" or "CEO Stripe"
 */
function parseQueryForRoleAndCompany(query: string): { role?: string; company?: string } {
  // Pattern: "Role at Company" or "Role @ Company"
  const atPattern = /^(.+?)\s+(?:at|@)\s+(.+)$/i;
  const atMatch = query.match(atPattern);
  if (atMatch) {
    return { role: atMatch[1].trim(), company: atMatch[2].trim() };
  }

  // Pattern: "Role, Company" or "Role - Company"
  const separatorPattern = /^(.+?)\s*[,\-]\s*(.+)$/;
  const sepMatch = query.match(separatorPattern);
  if (sepMatch) {
    return { role: sepMatch[1].trim(), company: sepMatch[2].trim() };
  }

  return {};
}

/**
 * Extracts company name from a LinkedIn title snippet.
 * Titles are formatted as: "John Smith - Software Engineer at Company | LinkedIn"
 */
function extractCompanyFromTitle(title: string): string | undefined {
  // Pattern: "at Company" or "@ Company" before "| LinkedIn"
  const atPattern = /\s+(?:at|@)\s+([^|]+?)(?:\s*\||\s*-\s*LinkedIn|$)/i;
  const match = title.match(atPattern);
  if (match) {
    return match[1].trim();
  }
  return undefined;
}

/**
 * Converts extracted LinkedIn results to search result format.
 */
function toSearchResultPerson(result: ExtractedLinkedInResult): SearchResultPerson {
  return {
    linkedinUrl: result.linkedinUrl,
    firstName: result.firstName,
    lastName: result.lastName,
    title: result.title,
    company: extractCompanyFromTitle(result.title),
  };
}

/**
 * Searches for people by role and/or company.
 * Uses Serper to search LinkedIn profiles.
 */
export async function searchPeople(params: {
  query?: string;
  role?: string;
  company?: string;
  location?: string;
  page: number;
  limit: number;
}): Promise<SearchPeopleResponse> {
  const { query, role, company, page, limit } = params;

  let searchRole = role;
  let searchCompany = company;

  // If free-text query provided and no explicit role/company, try to parse them
  if (query && !role && !company) {
    const parsed = parseQueryForRoleAndCompany(query);
    searchRole = parsed.role;
    searchCompany = parsed.company;
  }

  // Build the search query
  let searchQuery: string;

  if (searchCompany && searchRole) {
    // Both company and role provided - use structured query
    searchQuery = buildRoleQuery(searchCompany, searchRole);
  } else if (searchCompany) {
    // Only company - search for any profiles at that company
    searchQuery = `site:linkedin.com/in/ "${searchCompany}"`;
  } else if (searchRole) {
    // Only role - search for profiles with that role
    searchQuery = `site:linkedin.com/in/ "${searchRole}"`;
  } else if (query) {
    // Fallback to free-text search
    searchQuery = `site:linkedin.com/in/ ${query}`;
  } else {
    // No search criteria provided
    return {
      results: [],
      total: 0,
      page,
      limit,
      hasMore: false,
    };
  }

  logger.info({ searchQuery, page, limit }, "Searching for people via Serper");

  try {
    let allResults: ExtractedLinkedInResult[];

    // When both role and company are provided, use multi-query to pool results
    if (searchRole && searchCompany) {
      const roleQueries = buildRoleQueries(searchCompany, searchRole, 4);
      type PooledResult = ExtractedLinkedInResult & { queryPriority: number };
      const pooledResults: PooledResult[] = [];
      const seenUrls = new Set<string>();

      for (const rq of roleQueries) {
        const totalNeeded = page * limit;
        const response = await serperFetch(rq.query, Math.min(totalNeeded + 10, 100));
        const extracted = extractAllLinkedInResults(response.organic || []);

        for (const result of extracted) {
          const normalizedUrl = result.linkedinUrl.toLowerCase().trim().replace(/\/$/, "");
          if (!seenUrls.has(normalizedUrl)) {
            seenUrls.add(normalizedUrl);
            pooledResults.push({ ...result, queryPriority: rq.priority });
          }
        }

        // Early exit if we have plenty of results for pagination
        if (pooledResults.length >= page * limit + 10) {
          break;
        }
      }

      allResults = rankResultsBySeniority(pooledResults, searchRole);
    } else {
      // Single query for non role+company searches
      const totalNeeded = page * limit;
      const response = await serperFetch(searchQuery, Math.min(totalNeeded + 10, 100));
      allResults = extractAllLinkedInResults(response.organic || []);
    }

    // Apply pagination
    const startIndex = (page - 1) * limit;
    const paginatedResults = allResults.slice(startIndex, startIndex + limit);

    const searchResults = paginatedResults.map(toSearchResultPerson);

    logger.info(
      {
        searchQuery,
        totalFound: allResults.length,
        returned: searchResults.length,
        page,
      },
      "Search completed"
    );

    return {
      results: searchResults,
      total: allResults.length,
      page,
      limit,
      hasMore: startIndex + limit < allResults.length,
    };
  } catch (error) {
    logger.error({ error, searchQuery }, "Failed to search for people");
    throw error;
  }
}
