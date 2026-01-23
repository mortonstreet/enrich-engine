"use client";

import Link from "next/link";
import Navigation from "@/components/landing/Navigation";
import ExaFooter from "@/components/landing/ExaFooter";
import AnimatedPixelBackground from "@/components/landing/AnimatedPixelBackground";
import ScrollReveal from "@/components/landing/ScrollReveal";
import { Book, Code, Zap, Database, Key, ArrowRight, Search, Users, FileText } from "lucide-react";

const quickLinks = [
  {
    title: "Getting Started",
    description: "Set up your account and make your first API call",
    icon: Zap,
    href: "/docs/getting-started",
    color: "bg-emerald-500",
  },
  {
    title: "API Reference",
    description: "Complete documentation for all endpoints",
    icon: Code,
    href: "/docs/api-reference",
    color: "bg-blue-500",
  },
  {
    title: "External API",
    description: "API access for integrations like GTM Dialer",
    icon: Key,
    href: "/docs/external-api",
    color: "bg-violet-500",
  },
  {
    title: "Guides",
    description: "In-depth tutorials and best practices",
    icon: Book,
    href: "/docs/guides",
    color: "bg-amber-500",
  },
];

const apiEndpoints = [
  {
    method: "POST",
    endpoint: "/api/search/people",
    description: "Search for people by role, company, or keywords",
    href: "/docs/api-reference/search",
  },
  {
    method: "POST",
    endpoint: "/api/scrape/jobs",
    description: "Create a bulk scrape job from CSV",
    href: "/docs/api-reference/scrape",
  },
  {
    method: "POST",
    endpoint: "/api/enrichment/enrich",
    description: "Enrich a single LinkedIn profile",
    href: "/docs/api-reference/enrich",
  },
  {
    method: "GET",
    endpoint: "/api/lists",
    description: "List all lead lists for your organization",
    href: "/docs/api-reference/lists",
  },
  {
    method: "GET",
    endpoint: "/api/external/lists",
    description: "External API: List accessible lists",
    href: "/docs/external-api",
  },
];

const guides = [
  {
    title: "LinkedIn Scraping",
    description: "Bulk scrape profiles from CSV uploads",
    icon: Database,
    href: "/docs/guides/scraping-linkedin",
  },
  {
    title: "SERP Queries",
    description: "How search queries are constructed",
    icon: Search,
    href: "/docs/guides/serp-queries",
  },
  {
    title: "Bulk Enrichment",
    description: "Enrich large lists efficiently",
    icon: Users,
    href: "/docs/guides/bulk-enrichment",
  },
];

