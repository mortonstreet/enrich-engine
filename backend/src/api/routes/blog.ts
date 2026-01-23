import { Router } from "express";
import { getBlogPosts, getBlogPost } from "@/api/controllers/blog.controller";
import { validatedRoute } from "./utils";
import { validateAndMerge } from "../middlewares/validationMiddleware";
import {
  GetBlogPostsRequest,
  GetBlogPostsRequestSchema,
  GetBlogPostRequest,
  GetBlogPostRequestSchema,
} from "@shared/types/src";

const router = Router();

// Get all blog posts (public route - no auth required)
router.get(
  "/",
  validateAndMerge(GetBlogPostsRequestSchema),
  validatedRoute<GetBlogPostsRequest>(getBlogPosts)
);

// Get single blog post by slug (public route - no auth required)
router.get(
  "/:slug",
  validateAndMerge(GetBlogPostRequestSchema),
  validatedRoute<GetBlogPostRequest>(getBlogPost)
);

export default router;
