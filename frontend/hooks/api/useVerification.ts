import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { get, post } from '@/lib/api';
import { QUERY_KEYS, ENDPOINTS } from '@/lib/config';
import type {
  VerificationJobResponse,
  VerificationProgressResponse,
  VerificationEstimateResponse,
  VerificationMethod,
  UserDecision,
} from '@shared/types/src';

// ============================================
// Verification Jobs
// ============================================

export function useVerificationJob(jobId?: string, options?: { polling?: boolean }) {
  return useQuery<VerificationJobResponse>({
    queryKey: QUERY_KEYS.verificationJob(jobId),
    queryFn: async () => {
      if (!jobId) throw new Error('Job ID is required');
      return await get<VerificationJobResponse>(ENDPOINTS.VERIFICATION.JOB(jobId));
    },
    enabled: !!jobId,
    refetchInterval: (query) => {
      if (!options?.polling) return false;
      const stage = query.state.data?.verificationStage;
      // Poll faster during SMTP verification, slower during API verification
      if (stage === 'smtp_verifying') return 1500;
      if (stage === 'api_verifying') return 3000;
      if (stage === 'pending') return 2000;
      return false;
    },
  });
}

export function useVerificationProgress(jobId?: string, options?: { polling?: boolean }) {
  return useQuery<VerificationProgressResponse>({
    queryKey: QUERY_KEYS.verificationProgress(jobId),
    queryFn: async () => {
      if (!jobId) throw new Error('Job ID is required');
      return await get<VerificationProgressResponse>(ENDPOINTS.VERIFICATION.PROGRESS(jobId));
    },
    enabled: !!jobId,
    refetchInterval: (query) => {
      if (!options?.polling) return false;
      const stage = query.state.data?.job?.verificationStage;
      if (stage === 'smtp_verifying') return 1500;
      if (stage === 'api_verifying') return 3000;
      if (stage === 'pending') return 2000;
      return false;
    },
  });
}

export function useVerificationEstimate(jobId?: string) {
  return useQuery<VerificationEstimateResponse>({
    queryKey: QUERY_KEYS.verificationEstimate(jobId),
    queryFn: async () => {
      if (!jobId) throw new Error('Job ID is required');
      return await get<VerificationEstimateResponse>(ENDPOINTS.VERIFICATION.ESTIMATE(jobId));
    },
    enabled: !!jobId,
  });
}

export function useCreateVerificationJob() {
  const queryClient = useQueryClient();

  return useMutation<VerificationJobResponse, Error, { listId: string; verificationMethod: VerificationMethod }>({
    mutationFn: async ({ listId, verificationMethod }) => {
      return await post<VerificationJobResponse>(ENDPOINTS.VERIFICATION.JOBS, {
        listId,
        verificationMethod,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.verificationJobs() });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.enrichLists() });
    },
  });
}

export function useSubmitVerificationDecision() {
  const queryClient = useQueryClient();

  return useMutation<VerificationJobResponse, Error, { jobId: string; decision: UserDecision }>({
    mutationFn: async ({ jobId, decision }) => {
      return await post<VerificationJobResponse>(ENDPOINTS.VERIFICATION.DECISION(jobId), {
        decision,
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.verificationJob(variables.jobId) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.verificationProgress(variables.jobId) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.verificationEstimate(variables.jobId) });
    },
  });
}

// ============================================
// Helper Functions
// ============================================

export function getVerificationStageLabel(stage: string): string {
  switch (stage) {
    case 'pending':
      return 'Pending';
    case 'smtp_verifying':
      return 'Verifying via SMTP';
    case 'awaiting_decision':
      return 'Awaiting Your Decision';
    case 'api_verifying':
      return 'Verifying via API';
    case 'completed':
      return 'Completed';
    default:
      return stage;
  }
}

export function getVerificationMethodLabel(method: string): string {
  switch (method) {
    case 'smtp_only':
      return 'SMTP Only (Free)';
    case 'smtp_api_fallback':
      return 'SMTP + API Fallback';
    case 'api_only':
      return 'API Only';
    default:
      return method;
  }
}

export function getStatusBadgeColor(status: string): string {
  switch (status) {
    case 'valid':
      return 'bg-green-100 text-green-800';
    case 'invalid':
      return 'bg-red-100 text-red-800';
    case 'catch_all':
      return 'bg-yellow-100 text-yellow-800';
    case 'unknown':
      return 'bg-gray-100 text-gray-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}
