import { z } from 'zod';

// ============================================
// Scopes
// ============================================

export const EXTERNAL_API_SCOPES = [
  'lists:read',
  'lists:write',
  'leads:read',
  'leads:write',
] as const;

export type ExternalApiScope = typeof EXTERNAL_API_SCOPES[number];

// ============================================
// Request Schemas
// ============================================

export const CreateExternalApiKeySchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be 100 characters or less'),
  scopes: z.array(z.enum(EXTERNAL_API_SCOPES)).min(1, 'At least one scope is required'),
  expiresAt: z.string().datetime().optional().nullable(),
});

export type CreateExternalApiKeyRequest = z.infer<typeof CreateExternalApiKeySchema>;

export const UpdateExternalApiKeySchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be 100 characters or less').optional(),
  scopes: z.array(z.enum(EXTERNAL_API_SCOPES)).min(1, 'At least one scope is required').optional(),
  isActive: z.boolean().optional(),
});

export type UpdateExternalApiKeyRequest = z.infer<typeof UpdateExternalApiKeySchema>;

export const DeleteExternalApiKeySchema = z.object({
  id: z.string().uuid(),
});

export type DeleteExternalApiKeyRequest = z.infer<typeof DeleteExternalApiKeySchema>;

export const GetExternalApiKeySchema = z.object({
  id: z.string().uuid(),
});

export type GetExternalApiKeyRequest = z.infer<typeof GetExternalApiKeySchema>;

// ============================================
// Response Types
// ============================================

export interface ExternalApiKeyResponse {
  id: string;
  name: string;
  keyPrefix: string;
  scopes: ExternalApiScope[];
  isActive: boolean;
  lastUsedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
  createdBy: {
    id: string;
    name: string | null;
    email: string;
  };
}

export interface ExternalApiKeyCreatedResponse {
  apiKey: ExternalApiKeyResponse;
  // The full key is ONLY returned on creation - never again
  fullKey: string;
}

export interface ExternalApiKeysListResponse {
  apiKeys: ExternalApiKeyResponse[];
}

// ============================================
// External API Response Types (for gtmdialer etc.)
// ============================================

export interface ExternalListResponse {
  id: string;
  name: string;
  description: string | null;
  leadCount: number;
  source: 'uploaded' | 'scraped';
  createdAt: string;
  updatedAt: string;
}

export interface ExternalListsResponse {
  lists: ExternalListResponse[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ExternalLeadResponse {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  company: string | null;
  role: string | null;
  linkedinUrl: string | null;
  companyDomain: string | null;
  customFields: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface ExternalListDetailResponse {
  list: ExternalListResponse;
  leads: ExternalLeadResponse[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Query params for external endpoints
export const ExternalListsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().optional(),
});

export type ExternalListsQuery = z.infer<typeof ExternalListsQuerySchema>;

export const ExternalListDetailQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(500).default(100),
});

export type ExternalListDetailQuery = z.infer<typeof ExternalListDetailQuerySchema>;

export const ExternalListIdSchema = z.object({
  listId: z.string().uuid(),
});

export type ExternalListIdRequest = z.infer<typeof ExternalListIdSchema>;
