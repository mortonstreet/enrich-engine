import { Router } from "express";
import {
  createEnrichmentJob,
  getEnrichmentJobs,
  getEnrichmentJob,
  deleteEnrichmentJob,
  downloadEnrichmentResults,
  getVendors,
  getListsForEnrichment,
  getApiKeys,
  saveApiKey,
  deleteApiKey,
  previewEmailGuessJob,
  createEmailGuessJob,
  getJobCostBreakdown,
  getJobCostComparison,
  getPricingComparison,
} from "@/api/controllers/enrich.controller";
import { authenticatedRoute, validatedRoute } from "./utils";
import { withBetterAuth } from "../middlewares/auth";
import { validateAndMerge } from "../middlewares/validationMiddleware";
import {
  CreateListEnrichmentJobRequest,
  CreateListEnrichmentJobSchema,
  GetListEnrichmentJobsQuery,
  GetListEnrichmentJobsQuerySchema,
  GetListEnrichmentJobRequest,
  GetListEnrichmentJobSchema,
  SaveVendorApiKeyRequest,
  SaveVendorApiKeySchema,
  DeleteVendorApiKeyRequest,
  DeleteVendorApiKeySchema,
  CreateEmailGuessJobRequest,
  CreateEmailGuessJobSchema,
  PreviewEmailGuessRequest,
  PreviewEmailGuessSchema,
} from "@shared/types/src";

const router = Router();

// ============================================
// Enrichment Jobs
// ============================================

// Create enrichment job
router.post(
  "/jobs",
  withBetterAuth,
  validateAndMerge(CreateListEnrichmentJobSchema),
  authenticatedRoute<CreateListEnrichmentJobRequest>(createEnrichmentJob)
);

// List enrichment jobs
router.get(
  "/jobs",
  withBetterAuth,
  validateAndMerge(GetListEnrichmentJobsQuerySchema),
  authenticatedRoute<GetListEnrichmentJobsQuery>(getEnrichmentJobs)
);

// Get enrichment job details
router.get(
  "/jobs/:jobId",
  withBetterAuth,
  validateAndMerge(GetListEnrichmentJobSchema),
  authenticatedRoute<GetListEnrichmentJobRequest>(getEnrichmentJob)
);

// Delete enrichment job
router.delete(
  "/jobs/:jobId",
  withBetterAuth,
  validateAndMerge(GetListEnrichmentJobSchema),
  authenticatedRoute<GetListEnrichmentJobRequest>(deleteEnrichmentJob)
);

// Download enriched results
router.get(
  "/jobs/:jobId/download",
  withBetterAuth,
  validateAndMerge(GetListEnrichmentJobSchema),
  authenticatedRoute<GetListEnrichmentJobRequest>(downloadEnrichmentResults)
);

// ============================================
// Vendors
// ============================================

router.get(
  "/vendors",
  withBetterAuth,
  authenticatedRoute<Record<string, never>>(getVendors)
);

// ============================================
// Lists for Enrichment
// ============================================

router.get(
  "/lists",
  withBetterAuth,
  authenticatedRoute<Record<string, never>>(getListsForEnrichment)
);

// ============================================
// API Keys (Settings)
// ============================================

router.get(
  "/api-keys",
  withBetterAuth,
  authenticatedRoute<Record<string, never>>(getApiKeys)
);

router.post(
  "/api-keys",
  withBetterAuth,
  validateAndMerge(SaveVendorApiKeySchema),
  authenticatedRoute<SaveVendorApiKeyRequest>(saveApiKey)
);

router.delete(
  "/api-keys/:vendor",
  withBetterAuth,
  validateAndMerge(DeleteVendorApiKeySchema),
  authenticatedRoute<DeleteVendorApiKeyRequest>(deleteApiKey)
);

// ============================================
// Email Guess
// ============================================

// Preview email guess job (cost estimation)
router.post(
  "/jobs/guess/preview",
  withBetterAuth,
  validateAndMerge(PreviewEmailGuessSchema),
  authenticatedRoute<PreviewEmailGuessRequest>(previewEmailGuessJob)
);

// Create email guess job
router.post(
  "/jobs/guess",
  withBetterAuth,
  validateAndMerge(CreateEmailGuessJobSchema),
  authenticatedRoute<CreateEmailGuessJobRequest>(createEmailGuessJob)
);

// Get job cost breakdown
router.get(
  "/jobs/:jobId/cost-breakdown",
  withBetterAuth,
  validateAndMerge(GetListEnrichmentJobSchema),
  authenticatedRoute<GetListEnrichmentJobRequest>(getJobCostBreakdown)
);

// Get job cost comparison (with competitors)
router.get(
  "/jobs/:jobId/cost-comparison",
  withBetterAuth,
  validateAndMerge(GetListEnrichmentJobSchema),
  authenticatedRoute<GetListEnrichmentJobRequest>(getJobCostComparison)
);

// ============================================
// Public Endpoints
// ============================================

// Get pricing comparison (public endpoint for landing page)
router.get(
  "/pricing-comparison",
  validatedRoute<Record<string, never>>(getPricingComparison)
);

export default router;
