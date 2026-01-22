import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { get, post, patch, del } from '@/lib/api';
import { QUERY_KEYS, ENDPOINTS } from '@/lib/config';
import {
  ExternalApiKeysListResponse,
  ExternalApiKeyCreatedResponse,
  ExternalApiKeyResponse,
  CreateExternalApiKeyRequest,
  UpdateExternalApiKeyRequest,
  ExternalApiScope,
} from '@shared/types/src';

// ============================================
// External API Keys
// ============================================

export function useExternalApiKeys() {
  return useQuery<ExternalApiKeysListResponse>({
    queryKey: QUERY_KEYS.externalApiKeys(),
    queryFn: async () => {
      return await get<ExternalApiKeysListResponse>(ENDPOINTS.EXTERNAL_API_KEYS.LIST);
    },
  });
}

export function useCreateExternalApiKey() {
  const queryClient = useQueryClient();

  return useMutation<
    ExternalApiKeyCreatedResponse,
    Error,
    { name: string; scopes: ExternalApiScope[]; expiresAt?: string | null }
  >({
    mutationFn: async ({ name, scopes, expiresAt }) => {
      return await post<ExternalApiKeyCreatedResponse>(ENDPOINTS.EXTERNAL_API_KEYS.CREATE, {
        name,
        scopes,
        expiresAt,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.externalApiKeys() });
    },
  });
}

export function useUpdateExternalApiKey() {
  const queryClient = useQueryClient();

  return useMutation<
    ExternalApiKeyResponse,
    Error,
    { id: string; updates: UpdateExternalApiKeyRequest }
  >({
    mutationFn: async ({ id, updates }) => {
      return await patch<ExternalApiKeyResponse>(ENDPOINTS.EXTERNAL_API_KEYS.UPDATE(id), updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.externalApiKeys() });
    },
  });
}

export function useDeleteExternalApiKey() {
  const queryClient = useQueryClient();

  return useMutation<{ success: boolean }, Error, string>({
    mutationFn: async (id) => {
      return await del<{ success: boolean }>(ENDPOINTS.EXTERNAL_API_KEYS.DELETE(id));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.externalApiKeys() });
    },
  });
}
