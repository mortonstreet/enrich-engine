import { Router } from "express";
import { getLists, getListById } from "@/api/controllers/external.controller";
import { externalApiRoute } from "./utils";
import { withExternalApiKey, requireScope } from "../middlewares/auth";
import { validateAndMerge } from "../middlewares/validationMiddleware";
import {
  ExternalListsQuery,
  ExternalListsQuerySchema,
  ExternalListDetailQuery,
  ExternalListDetailQuerySchema,
  ExternalListIdRequest,
  ExternalListIdSchema,
} from "@shared/types/src";

const router = Router();

// ============================================
// External Lists API (API Key authenticated)
// These endpoints are for external apps like gtmdialer
// ============================================

// Get all lists accessible to the organization
router.get(
  "/lists",
  withExternalApiKey,
  requireScope("lists:read"),
  validateAndMerge(ExternalListsQuerySchema),
  externalApiRoute<ExternalListsQuery>(getLists)
);

// Get a specific list with its leads
router.get(
  "/lists/:listId",
  withExternalApiKey,
  requireScope("lists:read"),
  validateAndMerge(ExternalListIdSchema.merge(ExternalListDetailQuerySchema)),
  externalApiRoute<ExternalListDetailQuery & ExternalListIdRequest>(getListById)
);

export default router;
