import * as externalApiKeyRepo from "@/repositories/externalApiKey.repository";
import { randomBytes, createHash } from "crypto";
import {
  ExternalApiKeyResponse,
  ExternalApiKeyCreatedResponse,
  ExternalApiKeysListResponse,
  ExternalApiScope,
} from "@shared/types/src";
import logger from "@/lib/logger";

// Generate a secure random API key with prefix
const generateApiKey = (): { fullKey: string; prefix: string; hash: string } => {
  // Generate 32 random bytes (256 bits of entropy)
  const randomPart = randomBytes(32).toString("base64url");
  const prefix = `ee_${randomPart.slice(0, 8)}`;
  const fullKey = `${prefix}_${randomPart}`;

  // Hash the full key using SHA-256
  const hash = createHash("sha256").update(fullKey).digest("hex");

  return { fullKey, prefix, hash };
};

// Verify a provided API key against a stored hash
export const verifyApiKey = (providedKey: string, storedHash: string): boolean => {
  const hash = createHash("sha256").update(providedKey).digest("hex");
  return hash === storedHash;
};

// Extract prefix from a full API key
export const extractPrefix = (fullKey: string): string | null => {
  // Format: ee_XXXXXXXX_rest
  const match = fullKey.match(/^(ee_[a-zA-Z0-9_-]{8})_/);
  return match ? match[1] : null;
};

export const createApiKey = async (
  organizationId: string,
  userId: string,
  name: string,
  scopes: ExternalApiScope[],
  expiresAt?: string | null
): Promise<ExternalApiKeyCreatedResponse> => {
  const { fullKey, prefix, hash } = generateApiKey();

  const apiKey = await externalApiKeyRepo.create({
    organizationId,
    name,
    keyPrefix: prefix,
    hashedKey: hash,
    scopes,
    createdById: userId,
    expiresAt: expiresAt ? new Date(expiresAt) : null,
  });

  if (!apiKey) {
    throw new Error("Failed to create API key");
  }

  const creator = await externalApiKeyRepo.getCreatorInfo(userId);

  logger.info(
    { organizationId, keyId: apiKey.id, name, scopes },
    "External API key created"
  );

  return {
    apiKey: {
      id: apiKey.id,
      name: apiKey.name,
      keyPrefix: apiKey.keyPrefix,
      scopes: apiKey.scopes as ExternalApiScope[],
      isActive: apiKey.isActive,
      lastUsedAt: apiKey.lastUsedAt?.toISOString() ?? null,
      expiresAt: apiKey.expiresAt?.toISOString() ?? null,
      createdAt: apiKey.createdAt.toISOString(),
      createdBy: {
        id: creator?.id ?? userId,
        name: creator?.name ?? null,
        email: creator?.email ?? "",
      },
    },
    fullKey,
  };
};

export const getApiKeys = async (
  organizationId: string
): Promise<ExternalApiKeysListResponse> => {
  const keys = await externalApiKeyRepo.findAllByOrganization(organizationId);

  // Fetch creator info for all keys
  const apiKeys: ExternalApiKeyResponse[] = await Promise.all(
    keys.map(async (key) => {
      const creator = await externalApiKeyRepo.getCreatorInfo(key.createdById);
      return {
        id: key.id,
        name: key.name,
        keyPrefix: key.keyPrefix,
        scopes: key.scopes as ExternalApiScope[],
        isActive: key.isActive,
        lastUsedAt: key.lastUsedAt?.toISOString() ?? null,
        expiresAt: key.expiresAt?.toISOString() ?? null,
        createdAt: key.createdAt.toISOString(),
        createdBy: {
          id: creator?.id ?? key.createdById,
          name: creator?.name ?? null,
          email: creator?.email ?? "",
        },
      };
    })
  );

  return { apiKeys };
};

export const updateApiKey = async (
  organizationId: string,
  keyId: string,
  updates: {
    name?: string;
    scopes?: ExternalApiScope[];
    isActive?: boolean;
  }
): Promise<ExternalApiKeyResponse | null> => {
  // Verify the key belongs to the organization
  const existing = await externalApiKeyRepo.findByIdAndOrganization(
    keyId,
    organizationId
  );

  if (!existing) {
    return null;
  }

  const updated = await externalApiKeyRepo.update(keyId, updates);

  if (!updated) {
    return null;
  }

  const creator = await externalApiKeyRepo.getCreatorInfo(updated.createdById);

  logger.info(
    { organizationId, keyId, updates },
    "External API key updated"
  );

  return {
    id: updated.id,
    name: updated.name,
    keyPrefix: updated.keyPrefix,
    scopes: updated.scopes as ExternalApiScope[],
    isActive: updated.isActive,
    lastUsedAt: updated.lastUsedAt?.toISOString() ?? null,
    expiresAt: updated.expiresAt?.toISOString() ?? null,
    createdAt: updated.createdAt.toISOString(),
    createdBy: {
      id: creator?.id ?? updated.createdById,
      name: creator?.name ?? null,
      email: creator?.email ?? "",
    },
  };
};

export const deleteApiKey = async (
  organizationId: string,
  keyId: string
): Promise<boolean> => {
  const deleted = await externalApiKeyRepo.deleteById(keyId, organizationId);

  if (deleted) {
    logger.info({ organizationId, keyId }, "External API key deleted");
    return true;
  }

  return false;
};

// Validate an API key and return organization info if valid
export const validateApiKey = async (
  fullKey: string
): Promise<{
  organizationId: string;
  scopes: ExternalApiScope[];
  keyId: string;
} | null> => {
  const prefix = extractPrefix(fullKey);

  if (!prefix) {
    logger.warn({ prefix: fullKey.slice(0, 15) }, "Invalid API key format");
    return null;
  }

  const apiKey = await externalApiKeyRepo.findByPrefix(prefix);

  if (!apiKey) {
    logger.warn({ prefix }, "API key not found");
    return null;
  }

  // Verify the hash matches
  if (!verifyApiKey(fullKey, apiKey.hashedKey)) {
    logger.warn({ keyId: apiKey.id }, "API key hash mismatch");
    return null;
  }

  // Check if expired
  if (apiKey.expiresAt && new Date(apiKey.expiresAt) < new Date()) {
    logger.warn({ keyId: apiKey.id }, "API key expired");
    return null;
  }

  // Check if active
  if (!apiKey.isActive) {
    logger.warn({ keyId: apiKey.id }, "API key is inactive");
    return null;
  }

  // Update last used timestamp (fire and forget)
  externalApiKeyRepo.updateLastUsed(apiKey.id).catch((err) => {
    logger.error({ err, keyId: apiKey.id }, "Failed to update last used timestamp");
  });

  return {
    organizationId: apiKey.organizationId,
    scopes: apiKey.scopes as ExternalApiScope[],
    keyId: apiKey.id,
  };
};

// Check if a key has a specific scope
export const hasScope = (
  scopes: ExternalApiScope[],
  requiredScope: ExternalApiScope
): boolean => {
  return scopes.includes(requiredScope);
};
