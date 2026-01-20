import { AuthRequestHandler } from "@/types/handlers";
import * as enrichService from "@/services/enrich.service";
import * as emailGuessService from "@/services/emailGuess.service";
import * as organizationService from "@/services/organization.service";
import {
  CreateListEnrichmentJobRequest,
  GetListEnrichmentJobsQuery,
  GetListEnrichmentJobRequest,
  SaveVendorApiKeyRequest,
  DeleteVendorApiKeyRequest,
  CreateEmailGuessJobRequest,
  PreviewEmailGuessRequest,
  OrganizationRole,
} from "@shared/types/src";
import { StatusCodes } from "http-status-codes";

// ============================================
// Enrichment Jobs
// ============================================

export const createEnrichmentJob: AuthRequestHandler<
  CreateListEnrichmentJobRequest
> = async (req, res) => {
  const { listId, enrichmentType } = req.validated;
  const organizationId = req.session.activeOrganizationId;
  const userId = req.user.id;

  if (!organizationId) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ error: "No active organization" });
  }

  try {
    const job = await enrichService.createEnrichmentJob(
      organizationId,
      userId,
      listId,
      enrichmentType
    );
    res.status(StatusCodes.CREATED).json(job);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(StatusCodes.BAD_REQUEST).json({ error: message });
  }
};

export const getEnrichmentJobs: AuthRequestHandler<
  GetListEnrichmentJobsQuery
> = async (req, res) => {
  const { page, limit, status } = req.validated;
  const organizationId = req.session.activeOrganizationId;

  if (!organizationId) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ error: "No active organization" });
  }

  const result = await enrichService.getEnrichmentJobs(organizationId, {
    page,
    limit,
    status,
  });
  res.json(result);
};

export const getEnrichmentJob: AuthRequestHandler<
  GetListEnrichmentJobRequest
> = async (req, res) => {
  const { jobId } = req.validated;
  const organizationId = req.session.activeOrganizationId;

  if (!organizationId) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ error: "No active organization" });
  }

  const result = await enrichService.getEnrichmentJob(organizationId, jobId);
  if (!result) {
    return res.status(StatusCodes.NOT_FOUND).json({ error: "Job not found" });
  }
  res.json(result);
};

export const deleteEnrichmentJob: AuthRequestHandler<
  GetListEnrichmentJobRequest
> = async (req, res) => {
  const { jobId } = req.validated;
  const organizationId = req.session.activeOrganizationId;

  if (!organizationId) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ error: "No active organization" });
  }

  const deleted = await enrichService.deleteEnrichmentJob(organizationId, jobId);
  if (!deleted) {
    return res.status(StatusCodes.NOT_FOUND).json({ error: "Job not found" });
  }
  res.json({ success: true });
};

export const downloadEnrichmentResults: AuthRequestHandler<
  GetListEnrichmentJobRequest
