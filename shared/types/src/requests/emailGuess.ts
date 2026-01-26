import { z } from 'zod';

// ============================================
// Enums
// ============================================

export type EmailValidationStatus = 'valid' | 'bounced' | 'catch_all' | 'unknown' | 'error';
export type EnrichmentStrategy = 'direct' | 'guess_first' | 'guess_only';

export enum EmailValidationStatusEnum {
  VALID = 'valid',
  BOUNCED = 'bounced',
  CATCH_ALL = 'catch_all',
  UNKNOWN = 'unknown',
  ERROR = 'error',
}

export enum EnrichmentStrategyEnum {
  DIRECT = 'direct',
  GUESS_FIRST = 'guess_first',
  GUESS_ONLY = 'guess_only',
}

// ============================================
// Email Pattern Types
// ============================================

export interface EmailPattern {
  pattern: string;
  example: string;
  successRate?: number;
}

// Ordered by hit rate from production data analysis (Jan 2026)
// Top 6 patterns capture 99.1% of all valid emails
export const EMAIL_PATTERNS: EmailPattern[] = [
  { pattern: 'first', example: 'john@company.com' },           // 21.03% hit rate
  { pattern: 'flast', example: 'jsmith@company.com' },         // 9.86% hit rate
  { pattern: 'first.last', example: 'john.smith@company.com' }, // 7.52% hit rate
  { pattern: 'firstl', example: 'johns@company.com' },         // 2.40% hit rate
  { pattern: 'firstlast', example: 'johnsmith@company.com' },  // 1.11% hit rate
  { pattern: 'last', example: 'smith@company.com' },           // 0.99% hit rate
  // Below patterns have <0.3% hit rate combined - excluded from default
  // { pattern: 'f.last', example: 'j.smith@company.com' },    // 0.26% hit rate
  // { pattern: 'first.l', example: 'john.s@company.com' },    // 0.19% hit rate
  // { pattern: 'first_last', example: 'john_smith@company.com' }, // 0.10% hit rate
  // { pattern: 'last.first', example: 'smith.john@company.com' }, // 0.00% hit rate - REMOVED
];

// ============================================
// Request Schemas
// ============================================

export const CreateEmailGuessJobSchema = z.object({
  listId: z.string().min(1, 'List ID is required'),
  strategy: z.enum(['guess_first', 'guess_only']).default('guess_first'),
});

export type CreateEmailGuessJobRequest = z.infer<typeof CreateEmailGuessJobSchema>;

export const PreviewEmailGuessSchema = z.object({
  listId: z.string().uuid(),
});

export type PreviewEmailGuessRequest = z.infer<typeof PreviewEmailGuessSchema>;

// ============================================
// Response Types
// ============================================

export interface EmailGuessPreviewResponse {
  totalLeads: number;
  leadsNeedingEmails: number;
  leadsWithDomains: number;
  leadsNeedingDomainSearch: number;
  estimatedCosts: {
    domainSearchCost: number;
    validationCost: number;
    prospeoFallbackCost: number;
    totalCost: number;
    comparedToDirectProspeo: number;
  };
}

export interface DomainPatternResponse {
  domain: string;
  patterns: Array<{
    pattern: string;
    successRate: number;
  }>;
  successCount: number;
  totalAttempts: number;
}

export interface EmailValidationAttemptResponse {
  id: string;
  leadId: string;
  email: string;
  pattern: string;
  status: EmailValidationStatus;
  createdAt: string;
  processedAt: string | null;
}

export interface EnrichmentJobCostBreakdownResponse {
  jobId: string;
  strategy: EnrichmentStrategy;
  totalLeads: number;
  costs: {
    domainSearchCredits: number;
    validationCredits: number;
    prospeoCredits: number;
    totalCredits: number;
  };
  results: {
    guessSuccessCount: number;
    fallbackCount: number;
    totalSuccess: number;
    totalFailed: number;
  };
  savings: {
    savedCredits: number;
    percentageSaved: number;
  };
}
