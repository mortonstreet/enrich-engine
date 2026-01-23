"use client";

import { useState } from "react";
import Link from "next/link";
import Navigation from "@/components/landing/Navigation";
import ExaFooter from "@/components/landing/ExaFooter";
import AnimatedPixelBackground from "@/components/landing/AnimatedPixelBackground";
import ScrollReveal from "@/components/landing/ScrollReveal";
import { ArrowRight, Clock, Loader2 } from "lucide-react";
import { useBlogPosts } from "@/hooks/api/useBlog";
import { BlogPostSummary } from "@shared/types/src";

function formatDate(date: Date | string | null): string {
  if (!date) return "";
  const d = new Date(date);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function FeaturedPostCard({ post }: { post: BlogPostSummary }) {
  const gradient = post.gradientColor || "bg-gradient-to-br from-[#E63946] to-pink-600";

  return (
    <Link href={`/blog/${post.slug}`} className="block group">
      <div className={`${gradient} rounded-xl sm:rounded-2xl p-5 sm:p-8 md:p-12 text-white`}>
        <div className="max-w-2xl">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-3 sm:mb-4 text-white/70 text-xs sm:text-sm">
            <span className="px-2.5 sm:px-3 py-1 bg-white/20 rounded-full">{post.category}</span>
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              {post.readTime}
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-semibold mb-3 sm:mb-4 group-hover:underline decoration-2 underline-offset-4">
            {post.title}
          </h2>
          <p className="text-white/80 text-sm sm:text-base md:text-lg mb-4 sm:mb-6 line-clamp-3 sm:line-clamp-none">{post.excerpt}</p>
          <div className="flex items-center text-white font-medium text-sm sm:text-base">
            Read article
            <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>
      </div>
    </Link>
  );
}

function PostCard({ post, index }: { post: BlogPostSummary; index: number }) {
  return (
    <ScrollReveal delay={index * 80}>
      <Link href={`/blog/${post.slug}`} className="block group">
        <article className="bg-white rounded-2xl p-6 border border-gray-100 hover:shadow-lg transition-all h-full">
          <div className="flex items-center gap-3 mb-4 text-sm">
            <span className="px-3 py-1 bg-gray-100 rounded-full text-gray-600">
              {post.category}
            </span>
            <span className="text-gray-400 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {post.readTime}
            </span>
          </div>
          <h3 className="text-lg font-semibold mb-2 group-hover:text-[#E63946] transition-colors">
            {post.title}
          </h3>
          <p className="text-gray-600 text-sm mb-4">{post.excerpt}</p>
          <div className="text-gray-400 text-sm">{formatDate(post.publishedAt)}</div>
        </article>
      </Link>
    </ScrollReveal>
  );
}

export default function BlogPage() {
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [page, setPage] = useState(1);

  const { data, isLoading, error } = useBlogPosts({
    category: selectedCategory,
    page,
    limit: 9,
  });

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
    setPage(1);
  };

  return (
    <div className="min-h-screen text-[#111827]">
      <AnimatedPixelBackground />
      <div className="relative z-10 bg-white pt-16">
        <Navigation />
        <main>
          {/* Hero */}
          <section className="py-12 sm:py-16 md:py-20 lg:py-28 bg-white">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
              <ScrollReveal>
                <h1
                  className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-normal tracking-tight mb-4 sm:mb-6"
                  style={{ fontFamily: "'Source Serif 4', Georgia, serif" }}
                >
                  Blog
                </h1>
                <p className="text-base sm:text-lg md:text-xl text-gray-600 max-w-2xl mx-auto">
                  Insights on B2B data, sales strategies, and product updates from the Enrich team.
                </p>
              </ScrollReveal>
            </div>
          </section>

          {/* Categories */}
          <section className="py-4 sm:py-6 bg-white border-b border-gray-100">
            <div className="max-w-6xl mx-auto px-4 sm:px-6">
              <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
                {(data?.categories || ["All"]).map((cat, i) => (
                  <button
                    key={i}
                    onClick={() => handleCategoryChange(cat)}
                    className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                      selectedCategory === cat
                        ? "bg-[#111827] text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* Loading State */}
          {isLoading && (
            <section className="py-20 bg-white">
              <div className="flex justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
              </div>
            </section>
          )}

          {/* Error State */}
          {error && (
            <section className="py-20 bg-white">
              <div className="text-center text-gray-600">
                Failed to load blog posts. Please try again later.
              </div>
            </section>
          )}

          {/* Featured Post */}
          {data?.featured && selectedCategory === "All" && (
            <section className="py-8 sm:py-10 md:py-12 bg-white">
              <div className="max-w-6xl mx-auto px-4 sm:px-6">
                <ScrollReveal>
                  <FeaturedPostCard post={data.featured} />
                </ScrollReveal>
              </div>
            </section>
          )}

          {/* Posts Grid */}
          {data && data.posts.length > 0 && (
            <section className="py-10 sm:py-14 md:py-16 lg:py-20 bg-gray-50">
              <div className="max-w-6xl mx-auto px-4 sm:px-6">
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 md:gap-8">
                  {data.posts
                    .filter((post) => !post.isFeatured || selectedCategory !== "All")
                    .map((post, i) => (
                      <PostCard key={post.id} post={post} index={i} />
                    ))}
                </div>

                {/* Pagination */}
                {data.pagination.totalPages > 1 && (
                  <div className="flex flex-col sm:flex-row justify-center items-center gap-3 sm:gap-4 mt-8 sm:mt-12">
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="w-full sm:w-auto px-6 py-2.5 border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
                    >
                      Previous
                    </button>
                    <span className="text-gray-600 text-sm sm:text-base order-first sm:order-none">
                      Page {page} of {data.pagination.totalPages}
                    </span>
                    <button
                      onClick={() => setPage((p) => Math.min(data.pagination.totalPages, p + 1))}
                      disabled={page === data.pagination.totalPages}
                      className="w-full sm:w-auto px-6 py-2.5 border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
                    >
                      Next
                    </button>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Empty State */}
          {data && data.posts.length === 0 && !data.featured && (
            <section className="py-20 bg-gray-50">
              <div className="text-center text-gray-600">
                No blog posts found{selectedCategory !== "All" ? ` in ${selectedCategory}` : ""}.
              </div>
            </section>
          )}

          {/* Newsletter */}
          <section className="py-12 sm:py-16 bg-white">
            <div className="max-w-xl mx-auto px-4 sm:px-6 text-center">
              <ScrollReveal>
                <h2 className="text-xl sm:text-2xl font-semibold mb-3 sm:mb-4">Subscribe to our newsletter</h2>
                <p className="text-sm sm:text-base text-gray-600 mb-4 sm:mb-6">
                  Get the latest insights delivered to your inbox. No spam, unsubscribe anytime.
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="email"
                    placeholder="you@company.com"
                    className="flex-1 px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#E63946]/30 focus:border-[#E63946] text-sm sm:text-base"
                  />
                  <button className="px-6 py-3 bg-[#111827] text-white rounded-xl hover:bg-black font-medium transition-colors text-sm sm:text-base">
                    Subscribe
                  </button>
                </div>
              </ScrollReveal>
            </div>
          </section>
        </main>
      </div>
      <ExaFooter />
    </div>
  );
}
