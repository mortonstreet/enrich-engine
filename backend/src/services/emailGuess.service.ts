import * as listEnrichmentJobRepository from "@/repositories/listEnrichmentJob.repository";
import * as vendorApiKeyRepository from "@/repositories/vendorApiKey.repository";
import * as listRepository from "@/repositories/list.repository";
import * as leadRepository from "@/repositories/lead.repository";
import * as domainPatternRepository from "@/repositories/domainPattern.repository";
import { decrypt } from "@/lib/encryption";
import { addListEnrichmentJob } from "@/queues/listEnrich.queue";
import {
  EmailGuessPreviewResponse,
  EnrichmentStrategy,
  ListEnrichmentJobStatus,
  ListEnrichmentJobResponse,
  EnrichmentVendor,
  EnrichmentType,
  JobCostComparisonResponse,
  PricingComparisonResponse,
} from "@shared/types/src";
import { db } from "@/lib/db";
import { sql } from "kysely";
import {
  ENRICH_ENGINE_COST_PER_EMAIL,
  COMPETITORS_BY_COST,
} from "@/config/competitorPricing";

// ============================================
// Cost Constants
// ============================================

const COSTS = {
  DOMAIN_SEARCH: 0.003, // Per Serper search
  EMAIL_VALIDATION: 0.0005, // Per MillionVerifier validation (cheaper than BounceBan)
  PROSPEO_LOOKUP: 0.05, // Per Prospeo lookup
};

// ============================================
// Preview / Cost Estimation
// ============================================

export async function previewEmailGuessJob(
  organizationId: string,
  listId: string
): Promise<EmailGuessPreviewResponse> {
  // Verify list exists and belongs to org
  const list = await listRepository.findListById(listId);
  if (!list || list.organizationId !== organizationId) {
    throw new Error("List not found");
  }

  // Get all leads in the list
  const allLeads = await db
    .selectFrom("lead")
    .where("listId", "=", listId)
    .select([
      "id",
      "firstName",
      "lastName",
      "email",
      "company",
      "companyDomain",
      "linkedinUrl",
    ])
    .execute();

  const totalLeads = allLeads.length;

  // Leads needing emails (no email or empty email)
  const leadsNeedingEmails = allLeads.filter(
    (l) => !l.email || l.email.trim() === ""
  );

  // Leads with company domains already
  const leadsWithDomains = leadsNeedingEmails.filter(
    (l) => l.companyDomain && l.companyDomain.trim() !== ""
  );

  // Leads needing domain search
  const leadsNeedingDomainSearch = leadsNeedingEmails.filter(
    (l) => (!l.companyDomain || l.companyDomain.trim() === "") && l.company
  );

  // Estimate costs
  const domainSearchCost =
    leadsNeedingDomainSearch.length * COSTS.DOMAIN_SEARCH;

  // Assume we'll validate ~10 patterns per lead initially
  const validationCost = leadsNeedingEmails.length * COSTS.EMAIL_VALIDATION;

  // Assume ~30% fallback rate to Prospeo (conservative estimate)
  const estimatedFallbackRate = 0.3;
  const prospeoFallbackCost =
    Math.ceil(leadsNeedingEmails.length * estimatedFallbackRate) *
    COSTS.PROSPEO_LOOKUP;

  const totalCost = domainSearchCost + validationCost + prospeoFallbackCost;
  const comparedToDirectProspeo =
    leadsNeedingEmails.length * COSTS.PROSPEO_LOOKUP;

  return {
    totalLeads,
    leadsNeedingEmails: leadsNeedingEmails.length,
    leadsWithDomains: leadsWithDomains.length,
    leadsNeedingDomainSearch: leadsNeedingDomainSearch.length,
    estimatedCosts: {
      domainSearchCost: Math.round(domainSearchCost * 100) / 100,
      validationCost: Math.round(validationCost * 100) / 100,
      prospeoFallbackCost: Math.round(prospeoFallbackCost * 100) / 100,
      totalCost: Math.round(totalCost * 100) / 100,
      comparedToDirectProspeo: Math.round(comparedToDirectProspeo * 100) / 100,
    },
  };
}

