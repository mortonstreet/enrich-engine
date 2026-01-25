import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { get, del, post, patch } from '@/lib/api';
import { QUERY_KEYS, ENDPOINTS, env } from '@/lib/config';
import {
  ScrapeJobsListResponse,
  ScrapeJobDetailResponse,
  CreateScrapeJobResponse,
  DeleteScrapeJobResponse,
  ScrapeJobStatus,
  DBScrapeJob,
  RenameScrapeJobResponse,
  SyncScrapeJobResponse,
} from '@shared/types/src';

/**
 * Query hook for listing scrape jobs with pagination
 */
export function useScrapeJobs(options?: { page?: number; limit?: number; status?: string }) {
  const page = options?.page ?? 1;
  const limit = options?.limit ?? 20;

  return useQuery<ScrapeJobsListResponse>({
    queryKey: [...QUERY_KEYS.scrapeJobs(), page, limit, options?.status],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('page', page.toString());
      params.set('limit', limit.toString());
      if (options?.status) {
        params.set('status', options.status);
      }

      const url = `${ENDPOINTS.SCRAPE.JOBS}?${params.toString()}`;
      return await get<ScrapeJobsListResponse>(url);
    },
  });
}

/**
 * Query hook for single scrape job with optional polling for active jobs
 */
export function useScrapeJob(jobId?: string, options?: { polling?: boolean }) {
  return useQuery<ScrapeJobDetailResponse>({
    queryKey: QUERY_KEYS.scrapeJob(jobId),
    queryFn: async () => {
      if (!jobId) throw new Error('Job ID is required');
      return await get<ScrapeJobDetailResponse>(ENDPOINTS.SCRAPE.JOB(jobId));
    },
    enabled: !!jobId,
    refetchInterval: (query) => {
      if (!options?.polling) return false;
      const data = query.state.data;
      if (
        data?.status === ScrapeJobStatus.PROCESSING ||
        data?.status === ScrapeJobStatus.PENDING ||
        data?.status === ScrapeJobStatus.PAUSED
      ) {
        return 3000;
      }
      return false;
    },
  });
}

/**
 * Mutation hook for creating a scrape job with CSV upload
 */
export function useCreateScrapeJob() {
  const queryClient = useQueryClient();

  return useMutation<CreateScrapeJobResponse, Error, { file: File; name?: string; roleConfigs?: { roleName: string; count: number }[] }>({
    mutationFn: async ({ file, name, roleConfigs }) => {
      const formData = new FormData();
      formData.append('file', file);
      if (name) {
        formData.append('name', name);
      }
      if (roleConfigs && roleConfigs.length > 0) {
        formData.append('roleConfigs', JSON.stringify(roleConfigs));
      }

      const response = await fetch(`${env.API_URL}${ENDPOINTS.SCRAPE.JOBS}`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create scrape job');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.scrapeJobs() });
    },
  });
}

/**
 * Mutation hook for deleting a scrape job
 */
export function useDeleteScrapeJob() {
  const queryClient = useQueryClient();

  return useMutation<DeleteScrapeJobResponse, Error, string>({
    mutationFn: async (jobId) => {
      return await del<DeleteScrapeJobResponse>(ENDPOINTS.SCRAPE.JOB(jobId));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.scrapeJobs() });
    },
  });
}

/**
 * Helper function to download scrape results as CSV
 * @param jobId - The job ID to download results for
 * @param foundOnly - If true, only download results with LinkedIn URLs found
 */
export function downloadScrapeResults(jobId: string, foundOnly?: boolean) {
  const url = `${env.API_URL}${ENDPOINTS.SCRAPE.DOWNLOAD(jobId)}${foundOnly ? '?foundOnly=true' : ''}`;
  window.open(url, '_blank');
}

/**
 * Mutation hook for pausing a scrape job
 */
export function usePauseScrapeJob() {
  const queryClient = useQueryClient();

  return useMutation<DBScrapeJob, Error, string>({
    mutationFn: async (jobId) => {
      return await post<DBScrapeJob>(ENDPOINTS.SCRAPE.PAUSE(jobId));
    },
    onSuccess: (_, jobId) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.scrapeJobs() });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.scrapeJob(jobId) });
      // Invalidate lists and leads as pausing syncs leads to the list
      queryClient.invalidateQueries({ queryKey: ['lists'] });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.allLeads() });
    },
  });
}

/**
 * Mutation hook for resuming a paused scrape job
 */
export function useResumeScrapeJob() {
  const queryClient = useQueryClient();

  return useMutation<DBScrapeJob, Error, string>({
    mutationFn: async (jobId) => {
      return await post<DBScrapeJob>(ENDPOINTS.SCRAPE.RESUME(jobId));
    },
    onSuccess: (_, jobId) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.scrapeJobs() });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.scrapeJob(jobId) });
    },
  });
}

/**
 * Mutation hook for renaming a scrape job
 */
export function useRenameScrapeJob() {
  const queryClient = useQueryClient();

  return useMutation<RenameScrapeJobResponse, Error, { jobId: string; name: string }>({
    mutationFn: async ({ jobId, name }) => {
      return await patch<RenameScrapeJobResponse>(ENDPOINTS.SCRAPE.RENAME(jobId), { name });
    },
    onSuccess: (_, { jobId }) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.scrapeJobs() });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.scrapeJob(jobId) });
      // Also invalidate lists as the associated list name may have changed
      queryClient.invalidateQueries({ queryKey: ['lists'] });
    },
  });
}

/**
 * Mutation hook for syncing scrape job results to a list
 */
export function useSyncScrapeJob() {
  const queryClient = useQueryClient();

  return useMutation<SyncScrapeJobResponse, Error, string>({
    mutationFn: async (jobId) => {
      return await post<SyncScrapeJobResponse>(ENDPOINTS.SCRAPE.SYNC(jobId));
    },
    onSuccess: (_, jobId) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.scrapeJobs() });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.scrapeJob(jobId) });
      // Invalidate lists and leads as syncing creates/updates leads
      queryClient.invalidateQueries({ queryKey: ['lists'] });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.allLeads() });
    },
  });
}
