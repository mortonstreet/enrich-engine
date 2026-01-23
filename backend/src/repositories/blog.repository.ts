import { db } from "@/lib/db";
import { withIdAndTimestamps } from "./utils";
import { CreateBlogPostInput, UpdateDBBlogPost } from "@shared/db/src/types";

export type BlogPostFilters = {
  category?: string;
  isFeatured?: boolean;
  publishedOnly?: boolean;
};

export const findAll = async (
  filters: BlogPostFilters = {},
  pagination?: { page: number; limit: number }
) => {
  let query = db.selectFrom("blog_post").selectAll();

  if (filters.category) {
    query = query.where("category", "=", filters.category);
  }

  if (filters.isFeatured !== undefined) {
    query = query.where("isFeatured", "=", filters.isFeatured);
  }

  if (filters.publishedOnly) {
    query = query.where("publishedAt", "is not", null);
  }

  query = query.orderBy("publishedAt", "desc");

  if (pagination) {
    query = query
      .limit(pagination.limit)
      .offset((pagination.page - 1) * pagination.limit);
  }

  return query.execute();
};

export const findBySlug = async (slug: string) => {
  return db
    .selectFrom("blog_post")
    .where("slug", "=", slug)
    .selectAll()
    .executeTakeFirst();
};

export const findById = async (id: string) => {
  return db
    .selectFrom("blog_post")
    .where("id", "=", id)
    .selectAll()
    .executeTakeFirst();
};

export const findFeatured = async () => {
  return db
    .selectFrom("blog_post")
    .where("isFeatured", "=", true)
    .where("publishedAt", "is not", null)
    .orderBy("publishedAt", "desc")
    .selectAll()
    .executeTakeFirst();
};

export const getCategories = async () => {
  const results = await db
    .selectFrom("blog_post")
    .select("category")
    .where("publishedAt", "is not", null)
    .distinct()
    .execute();

  return results.map((r) => r.category);
};

export const count = async (filters: BlogPostFilters = {}) => {
  let query = db
    .selectFrom("blog_post")
    .select(db.fn.countAll().as("count"));

  if (filters.category) {
    query = query.where("category", "=", filters.category);
  }

  if (filters.publishedOnly) {
    query = query.where("publishedAt", "is not", null);
  }

  const result = await query.executeTakeFirst();
  return Number(result?.count ?? 0);
};

export const create = async (data: CreateBlogPostInput) => {
  return db
    .insertInto("blog_post")
    .values(withIdAndTimestamps(data, true))
    .returningAll()
    .executeTakeFirst();
};

export const update = async (id: string, data: Partial<UpdateDBBlogPost>) => {
  return db
    .updateTable("blog_post")
    .set({ ...data, updatedAt: new Date() })
    .where("id", "=", id)
    .returningAll()
    .executeTakeFirst();
};

export const deleteById = async (id: string) => {
  return db
    .deleteFrom("blog_post")
    .where("id", "=", id)
    .executeTakeFirst();
};
