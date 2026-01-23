import { ValidatedRequestHandler } from "@/types/handlers";
import * as blogService from "@/services/blog.service";
import { GetBlogPostsRequest, GetBlogPostRequest } from "@shared/types/src";

export const getBlogPosts: ValidatedRequestHandler<GetBlogPostsRequest> = async (
  req,
  res
) => {
  const { category, page, limit } = req.validated;

  const result = await blogService.getBlogPosts({ category, page, limit });

  res.json(result);
};

export const getBlogPost: ValidatedRequestHandler<GetBlogPostRequest> = async (
  req,
  res
) => {
  const { slug } = req.validated;

  const post = await blogService.getBlogPost(slug);

  if (!post) {
    return res.status(404).json({ error: "Blog post not found" });
  }

  res.json(post);
};
