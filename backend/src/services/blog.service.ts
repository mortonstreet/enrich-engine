import * as blogRepository from "@/repositories/blog.repository";
import {
  GetBlogPostsRequest,
  GetBlogPostsResponse,
  GetBlogPostResponse,
  BlogPostSummary,
} from "@shared/types/src";

const toSummary = (post: any): BlogPostSummary => ({
  id: post.id,
  slug: post.slug,
  title: post.title,
  excerpt: post.excerpt,
  category: post.category,
  readTime: post.readTime,
  author: "Enrich Engine team",
  publishedAt: post.publishedAt,
  isFeatured: post.isFeatured,
  gradientColor: post.gradientColor,
});

export const getBlogPosts = async (
  request: GetBlogPostsRequest
): Promise<GetBlogPostsResponse> => {
  const { category, page, limit } = request;

  const filters = {
    category: category && category !== "All" ? category : undefined,
    publishedOnly: true,
  };

  const [posts, featured, categories, total] = await Promise.all([
    blogRepository.findAll(filters, { page, limit }),
    blogRepository.findFeatured(),
    blogRepository.getCategories(),
    blogRepository.count(filters),
  ]);

  return {
    posts: posts.map(toSummary),
    featured: featured ? toSummary(featured) : null,
    categories: ["All", ...categories],
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

export const getBlogPost = async (
  slug: string
): Promise<GetBlogPostResponse | null> => {
  const post = await blogRepository.findBySlug(slug);
  if (!post) return null;
  return {
    ...post,
    author: "Enrich Engine team",
  };
};
