import { Router } from "express";
import {
  enrichPerson,
  getEnrichmentHistory,
  createBulkJob,
  getBulkJobStatus,
  downloadBulkJobCsv,
} from "@/api/controllers/enrichment.controller";
import { authenticatedRoute } from "./utils";
import { withBetterAuth } from "../middlewares/auth";
import { validateAndMerge } from "../middlewares/validationMiddleware";
import {
  EnrichPersonRequest,
  EnrichPersonRequestSchema,
  GetEnrichmentHistoryRequest,
  GetEnrichmentHistoryRequestSchema,
  BulkEnrichRequest,
  BulkEnrichRequestSchema,
  GetBulkJobRequest,
  GetBulkJobRequestSchema,
} from "@shared/types/src";
import multer from "multer";

const router = Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "text/csv" || file.originalname.endsWith(".csv")) {
      cb(null, true);
    } else {
      cb(new Error("Only CSV files are allowed"));
    }
  },
});

// Single enrichment
router.post(
  "/enrich",
  withBetterAuth,
  validateAndMerge(EnrichPersonRequestSchema),
  authenticatedRoute<EnrichPersonRequest>(enrichPerson),
);

// Get enrichment history
router.get(
  "/history",
  withBetterAuth,
  validateAndMerge(GetEnrichmentHistoryRequestSchema),
  authenticatedRoute<GetEnrichmentHistoryRequest>(getEnrichmentHistory),
);

// Bulk enrichment - upload CSV
router.post(
  "/bulk",
  withBetterAuth,
  upload.single("file"),
  validateAndMerge(BulkEnrichRequestSchema),
  authenticatedRoute<BulkEnrichRequest>(createBulkJob),
);

// Get bulk job status
router.get(
  "/bulk/:jobId",
  withBetterAuth,
  validateAndMerge(GetBulkJobRequestSchema),
  authenticatedRoute<GetBulkJobRequest>(getBulkJobStatus),
);

// Download bulk job results as CSV
router.get(
  "/bulk/:jobId/download",
  withBetterAuth,
  validateAndMerge(GetBulkJobRequestSchema),
  authenticatedRoute<GetBulkJobRequest>(downloadBulkJobCsv),
);

export default router;
