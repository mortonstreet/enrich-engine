import * as listEnrichmentJobRepository from "@/repositories/listEnrichmentJob.repository";
import * as vendorApiKeyRepository from "@/repositories/vendorApiKey.repository";
import * as listRepository from "@/repositories/list.repository";
import * as leadRepository from "@/repositories/lead.repository";
import { encrypt, decrypt, maskApiKey } from "@/lib/encryption";
import { addListEnrichmentJob } from "@/queues/listEnrich.queue";
import { isValidLinkedInProfileUrl, filterLeadsByLinkedInUrl } from "@/utils/linkedinValidator";
import logger from "@/lib/logger";
import {
  ListEnrichmentJobResponse,
  ListEnrichmentJobsListResponse,
  ListEnrichmentJobDetailResponse,
  VendorsListResponse,
  ApiKeysListResponse,
  ListsForEnrichmentResponse,
  EnrichmentType,
  EnrichmentVendor,
  ListEnrichmentJobStatus,
} from "@shared/types/src";

// ============================================
// Vendor Configuration
// ============================================

const VENDORS = [
  {
    id: "prospeo" as EnrichmentVendor,
    name: "Prospeo",
    supportedTypes: ["email", "phone"] as EnrichmentType[],
    status: "active" as const,
  },
  {
    id: "millionverifier" as EnrichmentVendor,
    name: "MillionVerifier",
    supportedTypes: ["email"] as EnrichmentType[],
    status: "active" as const,
  },
  {
    id: "openrouter" as EnrichmentVendor,
    name: "OpenRouter",
    supportedTypes: [] as EnrichmentType[], // For AI first line generation
    status: "active" as const,
  },
  {
    id: "apollo" as EnrichmentVendor,
    name: "Apollo",
    supportedTypes: ["email", "phone"] as EnrichmentType[],
    status: "coming_soon" as const,
  },
  {
    id: "hunter" as EnrichmentVendor,
    name: "Hunter",
    supportedTypes: ["email"] as EnrichmentType[],
    status: "coming_soon" as const,
  },
  {
    id: "clearbit" as EnrichmentVendor,
    name: "Clearbit",
    supportedTypes: ["email"] as EnrichmentType[],
    status: "coming_soon" as const,
  },
];

// ============================================
// Vendor API Key Management
// ============================================

export async function getVendors(
  organizationId: string
): Promise<VendorsListResponse> {
  const configuredKeys = await vendorApiKeyRepository.findAllByOrganization(
    organizationId
  );
  const configuredVendors = new Set(configuredKeys.map((k) => k.vendor));

  const vendors = VENDORS.map((vendor) => ({
    ...vendor,
    isConfigured: configuredVendors.has(vendor.id),
  }));

  return { vendors };
}

export async function getApiKeys(
  organizationId: string
): Promise<ApiKeysListResponse> {
  const keys = await vendorApiKeyRepository.findAllByOrganization(organizationId);
  const keyMap = new Map(keys.map((k) => [k.vendor, k]));

  const apiKeys = VENDORS.map((vendor) => {
    const key = keyMap.get(vendor.id);
    if (key) {
      const decrypted = decrypt(key.encryptedKey);
      return {
        vendor: vendor.id,
        isConfigured: true,
        maskedKey: maskApiKey(decrypted),
        updatedAt: key.updatedAt.toISOString(),
      };
    }
    return {
      vendor: vendor.id,
      isConfigured: false,
      maskedKey: null,
      updatedAt: null,
    };
  });

  return { apiKeys };
}

export async function saveApiKey(
  organizationId: string,
  userId: string,
  vendor: string,
  apiKey: string
) {
  const encryptedKey = encrypt(apiKey);

  await vendorApiKeyRepository.upsert({
    organizationId,
    vendor,
    encryptedKey,
    createdById: userId,
  });

  return { success: true };
}

export async function deleteApiKey(organizationId: string, vendor: string) {
  await vendorApiKeyRepository.deleteByOrgAndVendor(organizationId, vendor);
  return { success: true };
}

