import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { get, post } from '@/lib/api';
import { QUERY_KEYS, ENDPOINTS, env } from '@/lib/config';
import {
  EnrichPersonResponse,
  EnrichmentHistoryResponse,
  BulkEnrichResponse,
  BulkJobStatusResponse,
  WaitlistResponse,
} from '@shared/types/src';

/**
 * Mutation hook for single person enrichment
 */
export function useEnrichPerson() {
  const queryClient = useQueryClient();

  return useMutation<EnrichPersonResponse, Error, { linkedinUrl: string; enrichMobile?: boolean }>({
    mutationFn: async ({ linkedinUrl, enrichMobile = true }) => {
      return await post<EnrichPersonResponse>(ENDPOINTS.ENRICHMENT.ENRICH, {
        linkedinUrl,
        enrichMobile,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.enrichmentHistory() });
    },
  });
}

/**
 * Query hook for enrichment history with pagination
 */
export function useEnrichmentHistory(options?: { page?: number; limit?: number; status?: string }) {
  const page = options?.page ?? 1;
  const limit = options?.limit ?? 20;

  return useQuery<EnrichmentHistoryResponse>({
    queryKey: [...QUERY_KEYS.enrichmentHistory(), page, limit, options?.status],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('page', page.toString());
      params.set('limit', limit.toString());
      if (options?.status) {
        params.set('status', options.status);
      }

      const url = `${ENDPOINTS.ENRICHMENT.HISTORY}?${params.toString()}`;
      return await get<EnrichmentHistoryResponse>(url);
    },
  });
}

/**
 * Mutation hook for creating bulk enrichment job
 */
export function useCreateBulkJob() {
  const queryClient = useQueryClient();

  return useMutation<BulkEnrichResponse, Error, { file: File; enrichMobile?: boolean }>({
    mutationFn: async ({ file, enrichMobile = true }) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('enrichMobile', enrichMobile.toString());

      const response = await fetch(`${env.API_URL}${ENDPOINTS.ENRICHMENT.BULK}`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create bulk job');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.enrichmentHistory() });
    },
  });
}

/**
 * Query hook for bulk job status with optional polling
 */
export function useBulkJobStatus(jobId?: string, options?: { polling?: boolean }) {
  return useQuery<BulkJobStatusResponse>({
    queryKey: QUERY_KEYS.bulkJobStatus(jobId),
    queryFn: async () => {
      if (!jobId) throw new Error('Job ID is required');
      return await get<BulkJobStatusResponse>(ENDPOINTS.ENRICHMENT.BULK_STATUS(jobId));
    },
    enabled: !!jobId,
    refetchInterval: options?.polling ? 3000 : false,
  });
}

/**
 * Helper function to download bulk job results as CSV
 */
export function downloadBulkJobCsv(jobId: string) {
  window.open(`${env.API_URL}${ENDPOINTS.ENRICHMENT.BULK_DOWNLOAD(jobId)}`, '_blank');
}

/**
 * Mutation hook for waitlist signup
 */
export function useWaitlistSignup() {
  return useMutation<WaitlistResponse, Error, { email: string; source?: string }>({
    mutationFn: async ({ email, source }) => {
      return await post<WaitlistResponse>(ENDPOINTS.WAITLIST.ADD, {
        email,
        source,
      });
    },
  });
}
