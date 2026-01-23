import { z } from 'zod';

// ============================================
// Verification Status Types
// ============================================

export type VerificationStatus = 'valid' | 'invalid' | 'catch_all' | 'unknown';
export type VerificationStage = 'pending' | 'smtp_verifying' | 'awaiting_decision' | 'api_verifying' | 'completed';
export type VerificationMethod = 'smtp_only' | 'smtp_api_fallback' | 'api_only';
export type VerificationSource = 'smtp' | 'api';
export type UserDecision = 'accept_current' | 'fill_all_gaps' | 'fill_unknowns_only' | 'fill_catchall_only';

export enum VerificationStatusEnum {
  VALID = 'valid',
  INVALID = 'invalid',
  CATCH_ALL = 'catch_all',
  UNKNOWN = 'unknown',
}

export enum VerificationStageEnum {
  PENDING = 'pending',
  SMTP_VERIFYING = 'smtp_verifying',
  AWAITING_DECISION = 'awaiting_decision',
  API_VERIFYING = 'api_verifying',
  COMPLETED = 'completed',
}

export enum VerificationMethodEnum {
  SMTP_ONLY = 'smtp_only',
  SMTP_API_FALLBACK = 'smtp_api_fallback',
  API_ONLY = 'api_only',
}

export enum UserDecisionEnum {
  ACCEPT_CURRENT = 'accept_current',
  FILL_ALL_GAPS = 'fill_all_gaps',
  FILL_UNKNOWNS_ONLY = 'fill_unknowns_only',
  FILL_CATCHALL_ONLY = 'fill_catchall_only',
}

// ============================================
// Request Schemas
// ============================================

export const CreateVerificationJobSchema = z.object({
  listId: z.string().uuid('Invalid list ID'),
  verificationMethod: z.enum(['smtp_only', 'smtp_api_fallback', 'api_only']).default('smtp_only'),
});

export type CreateVerificationJobRequest = z.infer<typeof CreateVerificationJobSchema>;

export const GetVerificationJobSchema = z.object({
  jobId: z.string().uuid(),
});

export type GetVerificationJobRequest = z.infer<typeof GetVerificationJobSchema>;

export const SubmitVerificationDecisionSchema = z.object({
  jobId: z.string().uuid(),
  decision: z.enum(['accept_current', 'fill_all_gaps', 'fill_unknowns_only', 'fill_catchall_only']),
});

export type SubmitVerificationDecisionRequest = z.infer<typeof SubmitVerificationDecisionSchema>;

export const GetVerificationEstimateSchema = z.object({
  jobId: z.string().uuid(),
});

export type GetVerificationEstimateRequest = z.infer<typeof GetVerificationEstimateSchema>;

// ============================================
// SMTP Verification Types
// ============================================

export interface SmtpVerificationResult {
  email: string;
  status: VerificationStatus;
  smtpCode?: number;
  smtpMessage?: string;
  mxHost?: string;
  isCatchAll: boolean;
  isDisposable: boolean;
  isRoleBased: boolean;
  isFreeProvider: boolean;
  totalMs: number;
}

export interface DomainVerificationResult {
  domain: string;
  mxRecords: MxRecord[];
  isCatchAll: boolean | null;
  isDisposable: boolean;
  emailsVerified: number;
  validCount: number;
  invalidCount: number;
  unknownCount: number;
}

export interface MxRecord {
  host: string;
  priority: number;
}

// ============================================
// Response Types
// ============================================

export interface VerificationJobResponse {
  id: string;
  listId: string;
  listName: string;
  verificationStage: VerificationStage;
  verificationMethod: VerificationMethod;
  totalEmails: number;
  processedEmails: number;
  // SMTP verification stats
  smtpValidCount: number;
  smtpInvalidCount: number;
  smtpCatchAllCount: number;
  smtpUnknownCount: number;
  smtpCompletedAt: string | null;
  // User decision
  userDecision: UserDecision | null;
  decisionMadeAt: string | null;
  // API verification stats (if applicable)
  apiValidCount?: number;
  apiInvalidCount?: number;
  // Overall stats
  totalValidCount: number;
  totalInvalidCount: number;
  coveragePercentage: number; // Percentage of emails with definitive status (valid/invalid)
  // Timestamps
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

export interface VerificationProgressResponse {
  job: VerificationJobResponse;
  recentResults?: SmtpVerificationResult[];
  domainStats?: DomainStatsResponse[];
}

export interface DomainStatsResponse {
  domain: string;
  totalEmails: number;
  validCount: number;
  invalidCount: number;
  catchAllCount: number;
  unknownCount: number;
  isCatchAll: boolean | null;
}

export interface VerificationEstimateResponse {
  jobId: string;
  // Counts by category
  unknownCount: number;
  catchAllCount: number;
  totalGapCount: number;
  // Cost estimates
  costPerEmail: number;
  fillUnknownsCost: number;
  fillCatchAllCost: number;
  fillAllGapsCost: number;
  // Current coverage
  currentCoveragePercentage: number;
  projectedCoveragePercentage: number;
}

export interface VerificationResultItemResponse {
  id: string;
  email: string;
  status: VerificationStatus;
  verificationSource: VerificationSource;
  smtpCode?: number;
  mxHost?: string;
  isCatchAll: boolean;
  isDisposable: boolean;
  isRoleBased: boolean;
  isFreeProvider: boolean;
  verifiedAt: string;
  // Lead info for display
  lead?: {
    firstName: string | null;
    lastName: string | null;
    company: string | null;
  };
}

export interface VerificationJobDetailResponse {
  job: VerificationJobResponse;
  items: VerificationResultItemResponse[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ============================================
// Batch Processing Types (Internal)
// ============================================

export interface EmailBatch {
  domain: string;
  emails: string[];
  mxHost?: string;
  priority: number;
}

export interface VerificationBatchResult {
  batchId: string;
  domain: string;
  results: SmtpVerificationResult[];
  totalMs: number;
  errors?: string[];
}

// ============================================
// Domain Rate Limit Configuration
// ============================================

export interface DomainRateLimitConfig {
  domain: string;
  maxConcurrent: number;
  delayMs: number;
  maxPerMinute: number;
}

export const DEFAULT_RATE_LIMITS: Record<string, DomainRateLimitConfig> = {
  'gmail.com': { domain: 'gmail.com', maxConcurrent: 2, delayMs: 500, maxPerMinute: 5 },
  'googlemail.com': { domain: 'googlemail.com', maxConcurrent: 2, delayMs: 500, maxPerMinute: 5 },
  'yahoo.com': { domain: 'yahoo.com', maxConcurrent: 3, delayMs: 300, maxPerMinute: 10 },
  'outlook.com': { domain: 'outlook.com', maxConcurrent: 3, delayMs: 300, maxPerMinute: 10 },
  'hotmail.com': { domain: 'hotmail.com', maxConcurrent: 3, delayMs: 300, maxPerMinute: 10 },
  'default': { domain: 'default', maxConcurrent: 10, delayMs: 100, maxPerMinute: 50 },
};