export async function getDecryptedApiKey(
  organizationId: string,
  vendor: string
): Promise<string | null> {
  try {
    const key = await vendorApiKeyRepository.findByOrgAndVendor(
      organizationId,
      vendor
    );
    if (!key) {
      logger.info({ organizationId, vendor }, "No API key found for vendor");
      return null;
    }
    const decrypted = decrypt(key.encryptedKey);
    logger.info(
      { organizationId, vendor, keyLength: decrypted.length },
      "Successfully decrypted API key"
    );
    return decrypted;
  } catch (error) {
    logger.error(
      { error, organizationId, vendor },
      "Failed to decrypt API key - encryption key may have changed"
    );
    return null;
  }
}

// ============================================
// List Selection for Enrichment
// ============================================

export async function getListsForEnrichment(
  organizationId: string
): Promise<ListsForEnrichmentResponse> {
  logger.info({ organizationId }, "getListsForEnrichment called");

  const lists = await listRepository.findListsByOrganizationId(organizationId);

  logger.info({ organizationId, listCount: lists.length }, "Found lists for organization");

  const listsWithLinkedin = await Promise.all(
    lists.map(async (list) => {
      try {
        const hasLinkedin = await leadRepository.hasLinkedinColumn(list.id);

        // Get counts of unenriched leads for each enrichment type
        const [unenrichedEmailCount, unenrichedPhoneCount] = await Promise.all([
          listEnrichmentJobRepository.countUnenrichedLeadsByList(list.id, "email"),
          listEnrichmentJobRepository.countUnenrichedLeadsByList(list.id, "phone"),
        ]);

        logger.info({
          listId: list.id,
          listName: list.name,
          unenrichedEmailCount,
          unenrichedPhoneCount,
          totalLeads: list.leadCount ?? 0,
        }, "Processed list for enrichment");

        return {
          id: list.id,
          name: list.name,
          leadCount: list.leadCount ?? 0,
          totalLeads: list.leadCount ?? 0, // Alias for consistency
          source: (list.source ?? "uploaded") as "uploaded" | "scraped",
          hasLinkedinColumn: hasLinkedin,
          createdAt: list.createdAt ? list.createdAt.toISOString() : new Date().toISOString(),
          unenrichedEmailCount,
          unenrichedPhoneCount,
        };
      } catch (err) {
        logger.error({ error: err, listId: list.id }, "Error processing list for enrichment");
        // On error, return leadCount as the unenriched count so user can still attempt enrichment
        // rather than incorrectly showing 0 (which implies all leads are already enriched)
        const fallbackCount = list.leadCount ?? 0;
        return {
          id: list.id,
          name: list.name,
          leadCount: fallbackCount,
          totalLeads: fallbackCount,
          source: (list.source ?? "uploaded") as "uploaded" | "scraped",
          hasLinkedinColumn: false,
          createdAt: list.createdAt ? list.createdAt.toISOString() : new Date().toISOString(),
          unenrichedEmailCount: fallbackCount,
          unenrichedPhoneCount: fallbackCount,
        };
      }
    })
  );

  return { lists: listsWithLinkedin };
}

// ============================================
// Enrichment Job Management
// ============================================