// ============================================
// Job Creation
// ============================================

export async function createEmailGuessJob(
  organizationId: string,
  userId: string,
  listId: string,
  strategy: EnrichmentStrategy
): Promise<ListEnrichmentJobResponse> {
  // Verify list exists and belongs to org
  const list = await listRepository.findListById(listId);
  if (!list || list.organizationId !== organizationId) {
    throw new Error("List not found");
  }

  // Check for required API keys based on strategy
  if (strategy === "guess_first" || strategy === "direct") {
    const prospeoKey = await vendorApiKeyRepository.findByOrgAndVendor(
      organizationId,
      "prospeo"
    );
    if (!prospeoKey) {
      throw new Error("Prospeo API key not configured");
    }
  }

  if (strategy === "guess_first" || strategy === "guess_only") {
    const millionVerifierKey = await vendorApiKeyRepository.findByOrgAndVendor(
      organizationId,
      "millionverifier"
    );
    if (!millionVerifierKey) {
      throw new Error("MillionVerifier API key not configured for email validation");
    }
  }

  // Get leads with LinkedIn URLs that need email enrichment
  const leads = await db
    .selectFrom("lead")
    .where("listId", "=", listId)
    .where("linkedinUrl", "is not", null)
    .where("linkedinUrl", "!=", "")
    .where((eb) =>
      eb.or([eb("email", "is", null), eb("email", "=", "")])
    )
    .selectAll()
    .execute();

  if (leads.length === 0) {
    throw new Error("No leads need email enrichment in this list");
  }

  // Create the job with strategy
  const job = await db
    .insertInto("list_enrichment_job")
    .values({
      id: crypto.randomUUID(),
      organizationId,
      userId,
      listId,
      vendor: "prospeo",
      enrichmentType: "email",
      status: "pending",
      totalRows: leads.length,
      processedRows: 0,
      successCount: 0,
      errorCount: 0,
      creditsUsed: 0,
      enrichmentStrategy: strategy,
      guessSuccessCount: 0,
      fallbackCount: 0,
      validationCredits: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returningAll()
    .executeTakeFirst();

  if (!job) {
    throw new Error("Failed to create enrichment job");
  }

  // Create job items for each lead
  const items = leads.map((lead) => ({
    id: crypto.randomUUID(),
    jobId: job.id,
    leadId: lead.id,
    linkedinUrl: lead.linkedinUrl!,
    status: "pending",
    createdAt: new Date(),
  }));

  if (items.length > 0) {
    await db.insertInto("list_enrichment_job_item").values(items).execute();
  }

  // Queue the job for processing
  await addListEnrichmentJob(job.id);

  return {
    id: job.id,
    listId: job.listId,
    listName: list.name,
    vendor: job.vendor as EnrichmentVendor,
    enrichmentType: job.enrichmentType as EnrichmentType,
    status: job.status as ListEnrichmentJobStatus,
    totalRows: job.totalRows,
    processedRows: job.processedRows,
    successCount: job.successCount,
    errorCount: job.errorCount,
    creditsUsed: job.creditsUsed,
    createdAt: job.createdAt.toISOString(),
    updatedAt: job.updatedAt.toISOString(),
    completedAt: null,
  };
}

// ============================================
// Cost Breakdown
// ============================================

export async function getJobCostBreakdown(
  organizationId: string,
  jobId: string
) {
  const job = await listEnrichmentJobRepository.findJobById(jobId);
  if (!job || job.organizationId !== organizationId) {
    return null;
  }

  const savedCredits =
    job.guessSuccessCount * COSTS.PROSPEO_LOOKUP -
    job.validationCredits * COSTS.EMAIL_VALIDATION;

  const percentageSaved =
    job.guessSuccessCount > 0
      ? Math.round(
          (savedCredits /
            ((job.guessSuccessCount + job.fallbackCount) * COSTS.PROSPEO_LOOKUP)) *
            100
        )
      : 0;

  return {
    jobId: job.id,
    strategy: job.enrichmentStrategy as EnrichmentStrategy,
    totalLeads: job.totalRows,
    costs: {
      domainSearchCredits: 0, // Track separately if needed
      validationCredits: job.validationCredits,
      prospeoCredits: job.fallbackCount,
      totalCredits: job.creditsUsed,
    },
    results: {
      guessSuccessCount: job.guessSuccessCount,
      fallbackCount: job.fallbackCount,
      totalSuccess: job.successCount,
      totalFailed: job.errorCount,
    },
    savings: {
      savedCredits: Math.round(savedCredits * 100) / 100,
      percentageSaved,
    },
  };
}

// ============================================
// Domain Pattern Management
// ============================================

export async function getDomainPattern(domain: string) {
  return domainPatternRepository.findByDomain(domain);
}

export async function getPrioritizedPatterns(domain: string): Promise<string[]> {
  return domainPatternRepository.getPrioritizedPatterns(domain);
}

// ============================================
// Cost Comparison
// ============================================

export async function getJobCostComparison(
  organizationId: string,
  jobId: string
): Promise<JobCostComparisonResponse | null> {
  const job = await listEnrichmentJobRepository.findJobById(jobId);
  if (!job || job.organizationId !== organizationId) {
    return null;
  }

  // Only return comparison for completed jobs
  if (job.status !== "completed") {
    return null;
  }

  const successfulEnrichments = job.successCount;
  if (successfulEnrichments === 0) {
    return {
      jobId: job.id,
      actualCost: 0,
      costPerEmail: 0,
      successfulEnrichments: 0,
      competitorComparisons: [],
    };
  }

  // Calculate actual cost based on validation credits and fallbacks
  const validationCost = job.validationCredits * COSTS.EMAIL_VALIDATION;
  const fallbackCost = job.fallbackCount * COSTS.PROSPEO_LOOKUP;
  const actualCost = validationCost + fallbackCost;
  const costPerEmail = actualCost / successfulEnrichments;

  // Calculate competitor comparisons
  const competitorComparisons = COMPETITORS_BY_COST.map((competitor) => {
    const wouldHaveCost = successfulEnrichments * competitor.costPerEmail;
    const savings = wouldHaveCost - actualCost;
    const percentageSaved = Math.round((savings / wouldHaveCost) * 100);

    return {
      competitorId: competitor.id,
      competitorName: competitor.name,
      wouldHaveCost: Math.round(wouldHaveCost * 100) / 100,
      savings: Math.round(savings * 100) / 100,
      percentageSaved: Math.max(0, percentageSaved),
    };
  });

  // Get email validation breakdown by status
  const validationBreakdown = await listEnrichmentJobRepository.countValidationAttemptsByStatus(jobId);

  // Calculate cost per validation status category
  const emailBreakdown = {
    validEmails: {
      count: validationBreakdown.valid,
      cost: Math.round(validationBreakdown.valid * COSTS.EMAIL_VALIDATION * 10000) / 10000,
    },
    catchAllEmails: {
      count: validationBreakdown.catchAll,
      cost: Math.round(validationBreakdown.catchAll * COSTS.EMAIL_VALIDATION * 10000) / 10000,
    },
    invalidEmails: {
      count: validationBreakdown.bounced,
      cost: Math.round(validationBreakdown.bounced * COSTS.EMAIL_VALIDATION * 10000) / 10000,
    },
    unknownEmails: {
      count: validationBreakdown.unknown + validationBreakdown.error,
      cost: Math.round((validationBreakdown.unknown + validationBreakdown.error) * COSTS.EMAIL_VALIDATION * 10000) / 10000,
    },
  };

  return {
    jobId: job.id,
    actualCost: Math.round(actualCost * 100) / 100,
    costPerEmail: Math.round(costPerEmail * 10000) / 10000,
    successfulEnrichments,
    competitorComparisons,
    emailBreakdown,
  };
}

export function getPricingComparison(): PricingComparisonResponse {
  return {
    enrichEngineCostPerEmail: ENRICH_ENGINE_COST_PER_EMAIL,
    competitors: COMPETITORS_BY_COST,
  };
}
