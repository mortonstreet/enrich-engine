import { AuthRequestHandler } from "@/types/handlers";
import * as copyGeneratorService from "@/services/copyGenerator.service";
import {
  CreateCopyGeneratorJobRequest,
  GetCopyGeneratorJobsQuery,
  GetCopyGeneratorJobRequest,
  PreviewCopyGeneratorRequest,
} from "@shared/types/src";
import { StatusCodes } from "http-status-codes";

// ============================================
// Copy Generator Jobs
// ============================================

export const createCopyGeneratorJob: AuthRequestHandler<
  CreateCopyGeneratorJobRequest
> = async (req, res) => {
  const { listId, userPrompt } = req.validated;
  const organizationId = req.session.activeOrganizationId;
  const userId = req.user.id;

  if (!organizationId) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ error: "No active organization" });
  }

  try {
    const job = await copyGeneratorService.createCopyGeneratorJob(
      organizationId,
      userId,
      listId,
      userPrompt
    );
    res.status(StatusCodes.CREATED).json(job);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(StatusCodes.BAD_REQUEST).json({ error: message });
  }
};

export const getCopyGeneratorJobs: AuthRequestHandler<
  GetCopyGeneratorJobsQuery
> = async (req, res) => {
  const { page, limit, status } = req.validated;
  const organizationId = req.session.activeOrganizationId;

  if (!organizationId) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ error: "No active organization" });
  }

  const result = await copyGeneratorService.getCopyGeneratorJobs(
    organizationId,
    {
      page,
      limit,
      status,
    }
  );
  res.json(result);
};

export const getCopyGeneratorJob: AuthRequestHandler<
  GetCopyGeneratorJobRequest
> = async (req, res) => {
  const { jobId } = req.validated;
  const organizationId = req.session.activeOrganizationId;

  if (!organizationId) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ error: "No active organization" });
  }

  const result = await copyGeneratorService.getCopyGeneratorJob(
    organizationId,
    jobId
  );
  if (!result) {
    return res.status(StatusCodes.NOT_FOUND).json({ error: "Job not found" });
  }
  res.json(result);
};

export const deleteCopyGeneratorJob: AuthRequestHandler<
  GetCopyGeneratorJobRequest
> = async (req, res) => {
  const { jobId } = req.validated;
  const organizationId = req.session.activeOrganizationId;

  if (!organizationId) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ error: "No active organization" });
  }

  const deleted = await copyGeneratorService.deleteCopyGeneratorJob(
    organizationId,
    jobId
  );
  if (!deleted) {
    return res.status(StatusCodes.NOT_FOUND).json({ error: "Job not found" });
  }
  res.json({ success: true });
};

// ============================================
// Lists for Copy Generator
// ============================================

export const getListsForCopyGenerator: AuthRequestHandler<
  Record<string, never>
> = async (req, res) => {
  const organizationId = req.session.activeOrganizationId;

  if (!organizationId) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ error: "No active organization" });
  }

  const result = await copyGeneratorService.getListsForCopyGenerator(
    organizationId
  );
  res.json(result);
};

// ============================================
// Preview
// ============================================

export const previewFirstLine: AuthRequestHandler<
  PreviewCopyGeneratorRequest
> = async (req, res) => {
  const { leadId, userPrompt } = req.validated;
  const organizationId = req.session.activeOrganizationId;

  if (!organizationId) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ error: "No active organization" });
  }

  try {
    const result = await copyGeneratorService.previewFirstLine(
      organizationId,
      leadId,
      userPrompt
    );
    res.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(StatusCodes.BAD_REQUEST).json({ error: message });
  }
};