export async function createEnrichmentJob(
  organizationId: string,
  userId: string,
  listId: string,
  enrichmentType: EnrichmentType
): Promise<ListEnrichmentJobResponse> {
  logger.info(
    { organizationId, userId, listId, enrichmentType },
    "Creating enrichment job"
  );

  // Verify list exists and belongs to org
  const list = await listRepository.findListById(listId);
  if (!list) {
    logger.warn({ listId }, "Enrichment job failed: List not found");
    throw new Error(`List not found (ID: ${listId})`);
  }
  if (list.organizationId !== organizationId) {
    logger.warn(
      { listId, listOrgId: list.organizationId, requestOrgId: organizationId },
      "Enrichment job failed: List belongs to different organization"
    );
    throw new Error("List not found or access denied");
  }

  // Check for API key
  logger.info({ organizationId }, "Checking for Prospeo API key");
  const apiKey = await getDecryptedApiKey(organizationId, "prospeo");
  if (!apiKey) {
    logger.warn(
      { organizationId },
      "Enrichment job failed: Prospeo API key not configured"
    );
    throw new Error(
      "Prospeo API key not configured. Please add your Prospeo API key in Settings > API Keys."
    );
  }

  // Get leads with LinkedIn URLs
  const allLeads = await leadRepository.findByListIdWithLinkedin(listId);
  logger.info(
    { listId, leadsWithLinkedin: allLeads.length },
    "Found leads with LinkedIn URLs"
  );

  if (allLeads.length === 0) {
    throw new Error(
      "No leads with LinkedIn URLs found in this list. Make sure your leads have LinkedIn profile URLs."
    );
  }

  // Filter to only valid LinkedIn profile URLs (exclude company pages, etc.)
  const { validLeads: leadsWithValidUrls, invalidLeads } = filterLeadsByLinkedInUrl(allLeads);

  if (invalidLeads.length > 0) {
    logger.info(
      {
        listId,
        invalidCount: invalidLeads.length,
        sampleInvalid: invalidLeads.slice(0, 3).map(l => ({
          id: l.id,
          url: l.linkedinUrl,
          reason: l.invalidReason,
        })),
      },
      "Filtered out leads with invalid LinkedIn URLs"
    );
  }

  if (leadsWithValidUrls.length === 0) {
    throw new Error(
      `No leads with valid LinkedIn profile URLs found. ${invalidLeads.length} leads were excluded (company pages, malformed URLs, etc.).`
    );
  }

  // Get leads that have already been enriched for this type to avoid duplicates
  const enrichedLeadIds = await listEnrichmentJobRepository.findEnrichedLeadIdsByList(
    listId,
    enrichmentType
  );

  // Filter out already enriched leads
  const leads = leadsWithValidUrls.filter((lead) => !enrichedLeadIds.has(lead.id));

  logger.info(
    {
      listId,
      totalLeadsWithLinkedin: allLeads.length,
      validLinkedinUrls: leadsWithValidUrls.length,
      invalidLinkedinUrls: invalidLeads.length,
      alreadyEnriched: enrichedLeadIds.size,
      toEnrich: leads.length,
    },
    "Filtered leads for enrichment"
  );

  if (leads.length === 0) {
    throw new Error(
      `All ${leadsWithValidUrls.length} leads with valid LinkedIn URLs in this list have already been enriched for ${enrichmentType}. No new leads to enrich.`
    );
  }

  // Create the job
  const job = await listEnrichmentJobRepository.createJob({
    organizationId,
    userId,
    listId,
    vendor: "prospeo",
    enrichmentType,
    totalRows: leads.length,
  });

  if (!job) {
    throw new Error("Failed to create enrichment job");
  }

  // Create job items for each lead (only unenriched leads)
  const items = leads.map((lead) => ({
    jobId: job.id,
    leadId: lead.id,
    linkedinUrl: lead.linkedinUrl!,
  }));

  await listEnrichmentJobRepository.createJobItems(items);

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
    completedAt: job.completedAt?.toISOString() ?? null,
  };
}

export async function getEnrichmentJobs(
  organizationId: string,
  options: { page: number; limit: number; status?: ListEnrichmentJobStatus }
): Promise<ListEnrichmentJobsListResponse> {
  const result = await listEnrichmentJobRepository.findJobsByOrganization(
    organizationId,
    options
  );

  const jobs = result.data.map((job) => ({
    id: job.id,
    listId: job.listId,
    listName: job.listName ?? "Unknown List",
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
    completedAt: job.completedAt?.toISOString() ?? null,
  }));

  return {
    jobs,
    pagination: {
      page: result.pagination.page,
      limit: result.pagination.limit,
      total: result.pagination.total,
      totalPages: result.pagination.totalPages,
    },
  };
}

