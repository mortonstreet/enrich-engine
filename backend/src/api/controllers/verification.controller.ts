import { AuthRequestHandler } from "@/types/handlers";
import * as verificationService from "@/services/verification.service";
import logger from "@/lib/logger";
import {
  CreateVerificationJobRequest,
  GetVerificationJobRequest,
  SubmitVerificationDecisionRequest,
  GetVerificationEstimateRequest,
} from "@shared/types/src";
import { StatusCodes } from "http-status-codes";
import { createErrorResponse, ErrorCodes } from "@/lib/errors";

// ============================================
// Verification Jobs
// ============================================

export const createVerificationJob: AuthRequestHandler<
  CreateVerificationJobRequest
> = async (req, res) => {
  const { listId, verificationMethod } = req.validated;
  const organizationId = req.session.activeOrganizationId;
  const userId = req.user.id;

  logger.info(
    { listId, verificationMethod, organizationId, userId },
    "Received create verification job request"
  );

  if (!organizationId) {
    logger.warn({ userId }, "Create verification job failed: No active organization");
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json(createErrorResponse(
        "No active organization. Please select an organization first.",
        ErrorCodes.NO_ACTIVE_ORGANIZATION
      ));
  }

  try {
    const job = await verificationService.createVerificationJob(
      organizationId,
      userId,
      listId,
      verificationMethod
    );
    logger.info({ jobId: job.id, listId, verificationMethod }, "Verification job created successfully");
    res.status(StatusCodes.CREATED).json(job);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.warn(
      { error: message, listId, verificationMethod, organizationId },
      "Create verification job failed"
    );
    res.status(StatusCodes.BAD_REQUEST).json({ error: message });
  }
};

export const getVerificationJob: AuthRequestHandler<
  GetVerificationJobRequest
> = async (req, res) => {
  const { jobId } = req.validated;
  const organizationId = req.session.activeOrganizationId;

  if (!organizationId) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json(createErrorResponse("No active organization", ErrorCodes.NO_ACTIVE_ORGANIZATION));
  }

  const result = await verificationService.getVerificationJob(organizationId, jobId);
  if (!result) {
    return res.status(StatusCodes.NOT_FOUND).json(createErrorResponse("Job not found", ErrorCodes.RESOURCE_NOT_FOUND));
  }
  res.json(result);
};

export const getVerificationJobProgress: AuthRequestHandler<
  GetVerificationJobRequest
> = async (req, res) => {
  const { jobId } = req.validated;
  const organizationId = req.session.activeOrganizationId;

  if (!organizationId) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json(createErrorResponse("No active organization", ErrorCodes.NO_ACTIVE_ORGANIZATION));
  }

  const result = await verificationService.getVerificationProgress(organizationId, jobId);
  if (!result) {
    return res.status(StatusCodes.NOT_FOUND).json(createErrorResponse("Job not found", ErrorCodes.RESOURCE_NOT_FOUND));
  }
  res.json(result);
};

export const submitVerificationDecision: AuthRequestHandler<
  SubmitVerificationDecisionRequest
> = async (req, res) => {
  const { jobId, decision } = req.validated;
  const organizationId = req.session.activeOrganizationId;

  logger.info({ jobId, decision, organizationId }, "Received verification decision");

  if (!organizationId) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json(createErrorResponse("No active organization", ErrorCodes.NO_ACTIVE_ORGANIZATION));
  }

  try {
    const result = await verificationService.submitDecision(organizationId, jobId, decision);
    if (!result) {
      return res.status(StatusCodes.NOT_FOUND).json(createErrorResponse("Job not found", ErrorCodes.RESOURCE_NOT_FOUND));
    }
    res.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.warn({ error: message, jobId, decision }, "Submit decision failed");
    res.status(StatusCodes.BAD_REQUEST).json(createErrorResponse(message, ErrorCodes.INVALID_REQUEST));
  }
};

export const getVerificationEstimate: AuthRequestHandler<
  GetVerificationEstimateRequest
> = async (req, res) => {
  const { jobId } = req.validated;
  const organizationId = req.session.activeOrganizationId;

  if (!organizationId) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json(createErrorResponse("No active organization", ErrorCodes.NO_ACTIVE_ORGANIZATION));
  }

  const result = await verificationService.getApiVerificationEstimate(organizationId, jobId);
  if (!result) {
    return res.status(StatusCodes.NOT_FOUND).json(createErrorResponse("Job not found", ErrorCodes.RESOURCE_NOT_FOUND));
  }
  res.json(result);
};
