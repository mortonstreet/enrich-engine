import { useMutation } from '@tanstack/react-query';
import { post } from '@/lib/api';
import { ENDPOINTS } from '@/lib/config';
import { SearchPeopleResponse } from '@shared/types/src';

interface SearchPeopleParams {
  query?: string;
  role?: string;
  company?: string;
  location?: string;
  page?: number;
  limit?: number;
}

/**
 * Mutation hook for searching people by role, company, or free-text query.
 * Uses a mutation instead of query because search criteria change frequently
 * and we want explicit control over when searches are triggered.
 */
export function useSearchPeople() {
  return useMutation<SearchPeopleResponse, Error, SearchPeopleParams>({
    mutationFn: async (params) => {
      return await post<SearchPeopleResponse>(ENDPOINTS.SEARCH.PEOPLE, {
        query: params.query,
        role: params.role,
        company: params.company,
        location: params.location,
        page: params.page ?? 1,
        limit: params.limit ?? 20,
      });
    },
  });
}
