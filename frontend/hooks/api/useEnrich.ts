import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { get, post, del } from '@/lib/api';
import { QUERY_KEYS, ENDPOINTS, env } from '@/lib/config';
import {
  ListEnrichmentJobResponse,
  ListEnrichmentJobsListResponse,
  ListEnrichmentJobDetailResponse,
  VendorsListResponse,
  ListsForEnrichmentResponse,
  ApiKeysListResponse,
  EnrichmentType,
  EnrichmentStrategy,
  EmailGuessPreviewResponse,
  JobCostComparisonResponse,
  PricingComparisonResponse,
} from '@shared/types/src';

// ============================================
// Enrichment Jobs
// ============================================

export function useEnrichmentJobs(options?: { page?: number; limit?: number; status?: string }) {
  const page = options?.page ?? 1;
  const limit = options?.limit ?? 20;

  return useQuery<ListEnrichmentJobsListResponse>({
    queryKey: [...QUERY_KEYS.enrichJobs(), page, limit, options?.status],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('page', page.toString());
      params.set('limit', limit.toString());
      if (options?.status) {
        params.set('status', options.status);
      }
      return await get<ListEnrichmentJobsListResponse>(`${ENDPOINTS.ENRICH.JOBS}?${params.toString()}`);
    },
  });
}

export function useEnrichmentJob(jobId?: string, options?: { polling?: boolean }) {
  return useQuery<ListEnrichmentJobDetailResponse>({
    queryKey: QUERY_KEYS.enrichJob(jobId),
    queryFn: async () => {
      if (!jobId) throw new Error('Job ID is required');
      return await get<ListEnrichmentJobDetailResponse>(ENDPOINTS.ENRICH.JOB(jobId));
    },
    enabled: !!jobId,
    refetchInterval: (query) => {
      if (!options?.polling) return false;
      const status = query.state.data?.job.status;
      return status === 'processing' || status === 'pending' ? 3000 : false;
    },
  });
}

export function useCreateEnrichmentJob() {
  const queryClient = useQueryClient();

  return useMutation<ListEnrichmentJobResponse, Error, { listId: string; enrichmentType: EnrichmentType }>({
    mutationFn: async ({ listId, enrichmentType }) => {
      return await post<ListEnrichmentJobResponse>(ENDPOINTS.ENRICH.JOBS, {
        listId,
        enrichmentType,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.enrichJobs() });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.enrichLists() });
    },
  });
}

export function useDeleteEnrichmentJob() {
  const queryClient = useQueryClient();

  return useMutation<{ success: boolean }, Error, string>({
    mutationFn: async (jobId) => {
      return await del<{ success: boolean }>(ENDPOINTS.ENRICH.JOB(jobId));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.enrichJobs() });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.enrichLists() });
    },
  });
}

export type DownloadFilter = 'all' | 'found' | 'valid' | 'catchall' | 'risky';

export function downloadEnrichmentResults(jobId: string, filter: DownloadFilter = 'all') {
  const url = `${env.API_URL}${ENDPOINTS.ENRICH.DOWNLOAD(jobId)}?filter=${filter}`;
  window.open(url, '_blank');
}

// ============================================
// Vendors
// ============================================

export function useVendors() {
  return useQuery<VendorsListResponse>({
    queryKey: QUERY_KEYS.enrichVendors(),
    queryFn: async () => {
      return await get<VendorsListResponse>(ENDPOINTS.ENRICH.VENDORS);
    },
  });
}

// ============================================
// Lists for Enrichment
// ============================================

export function useListsForEnrichment() {
  return useQuery<ListsForEnrichmentResponse>({
    queryKey: QUERY_KEYS.enrichLists(),
    queryFn: async () => {
      return await get<ListsForEnrichmentResponse>(ENDPOINTS.ENRICH.LISTS);
    },
  });
}

// ============================================
// API Keys
// ============================================

export function useApiKeys() {
  return useQuery<ApiKeysListResponse>({
    queryKey: QUERY_KEYS.enrichApiKeys(),
    queryFn: async () => {
      return await get<ApiKeysListResponse>(ENDPOINTS.ENRICH.API_KEYS);
    },
  });
}

export function useSaveApiKey() {
  const queryClient = useQueryClient();

  return useMutation<{ success: boolean }, Error, { vendor: string; apiKey: string }>({
    mutationFn: async ({ vendor, apiKey }) => {
      return await post<{ success: boolean }>(ENDPOINTS.ENRICH.API_KEYS, {
        vendor,
        apiKey,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.enrichApiKeys() });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.enrichVendors() });
    },
  });
}

export function useDeleteApiKey() {
  const queryClient = useQueryClient();

  return useMutation<{ success: boolean }, Error, string>({
    mutationFn: async (vendor) => {
      return await del<{ success: boolean }>(ENDPOINTS.ENRICH.API_KEY(vendor));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.enrichApiKeys() });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.enrichVendors() });
    },
  });
}

// ============================================
// Email Guess (Smart Enrichment)
// ============================================

export function useEmailGuessPreview(listId?: string) {
  return useQuery<EmailGuessPreviewResponse>({
    queryKey: QUERY_KEYS.enrichGuessPreview(listId),
    queryFn: async () => {
      if (!listId) throw new Error('List ID is required');
      return await post<EmailGuessPreviewResponse>(ENDPOINTS.ENRICH.GUESS_PREVIEW, { listId });
    },
    enabled: !!listId,
  });
}

export function useCreateEmailGuessJob() {
  const queryClient = useQueryClient();

  return useMutation<ListEnrichmentJobResponse, Error, { listId: string; strategy: EnrichmentStrategy }>({
    mutationFn: async ({ listId, strategy }) => {
      return await post<ListEnrichmentJobResponse>(ENDPOINTS.ENRICH.GUESS, {
        listId,
        strategy,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.enrichJobs() });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.enrichLists() });
    },
  });
}

export interface JobCostBreakdown {
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

export function useJobCostBreakdown(jobId?: string) {
  return useQuery<JobCostBreakdown>({
    queryKey: QUERY_KEYS.enrichCostBreakdown(jobId),
    queryFn: async () => {
      if (!jobId) throw new Error('Job ID is required');
      return await get<JobCostBreakdown>(ENDPOINTS.ENRICH.COST_BREAKDOWN(jobId));
    },
    enabled: !!jobId,
  });
}

// ============================================
// Cost Comparison
// ============================================

export function useJobCostComparison(jobId?: string, enabled?: boolean) {
  return useQuery<JobCostComparisonResponse>({
    queryKey: QUERY_KEYS.enrichCostComparison(jobId),
    queryFn: async () => {
      if (!jobId) throw new Error('Job ID is required');
      return await get<JobCostComparisonResponse>(ENDPOINTS.ENRICH.COST_COMPARISON(jobId));
    },
    enabled: !!jobId && enabled !== false,
  });
}

export function usePricingComparison() {
  return useQuery<PricingComparisonResponse>({
    queryKey: QUERY_KEYS.pricingComparison(),
    queryFn: async () => {
      return await get<PricingComparisonResponse>(ENDPOINTS.ENRICH.PRICING_COMPARISON);
    },
    staleTime: 1000 * 60 * 60, // Cache for 1 hour (pricing doesn't change often)
  });
}
