"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import DarkNavigation from "@/components/landing/DarkNavigation";
import DarkFooter from "@/components/landing/DarkFooter";
import DarkScrollReveal from "@/components/landing/DarkScrollReveal";
import { OmniDialLogoStatic } from "@/components/landing/OmniDialLogo";
import { blogPosts } from "./data";

const categories = ["All", "Sales Tactics", "Tips & Tricks", "Productivity", "Sales Management", "Case Study", "Sales Operations"];

export default function BlogPage() {
  const featuredPosts = blogPosts.filter((post) => post.featured);
  const recentPosts = blogPosts.filter((post) => !post.featured);

  return (
    <div className="min-h-screen text-white bg-[#0a0a0a]">
      <DarkNavigation />

      <div className="relative z-10 bg-[#0a0a0a] pt-16">
        <main>
          {/* Hero */}
          <section className="py-16 sm:py-20 md:py-24">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
              <DarkScrollReveal>
                <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl tracking-tight mb-4 heading-display">
                  Sales Dialer Insights
                </h1>
                <p className="text-white/50 text-lg max-w-2xl mx-auto">
                  Outbound sales strategies, cold calling techniques, and sales technology insights for SDRs and sales leaders.
                </p>
              </DarkScrollReveal>
            </div>
          </section>

          {/* Categories */}
          <section className="pb-8">
            <div className="max-w-6xl mx-auto px-4 sm:px-6">
              <div className="flex flex-wrap gap-2 justify-center">
                {categories.map((category) => (
                  <button
                    key={category}
                    className={`px-4 py-2 text-sm rounded-full transition-colors ${
                      category === "All"
                        ? "bg-white text-black"
                        : "bg-white/5 text-white/60 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* Featured Posts */}
          <section className="py-8 sm:py-12">
            <div className="max-w-6xl mx-auto px-4 sm:px-6">
              <DarkScrollReveal>
                <h2 className="text-xl font-semibold mb-6">Featured</h2>
              </DarkScrollReveal>

              <div className="grid md:grid-cols-2 gap-6">
                {featuredPosts.map((post, i) => (
                  <DarkScrollReveal key={post.slug} delay={i * 100}>
                    <Link href={`/blog/${post.slug}`}>
                      <article className="group p-6 bg-[#111111] rounded-2xl border border-white/5 hover:border-white/10 transition-all h-full">
                        <div className="flex items-center gap-2 mb-4">
                          <span className="px-2 py-1 bg-white/10 text-white/70 text-xs rounded-full">
                            {post.category}
                          </span>
                          <span className="text-white/40 text-xs">{post.readTime}</span>
                        </div>
                        <h3 className="text-xl font-semibold text-white mb-3 group-hover:text-blue-400 transition-colors">
                          {post.title}
                        </h3>
                        <p className="text-white/50 text-sm leading-relaxed mb-4">
                          {post.excerpt}
                        </p>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <OmniDialLogoStatic size={16} color="#fafafa" />
                            <span className="text-white/40 text-xs">OmniDial Team</span>
                          </div>
                          <span className="text-white/40 text-xs">{post.date}</span>
                        </div>
                      </article>
                    </Link>
                  </DarkScrollReveal>
                ))}
              </div>
            </div>
          </section>

          {/* All Posts */}
          <section className="py-8 sm:py-12 border-t border-white/5">
            <div className="max-w-6xl mx-auto px-4 sm:px-6">
              <DarkScrollReveal>
                <h2 className="text-xl font-semibold mb-6">All Articles</h2>
              </DarkScrollReveal>

              <div className="space-y-4">
                {recentPosts.map((post, i) => (
                  <DarkScrollReveal key={post.slug} delay={i * 50}>
                    <Link href={`/blog/${post.slug}`}>
                      <article className="group flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:p-6 bg-[#111111] rounded-xl border border-white/5 hover:border-white/10 transition-all">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="px-2 py-0.5 bg-white/10 text-white/70 text-xs rounded-full">
                              {post.category}
                            </span>
                          </div>
                          <h3 className="text-lg font-semibold text-white group-hover:text-blue-400 transition-colors">
                            {post.title}
                          </h3>
                          <p className="text-white/50 text-sm mt-1 line-clamp-1 hidden sm:block">
                            {post.excerpt}
                          </p>
                        </div>
                        <div className="flex items-center gap-4 sm:gap-6 text-xs text-white/40">
                          <div className="flex items-center gap-2">
                            <OmniDialLogoStatic size={14} color="#a3a3a3" />
                            <span>OmniDial Team</span>
                          </div>
                          <span>{post.readTime}</span>
                          <span className="hidden sm:inline">{post.date}</span>
                          <ArrowRight className="w-4 h-4 text-white/20 group-hover:text-white/60 transition-colors" />
                        </div>
                      </article>
                    </Link>
                  </DarkScrollReveal>
                ))}
              </div>
            </div>
          </section>

          {/* Newsletter CTA */}
          <section className="py-16 sm:py-20 border-t border-white/5">
            <div className="max-w-2xl mx-auto px-4 sm:px-6 text-center">
              <DarkScrollReveal>
                <h2 className="text-2xl sm:text-3xl font-semibold mb-4">
                  Sales dialer tips delivered weekly
                </h2>
                <p className="text-white/50 mb-6">
                  Practical insights on cold calling, power dialing, outbound sales strategy, and CRM best practices.
                </p>
                <form className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
                  <input
                    type="email"
                    placeholder="you@company.com"
                    className="flex-1 px-4 py-3 bg-[#111111] border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-white/20"
                  />
                  <button
                    type="submit"
                    className="px-6 py-3 bg-white text-black font-medium rounded-xl hover:bg-white/90 transition-colors"
                  >
                    Subscribe
                  </button>
                </form>
              </DarkScrollReveal>
            </div>
          </section>
        </main>
      </div>

      <DarkFooter />
    </div>
  );
}
