import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { get, post, del } from '@/lib/api';
import { QUERY_KEYS, ENDPOINTS } from '@/lib/config';
import {
  CopyGeneratorJobResponse,
  CopyGeneratorJobsListResponse,
  CopyGeneratorJobDetailResponse,
  CopyGeneratorListsResponse,
  CopyGeneratorPreviewResponse,
} from '@shared/types/src';

// ============================================
// Copy Generator Jobs
// ============================================

export function useCopyGeneratorJobs(options?: { page?: number; limit?: number; status?: string }) {
  const page = options?.page ?? 1;
  const limit = options?.limit ?? 20;

  return useQuery<CopyGeneratorJobsListResponse>({
    queryKey: [...QUERY_KEYS.copyGeneratorJobs(), page, limit, options?.status],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('page', page.toString());
      params.set('limit', limit.toString());
      if (options?.status) {
        params.set('status', options.status);
      }
      return await get<CopyGeneratorJobsListResponse>(`${ENDPOINTS.COPY_GENERATOR.JOBS}?${params.toString()}`);
    },
  });
}

export function useCopyGeneratorJob(jobId?: string, options?: { polling?: boolean }) {
  return useQuery<CopyGeneratorJobDetailResponse>({
    queryKey: QUERY_KEYS.copyGeneratorJob(jobId),
    queryFn: async () => {
      if (!jobId) throw new Error('Job ID is required');
      return await get<CopyGeneratorJobDetailResponse>(ENDPOINTS.COPY_GENERATOR.JOB(jobId));
    },
    enabled: !!jobId,
    refetchInterval: (query) => {
      if (!options?.polling) return false;
      const status = query.state.data?.job.status;
      return status === 'processing' || status === 'pending' ? 3000 : false;
    },
  });
}

export function useCreateCopyGeneratorJob() {
  const queryClient = useQueryClient();

  return useMutation<CopyGeneratorJobResponse, Error, { listId: string; userPrompt: string }>({
    mutationFn: async ({ listId, userPrompt }) => {
      return await post<CopyGeneratorJobResponse>(ENDPOINTS.COPY_GENERATOR.JOBS, {
        listId,
        userPrompt,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.copyGeneratorJobs() });
    },
  });
}

export function useDeleteCopyGeneratorJob() {
  const queryClient = useQueryClient();

  return useMutation<{ success: boolean }, Error, string>({
    mutationFn: async (jobId) => {
      return await del<{ success: boolean }>(ENDPOINTS.COPY_GENERATOR.JOB(jobId));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.copyGeneratorJobs() });
    },
  });
}

// ============================================
// Lists for Copy Generation
// ============================================

export function useCopyGeneratorLists() {
  return useQuery<CopyGeneratorListsResponse>({
    queryKey: QUERY_KEYS.copyGeneratorLists(),
    queryFn: async () => {
      return await get<CopyGeneratorListsResponse>(ENDPOINTS.COPY_GENERATOR.LISTS);
    },
  });
}

// ============================================
// Preview
// ============================================

export function usePreviewCopyGenerator() {
  return useMutation<CopyGeneratorPreviewResponse, Error, { leadId: string; userPrompt: string }>({
    mutationFn: async ({ leadId, userPrompt }) => {
      return await post<CopyGeneratorPreviewResponse>(ENDPOINTS.COPY_GENERATOR.PREVIEW, {
        leadId,
        userPrompt,
      });
    },
  });
}
