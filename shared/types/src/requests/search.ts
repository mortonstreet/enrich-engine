import { z } from 'zod';

// ============================================
// Search People Request
// ============================================

export const SearchPeopleRequestSchema = z.object({
  query: z.string().max(500).optional(),
  role: z.string().max(255).optional(),
  company: z.string().max(255).optional(),
  location: z.string().max(255).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(20),
});

export type SearchPeopleRequest = z.infer<typeof SearchPeopleRequestSchema>;

// ============================================
// Search Result Types
// ============================================

export interface SearchResultPerson {
  linkedinUrl: string;
  firstName: string | null;
  lastName: string | null;
  title: string;
  company?: string;
}

export interface SearchPeopleResponse {
  results: SearchResultPerson[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}
