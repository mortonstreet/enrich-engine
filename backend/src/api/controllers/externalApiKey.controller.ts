import { AuthRequestHandler } from "@/types/handlers";
import * as externalApiKeyService from "@/services/externalApiKey.service";
import * as organizationService from "@/services/organization.service";
import logger from "@/lib/logger";
import {
  CreateExternalApiKeyRequest,
  UpdateExternalApiKeyRequest,
  DeleteExternalApiKeyRequest,
  GetExternalApiKeyRequest,
  OrganizationRole,
} from "@shared/types/src";
import { StatusCodes } from "http-status-codes";

// ============================================
// External API Key Management (Admin only)
// ============================================

export const createApiKey: AuthRequestHandler<
  CreateExternalApiKeyRequest
> = async (req, res) => {
  const { name, scopes, expiresAt } = req.validated;
  const organizationId = req.session.activeOrganizationId;
  const userId = req.user.id;

  if (!organizationId) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ error: "No active organization" });
  }

  // Check if user is admin or owner
  const hasAccess = await organizationService.doesMemberHaveRole(
    userId,
    organizationId,
    [OrganizationRole.ADMIN, OrganizationRole.OWNER]
  );

  if (!hasAccess) {
    return res
      .status(StatusCodes.FORBIDDEN)
      .json({ error: "Only admins can create API keys" });
  }

  try {
    const result = await externalApiKeyService.createApiKey(
      organizationId,
      userId,
      name,
      scopes,
      expiresAt
    );

    logger.info(
      { organizationId, keyId: result.apiKey.id, name },
      "External API key created via API"
    );

    res.status(StatusCodes.CREATED).json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error({ error: message, organizationId }, "Failed to create API key");
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: message });
  }
};

export const getApiKeys: AuthRequestHandler<Record<string, never>> = async (
  req,
  res
) => {
  const organizationId = req.session.activeOrganizationId;
  const userId = req.user.id;

  if (!organizationId) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ error: "No active organization" });
  }

  // Check if user is admin or owner
  const hasAccess = await organizationService.doesMemberHaveRole(
    userId,
    organizationId,
    [OrganizationRole.ADMIN, OrganizationRole.OWNER]
  );

  if (!hasAccess) {
    return res
      .status(StatusCodes.FORBIDDEN)
      .json({ error: "Only admins can view API keys" });
  }

  const result = await externalApiKeyService.getApiKeys(organizationId);
  res.json(result);
};

export const updateApiKey: AuthRequestHandler<
  UpdateExternalApiKeyRequest & GetExternalApiKeyRequest
> = async (req, res) => {
  const { id, name, scopes, isActive } = req.validated;
  const organizationId = req.session.activeOrganizationId;
  const userId = req.user.id;

  if (!organizationId) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ error: "No active organization" });
  }

  // Check if user is admin or owner
  const hasAccess = await organizationService.doesMemberHaveRole(
    userId,
    organizationId,
    [OrganizationRole.ADMIN, OrganizationRole.OWNER]
  );

  if (!hasAccess) {
    return res
      .status(StatusCodes.FORBIDDEN)
      .json({ error: "Only admins can update API keys" });
  }

  const updates: { name?: string; scopes?: typeof scopes; isActive?: boolean } = {};
  if (name !== undefined) updates.name = name;
  if (scopes !== undefined) updates.scopes = scopes;
  if (isActive !== undefined) updates.isActive = isActive;

  const result = await externalApiKeyService.updateApiKey(
    organizationId,
    id,
    updates
  );

  if (!result) {
    return res
      .status(StatusCodes.NOT_FOUND)
      .json({ error: "API key not found" });
  }

  logger.info(
    { organizationId, keyId: id, updates },
    "External API key updated via API"
  );

  res.json(result);
};

export const deleteApiKey: AuthRequestHandler<
  DeleteExternalApiKeyRequest
> = async (req, res) => {
  const { id } = req.validated;
  const organizationId = req.session.activeOrganizationId;
  const userId = req.user.id;

  if (!organizationId) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ error: "No active organization" });
  }

  // Check if user is admin or owner
  const hasAccess = await organizationService.doesMemberHaveRole(
    userId,
    organizationId,
    [OrganizationRole.ADMIN, OrganizationRole.OWNER]
  );

  if (!hasAccess) {
    return res
      .status(StatusCodes.FORBIDDEN)
      .json({ error: "Only admins can delete API keys" });
  }

  const deleted = await externalApiKeyService.deleteApiKey(organizationId, id);

  if (!deleted) {
    return res
      .status(StatusCodes.NOT_FOUND)
      .json({ error: "API key not found" });
  }

  res.json({ success: true });
};
