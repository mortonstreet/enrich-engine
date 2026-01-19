import { z } from 'zod';

// ============================================
// Enums
// ============================================

export type ListEnrichmentJobStatus = 'pending' | 'processing' | 'completed' | 'failed';
export type ListEnrichmentItemStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'not_found';
export type EnrichmentType = 'email' | 'phone';
export type EnrichmentVendor = 'prospeo' | 'apollo' | 'hunter' | 'clearbit' | 'millionverifier' | 'openrouter';

export enum ListEnrichmentJobStatusEnum {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export enum ListEnrichmentItemStatusEnum {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  NOT_FOUND = 'not_found',
}

export enum EnrichmentTypeEnum {
  EMAIL = 'email',
  PHONE = 'phone',
}

export enum EnrichmentVendorEnum {
  PROSPEO = 'prospeo',
  APOLLO = 'apollo',
  HUNTER = 'hunter',
  CLEARBIT = 'clearbit',
  MILLIONVERIFIER = 'millionverifier',
  OPENROUTER = 'openrouter',
}

// ============================================
// Request Schemas
// ============================================

export const CreateListEnrichmentJobSchema = z.object({
  listId: z.string().min(1, 'List ID is required'),
  enrichmentType: z.enum(['email', 'phone']),
});

export type CreateListEnrichmentJobRequest = z.infer<typeof CreateListEnrichmentJobSchema>;

export const GetListEnrichmentJobsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  status: z.enum(['pending', 'processing', 'completed', 'failed']).optional(),
});

export type GetListEnrichmentJobsQuery = z.infer<typeof GetListEnrichmentJobsQuerySchema>;

export const GetListEnrichmentJobSchema = z.object({
  jobId: z.string().uuid(),
});

export type GetListEnrichmentJobRequest = z.infer<typeof GetListEnrichmentJobSchema>;

export const SaveVendorApiKeySchema = z.object({
  vendor: z.enum(['prospeo', 'apollo', 'hunter', 'clearbit', 'millionverifier', 'openrouter']),
  apiKey: z.string().min(1, 'API key is required'),
});

export type SaveVendorApiKeyRequest = z.infer<typeof SaveVendorApiKeySchema>;

export const DeleteVendorApiKeySchema = z.object({
  vendor: z.enum(['prospeo', 'apollo', 'hunter', 'clearbit', 'millionverifier', 'openrouter']),
});

export type DeleteVendorApiKeyRequest = z.infer<typeof DeleteVendorApiKeySchema>;

// ============================================
// Response Types
// ============================================

export interface ListEnrichmentJobResponse {
  id: string;
  listId: string;
  listName: string;
  vendor: EnrichmentVendor;
  enrichmentType: EnrichmentType;
  enrichmentStrategy?: 'direct' | 'guess_first' | 'guess_only';
  status: ListEnrichmentJobStatus;
  totalRows: number;
  processedRows: number;
  successCount: number;
  errorCount: number;
  creditsUsed: number;
  guessSuccessCount?: number;
  fallbackCount?: number;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

export interface ListEnrichmentJobsListResponse {
  jobs: ListEnrichmentJobResponse[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ListEnrichmentJobDetailResponse {
  job: ListEnrichmentJobResponse;
  items: ListEnrichmentJobItemResponse[];
}

export interface EmailValidationAttemptResponse {
  id: string;
  email: string;
  pattern: string;
  status: 'valid' | 'bounced' | 'catch_all' | 'unknown' | 'error';
  createdAt: string;
  processedAt: string | null;
}

export interface ListEnrichmentJobItemResponse {
  id: string;
  leadId: string;
  linkedinUrl: string;
  status: ListEnrichmentItemStatus;
  enrichedEmail: string | null;
  enrichedPhone: string | null;
  errorMessage: string | null;
  createdAt: string;
  processedAt: string | null;
  // Lead info for display
  lead?: {
    firstName: string | null;
    lastName: string | null;
    company: string | null;
    companyDomain: string | null;
  };
  // Email validation attempts (for guess strategies)
  validationAttempts?: EmailValidationAttemptResponse[];
}

export interface VendorResponse {
  id: EnrichmentVendor;
  name: string;
  isConfigured: boolean;
  supportedTypes: EnrichmentType[];
  status: 'active' | 'coming_soon';
}

export interface VendorsListResponse {
  vendors: VendorResponse[];
}

export interface ApiKeyResponse {
  vendor: EnrichmentVendor;
  isConfigured: boolean;
  maskedKey: string | null;
  updatedAt: string | null;
}

export interface ApiKeysListResponse {
  apiKeys: ApiKeyResponse[];
}

// ============================================
// List Selection Response (for enrich form)
// ============================================

export interface ListForEnrichmentResponse {
  id: string;
  name: string;
  leadCount: number;
  totalLeads: number; // Alias for leadCount for consistency
  source: 'uploaded' | 'scraped';
  hasLinkedinColumn: boolean;
  createdAt: string;
  // Count of leads with LinkedIn URLs that haven't been enriched yet (per type)
  unenrichedEmailCount: number;
  unenrichedPhoneCount: number;
}

export interface ListsForEnrichmentResponse {
  lists: ListForEnrichmentResponse[];
}
