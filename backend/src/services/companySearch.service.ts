import * as companySearchJobRepo from "@/repositories/companySearchJob.repository";
import {
  serperPaginatedFetch,
  extractCompanyResults,
} from "@/clients/serper.client";
import { sendPusherEvent } from "@/lib/pusher";
import logger from "@/lib/logger";
import {
  CompanySearchJobStatus,
  GenerateSearchQueryResponse,
  PreviewCompanySearchResponse,
  CreateCompanySearchJobResponse,
  CompanySearchJobDetailResponse,
  CompanySearchJobsListResponse,
  CreatePeopleSearchFromCompaniesResponse,
  DBCompanySearchJob,
  DBCompanySearchItem,
  RoleConfig,
  ScrapeInputType,
} from "@shared/types/src";

// ============================================
// Generate Search Query
// ============================================

const SEARCH_QUERY_SYSTEM_PROMPT = `You are an expert at Google search queries for finding companies on LinkedIn.

Rules:
- Always include site:linkedin.com/company in the query
- Use quoted phrases for specific terms
- Include industry terminology and relevant keywords
- Include deal size/fund size terms when mentioned (e.g. "lower middle market", "mega fund")
- Do NOT use boolean operators (AND, OR, NOT)
- Keep the query focused and effective
- Return ONLY valid JSON: {"query": "...", "explanation": "..."}`;

