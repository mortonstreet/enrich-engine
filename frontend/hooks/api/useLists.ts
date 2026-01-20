import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { get, post, patch, del } from '@/lib/api';
import { QUERY_KEYS, ENDPOINTS, env } from '@/lib/config';
import {
  ListsPageResponse,
  ListDetailResponse,
  FavoritesResponse,
  RecentsResponse,
  ListResponse,
  FolderResponse,
  CreateListRequest,
  UpdateListRequest,
  CreateFolderRequest,
  UpdateFolderRequest,
  AddFavoriteRequest,
  AllLeadsResponse,
  CreateListFromLeadsRequest,
  CreateListFromLeadsResponse,
  CreateListFromFiltersRequest,
  CreateListFromFiltersResponse,
  LeadFilterOptionsResponse,
} from '@shared/types/src';

// ============================================
// List Hooks
// ============================================

export function useLists(options?: {
  folderId?: string | null;
  search?: string;
  ownerId?: string;
}) {
  return useQuery<ListsPageResponse>({
    queryKey: QUERY_KEYS.lists(options?.folderId, options?.search, options?.ownerId),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (options?.folderId) {
        params.set('folderId', options.folderId);
      }
      if (options?.search) {
        params.set('search', options.search);
      }
      if (options?.ownerId) {
        params.set('ownerId', options.ownerId);
      }
      const url = params.toString()
        ? `${ENDPOINTS.LISTS.BASE}?${params.toString()}`
        : ENDPOINTS.LISTS.BASE;
      return await get<ListsPageResponse>(url);
    },
  });
}

export function useListDetail(
  id?: string,
  options?: { page?: number; limit?: number; search?: string },
) {
  return useQuery<ListDetailResponse>({
    queryKey: [...QUERY_KEYS.listDetail(id), options?.page, options?.limit, options?.search],
    queryFn: async () => {
      if (!id) throw new Error('List ID is required');
      const params = new URLSearchParams();
      params.set('page', (options?.page ?? 1).toString());
      params.set('limit', (options?.limit ?? 20).toString());
      if (options?.search) {
        params.set('search', options.search);
      }
      const url = `${ENDPOINTS.LISTS.DETAIL(id)}?${params.toString()}`;
      return await get<ListDetailResponse>(url);
    },
    enabled: !!id,
  });
}

export function useCreateList() {
  const queryClient = useQueryClient();

  return useMutation<ListResponse, Error, CreateListRequest>({
    mutationFn: async (data) => {
      return await post<ListResponse>(ENDPOINTS.LISTS.BASE, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lists'] });
    },
  });
}

export function useUpdateList() {
  const queryClient = useQueryClient();

  return useMutation<ListResponse, Error, UpdateListRequest>({
    mutationFn: async ({ id, ...data }) => {
      return await patch<ListResponse>(ENDPOINTS.LISTS.DETAIL(id), data);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['lists'] });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.listDetail(variables.id) });
    },
  });
}

export function useDeleteList() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: async (id) => {
      await del<void>(ENDPOINTS.LISTS.DETAIL(id));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lists'] });
    },
  });
}

export function downloadListCsv(id: string) {
  window.open(`${env.API_URL}${ENDPOINTS.LISTS.EXPORT(id)}`, '_blank');
}

// ============================================
// Folder Hooks
// ============================================

export function useCreateFolder() {
  const queryClient = useQueryClient();

  return useMutation<FolderResponse, Error, CreateFolderRequest>({
    mutationFn: async (data) => {
      return await post<FolderResponse>(ENDPOINTS.LISTS.FOLDERS, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lists'] });
    },
  });
}

export function useUpdateFolder() {
  const queryClient = useQueryClient();

  return useMutation<FolderResponse, Error, UpdateFolderRequest>({
    mutationFn: async ({ id, ...data }) => {
      return await patch<FolderResponse>(ENDPOINTS.LISTS.FOLDER(id), data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lists'] });
    },
  });
}

export function useDeleteFolder() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: async (id) => {
      await del<void>(ENDPOINTS.LISTS.FOLDER(id));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lists'] });
    },
  });
}

// ============================================
// Favorite Hooks
// ============================================

export function useFavorites() {
  return useQuery<FavoritesResponse>({
    queryKey: QUERY_KEYS.listFavorites(),
    queryFn: async () => {
      return await get<FavoritesResponse>(ENDPOINTS.LISTS.FAVORITES);
    },
  });
}

export function useAddFavorite() {
  const queryClient = useQueryClient();

  return useMutation<{ id: string }, Error, AddFavoriteRequest>({
    mutationFn: async (data) => {
      return await post<{ id: string }>(ENDPOINTS.LISTS.FAVORITES, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lists'] });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.listFavorites() });
    },
  });
}

export function useRemoveFavorite() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: async (id) => {
      await del<void>(ENDPOINTS.LISTS.FAVORITE(id));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lists'] });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.listFavorites() });
    },
  });
}

