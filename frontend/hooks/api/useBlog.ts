import { useQuery } from '@tanstack/react-query';
import { get } from '@/lib/api';
import { QUERY_KEYS, ENDPOINTS } from '@/lib/config';
import { GetBlogPostsResponse, GetBlogPostResponse } from '@shared/types/src';

/**
 * Query hook for blog posts list with optional category filter
 */
export function useBlogPosts(options?: { category?: string; page?: number; limit?: number }) {
  const category = options?.category;
  const page = options?.page ?? 1;
  const limit = options?.limit ?? 12;

  return useQuery<GetBlogPostsResponse>({
    queryKey: [...QUERY_KEYS.blogPosts(category), page, limit],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('page', page.toString());
      params.set('limit', limit.toString());
      if (category && category !== 'All') {
        params.set('category', category);
      }

      const url = `${ENDPOINTS.BLOG.LIST}?${params.toString()}`;
      return await get<GetBlogPostsResponse>(url);
    },
  });
}

/**
 * Query hook for single blog post by slug
 */
export function useBlogPost(slug?: string) {
  return useQuery<GetBlogPostResponse>({
    queryKey: QUERY_KEYS.blogPost(slug),
    queryFn: async () => {
      if (!slug) throw new Error('Slug is required');
      return await get<GetBlogPostResponse>(ENDPOINTS.BLOG.DETAIL(slug));
    },
    enabled: !!slug,
  });
}
