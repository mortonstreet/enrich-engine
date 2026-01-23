"use client";

import { use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Navigation from "@/components/landing/Navigation";
import ExaFooter from "@/components/landing/ExaFooter";
import AnimatedPixelBackground from "@/components/landing/AnimatedPixelBackground";
import ScrollReveal from "@/components/landing/ScrollReveal";
import { ArrowLeft, Clock, Calendar, Loader2 } from "lucide-react";
import { EnrichEngineLogoStatic } from "@/components/landing/EnrichEngineLogo";
import { useBlogPost } from "@/hooks/api/useBlog";

function formatDate(date: Date | string | null): string {
  if (!date) return "";
  const d = new Date(date);
  return d.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export default function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const router = useRouter();
  const { data: post, isLoading, error } = useBlogPost(slug);

  if (isLoading) {
    return (
      <div className="min-h-screen text-[#111827]">
        <AnimatedPixelBackground />
        <div className="relative z-10 bg-white pt-16">
          <Navigation />
          <main className="py-20 sm:py-24 md:py-32">
            <div className="flex justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            </div>
          </main>
        </div>
        <ExaFooter />
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="min-h-screen text-[#111827]">
        <AnimatedPixelBackground />
        <div className="relative z-10 bg-white pt-16">
          <Navigation />
          <main className="py-20 sm:py-24 md:py-32">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
              <h1 className="text-xl sm:text-2xl font-semibold mb-4">Post not found</h1>
              <p className="text-sm sm:text-base text-gray-600 mb-6 sm:mb-8">
                The blog post you&apos;re looking for doesn&apos;t exist or has been removed.
              </p>
              <button
                onClick={() => router.push("/blog")}
                className="inline-flex items-center gap-2 px-5 sm:px-6 py-2.5 sm:py-3 bg-[#111827] text-white rounded-xl hover:bg-black font-medium transition-colors text-sm sm:text-base"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Blog
              </button>
            </div>
          </main>
        </div>
        <ExaFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen text-[#111827]">
      <AnimatedPixelBackground />
      <div className="relative z-10 bg-white pt-16">
        <Navigation />
        <main>
          {/* Header */}
          <section className="py-10 sm:py-14 md:py-20 lg:py-24 bg-white">
            <div className="max-w-4xl mx-auto px-4 sm:px-6">
              <ScrollReveal>
                <Link
                  href="/blog"
                  className="inline-flex items-center gap-2 text-gray-600 hover:text-[#E63946] transition-colors mb-8"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to Blog
                </Link>

                <div className="flex flex-wrap items-center gap-4 mb-6 text-sm">
                  <span className="px-3 py-1 bg-[#E63946]/10 text-[#E63946] rounded-full font-medium">
                    {post.category}
                  </span>
                  <span className="flex items-center gap-1 text-gray-500">
                    <Clock className="w-4 h-4" />
                    {post.readTime}
                  </span>
                  <span className="flex items-center gap-1 text-gray-500">
                    <Calendar className="w-4 h-4" />
                    {formatDate(post.publishedAt)}
                  </span>
                </div>

                <h1
                  className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-semibold tracking-tight mb-4 sm:mb-6"
                  style={{ fontFamily: "'Source Serif 4', Georgia, serif" }}
                >
                  {post.title}
                </h1>

                <p className="text-base sm:text-lg md:text-xl text-gray-600 mb-6 sm:mb-8">{post.excerpt}</p>

                <div className="flex items-center gap-3 text-sm text-gray-600">
                  <EnrichEngineLogoStatic size={40} />
                  <div>
                    <div className="font-medium text-gray-900">{post.author}</div>
                  </div>
                </div>
              </ScrollReveal>
            </div>
          </section>

          {/* Content */}
          <section className="pb-12 sm:pb-16 md:pb-20 bg-white">
            <div className="max-w-4xl mx-auto px-4 sm:px-6">
              <ScrollReveal delay={100}>
                <article
                  className="prose prose-lg prose-gray max-w-none
                    prose-headings:font-semibold prose-headings:tracking-tight
                    prose-h2:text-2xl prose-h2:mt-12 prose-h2:mb-4
                    prose-h3:text-xl prose-h3:mt-8 prose-h3:mb-3
                    prose-p:text-gray-600 prose-p:leading-relaxed
                    prose-a:text-[#E63946] prose-a:no-underline hover:prose-a:underline
                    prose-strong:text-gray-900
                    prose-ul:text-gray-600 prose-ol:text-gray-600
                    prose-li:my-1
                    prose-blockquote:border-l-[#E63946] prose-blockquote:bg-gray-50 prose-blockquote:py-4 prose-blockquote:px-6 prose-blockquote:rounded-r-xl prose-blockquote:not-italic
                    prose-code:bg-gray-100 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:font-normal prose-code:before:content-none prose-code:after:content-none
                    prose-pre:bg-gray-900 prose-pre:text-gray-100"
                  dangerouslySetInnerHTML={{ __html: post.content }}
                />
              </ScrollReveal>
            </div>
          </section>

          {/* CTA */}
          <section className="py-10 sm:py-12 md:py-16 bg-gray-50">
            <div className="max-w-xl mx-auto px-4 sm:px-6 text-center">
              <ScrollReveal>
                <h2 className="text-xl sm:text-2xl font-semibold mb-3 sm:mb-4">Ready to enrich your data?</h2>
                <p className="text-sm sm:text-base text-gray-600 mb-4 sm:mb-6">
                  Join thousands of companies using Enrich Engine to power their sales pipelines.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
                  <Link
                    href="/signup"
                    className="px-6 py-3 bg-[#E63946] text-white rounded-xl hover:bg-[#d32f3d] font-medium transition-colors text-sm sm:text-base"
                  >
                    Start Free Trial
                  </Link>
                  <Link
                    href="/blog"
                    className="px-6 py-3 border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50 font-medium transition-colors text-sm sm:text-base"
                  >
                    Read More Articles
                  </Link>
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