export default function DocsPage() {
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
                  Documentation
                </h1>
                <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-8">
                  Everything you need to integrate Enrich Engine into your applications.
                </p>
                {/* Quick Links */}
                <div className="flex flex-wrap justify-center gap-3">
                  <Link
                    href="/docs/getting-started"
                    className="inline-flex items-center gap-2 bg-[#E63946] text-white px-4 py-2 rounded-lg font-medium hover:bg-[#d32f3d] transition-colors"
                  >
                    Get Started
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                  <Link
                    href="/docs/api-reference"
                    className="inline-flex items-center gap-2 border border-gray-300 text-gray-700 px-4 py-2 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                  >
                    API Reference
                  </Link>
                </div>
              </ScrollReveal>
            </div>
          </section>

          {/* Quick Links */}
          <section className="py-12 bg-gray-50">
            <div className="max-w-6xl mx-auto px-6">
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                {quickLinks.map((link, i) => (
                  <ScrollReveal key={i} delay={i * 80}>
                    <Link
                      href={link.href}
                      className="block bg-white rounded-2xl p-6 border border-gray-100 hover:shadow-lg hover:border-[#E63946]/30 transition-all group h-full"
                    >
                      <div className={`w-12 h-12 ${link.color} rounded-xl flex items-center justify-center text-white mb-4`}>
                        <link.icon className="w-6 h-6" />
                      </div>
                      <h3 className="font-semibold text-lg mb-1 group-hover:text-[#E63946] transition-colors">
                        {link.title}
                      </h3>
                      <p className="text-gray-600 text-sm">{link.description}</p>
                    </Link>
                  </ScrollReveal>
                ))}
              </div>
            </div>
          </section>

          {/* API Reference */}
          <section className="py-16 md:py-20 bg-white">
            <div className="max-w-4xl mx-auto px-6">
              <ScrollReveal>
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-2xl font-semibold flex items-center gap-3">
                    <Code className="w-6 h-6 text-[#E63946]" />
                    API Reference
                  </h2>
                  <Link href="/docs/api-reference" className="text-[#E63946] text-sm font-medium hover:underline">
                    View all endpoints →
                  </Link>
                </div>
                <div className="space-y-3">
                  {apiEndpoints.map((endpoint, i) => (
                    <Link
                      key={i}
                      href={endpoint.href}
                      className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl border border-gray-100 hover:border-[#E63946]/30 hover:shadow-md transition-all group"
                    >
                      <span className={`px-2 py-1 rounded text-xs font-mono font-bold ${
                        endpoint.method === "GET" ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700"
                      }`}>
                        {endpoint.method}
                      </span>
                      <code className="font-mono text-sm text-gray-800">{endpoint.endpoint}</code>
                      <span className="text-gray-500 text-sm ml-auto hidden sm:block">{endpoint.description}</span>
                      <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-[#E63946] transition-colors" />
                    </Link>
                  ))}
                </div>
              </ScrollReveal>
            </div>
          </section>

          {/* Guides */}
          <section className="py-16 md:py-20 bg-gray-50">
            <div className="max-w-4xl mx-auto px-6">
              <ScrollReveal>
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-2xl font-semibold flex items-center gap-3">
                    <FileText className="w-6 h-6 text-[#E63946]" />
                    Guides
                  </h2>
                  <Link href="/docs/guides" className="text-[#E63946] text-sm font-medium hover:underline">
                    View all guides →
                  </Link>
                </div>
                <div className="grid md:grid-cols-3 gap-4">
                  {guides.map((guide, i) => (
                    <Link
                      key={i}
                      href={guide.href}
                      className="p-5 rounded-xl border border-gray-100 bg-white hover:border-[#E63946]/30 hover:shadow-md transition-all group"
                    >
                      <guide.icon className="w-8 h-8 text-gray-400 mb-3 group-hover:text-[#E63946] transition-colors" />
                      <h3 className="font-semibold mb-1">{guide.title}</h3>
                      <p className="text-gray-600 text-sm">{guide.description}</p>
                    </Link>
                  ))}
                </div>
              </ScrollReveal>
            </div>
          </section>

          {/* Authentication */}
          <section className="py-16 md:py-20 bg-white">
            <div className="max-w-4xl mx-auto px-6">
              <ScrollReveal>
                <h2 className="text-2xl font-semibold mb-8 flex items-center gap-3">
                  <Key className="w-6 h-6 text-[#E63946]" />
                  Authentication
                </h2>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="p-6 rounded-xl border border-gray-100 bg-gray-50">
                    <h3 className="font-semibold mb-2">Session-Based Auth</h3>
                    <p className="text-gray-600 text-sm mb-4">
                      For dashboard and web app access. Cookies are automatically managed
                      when you log in.
                    </p>
                    <code className="text-sm bg-gray-200 px-2 py-1 rounded font-mono">
                      credentials: &apos;include&apos;
                    </code>
                  </div>
                  <div className="p-6 rounded-xl border border-gray-100 bg-gray-50">
                    <h3 className="font-semibold mb-2">API Key Auth</h3>
                    <p className="text-gray-600 text-sm mb-4">
                      For external integrations. Create keys in Settings &gt; API Keys
                      with specific scopes.
                    </p>
                    <code className="text-sm bg-gray-200 px-2 py-1 rounded font-mono">
                      X-API-Key: ee_live_xxx
                    </code>
                  </div>
                </div>
                <div className="mt-4 text-center">
                  <Link
                    href="/docs/api-reference/authentication"
                    className="text-[#E63946] text-sm font-medium hover:underline"
                  >
                    Learn more about authentication →
                  </Link>
                </div>
              </ScrollReveal>
            </div>
          </section>

          {/* Help */}
          <section className="py-16 bg-white">
            <div className="max-w-4xl mx-auto px-6 text-center">
              <h2 className="text-2xl md:text-3xl font-semibold text-gray-900 mb-4">
                Need help?
              </h2>
              <p className="text-gray-600 mb-6">
                Our support team is here to help you get started.
              </p>
              <div className="flex flex-col sm:flex-row justify-center gap-4">
                <Link href="/contact">
                  <button className="bg-[#E63946] text-white hover:bg-[#d32f3d] rounded-xl px-8 py-3 font-medium transition-colors">
                    Contact support
                  </button>
                </Link>
                <Link
                  href="/docs/api-reference/errors"
                  className="border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-xl px-8 py-3 font-medium transition-colors"
                >
                  Troubleshooting
                </Link>
              </div>
            </div>
          </section>
        </main>
      </div>
      <ExaFooter />
    </div>
  );
}