export function useToggleFavorite() {
  const queryClient = useQueryClient();

  return useMutation<
    void,
    Error,
    { listId?: string; folderId?: string; isFavorite: boolean }
  >({
    mutationFn: async ({ listId, folderId, isFavorite }) => {
      if (isFavorite) {
        // Remove favorite
        const params = new URLSearchParams();
        if (listId) params.set('listId', listId);
        if (folderId) params.set('folderId', folderId);
        await del<void>(`${ENDPOINTS.LISTS.FAVORITES}?${params.toString()}`);
      } else {
        // Add favorite
        await post<{ id: string }>(ENDPOINTS.LISTS.FAVORITES, { listId, folderId });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lists'] });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.listFavorites() });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.listRecents() });
    },
  });
}

// ============================================
// Recents Hooks
// ============================================

export function useRecents() {
  return useQuery<RecentsResponse>({
    queryKey: QUERY_KEYS.listRecents(),
    queryFn: async () => {
      return await get<RecentsResponse>(ENDPOINTS.LISTS.RECENTS);
    },
  });
}

// ============================================
// Lead Hooks
// ============================================

export function useUpdateLead() {
  const queryClient = useQueryClient();

  return useMutation<
    void,
    Error,
    {
      id: string;
      listId: string;
      firstName?: string | null;
      lastName?: string | null;
      email?: string | null;
      phone?: string | null;
      company?: string | null;
      role?: string | null;
      linkedinUrl?: string | null;
      customFields?: Record<string, unknown>;
    }
  >({
    mutationFn: async ({ id, listId, ...data }) => {
      await patch<void>(ENDPOINTS.LISTS.LEAD(id), data);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.listDetail(variables.listId) });
    },
  });
}

// ============================================
// CSV Upload Hook
// ============================================

export function useUploadCSV() {
  const queryClient = useQueryClient();

  return useMutation<ListResponse, Error, { listId: string; file: File }>({
    mutationFn: async ({ listId, file }) => {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${env.API_URL}${ENDPOINTS.LISTS.DETAIL(listId)}/upload`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to upload CSV');
      }

      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['lists'] });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.listDetail(variables.listId) });
    },
  });
}

// ============================================
// All Leads Hooks
// ============================================

export function useAllLeads(options?: {
  page?: number;
  limit?: number;
  search?: string;
  listId?: string;
  company?: string;
  role?: string;
  hasEmail?: boolean;
  hasPhone?: boolean;
  hasLinkedinUrl?: boolean;
}) {
  return useQuery<AllLeadsResponse>({
    queryKey: [...QUERY_KEYS.allLeads(), options?.page, options?.limit, options?.search, options?.listId, options?.company, options?.role, options?.hasEmail, options?.hasPhone, options?.hasLinkedinUrl],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (options?.page) params.set('page', options.page.toString());
      if (options?.limit) params.set('limit', options.limit.toString());
      if (options?.search) params.set('search', options.search);
      if (options?.listId) params.set('listId', options.listId);
      if (options?.company) params.set('company', options.company);
      if (options?.role) params.set('role', options.role);
      if (options?.hasEmail !== undefined) params.set('hasEmail', options.hasEmail.toString());
      if (options?.hasPhone !== undefined) params.set('hasPhone', options.hasPhone.toString());
      if (options?.hasLinkedinUrl !== undefined) params.set('hasLinkedinUrl', options.hasLinkedinUrl.toString());
      const url = params.toString()
        ? `${ENDPOINTS.LISTS.ALL_LEADS}?${params.toString()}`
        : ENDPOINTS.LISTS.ALL_LEADS;
      return await get<AllLeadsResponse>(url);
    },
  });
}

export function useLeadFilterOptions() {
  return useQuery<LeadFilterOptionsResponse>({
    queryKey: QUERY_KEYS.leadFilterOptions(),
    queryFn: async () => {
      return await get<LeadFilterOptionsResponse>(ENDPOINTS.LISTS.LEAD_FILTER_OPTIONS);
    },
  });
}

export function useCreateListFromFilters() {
  const queryClient = useQueryClient();

  return useMutation<CreateListFromFiltersResponse, Error, CreateListFromFiltersRequest>({
    mutationFn: async (data) => {
      return await post<CreateListFromFiltersResponse>(ENDPOINTS.LISTS.CREATE_LIST_FROM_FILTERS, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lists'] });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.allLeads() });
    },
  });
}

export function useCreateListFromLeads() {
  const queryClient = useQueryClient();

  return useMutation<CreateListFromLeadsResponse, Error, CreateListFromLeadsRequest>({
    mutationFn: async (data) => {
      return await post<CreateListFromLeadsResponse>(ENDPOINTS.LISTS.CREATE_LIST_FROM_LEADS, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lists'] });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.allLeads() });
    },
  });
}

export function useDeleteLead() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: async (id) => {
      await del<void>(ENDPOINTS.LISTS.LEAD(id));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lists'] });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.allLeads() });
    },
  });
}
