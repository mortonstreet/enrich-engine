"use client";

import Link from "next/link";
import Navigation from "@/components/landing/Navigation";
import ExaFooter from "@/components/landing/ExaFooter";
import AnimatedPixelBackground from "@/components/landing/AnimatedPixelBackground";
import ScrollReveal from "@/components/landing/ScrollReveal";
import { ArrowRight, Clock, Github, ExternalLink } from "lucide-react";

const posts = [
  {
    title: "How We Built a 95% Accurate Email Verification System",
    excerpt: "A deep dive into our multi-layered email verification approach combining SMTP, DNS, and ML.",
    author: "Sarah Mitchell",
    role: "CTO",
    date: "Jan 18, 2025",
    readTime: "12 min read",
    tags: ["Engineering", "Machine Learning"],
  },
  {
    title: "Scaling Our Data Pipeline to 1 Billion Records",
    excerpt: "Lessons learned from scaling our enrichment infrastructure on Kubernetes and PostgreSQL.",
    author: "Marcus Rodriguez",
    role: "Head of Engineering",
    date: "Jan 10, 2025",
    readTime: "15 min read",
    tags: ["Infrastructure", "Scaling"],
  },
  {
    title: "Building a Developer-First API Experience",
    excerpt: "How we designed our API with developer experience as the top priority.",
    author: "David Chen",
    role: "Senior Engineer",
    date: "Dec 28, 2024",
    readTime: "8 min read",
    tags: ["API Design", "DX"],
  },
  {
    title: "Real-time Webhooks at Scale",
    excerpt: "Implementing reliable webhook delivery with exactly-once semantics.",
    author: "Emily Park",
    role: "Backend Engineer",
    date: "Dec 15, 2024",
    readTime: "10 min read",
    tags: ["Webhooks", "Architecture"],
  },
];

const techStack = [
  { name: "TypeScript", category: "Language" },
  { name: "Node.js", category: "Runtime" },
  { name: "PostgreSQL", category: "Database" },
  { name: "Redis", category: "Cache" },
  { name: "Kubernetes", category: "Infrastructure" },
  { name: "Vercel", category: "Frontend" },
];

const openSource = [
  {
    name: "email-validator",
    description: "Fast, comprehensive email validation library",
    stars: "1.2k",
    language: "TypeScript",
  },
  {
    name: "linkedin-parser",
    description: "Parse LinkedIn profile URLs and data",
    stars: "890",
    language: "TypeScript",
  },
  {
    name: "rate-limiter",
    description: "Distributed rate limiting with Redis",
    stars: "650",
    language: "Go",
  },
];

