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
  COMPANY = 'company',
  DOMAIN = 'domain',
  URL = 'url',
}

export enum ScrapeWorkflowType {
  COMPANY_CSV = 'company_csv',
  NAME_CSV = 'name_csv',
  DOMAIN_CSV = 'domain_csv',
  SINGLE_URL = 'single_url',
  PDF_UPLOAD = 'pdf_upload',
}

// Role configuration for workflow-based scraping
export interface RoleConfig {
  roleName: string;
  count: number;
}

// ============================================
// Request Schemas
// ============================================

// Role config schema for validation (defined here for reuse)
const RoleConfigSchemaInternal = z.object({
  roleName: z.string().min(1, 'Role name is required'),
  count: z.number().int().positive().max(10, 'Maximum 10 people per role'),
});

export const CreateScrapeJobRequestSchema = z.object({
  name: z.string().max(255).optional(),
  // Optional role configs for company-based workflow (roles configured in UI, not CSV)
  roleConfigs: z.preprocess(
    (val) => {
      // Handle string input from FormData
      if (typeof val === 'string') {
        try {
          return JSON.parse(val);
        } catch {
          return undefined;
        }
      }
      return val;
    },
    z.array(RoleConfigSchemaInternal).optional()
  ),
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

// ============================================
// New Workflow Request Schemas
// ============================================

// Role config schema for validation
const RoleConfigSchema = z.object({
  roleName: z.string().min(1, 'Role name is required'),
  count: z.number().int().positive().max(10, 'Maximum 10 people per role'),
});

// Company CSV workflow - upload companies, configure roles
export const CreateCompanyScrapeJobRequestSchema = z.object({
  name: z.string().max(255).optional(),
  roleConfigs: z.array(RoleConfigSchema).min(1, 'At least one role is required').max(10),
});

export type CreateCompanyScrapeJobRequest = z.infer<typeof CreateCompanyScrapeJobRequestSchema>;

// Domain CSV workflow - upload domains, configure roles
export const CreateDomainScrapeJobRequestSchema = z.object({
  name: z.string().max(255).optional(),
  roleConfigs: z.array(RoleConfigSchema).min(1, 'At least one role is required').max(10),
});

export type CreateDomainScrapeJobRequest = z.infer<typeof CreateDomainScrapeJobRequestSchema>;

// Single URL workflow - scrape from a single company page
export const CreateSingleUrlScrapeJobRequestSchema = z.object({
  name: z.string().max(255).optional(),
  sourceUrl: z.string().url('Valid URL is required'),
  roleConfigs: z.array(RoleConfigSchema).min(1, 'At least one role is required').max(10),
});

export type CreateSingleUrlScrapeJobRequest = z.infer<typeof CreateSingleUrlScrapeJobRequestSchema>;

// CSV Row types for different workflows
export interface CompanyCSVRow {
  company: string;
  [key: string]: string | undefined;
}

export interface DomainCSVRow {
  domain?: string;
  website?: string;
  [key: string]: string | undefined;
}

// ============================================
// Re-run Not-Found Items
// ============================================

export const CreateRerunJobRequestSchema = z.object({
  sourceJobId: z.string().uuid(),
  name: z.string().max(255).optional(),
  roleConfigs: z.array(z.object({
    roleName: z.string().min(1, 'Role name is required'),
    count: z.number().int().positive().max(10, 'Maximum 10 people per role'),
  })).min(1, 'At least one role is required').max(10),
});

export type CreateRerunJobRequest = z.infer<typeof CreateRerunJobRequestSchema>;

export type CreateRerunJobResponse = {
  job: DBScrapeJob;
  message: string;
  notFoundCount: number;
  newItemCount: number;
};

// ============================================
// Role Analytics
// ============================================

export interface RoleAnalytics {
  roleName: string;
  total: number;
  found: number;
  notFound: number;
  hitRate: number;
}

export interface RoleAnalyticsResponse {
  analytics: RoleAnalytics[];
  suggestions: Array<{
    originalRole: string;
    suggestedRoles: string[];
    reason: string;
  }>;
}
