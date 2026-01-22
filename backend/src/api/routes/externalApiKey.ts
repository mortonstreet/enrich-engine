import { Router } from "express";
import {
  createApiKey,
  getApiKeys,
  updateApiKey,
  deleteApiKey,
} from "@/api/controllers/externalApiKey.controller";
import { authenticatedRoute } from "./utils";
import { withBetterAuth } from "../middlewares/auth";
import { validateAndMerge } from "../middlewares/validationMiddleware";
import {
  CreateExternalApiKeyRequest,
  CreateExternalApiKeySchema,
  UpdateExternalApiKeyRequest,
  UpdateExternalApiKeySchema,
  DeleteExternalApiKeyRequest,
  DeleteExternalApiKeySchema,
  GetExternalApiKeyRequest,
  GetExternalApiKeySchema,
} from "@shared/types/src";

const router = Router();

// ============================================
// External API Key Management (Admin only)
// ============================================

// List all API keys for the organization
router.get(
  "/",
  withBetterAuth,
  authenticatedRoute<Record<string, never>>(getApiKeys)
);

// Create a new API key
router.post(
  "/",
  withBetterAuth,
  validateAndMerge(CreateExternalApiKeySchema),
  authenticatedRoute<CreateExternalApiKeyRequest>(createApiKey)
);

// Update an API key
router.patch(
  "/:id",
  withBetterAuth,
  validateAndMerge(GetExternalApiKeySchema.merge(UpdateExternalApiKeySchema)),
  authenticatedRoute<UpdateExternalApiKeyRequest & GetExternalApiKeyRequest>(updateApiKey)
);

// Delete (revoke) an API key
router.delete(
  "/:id",
  withBetterAuth,
  validateAndMerge(DeleteExternalApiKeySchema),
  authenticatedRoute<DeleteExternalApiKeyRequest>(deleteApiKey)
);

export default router;
