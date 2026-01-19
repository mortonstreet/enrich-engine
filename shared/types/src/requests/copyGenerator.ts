import { z } from 'zod';

// ============================================
// Enums
// ============================================

export type CopyGeneratorJobStatus = 'pending' | 'processing' | 'completed' | 'failed';
export type CopyGeneratorItemStatus = 'pending' | 'processing' | 'completed' | 'failed';

export enum CopyGeneratorJobStatusEnum {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export enum CopyGeneratorItemStatusEnum {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

// ============================================
// Request Schemas
// ============================================

export const CreateCopyGeneratorJobSchema = z.object({
  listId: z.string().min(1, 'List ID is required'),
  userPrompt: z.string().min(10, 'User prompt must be at least 10 characters'),
});

export type CreateCopyGeneratorJobRequest = z.infer<typeof CreateCopyGeneratorJobSchema>;

export const GetCopyGeneratorJobsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  status: z.enum(['pending', 'processing', 'completed', 'failed']).optional(),
});

export type GetCopyGeneratorJobsQuery = z.infer<typeof GetCopyGeneratorJobsQuerySchema>;

export const GetCopyGeneratorJobSchema = z.object({
  jobId: z.string().uuid(),
});

export type GetCopyGeneratorJobRequest = z.infer<typeof GetCopyGeneratorJobSchema>;

export const PreviewCopyGeneratorSchema = z.object({
  leadId: z.string().uuid(),
  userPrompt: z.string().min(10, 'User prompt must be at least 10 characters'),
});

export type PreviewCopyGeneratorRequest = z.infer<typeof PreviewCopyGeneratorSchema>;

// ============================================
// Response Types
// ============================================

export interface CopyGeneratorJobResponse {
  id: string;
  listId: string;
  listName: string;
  userPrompt: string;
  status: CopyGeneratorJobStatus;
  totalRows: number;
  processedRows: number;
  successCount: number;
  errorCount: number;
  tokensUsed: number;
  estimatedCost: number;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

export interface CopyGeneratorJobsListResponse {
  jobs: CopyGeneratorJobResponse[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface CopyGeneratorJobDetailResponse {
  job: CopyGeneratorJobResponse;
  items: CopyGeneratorJobItemResponse[];
}

export interface CopyGeneratorJobItemResponse {
  id: string;
  leadId: string;
  leadFirstName: string | null;
  leadLastName: string | null;
  leadCompany: string | null;
  status: CopyGeneratorItemStatus;
  generatedLine: string | null;
  tokensUsed: number;
  errorMessage: string | null;
  createdAt: string;
  processedAt: string | null;
}

export interface PreviewCopyGeneratorResponse {
  generatedLine: string;
  tokensUsed: number;
}

// ============================================
// List Selection Response (for copy generator form)
// ============================================

export interface ListForCopyGeneratorResponse {
  id: string;
  name: string;
  leadCount: number;
  totalLeads: number; // Alias for leadCount
  source: 'uploaded' | 'scraped';
  createdAt: string;
  // Count of leads without firstLine generated
  leadsWithoutFirstLine: number;
}

export interface ListsForCopyGeneratorResponse {
  lists: ListForCopyGeneratorResponse[];
}

// Alias for backwards compatibility
export type CopyGeneratorListsResponse = ListsForCopyGeneratorResponse;
export type CopyGeneratorPreviewResponse = PreviewCopyGeneratorResponse;