export default function EngineeringPage() {
  return (
    <div className="min-h-screen text-[#111827]">
      <AnimatedPixelBackground />
      <div className="relative z-10 bg-white">
        <Navigation />
        <main>
          {/* Hero */}
          <section className="py-20 md:py-28 bg-white">
            <div className="max-w-4xl mx-auto px-6 text-center">
              <ScrollReveal>
                <h1
                  className="text-4xl md:text-5xl lg:text-6xl font-normal tracking-tight mb-6"
                  style={{ fontFamily: "'Source Serif 4', Georgia, serif" }}
                >
                  Engineering Blog
                </h1>
                <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                  Technical deep-dives, architecture decisions, and lessons learned
                  from building a data enrichment platform at scale.
                </p>
              </ScrollReveal>
            </div>
          </section>

          {/* Tech Stack */}
          <section className="py-12 bg-gray-50 border-y border-gray-100">
            <div className="max-w-6xl mx-auto px-6">
              <div className="flex items-center justify-center gap-8 flex-wrap">
                <span className="text-sm text-gray-400 font-medium">Our Stack:</span>
                {techStack.map((tech, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="font-medium text-gray-800">{tech.name}</span>
                    <span className="text-xs text-gray-400">({tech.category})</span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Blog Posts */}
          <section className="py-16 md:py-20 bg-white">
            <div className="max-w-4xl mx-auto px-6">
              <div className="space-y-8">
                {posts.map((post, i) => (
                  <ScrollReveal key={i} delay={i * 80}>
                    <Link href="#" className="block group">
                      <article className="p-6 rounded-2xl border border-gray-100 hover:border-[#E63946]/30 hover:shadow-lg transition-all">
                        <div className="flex items-center gap-2 mb-3">
                          {post.tags.map((tag, j) => (
                            <span
                              key={j}
                              className="px-3 py-1 bg-gray-100 rounded-full text-xs font-medium text-gray-600"
                            >
                              {tag}
                            </span>
                          ))}
                          <span className="text-gray-400 text-sm flex items-center gap-1 ml-auto">
                            <Clock className="w-3 h-3" />
                            {post.readTime}
                          </span>
                        </div>
                        <h2 className="text-xl font-semibold mb-2 group-hover:text-[#E63946] transition-colors">
                          {post.title}
                        </h2>
                        <p className="text-gray-600 mb-4">{post.excerpt}</p>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-[#E63946] rounded-full flex items-center justify-center text-white text-sm font-bold">
                              {post.author.charAt(0)}
                            </div>
                            <div>
                              <div className="text-sm font-medium">{post.author}</div>
                              <div className="text-xs text-gray-500">{post.role}</div>
                            </div>
                          </div>
                          <span className="text-sm text-gray-400">{post.date}</span>
                        </div>
                      </article>
                    </Link>
                  </ScrollReveal>
                ))}
              </div>
            </div>
          </section>

          {/* Open Source */}
          <section className="py-16 md:py-20 bg-gray-50">
            <div className="max-w-6xl mx-auto px-6">
              <ScrollReveal>
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h2 className="text-2xl font-semibold mb-2">Open Source</h2>
                    <p className="text-gray-600">
                      Libraries and tools we&apos;ve open-sourced from our work.
                    </p>
                  </div>
                  <a
                    href="https://github.com"
                    className="flex items-center gap-2 text-gray-600 hover:text-[#E63946] transition-colors"
                  >
                    <Github className="w-5 h-5" />
                    View on GitHub
                  </a>
                </div>
              </ScrollReveal>
              <div className="grid md:grid-cols-3 gap-6">
                {openSource.map((repo, i) => (
                  <ScrollReveal key={i} delay={i * 80}>
                    <a href="#" className="block group">
                      <div className="bg-white rounded-2xl p-6 border border-gray-100 hover:shadow-lg transition-all h-full">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <Github className="w-5 h-5 text-gray-600" />
                            <span className="font-semibold group-hover:text-[#E63946] transition-colors">
                              {repo.name}
                            </span>
                          </div>
                          <ExternalLink className="w-4 h-4 text-gray-400" />
                        </div>
                        <p className="text-gray-600 text-sm mb-4">{repo.description}</p>
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <span className="flex items-center gap-1">
                            <span className="w-3 h-3 rounded-full bg-blue-500" />
                            {repo.language}
                          </span>
                          <span>⭐ {repo.stars}</span>
                        </div>
                      </div>
                    </a>
                  </ScrollReveal>
                ))}
              </div>
            </div>
          </section>

          {/* Careers CTA */}
          <section className="py-16 bg-white">
            <div className="max-w-4xl mx-auto px-6 text-center">
              <h2 className="text-2xl md:text-3xl font-semibold text-[#111827] mb-4">
                Want to work on interesting problems?
              </h2>
              <p className="text-gray-600 mb-8">
                We&apos;re hiring engineers who love building data infrastructure at scale.
              </p>
              <Link href="/careers">
                <button className="inline-flex items-center gap-2 bg-[#E63946] hover:bg-[#C5303C] text-white rounded-xl px-8 py-3 font-medium transition-colors">
                  View open positions
                  <ArrowRight className="w-4 h-4" />
                </button>
              </Link>
            </div>
          </section>
        </main>
      </div>
      <ExaFooter />
    </div>
  );
}
