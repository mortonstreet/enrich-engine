import { AuthRequestHandler } from "@/types/handlers";
import * as companySearchService from "@/services/companySearch.service";
import { addCompanySearchJob } from "@/queues/companySearch.queue";
import {
  GenerateSearchQueryRequest,
  PreviewCompanySearchRequest,
  CreateCompanySearchJobRequest,
  GetCompanySearchJobsRequest,
  GetCompanySearchJobRequest,
  DownloadCompanySearchRequest,
  CreatePeopleSearchFromCompaniesRequest,
} from "@shared/types/src";

// Helper to get the OpenRouter API key for the organization
async function getOpenRouterApiKey(organizationId: string): Promise<string> {
  const { db } = await import("@/lib/db");
  const { decrypt } = await import("@/lib/encryption");

  const vendorKey = await db
    .selectFrom("vendor_api_key")
    .where("organizationId", "=", organizationId)
    .where("vendor", "=", "openrouter")
    .where("isActive", "=", true)
    .select(["encryptedKey"])
    .executeTakeFirst();

  if (!vendorKey) {
    throw new Error("OpenRouter API key not configured. Please add it in Settings > API Keys.");
  }

  return decrypt(vendorKey.encryptedKey);
}

export const generateSearchQuery: AuthRequestHandler<GenerateSearchQueryRequest> = async (
  req,
  res
) => {
  const { naturalLanguageQuery } = req.validated;
  const organizationId = req.session.activeOrganizationId;

  if (!organizationId) {
    return res.status(400).json({ error: "No active organization" });
  }

  const apiKey = await getOpenRouterApiKey(organizationId);
  const result = await companySearchService.generateSearchQuery(naturalLanguageQuery, apiKey);

  res.json(result);
};

export const previewCompanySearch: AuthRequestHandler<PreviewCompanySearchRequest> = async (
  req,
  res
) => {
  const { searchQuery } = req.validated;
  const organizationId = req.session.activeOrganizationId;

  if (!organizationId) {
    return res.status(400).json({ error: "No active organization" });
  }

  const result = await companySearchService.previewSearch(searchQuery);

  res.json(result);
};

export const createCompanySearchJob: AuthRequestHandler<CreateCompanySearchJobRequest> = async (
  req,
  res
) => {
  const { name, naturalLanguageQuery, searchQuery, maxPages } = req.validated;
  const organizationId = req.session.activeOrganizationId;

  if (!organizationId) {
    return res.status(400).json({ error: "No active organization" });
  }

  const result = await companySearchService.createCompanySearchJob(
    organizationId,
    req.user.id,
    { name, naturalLanguageQuery, searchQuery, maxPages }
  );

  await addCompanySearchJob(result.job.id);

  res.json(result);
};

export const getCompanySearchJobs: AuthRequestHandler<GetCompanySearchJobsRequest> = async (
  req,
  res
) => {
  const { page, limit, status } = req.validated;
  const organizationId = req.session.activeOrganizationId;

  if (!organizationId) {
    return res.status(400).json({ error: "No active organization" });
  }

  const result = await companySearchService.getCompanySearchJobs(organizationId, {
    page,
    limit,
    status,
  });

  res.json(result);
};

export const getCompanySearchJob: AuthRequestHandler<GetCompanySearchJobRequest> = async (
  req,
  res
) => {
  const { jobId } = req.validated;
  const organizationId = req.session.activeOrganizationId;

  if (!organizationId) {
    return res.status(400).json({ error: "No active organization" });
  }

  const result = await companySearchService.getCompanySearchJob(jobId, organizationId);

  res.json(result);
};

export const downloadCompanySearchResults: AuthRequestHandler<DownloadCompanySearchRequest> = async (
  req,
  res
) => {
  const { jobId } = req.validated;
  const organizationId = req.session.activeOrganizationId;
  const dedupedOnly = req.query.dedupedOnly !== "false";

  if (!organizationId) {
    return res.status(400).json({ error: "No active organization" });
  }

  const { fileName, rows } = await companySearchService.getDownloadData(
    jobId,
    organizationId,
    dedupedOnly
  );

  if (rows.length === 0) {
    return res.status(400).json({ error: "No results to download" });
  }

  const headers = Object.keys(rows[0]);
  const csvContent = [
    headers.join(","),
    ...rows.map((row) =>
      headers.map((h) => `"${(row[h] || "").replace(/"/g, '""')}"`).join(",")
    ),
  ].join("\n");

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
  res.send(csvContent);
};

export const createPeopleSearchFromCompanies: AuthRequestHandler<CreatePeopleSearchFromCompaniesRequest> = async (
  req,
  res
) => {
  const { jobId, name, roleConfigs } = req.validated;
  const organizationId = req.session.activeOrganizationId;

  if (!organizationId) {
    return res.status(400).json({ error: "No active organization" });
  }

  const result = await companySearchService.createPeopleSearchFromCompanies(
    jobId,
    organizationId,
    req.user.id,
    name,
    roleConfigs
  );

  res.json(result);
};
