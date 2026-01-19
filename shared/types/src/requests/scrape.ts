import { z } from 'zod';
import { PaginatedResponse } from './pagination';
import { DBScrapeJob, DBScrapeJobItem } from '@shared/db/src/types';

// ============================================
// Enums
// ============================================

export enum ScrapeJobStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export enum ScrapeItemStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  NO_RESULT = 'no_result',
}

export enum ScrapeInputType {
  NAME = 'name',
  ROLE = 'role',
}

// ============================================
// Request Schemas
// ============================================

export const CreateScrapeJobRequestSchema = z.object({
  name: z.string().max(255).optional(),
});

export type CreateScrapeJobRequest = z.infer<typeof CreateScrapeJobRequestSchema>;

export const GetScrapeJobsRequestSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  status: z.enum(['pending', 'processing', 'paused', 'completed', 'failed']).optional(),
});

export const PauseScrapeJobRequestSchema = z.object({
  jobId: z.string().uuid(),
});

export type PauseScrapeJobRequest = z.infer<typeof PauseScrapeJobRequestSchema>;

export type GetScrapeJobsRequest = z.infer<typeof GetScrapeJobsRequestSchema>;

export const GetScrapeJobRequestSchema = z.object({
  jobId: z.string().uuid(),
});

export type GetScrapeJobRequest = z.infer<typeof GetScrapeJobRequestSchema>;

export const DeleteScrapeJobRequestSchema = z.object({
  jobId: z.string().uuid(),
});

export type DeleteScrapeJobRequest = z.infer<typeof DeleteScrapeJobRequestSchema>;

// ============================================
// CSV Validation Types
// ============================================

export interface CSVColumnValidation {
  isValid: boolean;
  inputType: ScrapeInputType | null;
  columns: string[];
  missingColumns: string[];
  errors: string[];
}

export interface ScrapeCSVRow {
  first_name?: string;
  last_name?: string;
  company?: string;
  role?: string;
  role1?: string;
  role2?: string;
  role3?: string;
  [key: string]: string | undefined;
}

// ============================================
// Response Types
// ============================================

export type ScrapeJobResponse = DBScrapeJob;

export type ScrapeJobDetailResponse = DBScrapeJob & {
  items?: DBScrapeJobItem[];
};

export type ScrapeJobsListResponse = PaginatedResponse<DBScrapeJob>;

export type CreateScrapeJobResponse = {
  job: DBScrapeJob;
  message: string;
};

export type DeleteScrapeJobResponse = {
  success: boolean;
  message: string;
};

// ============================================
// Rename Scrape Job
// ============================================

export const RenameScrapeJobRequestSchema = z.object({
  jobId: z.string().uuid(),
  name: z.string().min(1).max(255),
});

export type RenameScrapeJobRequest = z.infer<typeof RenameScrapeJobRequestSchema>;

export type RenameScrapeJobResponse = DBScrapeJob;

// ============================================
// Sync Scrape Job Results to List
// ============================================

export const SyncScrapeJobRequestSchema = z.object({
  jobId: z.string().uuid(),
});

export type SyncScrapeJobRequest = z.infer<typeof SyncScrapeJobRequestSchema>;

export type SyncScrapeJobResponse = {
  success: boolean;
  listId: string | null;
  leadsCount: number;
  message: string;
};
