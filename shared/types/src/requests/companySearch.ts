import { z } from 'zod';
import { PaginatedResponse } from './pagination';
import { DBCompanySearchJob, DBCompanySearchItem } from '@shared/db/src/types';
import { RoleConfig } from './scrape';

// ============================================
// Enums
// ============================================

export enum CompanySearchJobStatus {
  PENDING = 'pending',
  GENERATING_QUERY = 'generating_query',
  PREVIEWING = 'previewing',
  SCRAPING = 'scraping',
  DEDUPLICATING = 'deduplicating',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

// ============================================
// Request Schemas
// ============================================

export const GenerateSearchQueryRequestSchema = z.object({
  naturalLanguageQuery: z.string().min(5, 'Query must be at least 5 characters').max(1000),
});

export type GenerateSearchQueryRequest = z.infer<typeof GenerateSearchQueryRequestSchema>;

export interface GenerateSearchQueryResponse {
  query: string;
  explanation: string;
}

export const PreviewCompanySearchRequestSchema = z.object({
  searchQuery: z.string().min(3, 'Search query is required').max(1000),
});

export type PreviewCompanySearchRequest = z.infer<typeof PreviewCompanySearchRequestSchema>;

export interface CompanySearchPreviewItem {
  companyName: string;
  linkedinUrl: string | null;
  snippet: string;
  position: number;
}

export interface PreviewCompanySearchResponse {
  results: CompanySearchPreviewItem[];
  totalResults: number;
  estimatedPages: number;
}

export const CreateCompanySearchJobRequestSchema = z.object({
  name: z.string().max(255).optional(),
  naturalLanguageQuery: z.string().min(5).max(1000),
  searchQuery: z.string().min(3).max(1000),
  maxPages: z.coerce.number().int().positive().max(50).default(10),
});

export type CreateCompanySearchJobRequest = z.infer<typeof CreateCompanySearchJobRequestSchema>;

export interface CreateCompanySearchJobResponse {
  job: DBCompanySearchJob;
  message: string;
}

export const GetCompanySearchJobsRequestSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  status: z.enum([
    'pending', 'generating_query', 'previewing', 'scraping',
    'deduplicating', 'completed', 'failed',
  ]).optional(),
});

export type GetCompanySearchJobsRequest = z.infer<typeof GetCompanySearchJobsRequestSchema>;

export type CompanySearchJobsListResponse = PaginatedResponse<DBCompanySearchJob>;

export const GetCompanySearchJobRequestSchema = z.object({
  jobId: z.string().uuid(),
});

export type GetCompanySearchJobRequest = z.infer<typeof GetCompanySearchJobRequestSchema>;

export type CompanySearchJobDetailResponse = DBCompanySearchJob & {
  items?: DBCompanySearchItem[];
  queryVariations?: Array<{ query: string; explanation: string }>;
};

export interface GenerateQueryVariationsResponse {
  variations: Array<{ query: string; explanation: string }>;
}

export const DownloadCompanySearchRequestSchema = z.object({
  jobId: z.string().uuid(),
});

export type DownloadCompanySearchRequest = z.infer<typeof DownloadCompanySearchRequestSchema>;

const RoleConfigSchema = z.object({
  roleName: z.string().min(1, 'Role name is required'),
  count: z.number().int().positive().max(10, 'Maximum 10 people per role'),
});

export const CreatePeopleSearchFromCompaniesRequestSchema = z.object({
  jobId: z.string().uuid(),
  name: z.string().max(255).optional(),
  roleConfigs: z.array(RoleConfigSchema).min(1, 'At least one role is required').max(10),
});

export type CreatePeopleSearchFromCompaniesRequest = z.infer<typeof CreatePeopleSearchFromCompaniesRequestSchema>;

export interface CreatePeopleSearchFromCompaniesResponse {
  scrapeJobId: string;
  message: string;
  companyCount: number;
  totalItems: number;
  skippedByDedup?: number;
  originalCompanyCount?: number;
}
