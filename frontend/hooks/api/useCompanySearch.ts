import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { get, post } from '@/lib/api';
import { QUERY_KEYS, ENDPOINTS, env } from '@/lib/config';
import {
  GenerateSearchQueryResponse,
  PreviewCompanySearchResponse,
  CreateCompanySearchJobResponse,
  CompanySearchJobsListResponse,
  CompanySearchJobDetailResponse,
  CreatePeopleSearchFromCompaniesResponse,
  CompanySearchJobStatus,
  RoleConfig,
} from '@shared/types/src';

export function useGenerateSearchQuery() {
  return useMutation<GenerateSearchQueryResponse, Error, { naturalLanguageQuery: string }>({
    mutationFn: async (params) => {
      return await post<GenerateSearchQueryResponse>(
        ENDPOINTS.COMPANY_SEARCH.GENERATE_QUERY,
        params
      );
    },
  });
}

export function usePreviewCompanySearch() {
  return useMutation<PreviewCompanySearchResponse, Error, { searchQuery: string }>({
    mutationFn: async (params) => {
      return await post<PreviewCompanySearchResponse>(
        ENDPOINTS.COMPANY_SEARCH.PREVIEW,
        params
      );
    },
  });
}

export function useCreateCompanySearchJob() {
  const queryClient = useQueryClient();

  return useMutation<
    CreateCompanySearchJobResponse,
    Error,
    { name?: string; naturalLanguageQuery: string; searchQuery: string; maxPages?: number }
  >({
    mutationFn: async (params) => {
      return await post<CreateCompanySearchJobResponse>(
        ENDPOINTS.COMPANY_SEARCH.JOBS,
        params
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.companySearchJobs() });
    },
  });
}

export function useCompanySearchJobs(options?: { page?: number; limit?: number; status?: string }) {
  const page = options?.page ?? 1;
  const limit = options?.limit ?? 20;

  return useQuery<CompanySearchJobsListResponse>({
    queryKey: [...QUERY_KEYS.companySearchJobs(), page, limit, options?.status],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('page', page.toString());
      params.set('limit', limit.toString());
      if (options?.status) {
        params.set('status', options.status);
      }
      return await get<CompanySearchJobsListResponse>(
        `${ENDPOINTS.COMPANY_SEARCH.JOBS}?${params.toString()}`
      );
    },
  });
}

export function useCompanySearchJob(jobId?: string) {
  return useQuery<CompanySearchJobDetailResponse>({
    queryKey: QUERY_KEYS.companySearchJob(jobId),
    queryFn: async () => {
      if (!jobId) throw new Error('Job ID is required');
      return await get<CompanySearchJobDetailResponse>(ENDPOINTS.COMPANY_SEARCH.JOB(jobId));
    },
    enabled: !!jobId,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (
        data?.status === CompanySearchJobStatus.SCRAPING ||
        data?.status === CompanySearchJobStatus.PENDING ||
        data?.status === CompanySearchJobStatus.DEDUPLICATING
      ) {
        return 3000;
      }
      return false;
    },
  });
}

export function useCreatePeopleSearchFromCompanies() {
  const queryClient = useQueryClient();

  return useMutation<
    CreatePeopleSearchFromCompaniesResponse,
    Error,
    { jobId: string; name?: string; roleConfigs: RoleConfig[] }
  >({
    mutationFn: async ({ jobId, name, roleConfigs }) => {
      return await post<CreatePeopleSearchFromCompaniesResponse>(
        ENDPOINTS.COMPANY_SEARCH.PEOPLE_SEARCH(jobId),
        { jobId, name, roleConfigs }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.companySearchJobs() });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.scrapeJobs() });
    },
  });
}

export function downloadCompanySearchResults(jobId: string, dedupedOnly: boolean = true) {
  const url = `${env.API_URL}${ENDPOINTS.COMPANY_SEARCH.DOWNLOAD(jobId)}${dedupedOnly ? '' : '?dedupedOnly=false'}`;
  window.open(url, '_blank');
}
