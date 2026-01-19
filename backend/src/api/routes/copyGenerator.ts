import { Router } from "express";
import {
  createCopyGeneratorJob,
  getCopyGeneratorJobs,
  getCopyGeneratorJob,
  deleteCopyGeneratorJob,
  getListsForCopyGenerator,
  previewFirstLine,
} from "@/api/controllers/copyGenerator.controller";
import { authenticatedRoute } from "./utils";
import { withBetterAuth } from "../middlewares/auth";
import { validateAndMerge } from "../middlewares/validationMiddleware";
import {
  CreateCopyGeneratorJobRequest,
  CreateCopyGeneratorJobSchema,
  GetCopyGeneratorJobsQuery,
  GetCopyGeneratorJobsQuerySchema,
  GetCopyGeneratorJobRequest,
  GetCopyGeneratorJobSchema,
  PreviewCopyGeneratorRequest,
  PreviewCopyGeneratorSchema,
} from "@shared/types/src";

const router = Router();

// ============================================
// Copy Generator Jobs
// ============================================

// Create copy generator job
router.post(
  "/jobs",
  withBetterAuth,
  validateAndMerge(CreateCopyGeneratorJobSchema),
  authenticatedRoute<CreateCopyGeneratorJobRequest>(createCopyGeneratorJob)
);

// List copy generator jobs
router.get(
  "/jobs",
  withBetterAuth,
  validateAndMerge(GetCopyGeneratorJobsQuerySchema),
  authenticatedRoute<GetCopyGeneratorJobsQuery>(getCopyGeneratorJobs)
);

// Get copy generator job details
router.get(
  "/jobs/:jobId",
  withBetterAuth,
  validateAndMerge(GetCopyGeneratorJobSchema),
  authenticatedRoute<GetCopyGeneratorJobRequest>(getCopyGeneratorJob)
);

// Delete copy generator job
router.delete(
  "/jobs/:jobId",
  withBetterAuth,
  validateAndMerge(GetCopyGeneratorJobSchema),
  authenticatedRoute<GetCopyGeneratorJobRequest>(deleteCopyGeneratorJob)
);

// ============================================
// Lists for Copy Generator
// ============================================

router.get(
  "/lists",
  withBetterAuth,
  authenticatedRoute<Record<string, never>>(getListsForCopyGenerator)
);

// ============================================
// Preview
// ============================================

router.post(
  "/preview",
  withBetterAuth,
  validateAndMerge(PreviewCopyGeneratorSchema),
  authenticatedRoute<PreviewCopyGeneratorRequest>(previewFirstLine)
);

export default router;
