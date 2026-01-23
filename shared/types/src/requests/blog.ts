import { z } from 'zod';
import { DBBlogPost } from '@shared/db/src/types';

// ============================================
// Get Blog Posts Request (List)
// ============================================

export const GetBlogPostsRequestSchema = z.object({
  category: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(12),
});

export type GetBlogPostsRequest = z.infer<typeof GetBlogPostsRequestSchema>;

// ============================================
// Get Single Blog Post Request
// ============================================

export const GetBlogPostRequestSchema = z.object({
  slug: z.string().min(1),
});

export type GetBlogPostRequest = z.infer<typeof GetBlogPostRequestSchema>;

// ============================================
// Response Types
// ============================================

export type BlogPostSummary = Pick<
  DBBlogPost,
  'id' | 'slug' | 'title' | 'excerpt' | 'category' | 'readTime' | 'author' | 'publishedAt' | 'isFeatured' | 'gradientColor'
>;

export type BlogPostDetail = DBBlogPost;

export type GetBlogPostsResponse = {
  posts: BlogPostSummary[];
  featured: BlogPostSummary | null;
  categories: string[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

export type GetBlogPostResponse = BlogPostDetail;
