import { Router } from "express";
import {
  generateSearchQuery,
  previewCompanySearch,
  createCompanySearchJob,
  getCompanySearchJobs,
  getCompanySearchJob,
  downloadCompanySearchResults,
  createPeopleSearchFromCompanies,
} from "@/api/controllers/companySearch.controller";
import { authenticatedRoute } from "./utils";
import { withBetterAuth } from "../middlewares/auth";
import { validateAndMerge } from "../middlewares/validationMiddleware";
import {
  GenerateSearchQueryRequest,
  GenerateSearchQueryRequestSchema,
  PreviewCompanySearchRequest,
  PreviewCompanySearchRequestSchema,
  CreateCompanySearchJobRequest,
  CreateCompanySearchJobRequestSchema,
  GetCompanySearchJobsRequest,
  GetCompanySearchJobsRequestSchema,
  GetCompanySearchJobRequest,
  GetCompanySearchJobRequestSchema,
  DownloadCompanySearchRequest,
  DownloadCompanySearchRequestSchema,
  CreatePeopleSearchFromCompaniesRequest,
  CreatePeopleSearchFromCompaniesRequestSchema,
} from "@shared/types/src";

const router = Router();

// Generate search query from natural language
router.post(
  "/generate-query",
  withBetterAuth,
  validateAndMerge(GenerateSearchQueryRequestSchema),
  authenticatedRoute<GenerateSearchQueryRequest>(generateSearchQuery)
);

// Preview search results (first page)
router.post(
  "/preview",
  withBetterAuth,
  validateAndMerge(PreviewCompanySearchRequestSchema),
  authenticatedRoute<PreviewCompanySearchRequest>(previewCompanySearch)
);

// Create company search job
router.post(
  "/jobs",
  withBetterAuth,
  validateAndMerge(CreateCompanySearchJobRequestSchema),
  authenticatedRoute<CreateCompanySearchJobRequest>(createCompanySearchJob)
);

// Get all company search jobs
router.get(
  "/jobs",
  withBetterAuth,
  validateAndMerge(GetCompanySearchJobsRequestSchema),
  authenticatedRoute<GetCompanySearchJobsRequest>(getCompanySearchJobs)
);

// Get specific company search job
router.get(
  "/jobs/:jobId",
  withBetterAuth,
  validateAndMerge(GetCompanySearchJobRequestSchema),
  authenticatedRoute<GetCompanySearchJobRequest>(getCompanySearchJob)
);

// Download company search results
router.get(
  "/jobs/:jobId/download",
  withBetterAuth,
  validateAndMerge(DownloadCompanySearchRequestSchema),
  authenticatedRoute<DownloadCompanySearchRequest>(downloadCompanySearchResults)
);

// Create people search from company search results
router.post(
  "/jobs/:jobId/people-search",
  withBetterAuth,
  validateAndMerge(CreatePeopleSearchFromCompaniesRequestSchema),
  authenticatedRoute<CreatePeopleSearchFromCompaniesRequest>(createPeopleSearchFromCompanies)
);

export default router;
