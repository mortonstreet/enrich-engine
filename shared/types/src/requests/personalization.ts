import { z } from 'zod';

// ============================================
// Enums
// ============================================

export type PersonalizationJobStatus = 'pending' | 'processing' | 'completed' | 'failed';
export type PersonalizationItemStatus = 'pending' | 'processing' | 'completed' | 'failed';

export type PersonalizationColumnType =
  | 'subject'
  | 'firstLine'
  | 'openingParagraph'
  | 'followUp1'
  | 'followUp2'
  | 'followUp3'
  | 'callToAction'
  | 'custom';

// ============================================
// Column Config
// ============================================

export interface ColumnConfig {
  columnType: PersonalizationColumnType;
  columnName: string;
  prompt: string;
  maxTokens: number;
  temperature: number;
}

export const ColumnConfigSchema = z.object({
  columnType: z.enum([
    'subject',
    'firstLine',
    'openingParagraph',
    'followUp1',
    'followUp2',
    'followUp3',
    'callToAction',
    'custom',
  ]),
  columnName: z.string().min(1, 'Column name is required').max(50),
  prompt: z.string().min(10, 'Prompt must be at least 10 characters'),
  maxTokens: z.number().int().min(50).max(2000).default(200),
  temperature: z.number().min(0).max(1).default(0.7),
});

// ============================================
// Request Schemas
// ============================================

export const CreatePersonalizationJobSchema = z.object({
  listId: z.string().min(1, 'List ID is required'),
  columns: z.array(ColumnConfigSchema).min(1).max(10),
  useIcpContext: z.boolean().default(false),
});

export type CreatePersonalizationJobRequest = z.infer<typeof CreatePersonalizationJobSchema>;

export const GetPersonalizationJobsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  status: z.enum(['pending', 'processing', 'completed', 'failed']).optional(),
});

export type GetPersonalizationJobsQuery = z.infer<typeof GetPersonalizationJobsQuerySchema>;

export const GetPersonalizationJobSchema = z.object({
  jobId: z.string().uuid(),
});

export type GetPersonalizationJobRequest = z.infer<typeof GetPersonalizationJobSchema>;

export const PreviewPersonalizationSchema = z.object({
  leadId: z.string().uuid(),
  columns: z.array(ColumnConfigSchema).min(1).max(10),
  useIcpContext: z.boolean().default(false),
});

export type PreviewPersonalizationRequest = z.infer<typeof PreviewPersonalizationSchema>;

// ============================================
// Response Types
// ============================================

export interface PersonalizationJobResponse {
  id: string;
  listId: string;
  listName: string;
  columnConfigs: ColumnConfig[];
  useIcpContext: boolean;
  status: PersonalizationJobStatus;
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

export interface PersonalizationJobsListResponse {
  jobs: PersonalizationJobResponse[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface PersonalizationJobDetailResponse {
  job: PersonalizationJobResponse;
  items: PersonalizationJobItemResponse[];
}

export interface PersonalizationJobItemResponse {
  id: string;
  leadId: string;
  leadFirstName: string | null;
  leadLastName: string | null;
  leadCompany: string | null;
  status: PersonalizationItemStatus;
  generatedColumns: Record<string, string> | null;
  tokensUsed: number;
  errorMessage: string | null;
  createdAt: string;
  processedAt: string | null;
}

export interface PreviewPersonalizationResponse {
  generatedColumns: Record<string, string>;
  tokensUsed: number;
}

// ============================================
// ICP Classification Types
// ============================================

export type IcpClassificationJobStatus = 'pending' | 'processing' | 'completed' | 'failed';

export const CreateIcpClassificationJobSchema = z.object({
  listId: z.string().min(1, 'List ID is required'),
  userPrompt: z.string().min(20, 'ICP criteria must be at least 20 characters'),
});

export type CreateIcpClassificationJobRequest = z.infer<typeof CreateIcpClassificationJobSchema>;

export const GetIcpClassificationJobsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  status: z.enum(['pending', 'processing', 'completed', 'failed']).optional(),
});

export type GetIcpClassificationJobsQuery = z.infer<typeof GetIcpClassificationJobsQuerySchema>;

export const PreviewIcpClassificationSchema = z.object({
  leadId: z.string().uuid(),
  userPrompt: z.string().min(20, 'ICP criteria must be at least 20 characters'),
});

export type PreviewIcpClassificationRequest = z.infer<typeof PreviewIcpClassificationSchema>;

export interface ICPContext {
  companyInsights: {
    industry?: string;
    size?: string;
    techStack?: string[];
    recentNews?: string[];
    fundingStage?: string;
    websiteAnalysis?: string;
  };
  personInsights: {
    recentActivity?: string[];
    interests?: string[];
    postingFrequency?: string;
  };
  fitAnalysis: {
    score: number;
    reasons: string[];
    concerns: string[];
    personalizationHooks: string[];
  };
}

export interface IcpClassificationJobResponse {
  id: string;
  listId: string;
  listName: string;
  userPrompt: string;
  status: IcpClassificationJobStatus;
  totalRows: number;
  processedRows: number;
  successCount: number;
  errorCount: number;
  tokensUsed: number;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

export interface IcpClassificationJobsListResponse {
  jobs: IcpClassificationJobResponse[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface PreviewIcpClassificationResponse {
  icpScore: number;
  icpContext: ICPContext;
  tokensUsed: number;
}