export async function getEnrichmentJob(
  organizationId: string,
  jobId: string
): Promise<ListEnrichmentJobDetailResponse | null> {
  const job = await listEnrichmentJobRepository.findJobByIdWithList(jobId);
  if (!job || job.organizationId !== organizationId) {
    return null;
  }

  const items = await listEnrichmentJobRepository.findItemsByJobId(jobId);

  // Fetch validation attempts for all job items
  const itemIds = items.map((item) => item.id);
  const validationAttempts =
    await listEnrichmentJobRepository.findValidationAttemptsByJobItemIds(itemIds);

  // Group validation attempts by job item ID
  const attemptsByItemId = new Map<string, typeof validationAttempts>();
  for (const attempt of validationAttempts) {
    const existing = attemptsByItemId.get(attempt.jobItemId) ?? [];
    existing.push(attempt);
    attemptsByItemId.set(attempt.jobItemId, existing);
  }

  return {
    job: {
      id: job.id,
      listId: job.listId,
      listName: job.listName ?? "Unknown List",
      vendor: job.vendor as EnrichmentVendor,
      enrichmentType: job.enrichmentType as EnrichmentType,
      enrichmentStrategy: job.enrichmentStrategy as 'direct' | 'guess_first' | 'guess_only' | undefined,
      status: job.status as ListEnrichmentJobStatus,
      totalRows: job.totalRows,
      processedRows: job.processedRows,
      successCount: job.successCount,
      errorCount: job.errorCount,
      creditsUsed: job.creditsUsed,
      guessSuccessCount: job.guessSuccessCount,
      fallbackCount: job.fallbackCount,
      createdAt: job.createdAt.toISOString(),
      updatedAt: job.updatedAt.toISOString(),
      completedAt: job.completedAt?.toISOString() ?? null,
    },
    items: items.map((item) => {
      const itemAttempts = attemptsByItemId.get(item.id) ?? [];
      return {
        id: item.id,
        leadId: item.leadId,
        linkedinUrl: item.linkedinUrl,
        status: item.status as any,
        enrichedEmail: item.enrichedEmail,
        enrichedPhone: item.enrichedPhone,
        errorMessage: item.errorMessage,
        createdAt: item.createdAt.toISOString(),
        processedAt: item.processedAt?.toISOString() ?? null,
        lead: {
          firstName: item.firstName,
          lastName: item.lastName,
          company: item.company,
          companyDomain: item.companyDomain,
        },
        validationAttempts: itemAttempts.map((a) => ({
          id: a.id,
          leadId: a.leadId,
          email: a.email,
          pattern: a.pattern,
          status: a.status as 'valid' | 'bounced' | 'catch_all' | 'unknown' | 'error',
          createdAt: a.createdAt.toISOString(),
          processedAt: a.processedAt?.toISOString() ?? null,
        })),
      };
    }),
  };
}

export async function deleteEnrichmentJob(
  organizationId: string,
  jobId: string
): Promise<boolean> {
  const job = await listEnrichmentJobRepository.findJobById(jobId);
  if (!job || job.organizationId !== organizationId) {
    return false;
  }

  await listEnrichmentJobRepository.deleteJob(jobId);
  return true;
}

// ============================================
// Job Progress Updates
// ============================================

export async function updateJobProgress(jobId: string) {
  const counts = await listEnrichmentJobRepository.countItemsByStatus(jobId);
  const processedRows =
    counts.completed + counts.failed + counts.notFound;
  const successCount = counts.completed;
  const errorCount = counts.failed + counts.notFound;

  await listEnrichmentJobRepository.updateJob(jobId, {
    processedRows,
    successCount,
    errorCount,
    creditsUsed: successCount,
  });
}

// ============================================
// CSV Download
// ============================================