export async function generateSearchQuery(
  naturalLanguageQuery: string,
  apiKey: string
): Promise<GenerateSearchQueryResponse> {
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "HTTP-Referer": "https://enrichengine.io",
      "X-Title": "EnrichEngine",
    },
    body: JSON.stringify({
      model: "google/gemini-2.0-flash-001",
      messages: [
        { role: "system", content: SEARCH_QUERY_SYSTEM_PROMPT },
        {
          role: "user",
          content: `Convert this natural language request into an optimal Google search query:\n\n"${naturalLanguageQuery}"`,
        },
      ],
      temperature: 0.3,
      max_tokens: 300,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    logger.error({ status: response.status, errorText }, "OpenRouter API error for query generation");
    throw new Error(`Failed to generate search query: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content?.trim() || "{}";

  let parsed: { query: string; explanation: string };
  try {
    let jsonContent = content;
    if (content.includes("```json")) {
      jsonContent = content.replace(/```json\n?/g, "").replace(/```\n?/g, "");
    } else if (content.includes("```")) {
      jsonContent = content.replace(/```\n?/g, "");
    }
    parsed = JSON.parse(jsonContent.trim());
  } catch {
    logger.warn({ content }, "Failed to parse search query response, using raw content");
    parsed = {
      query: `site:linkedin.com/company ${naturalLanguageQuery}`,
      explanation: "Using natural language query with LinkedIn company site filter",
    };
  }

  return {
    query: parsed.query,
    explanation: parsed.explanation,
  };
}

// ============================================
// Preview Search
// ============================================

export async function previewSearch(
  searchQuery: string
): Promise<PreviewCompanySearchResponse> {
  const response = await serperPaginatedFetch(searchQuery, 1);
  const companies = extractCompanyResults(response.organic || []);

  return {
    results: companies.map((c) => ({
      companyName: c.companyName,
      linkedinUrl: c.linkedinUrl,
      snippet: c.snippet,
      position: c.position,
    })),
    totalResults: companies.length,
    estimatedPages: 10,
  };
}

// ============================================
// Create Job
// ============================================

export async function createCompanySearchJob(
  organizationId: string,
  userId: string,
  params: {
    name?: string;
    naturalLanguageQuery: string;
    searchQuery: string;
    maxPages?: number;
  }
): Promise<CreateCompanySearchJobResponse> {
  const jobName = params.name || `Company Search - ${new Date().toLocaleDateString()}`;

  const job = await companySearchJobRepo.create({
    organizationId,
    userId,
    name: jobName,
    naturalLanguageQuery: params.naturalLanguageQuery,
    generatedSearchQuery: params.searchQuery,
    finalSearchQuery: params.searchQuery,
    maxPages: params.maxPages || 10,
    status: CompanySearchJobStatus.PENDING,
  });

  if (!job) {
    throw new Error("Failed to create company search job");
  }

  return {
    job,
    message: `Company search job created. Will scrape up to ${params.maxPages || 10} pages.`,
  };
}

// ============================================
// Process Job (Worker Entry Point)
// ============================================

export async function processCompanySearchJob(jobId: string): Promise<void> {
  const job = await companySearchJobRepo.findById(jobId);
  if (!job) {
    logger.error({ jobId }, "Company search job not found");
    return;
  }

  if (!job.finalSearchQuery) {
    await companySearchJobRepo.update(jobId, {
      status: CompanySearchJobStatus.FAILED,
      errorMessage: "No search query defined",
    });
    return;
  }

  try {
    // Update status to scraping
    await companySearchJobRepo.update(jobId, {
      status: CompanySearchJobStatus.SCRAPING,
    });

    await sendProgressUpdate(job.organizationId, jobId, {
      status: CompanySearchJobStatus.SCRAPING,
      scrapedPages: 0,
      totalPages: job.maxPages,
    });

    const maxPages = job.maxPages || 10;
    let scrapedPages = 0;

    for (let page = 1; page <= maxPages; page++) {
      logger.info({ jobId, page, maxPages }, "Scraping company search page");

      const response = await serperPaginatedFetch(job.finalSearchQuery, page);
      const organicResults = response.organic || [];
      const companies = extractCompanyResults(organicResults);

      if (organicResults.length === 0) {
        logger.info({ jobId, page }, "No more results from Serper, stopping pagination");
        break;
      }

      if (companies.length === 0) {
        logger.info({ jobId, page }, "No LinkedIn companies on this page, continuing to next page");
        scrapedPages = page;
        await companySearchJobRepo.update(jobId, {
          scrapedPages: page,
          totalPages: maxPages,
        });
        await sendProgressUpdate(job.organizationId, jobId, {
          status: CompanySearchJobStatus.SCRAPING,
          scrapedPages: page,
          totalPages: maxPages,
        });
        if (organicResults.length < 10) {
          logger.info({ jobId, page, rawResultCount: organicResults.length }, "Partial raw page, stopping pagination");
          break;
        }
        continue;
      }

      // Create items for this page
      const items = companies.map((c) => ({
        jobId,
        companyName: c.companyName,
        linkedinUrl: c.linkedinUrl || null,
        companyDomain: c.linkedinUrl ? extractDomainFromLinkedInUrl(c.linkedinUrl) : null,
        source: `serper_page_${page}`,
        serperPosition: c.position,
        rawSnippet: c.snippet || null,
      }));

      await companySearchJobRepo.createItems(items);

      scrapedPages = page;
      await companySearchJobRepo.update(jobId, {
        scrapedPages: page,
        totalPages: maxPages,
      });

      await sendProgressUpdate(job.organizationId, jobId, {
        status: CompanySearchJobStatus.SCRAPING,
        scrapedPages: page,
        totalPages: maxPages,
      });

      // Stop if Serper returned fewer raw results than requested (end of results)
      if (organicResults.length < 10) {
        logger.info({ jobId, page, rawResultCount: organicResults.length }, "Partial raw page, stopping pagination");
        break;
      }
    }

    // Run deduplication
    await companySearchJobRepo.update(jobId, {
      status: CompanySearchJobStatus.DEDUPLICATING,
    });

    await sendProgressUpdate(job.organizationId, jobId, {
      status: CompanySearchJobStatus.DEDUPLICATING,
      scrapedPages,
    });

    await deduplicateResults(jobId);

    // Get final counts
    const progress = await companySearchJobRepo.getJobProgress(jobId);

    await companySearchJobRepo.update(jobId, {
      status: CompanySearchJobStatus.COMPLETED,
      scrapedPages,
      rawResultCount: progress.rawResultCount,
      dedupedResultCount: progress.dedupedResultCount,
      completedAt: new Date(),
    });

    await sendProgressUpdate(job.organizationId, jobId, {
      status: CompanySearchJobStatus.COMPLETED,
      scrapedPages,
      rawResultCount: progress.rawResultCount,
      dedupedResultCount: progress.dedupedResultCount,
    });

    logger.info(
      { jobId, scrapedPages, rawResultCount: progress.rawResultCount, dedupedResultCount: progress.dedupedResultCount },
      "Company search job completed"
    );
  } catch (error) {
    logger.error({ jobId, error }, "Company search job failed");

    await companySearchJobRepo.update(jobId, {
      status: CompanySearchJobStatus.FAILED,
      errorMessage: error instanceof Error ? error.message : "Unknown error",
    });

    await sendProgressUpdate(job.organizationId, jobId, {
      status: CompanySearchJobStatus.FAILED,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

// ============================================
// Deduplication
// ============================================

export async function deduplicateResults(jobId: string): Promise<void> {
  const allItems = await companySearchJobRepo.findAllItemsByJobId(jobId);

  if (allItems.length === 0) return;

  // Group by normalized LinkedIn URL first
  const urlGroups = new Map<string, DBCompanySearchItem[]>();
  const noUrlItems: DBCompanySearchItem[] = [];

  for (const item of allItems) {
    if (item.linkedinUrl) {
      const normalizedUrl = normalizeLinkedInUrl(item.linkedinUrl);
      const group = urlGroups.get(normalizedUrl) || [];
      group.push(item);
      urlGroups.set(normalizedUrl, group);
    } else {
      noUrlItems.push(item);
    }
  }

  // Mark duplicates within URL groups
  for (const [, group] of urlGroups) {
    if (group.length <= 1) continue;
    const primary = group[0];
    const dupeIds = group.slice(1).map((item) => item.id);
    if (dupeIds.length > 0) {
      await companySearchJobRepo.markDuplicates(dupeIds, primary.id);
    }
  }

  // For items without URLs, group by normalized company name
  const nameGroups = new Map<string, DBCompanySearchItem[]>();

  for (const item of noUrlItems) {
    const normalizedName = normalizeCompanyName(item.companyName);
    const group = nameGroups.get(normalizedName) || [];
    group.push(item);
    nameGroups.set(normalizedName, group);
  }

  // Also check if name-only items match URL-based items
  for (const item of noUrlItems) {
    const normalizedName = normalizeCompanyName(item.companyName);
    let foundMatch = false;

    for (const [, urlGroup] of urlGroups) {
      const primaryName = normalizeCompanyName(urlGroup[0].companyName);
      if (primaryName === normalizedName) {
        await companySearchJobRepo.markDuplicates([item.id], urlGroup[0].id);
        foundMatch = true;
        break;
      }
    }

    if (foundMatch) continue;

    // Check within name groups
    const nameGroup = nameGroups.get(normalizedName);
    if (nameGroup && nameGroup.length > 1 && nameGroup[0].id !== item.id) {
      await companySearchJobRepo.markDuplicates([item.id], nameGroup[0].id);
    }
  }
}

function normalizeLinkedInUrl(url: string): string {
  return url
    .toLowerCase()
    .trim()
    .replace(/\/+$/, "")
    .replace(/^https?:\/\/([a-z]{2}\.|www\.)?/, "");
}

function normalizeCompanyName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\b(inc|llc|corp|ltd|co|corporation|incorporated|limited|company)\b\.?/gi, "")
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function extractDomainFromLinkedInUrl(url: string): string | null {
  // LinkedIn company URLs don't contain the company domain,
  // but we keep this as a placeholder for future enrichment
  return null;
}

// ============================================
// Get Jobs
// ============================================

export async function getCompanySearchJobs(
  organizationId: string,
  options: { page: number; limit: number; status?: string }
): Promise<CompanySearchJobsListResponse> {
  return companySearchJobRepo.findByOrganizationId(organizationId, options);
}

export async function getCompanySearchJob(
  jobId: string,
  organizationId: string
): Promise<CompanySearchJobDetailResponse> {
  const { job, items } = await companySearchJobRepo.findByIdWithItems(jobId);

  if (!job) {
    throw new Error("Company search job not found");
  }

  if (job.organizationId !== organizationId) {
    throw new Error("Unauthorized");
  }

  return { ...job, items };
}

// ============================================
// Download
// ============================================

export async function getDownloadData(
  jobId: string,
  organizationId: string,
  dedupedOnly: boolean = true
): Promise<{
  fileName: string;
  rows: Array<Record<string, string>>;
}> {
  const job = await companySearchJobRepo.findById(jobId);
  if (!job) throw new Error("Job not found");
  if (job.organizationId !== organizationId) throw new Error("Unauthorized");

  const items = dedupedOnly
    ? await companySearchJobRepo.findDedupedItemsByJobId(jobId)
    : await companySearchJobRepo.findAllItemsByJobId(jobId);

  const rows = items.map((item) => ({
    company_name: item.companyName || "",
    linkedin_url: item.linkedinUrl || "",
    domain: item.companyDomain || "",
  }));

  const fileName = `${job.name.replace(/[^a-zA-Z0-9]/g, "_")}_companies.csv`;

  return { fileName, rows };
}

// ============================================
// Create People Search from Companies
// ============================================

export async function createPeopleSearchFromCompanies(
  jobId: string,
  organizationId: string,
  userId: string,
  name: string | undefined,
  roleConfigs: RoleConfig[]
): Promise<CreatePeopleSearchFromCompaniesResponse> {
  const job = await companySearchJobRepo.findById(jobId);
  if (!job) throw new Error("Company search job not found");
  if (job.organizationId !== organizationId) throw new Error("Unauthorized");

  const dedupedItems = await companySearchJobRepo.findDedupedItemsByJobId(jobId);

  if (dedupedItems.length === 0) {
    throw new Error("No companies found in search results");
  }

  // Import scrape service and queue dynamically to avoid circular deps
  const scrapeService = await import("@/services/scrape.service");
  const { addScrapeJob } = await import("@/queues/scrape.queue");

  // Build CSV rows from companies: each company x each role x count
  const csvRows: Array<{ company: string; role?: string }> = [];

  for (const item of dedupedItems) {
    for (const config of roleConfigs) {
      for (let i = 0; i < config.count; i++) {
        csvRows.push({
          company: item.companyName,
          ...(config.roleName ? { role: config.roleName } : {}),
        });
      }
    }
  }

  const jobName = name || `People Search - ${job.name}`;

  const result = await scrapeService.createScrapeJob(
    organizationId,
    userId,
    jobName,
    ScrapeInputType.COMPANY,
    csvRows as any,
    roleConfigs
  );

  // Link the scrape job back to the company search job
  await companySearchJobRepo.update(jobId, {
    scrapeJobId: result.job.id,
  });

  // Add to scrape queue
  await addScrapeJob(result.job.id);

  return {
    scrapeJobId: result.job.id,
    message: `People search created for ${dedupedItems.length} companies with ${roleConfigs.length} role(s)`,
    companyCount: dedupedItems.length,
    totalItems: csvRows.length,
  };
}

// ============================================
// Pusher Progress Updates
// ============================================

async function sendProgressUpdate(
  organizationId: string,
  jobId: string,
  data: Record<string, unknown>
): Promise<void> {
  try {
    await sendPusherEvent(`org-${organizationId}`, "company-search-progress", {
      jobId,
      ...data,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.warn({ error, jobId }, "Failed to send company search progress update");
  }
}
