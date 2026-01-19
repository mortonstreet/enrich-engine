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

export const EMAIL_PATTERNS: EmailPattern[] = [
  { pattern: 'first.last', example: 'john.smith@company.com' },
  { pattern: 'flast', example: 'jsmith@company.com' },
  { pattern: 'firstl', example: 'johns@company.com' },
  { pattern: 'first_last', example: 'john_smith@company.com' },
  { pattern: 'first', example: 'john@company.com' },
  { pattern: 'last.first', example: 'smith.john@company.com' },
  { pattern: 'first.l', example: 'john.s@company.com' },
  { pattern: 'f.last', example: 'j.smith@company.com' },
  { pattern: 'firstlast', example: 'johnsmith@company.com' },
  { pattern: 'last', example: 'smith@company.com' },
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