export async function generateEnrichedCsv(
  organizationId: string,
  jobId: string,
  filter: 'all' | 'found' | 'valid' | 'catchall' | 'risky' = 'all'
): Promise<{ csv: string; filename: string } | null> {
  const job = await listEnrichmentJobRepository.findJobByIdWithList(jobId);
  if (!job || job.organizationId !== organizationId) {
    return null;
  }

  let items = await listEnrichmentJobRepository.findItemsByJobId(jobId);

  // Get validation attempts for all items to determine validation status
  const itemIds = items.map((item) => item.id);
  const validationAttempts = await listEnrichmentJobRepository.findValidationAttemptsByJobItemIds(itemIds);

  // Create a map of item ID to their best validation status
  // Priority: valid > catch_all > unknown > bounced > error
  const itemValidationStatusMap = new Map<string, string>();
  for (const attempt of validationAttempts) {
    const currentStatus = itemValidationStatusMap.get(attempt.jobItemId);
    // If we already have a "valid" status for this item, keep it
    if (currentStatus === 'valid') continue;
    // Otherwise, prefer valid > catch_all > unknown > others
    if (attempt.status === 'valid' ||
        (attempt.status === 'catch_all' && currentStatus !== 'valid') ||
        (!currentStatus || currentStatus === 'bounced' || currentStatus === 'error' || currentStatus === 'unknown')) {
      itemValidationStatusMap.set(attempt.jobItemId, attempt.status);
    }
  }

  // Filter items based on filter parameter
  if (filter === 'found') {
    items = items.filter((item) => {
      if (job.enrichmentType === 'email') {
        return item.enrichedEmail && item.enrichedEmail.trim() !== '';
      }
      return item.enrichedPhone && item.enrichedPhone.trim() !== '';
    });
  } else if (filter === 'valid') {
    items = items.filter((item) => {
      const hasEnrichedValue = job.enrichmentType === 'email'
        ? item.enrichedEmail && item.enrichedEmail.trim() !== ''
        : item.enrichedPhone && item.enrichedPhone.trim() !== '';
      const validationStatus = itemValidationStatusMap.get(item.id);
      return hasEnrichedValue && validationStatus === 'valid';
    });
  } else if (filter === 'catchall') {
    items = items.filter((item) => {
      const hasEnrichedValue = job.enrichmentType === 'email'
        ? item.enrichedEmail && item.enrichedEmail.trim() !== ''
        : item.enrichedPhone && item.enrichedPhone.trim() !== '';
      const validationStatus = itemValidationStatusMap.get(item.id);
      return hasEnrichedValue && validationStatus === 'catch_all';
    });
  } else if (filter === 'risky') {
    items = items.filter((item) => {
      const hasEnrichedValue = job.enrichmentType === 'email'
        ? item.enrichedEmail && item.enrichedEmail.trim() !== ''
        : item.enrichedPhone && item.enrichedPhone.trim() !== '';
      const validationStatus = itemValidationStatusMap.get(item.id);
      // Risky includes: catch_all, unknown, or no validation data (enriched via Prospeo without validation)
      return hasEnrichedValue && (validationStatus === 'catch_all' || validationStatus === 'unknown' || !validationStatus);
    });
  }

  // Get leads for the items using batch query to avoid connection pool exhaustion
  const leadIds = items.map((item) => item.leadId);
  const leads = await leadRepository.findByIds(leadIds, organizationId);
  const leadMap = new Map(leads.map((l) => [l.id, l]));

  // Build CSV
  const headers = [
    "LinkedIn URL",
    "First Name",
    "Last Name",
    "Email",
    "Phone",
    "Company",
    "Role",
    "Enrichment Status",
    "Validation Status",
    job.enrichmentType === "email" ? "Enriched Email" : "Enriched Phone",
  ];

  const rows = items.map((item) => {
    const lead = leadMap.get(item.leadId);
    const validationStatus = itemValidationStatusMap.get(item.id) ?? '';
    return [
      item.linkedinUrl,
      lead?.firstName ?? "",
      lead?.lastName ?? "",
      lead?.email ?? "",
      lead?.phone ?? "",
      lead?.company ?? "",
      lead?.role ?? "",
      item.status,
      validationStatus,
      job.enrichmentType === "email"
        ? item.enrichedEmail ?? ""
        : item.enrichedPhone ?? "",
    ];
  });

  const escapeCsvField = (field: string) => {
    if (field.includes(",") || field.includes('"') || field.includes("\n")) {
      return `"${field.replace(/"/g, '""')}"`;
    }
    return field;
  };

  const csv =
    headers.join(",") +
    "\n" +
    rows.map((row) => row.map(escapeCsvField).join(",")).join("\n");

  const filterSuffixMap: Record<string, string> = {
    all: '',
    found: '_found',
    valid: '_valid',
    catchall: '_catchall',
    risky: '_risky',
  };
  const filterSuffix = filterSuffixMap[filter] ?? '';
  const filename = `${job.listName ?? "enriched"}_${job.enrichmentType}${filterSuffix}_${new Date().toISOString().split("T")[0]}.csv`;

  return { csv, filename };
}
