import { Router } from "express";
import { withBetterAuth } from "@/api/middlewares/auth";
import { validateAndMerge } from "@/api/middlewares/validationMiddleware";
import { authenticatedRoute } from "./utils";
import {
  createVerificationJob,
  getVerificationJob,
  getVerificationJobProgress,
  submitVerificationDecision,
  getVerificationEstimate,
} from "@/api/controllers/verification.controller";
import {
  CreateVerificationJobSchema,
  GetVerificationJobSchema,
  SubmitVerificationDecisionSchema,
  GetVerificationEstimateSchema,
} from "@shared/types/src";
import { RedisRateLimiter } from "@/services/rate-limiter.service";

const router = Router();

// Create a new verification job
router.post(
  "/jobs",
  withBetterAuth,
  RedisRateLimiter.presets.perUser(60, 5), // 5 jobs per minute
  validateAndMerge(CreateVerificationJobSchema),
  authenticatedRoute(createVerificationJob)
);

// Get a specific verification job
router.get(
  "/jobs/:jobId",
  withBetterAuth,
  validateAndMerge(GetVerificationJobSchema),
  authenticatedRoute(getVerificationJob)
);

// Get verification job progress (with domain stats)
router.get(
  "/jobs/:jobId/progress",
  withBetterAuth,
  validateAndMerge(GetVerificationJobSchema),
  authenticatedRoute(getVerificationJobProgress)
);

// Submit user decision for a verification job
router.post(
  "/jobs/:jobId/decision",
  withBetterAuth,
  RedisRateLimiter.presets.perUser(60, 10), // 10 decisions per minute
  validateAndMerge(SubmitVerificationDecisionSchema),
  authenticatedRoute(submitVerificationDecision)
);

// Get API fallback cost estimate for a job
router.get(
  "/jobs/:jobId/estimate",
  withBetterAuth,
  validateAndMerge(GetVerificationEstimateSchema),
  authenticatedRoute(getVerificationEstimate)
);

export default router;
