import { z } from 'zod';
import { PaginatedResponse } from './pagination';
import {
  DBLeadList,
  DBLeadListFolder,
  DBListFavorite,
  DBListOpen,
  DBLead,
} from '@shared/db/src/types';

// ============================================
// Enums
// ============================================

export enum ListImportStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export enum ListSource {
  UPLOADED = 'uploaded',
  SCRAPED = 'scraped',
}

// ============================================
// List Request Schemas
// ============================================

export const CreateListRequestSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  description: z.string().max(1000).optional(),
  folderId: z.string().uuid().optional(),
});

export type CreateListRequest = z.infer<typeof CreateListRequestSchema>;

export const UpdateListRequestSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).nullable().optional(),
  folderId: z.string().uuid().nullable().optional(),
});

export type UpdateListRequest = z.infer<typeof UpdateListRequestSchema>;

export const GetListRequestSchema = z.object({
  id: z.string().uuid(),
});

export type GetListRequest = z.infer<typeof GetListRequestSchema>;

export const DeleteListRequestSchema = z.object({
  id: z.string().uuid(),
});

export type DeleteListRequest = z.infer<typeof DeleteListRequestSchema>;

// ============================================
// Folder Request Schemas
// ============================================

export const CreateFolderRequestSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  parentId: z.string().uuid().optional(),
});

export type CreateFolderRequest = z.infer<typeof CreateFolderRequestSchema>;

export const UpdateFolderRequestSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(255).optional(),
  parentId: z.string().uuid().nullable().optional(),
  order: z.number().int().optional(),
});

export type UpdateFolderRequest = z.infer<typeof UpdateFolderRequestSchema>;

export const DeleteFolderRequestSchema = z.object({
  id: z.string().uuid(),
});

export type DeleteFolderRequest = z.infer<typeof DeleteFolderRequestSchema>;

// ============================================
// Favorite Request Schemas
// ============================================

export const AddFavoriteRequestSchema = z
  .object({
    listId: z.string().uuid().optional(),
    folderId: z.string().uuid().optional(),
  })
  .refine((data) => (data.listId && !data.folderId) || (!data.listId && data.folderId), {
    message: 'Must provide either listId or folderId, not both',
  });

export type AddFavoriteRequest = z.infer<typeof AddFavoriteRequestSchema>;

export const RemoveFavoriteRequestSchema = z.object({
  id: z.string().uuid(),
});

export type RemoveFavoriteRequest = z.infer<typeof RemoveFavoriteRequestSchema>;

// ============================================
// Query Schemas
// ============================================

export const GetListsQuerySchema = z.object({
  folderId: z.string().uuid().optional(),
  search: z.string().optional(),
  ownerId: z.string().uuid().optional(),
});

export type GetListsQuery = z.infer<typeof GetListsQuerySchema>;

