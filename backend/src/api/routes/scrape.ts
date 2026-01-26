import { Router } from "express";
import {
  createScrapeJob,
  getScrapeJobs,
  getScrapeJob,
  deleteScrapeJob,
  downloadScrapeResults,
  pauseScrapeJob,
  resumeScrapeJob,
  renameScrapeJob,
  syncScrapeJob,
  createRerunJob,
  getRoleAnalytics,
} from "@/api/controllers/scrape.controller";
import { authenticatedRoute } from "./utils";
import { withBetterAuth } from "../middlewares/auth";
import { validateAndMerge } from "../middlewares/validationMiddleware";
import {
  CreateScrapeJobRequest,
  CreateScrapeJobRequestSchema,
  GetScrapeJobsRequest,
  GetScrapeJobsRequestSchema,
  GetScrapeJobRequest,
  GetScrapeJobRequestSchema,
  DeleteScrapeJobRequest,
  DeleteScrapeJobRequestSchema,
  PauseScrapeJobRequest,
  PauseScrapeJobRequestSchema,
  RenameScrapeJobRequest,
  RenameScrapeJobRequestSchema,
  SyncScrapeJobRequest,
  SyncScrapeJobRequestSchema,
  CreateRerunJobRequest,
  CreateRerunJobRequestSchema,
} from "@shared/types/src";
import multer from "multer";

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "text/csv" || file.originalname.endsWith(".csv")) {
      cb(null, true);
    } else {
      cb(new Error("Only CSV files are allowed"));
    }
  },
});

// Create scrape job (upload CSV)
router.post(
  "/jobs",
  withBetterAuth,
  upload.single("file"),
  validateAndMerge(CreateScrapeJobRequestSchema),
  authenticatedRoute<CreateScrapeJobRequest>(createScrapeJob)
);

// Get all scrape jobs
router.get(
  "/jobs",
  withBetterAuth,
  validateAndMerge(GetScrapeJobsRequestSchema),
  authenticatedRoute<GetScrapeJobsRequest>(getScrapeJobs)
);

// Get specific scrape job
router.get(
  "/jobs/:jobId",
  withBetterAuth,
  validateAndMerge(GetScrapeJobRequestSchema),
  authenticatedRoute<GetScrapeJobRequest>(getScrapeJob)
);

// Delete scrape job
router.delete(
  "/jobs/:jobId",
  withBetterAuth,
  validateAndMerge(DeleteScrapeJobRequestSchema),
  authenticatedRoute<DeleteScrapeJobRequest>(deleteScrapeJob)
);

// Download scrape results as CSV
router.get(
  "/jobs/:jobId/download",
  withBetterAuth,
  validateAndMerge(GetScrapeJobRequestSchema),
  authenticatedRoute<GetScrapeJobRequest>(downloadScrapeResults)
);

// Pause scrape job
router.post(
  "/jobs/:jobId/pause",
  withBetterAuth,
  validateAndMerge(PauseScrapeJobRequestSchema),
  authenticatedRoute<PauseScrapeJobRequest>(pauseScrapeJob)
);

// Resume scrape job
router.post(
  "/jobs/:jobId/resume",
  withBetterAuth,
  validateAndMerge(PauseScrapeJobRequestSchema),
  authenticatedRoute<PauseScrapeJobRequest>(resumeScrapeJob)
);

// Rename scrape job
router.patch(
  "/jobs/:jobId/rename",
  withBetterAuth,
  validateAndMerge(RenameScrapeJobRequestSchema),
  authenticatedRoute<RenameScrapeJobRequest>(renameScrapeJob)
);

// Sync scrape job results to list
router.post(
  "/jobs/:jobId/sync",
  withBetterAuth,
  validateAndMerge(SyncScrapeJobRequestSchema),
  authenticatedRoute<SyncScrapeJobRequest>(syncScrapeJob)
);

// Re-run not-found items with different roles
router.post(
  "/jobs/:jobId/rerun",
  withBetterAuth,
  validateAndMerge(CreateRerunJobRequestSchema),
  authenticatedRoute<CreateRerunJobRequest>(createRerunJob)
);

// Get role analytics for a job
router.get(
  "/jobs/:jobId/role-analytics",
  withBetterAuth,
  validateAndMerge(GetScrapeJobRequestSchema),
  authenticatedRoute<GetScrapeJobRequest>(getRoleAnalytics)
);

export default router;