> = async (req, res) => {
  const { jobId } = req.validated;
  const organizationId = req.session.activeOrganizationId;

  if (!organizationId) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ error: "No active organization" });
  }

  const result = await enrichService.generateEnrichedCsv(organizationId, jobId);
  if (!result) {
    return res.status(StatusCodes.NOT_FOUND).json({ error: "Job not found" });
  }

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename="${result.filename}"`);
  res.send(result.csv);
};

// ============================================
// Vendors
// ============================================

export const getVendors: AuthRequestHandler<Record<string, never>> = async (
  req,
  res
) => {
  const organizationId = req.session.activeOrganizationId;

  if (!organizationId) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ error: "No active organization" });
  }

  const result = await enrichService.getVendors(organizationId);
  res.json(result);
};

// ============================================
// Lists for Enrichment
// ============================================

export const getListsForEnrichment: AuthRequestHandler<
  Record<string, never>
> = async (req, res) => {
  const organizationId = req.session.activeOrganizationId;

  if (!organizationId) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ error: "No active organization" });
  }

  const result = await enrichService.getListsForEnrichment(organizationId);
  res.json(result);
};

// ============================================
// API Keys (Admin only)
// ============================================

export const getApiKeys: AuthRequestHandler<Record<string, never>> = async (
  req,
  res
) => {
  const organizationId = req.session.activeOrganizationId;
  const userId = req.user.id;

  if (!organizationId) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ error: "No active organization" });
  }

  // Check if user is admin or owner
  const hasAccess = await organizationService.doesMemberHaveRole(
    userId,
    organizationId,
    [OrganizationRole.ADMIN, OrganizationRole.OWNER]
  );
  if (!hasAccess) {
    return res
      .status(StatusCodes.FORBIDDEN)
      .json({ error: "Only admins can view API keys" });
  }

  const result = await enrichService.getApiKeys(organizationId);
  res.json(result);
};

export const saveApiKey: AuthRequestHandler<SaveVendorApiKeyRequest> = async (
  req,
  res
) => {
  const { vendor, apiKey } = req.validated;
  const organizationId = req.session.activeOrganizationId;
  const userId = req.user.id;

  if (!organizationId) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ error: "No active organization" });
  }

  // Check if user is admin or owner
  const hasAccess = await organizationService.doesMemberHaveRole(
    userId,
    organizationId,
    [OrganizationRole.ADMIN, OrganizationRole.OWNER]
  );
  if (!hasAccess) {
    return res
      .status(StatusCodes.FORBIDDEN)
      .json({ error: "Only admins can manage API keys" });
  }

  await enrichService.saveApiKey(organizationId, userId, vendor, apiKey);
  res.json({ success: true });
};

export const deleteApiKey: AuthRequestHandler<DeleteVendorApiKeyRequest> = async (
  req,
  res
) => {
  const { vendor } = req.validated;
  const organizationId = req.session.activeOrganizationId;
  const userId = req.user.id;

  if (!organizationId) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ error: "No active organization" });
  }

  // Check if user is admin or owner
  const hasAccess = await organizationService.doesMemberHaveRole(
    userId,
    organizationId,
    [OrganizationRole.ADMIN, OrganizationRole.OWNER]
  );
  if (!hasAccess) {
    return res
      .status(StatusCodes.FORBIDDEN)
      .json({ error: "Only admins can delete API keys" });
  }

  await enrichService.deleteApiKey(organizationId, vendor);
  res.json({ success: true });
};

// ============================================
// Email Guess
// ============================================

export const previewEmailGuessJob: AuthRequestHandler<
  PreviewEmailGuessRequest
> = async (req, res) => {
  const { listId } = req.validated;
  const organizationId = req.session.activeOrganizationId;

  if (!organizationId) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ error: "No active organization" });
  }

  try {
    const preview = await emailGuessService.previewEmailGuessJob(
      organizationId,
      listId
    );
    res.json(preview);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(StatusCodes.BAD_REQUEST).json({ error: message });
  }
};

export const createEmailGuessJob: AuthRequestHandler<
  CreateEmailGuessJobRequest
> = async (req, res) => {
  const { listId, strategy } = req.validated;
  const organizationId = req.session.activeOrganizationId;
  const userId = req.user.id;

  if (!organizationId) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ error: "No active organization" });
  }

  try {
    const job = await emailGuessService.createEmailGuessJob(
      organizationId,
      userId,
      listId,
      strategy
    );
    res.status(StatusCodes.CREATED).json(job);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(StatusCodes.BAD_REQUEST).json({ error: message });
  }
};

export const getJobCostBreakdown: AuthRequestHandler<
  GetListEnrichmentJobRequest
> = async (req, res) => {
  const { jobId } = req.validated;
  const organizationId = req.session.activeOrganizationId;

  if (!organizationId) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ error: "No active organization" });
  }

  const breakdown = await emailGuessService.getJobCostBreakdown(
    organizationId,
    jobId
  );
  if (!breakdown) {
    return res.status(StatusCodes.NOT_FOUND).json({ error: "Job not found" });
  }
  res.json(breakdown);
};
