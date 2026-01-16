import { z } from 'zod';
import { PaginatedResponse } from './pagination';
import {
  DBEnrichment,
  DBBulkEnrichmentJob,
  DBBulkEnrichmentItem,
} from '@shared/db/src/types';

// ============================================
// Enrich Person Request
// ============================================

export const EnrichPersonRequestSchema = z.object({
  linkedinUrl: z
    .string()
    .url('Invalid LinkedIn URL')
    .refine(
      (url) => url.includes('linkedin.com'),
      'URL must be a LinkedIn profile URL'
    ),
  enrichMobile: z.boolean().default(true),
});

export type EnrichPersonRequest = z.infer<typeof EnrichPersonRequestSchema>;

// ============================================
// Bulk Enrich Request
// ============================================

export const BulkEnrichRequestSchema = z.object({
  enrichMobile: z.boolean().default(true),
});

export type BulkEnrichRequest = z.infer<typeof BulkEnrichRequestSchema>;

// ============================================
// Get Bulk Job Request
// ============================================

export const GetBulkJobRequestSchema = z.object({
  jobId: z.string().uuid(),
});

export type GetBulkJobRequest = z.infer<typeof GetBulkJobRequestSchema>;

// ============================================
// Get Enrichment History Request
// ============================================

export const GetEnrichmentHistoryRequestSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  status: z.enum(['pending', 'completed', 'not_found', 'error']).optional(),
});

export type GetEnrichmentHistoryRequest = z.infer<typeof GetEnrichmentHistoryRequestSchema>;

// ============================================
// Waitlist Request
// ============================================

export const WaitlistRequestSchema = z.object({
  email: z.string().email('Invalid email address'),
  source: z.string().optional(),
});

export type WaitlistRequest = z.infer<typeof WaitlistRequestSchema>;

// ============================================
// Response Types
// ============================================

export type EnrichPersonResponse = DBEnrichment;

export type BulkEnrichResponse = {
  job: DBBulkEnrichmentJob;
  message: string;
};

export type BulkJobStatusResponse = {
  job: DBBulkEnrichmentJob;
  items: DBBulkEnrichmentItem[];
};

export type EnrichmentHistoryResponse = PaginatedResponse<DBEnrichment>;

export type WaitlistResponse = {
  success: boolean;
  message: string;
};

// ============================================
// Enrichment Status Enum
// ============================================

export enum EnrichmentStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  NOT_FOUND = 'not_found',
  ERROR = 'error',
}

export enum BulkJobStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export enum BulkItemStatus {
  PENDING = 'pending',
  MATCHED = 'matched',
  NOT_MATCHED = 'not_matched',
  ERROR = 'error',
}