export const GetLeadsQuerySchema = z.object({
  id: z.string().uuid(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().optional(),
});

export type GetLeadsQuery = z.infer<typeof GetLeadsQuerySchema>;

// ============================================
// Lead Request Schemas
// ============================================

export const UpdateLeadRequestSchema = z.object({
  id: z.string().uuid(),
  firstName: z.string().nullable().optional(),
  lastName: z.string().nullable().optional(),
  email: z.string().email().nullable().optional(),
  phone: z.string().nullable().optional(),
  company: z.string().nullable().optional(),
  role: z.string().nullable().optional(),
  linkedinUrl: z.string().url().nullable().optional(),
  customFields: z.record(z.string(), z.unknown()).optional(),
});

export type UpdateLeadRequest = z.infer<typeof UpdateLeadRequestSchema>;

// ============================================
// Open Tracking Schemas
// ============================================

export const TrackOpenRequestSchema = z.object({
  id: z.string().uuid(),
});

export type TrackOpenRequest = z.infer<typeof TrackOpenRequestSchema>;

// ============================================
// Response Types
// ============================================

export interface ListOwner {
  id: string;
  name: string | null;
  image: string | null;
}

export interface ListResponse {
  id: string;
  name: string;
  description: string | null;
  folderId: string | null;
  importStatus: string;
  leadCount: number;
  source: string;
  scrapeJobId: string | null;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  isFavorite?: boolean;
  lastOpenedAt?: string | null;
  owner?: ListOwner;
}

export interface FolderResponse {
  id: string;
  name: string;
  parentId: string | null;
  order: number;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  isFavorite?: boolean;
  lastOpenedAt?: string | null;
  owner?: ListOwner;
}

export interface LeadResponse {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  company: string | null;
  role: string | null;
  linkedinUrl: string | null;
  companyDomain: string | null;
  customFields: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface ListsPageResponse {
  lists: ListResponse[];
  folders: FolderResponse[];
}

export interface ListDetailResponse {
  list: ListResponse;
  leads: LeadResponse[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface FavoriteResponse {
  id: string;
  type: 'list' | 'folder';
  item: ListResponse | FolderResponse;
  createdAt: string;
}

export interface RecentResponse {
  id: string;
  type: 'list' | 'folder';
  item: ListResponse | FolderResponse;
  openedAt: string;
}

export interface FavoritesResponse {
  favorites: FavoriteResponse[];
}

export interface RecentsResponse {
  recents: RecentResponse[];
}

// ============================================
// All Leads Request Schemas
// ============================================

export const GetAllLeadsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().optional(),
  listId: z.string().uuid().optional(),
  // Advanced filters
  company: z.string().optional(),
  role: z.string().optional(),
  hasEmail: z.enum(['true', 'false']).optional().transform(v => v === 'true' ? true : v === 'false' ? false : undefined),
  hasPhone: z.enum(['true', 'false']).optional().transform(v => v === 'true' ? true : v === 'false' ? false : undefined),
  hasLinkedinUrl: z.enum(['true', 'false']).optional().transform(v => v === 'true' ? true : v === 'false' ? false : undefined),
  createdAfter: z.coerce.date().optional(),
  createdBefore: z.coerce.date().optional(),
});

export type GetAllLeadsQuery = z.infer<typeof GetAllLeadsQuerySchema>;

export const CreateListFromLeadsRequestSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  leadIds: z.array(z.string().uuid()).min(1, 'At least one lead is required'),
  description: z.string().max(1000).optional(),
  folderId: z.string().uuid().optional(),
});

export type CreateListFromLeadsRequest = z.infer<typeof CreateListFromLeadsRequestSchema>;

// Create list from filters (for targeted list building)
export const CreateListFromFiltersRequestSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  description: z.string().max(1000).optional(),
  folderId: z.string().uuid().optional(),
  maxLeads: z.number().int().positive().max(10000).default(100),
  dedupe: z.boolean().default(true),
  // Filters
  listId: z.string().uuid().optional(),
  company: z.string().optional(),
  role: z.string().optional(),
  hasEmail: z.boolean().optional(),
  hasPhone: z.boolean().optional(),
  hasLinkedinUrl: z.boolean().optional(),
  createdAfter: z.coerce.date().optional(),
  createdBefore: z.coerce.date().optional(),
  search: z.string().optional(),
});

export type CreateListFromFiltersRequest = z.infer<typeof CreateListFromFiltersRequestSchema>;

export const DeleteLeadRequestSchema = z.object({
  id: z.string().uuid(),
});

export type DeleteLeadRequest = z.infer<typeof DeleteLeadRequestSchema>;

// ============================================
// CSV Upload Request Schemas
// ============================================

export const UploadListCsvRequestSchema = z.object({
  id: z.string().uuid(),
});

export type UploadListCsvRequest = z.infer<typeof UploadListCsvRequestSchema>;

// ============================================
// All Leads Response Types
// ============================================

export interface AllLeadsResponse {
  data: LeadWithListResponse[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export interface LeadWithListResponse extends LeadResponse {
  listId: string;
  listName: string;
}

export interface CreateListFromLeadsResponse {
  list: ListResponse;
  leadsCreated: number;
}

export interface CreateListFromFiltersResponse {
  list: ListResponse;
  leadsCreated: number;
  totalMatched: number;
  deduplicatedCount: number;
}

// Filter options for the UI
export interface LeadFilterOptionsResponse {
  companies: string[];
  roles: string[];
}

export interface UploadListCsvResponse {
  success: boolean;
  message: string;
  leadsCreated: number;
}

// DB Type exports for backend use
export type {
  DBLeadList,
  DBLeadListFolder,
  DBListFavorite,
  DBListOpen,
  DBLead,
};
