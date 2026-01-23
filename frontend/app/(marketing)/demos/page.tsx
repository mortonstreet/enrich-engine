"use client";

import Link from "next/link";
import Navigation from "@/components/landing/Navigation";
import ExaFooter from "@/components/landing/ExaFooter";
import ScrollReveal from "@/components/landing/ScrollReveal";
import { ExternalLink, Github, Code, Mail, Phone, Search, Database, Users, Building2 } from "lucide-react";

const demos = [
  {
    id: "email-finder",
    title: "Email Finder",
    description: "Enter a LinkedIn URL and get a verified business email instantly with confidence scores.",
    icon: Mail,
    badge: "LIVE-DEMO",
    preview: {
      type: "email" as const,
      mockTitle: "Email Lookup",
      mockSubtitle: "Enter a LinkedIn URL for detailed contact info.",
    },
    links: {
      live: "/dashboard/search",
      docs: "/docs#email-finder",
    },
  },
  {
    id: "phone-finder",
    title: "Phone Finder",
    description: "Find direct dial phone numbers for any professional with verification status.",
    icon: Phone,
    badge: "LIVE-DEMO",
    preview: {
      type: "phone" as const,
      mockTitle: "Direct Dial Lookup",
      mockSubtitle: "Get verified phone numbers instantly.",
    },
    links: {
      live: "/dashboard/search",
      docs: "/docs#phone-finder",
    },
  },
  {
    id: "company-enrichment",
    title: "Company Enrichment",
    description: "Get comprehensive company data including firmographics, funding, and tech stack.",
    icon: Building2,
    badge: "LIVE-DEMO",
    preview: {
      type: "company" as const,
      mockTitle: "Company Intel",
      mockSubtitle: "Deep company insights from multiple sources.",
    },
    links: {
      live: "/dashboard/search",
      docs: "/docs#company",
    },
  },
  {
    id: "lead-search",
    title: "Lead Search",
    description: "Search for leads by role, company, location, or any custom criteria.",
    icon: Search,
    badge: "LIVE-DEMO",
    preview: {
      type: "search" as const,
      mockTitle: "Find Leads",
      mockSubtitle: "Search by role, company, or location.",
    },
    links: {
      live: "/dashboard/search",
      docs: "/docs#lead-search",
    },
  },
  {
    id: "bulk-enrichment",
    title: "Bulk Enrichment",
    description: "Upload a CSV and enrich thousands of contacts at once with parallel processing.",
    icon: Database,
    badge: "API",
    preview: {
      type: "bulk" as const,
      mockTitle: "Bulk Processing",
      mockSubtitle: "Enrich entire lists in minutes.",
    },
    links: {
      docs: "/docs#bulk",
      github: "https://github.com",
    },
  },
  {
    id: "crm-sync",
    title: "CRM Integration",
    description: "Real-time enrichment that syncs directly with Salesforce, HubSpot, and more.",
    icon: Users,
    badge: "INTEGRATION",
    preview: {
      type: "crm" as const,
      mockTitle: "CRM Sync",
      mockSubtitle: "Auto-enrich your CRM records.",
    },
    links: {
      docs: "/docs#integrations",
    },
  },
];

function DemoPreview({ demo }: { demo: typeof demos[0] }) {
  const colors = {
    email: { bg: "bg-amber-50", accent: "bg-amber-500", text: "text-amber-700" },
    phone: { bg: "bg-emerald-50", accent: "bg-emerald-500", text: "text-emerald-700" },
    company: { bg: "bg-blue-50", accent: "bg-blue-500", text: "text-blue-700" },
    search: { bg: "bg-violet-50", accent: "bg-violet-500", text: "text-violet-700" },
    bulk: { bg: "bg-slate-100", accent: "bg-slate-500", text: "text-slate-700" },
    crm: { bg: "bg-rose-50", accent: "bg-rose-500", text: "text-rose-700" },
  };

  const color = colors[demo.preview.type];

  return (
    <div className={`${color.bg} rounded-t-xl p-6 h-48 relative overflow-hidden`}>
      {/* Mock UI */}
      <div className="bg-white rounded-lg shadow-sm p-4 max-w-[85%]">
        <div className={`text-sm font-semibold ${color.text} mb-1`}>
          {demo.preview.mockTitle}
        </div>
        <div className="text-xs text-gray-500 mb-3">
          {demo.preview.mockSubtitle}
        </div>
        {/* Mock input */}
        <div className="flex gap-2">
          <div className="flex-1 h-8 bg-gray-50 rounded border border-gray-200 px-2 flex items-center">
            <span className="text-xs text-gray-400">
              {demo.preview.type === "email" && "linkedin.com/in/..."}
              {demo.preview.type === "phone" && "Enter name or URL..."}
              {demo.preview.type === "company" && "Enter company name..."}
              {demo.preview.type === "search" && "VP Sales at startups..."}
              {demo.preview.type === "bulk" && "Upload CSV file..."}
              {demo.preview.type === "crm" && "Connect your CRM..."}
            </span>
          </div>
          <div className={`${color.accent} h-8 px-3 rounded text-white text-xs flex items-center font-medium`}>
            {demo.preview.type === "bulk" ? "Upload" : "Search"}
          </div>
        </div>
      </div>
      {/* Decorative elements */}
      <div className={`absolute -bottom-2 -right-2 w-24 h-24 ${color.accent} opacity-10 rounded-full blur-xl`} />
    </div>
  );
}

function DemoCard({ demo }: { demo: typeof demos[0] }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow duration-300 group">
      <DemoPreview demo={demo} />

      <div className="p-5">
        <div className="flex items-start justify-between mb-2">
          <h3 className="text-lg font-semibold text-gray-900 group-hover:text-[#E63946] transition-colors">
            {demo.title}
          </h3>
          <div className="flex items-center gap-1.5">
            {demo.links.live && (
              <Link
                href={demo.links.live}
                className="p-1.5 rounded-full hover:bg-gray-100 transition-colors"
                title="Live demo"
              >
                <ExternalLink className="w-4 h-4 text-gray-500" />
              </Link>
            )}
            {demo.links.github && (
              <Link
                href={demo.links.github}
                className="p-1.5 rounded-full hover:bg-gray-100 transition-colors"
                title="View source"
              >
                <Github className="w-4 h-4 text-gray-500" />
              </Link>
            )}
            {demo.links.docs && (
              <Link
                href={demo.links.docs}
                className="p-1.5 rounded-full hover:bg-gray-100 transition-colors"
                title="Documentation"
              >
                <Code className="w-4 h-4 text-gray-500" />
              </Link>
            )}
          </div>
        </div>

        <p className="text-sm text-gray-600 mb-4 line-clamp-2">
          {demo.description}
        </p>

        <div className="flex items-center gap-2">
          <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
            demo.badge === "LIVE-DEMO"
              ? "bg-gray-900 text-white"
              : demo.badge === "API"
              ? "bg-blue-100 text-blue-700"
              : "bg-purple-100 text-purple-700"
          }`}>
            {demo.badge}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function DemosPage() {
  return (
    <div className="min-h-screen text-[#111827]">
      <div className="relative z-10 bg-white">
        <Navigation />
        <main>
          {/* Hero - Dark with dot pattern */}
          <section className="relative bg-[#111827] text-white overflow-hidden">
            {/* Dot pattern */}
            <div className="absolute inset-0">
              <div
                className="w-full h-full"
                style={{
                  backgroundImage: `radial-gradient(circle, rgba(255,255,255,0.08) 1px, transparent 1px)`,
                  backgroundSize: '32px 32px',
                }}
              />
              {/* Diagonal accent lines */}
              <div className="absolute inset-0 opacity-[0.03]">
                <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
                  <defs>
                    <pattern id="diagonalLines" patternUnits="userSpaceOnUse" width="60" height="60">
                      <line x1="0" y1="60" x2="60" y2="0" stroke="white" strokeWidth="1" />
                    </pattern>
                  </defs>
                  <rect width="100%" height="100%" fill="url(#diagonalLines)" />
                </svg>
              </div>
              {/* Subtle gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-[#E63946]/5" />
            </div>

            <div className="relative max-w-6xl mx-auto px-6 py-32 md:py-40">
              <ScrollReveal>
                <div className="text-sm font-medium tracking-widest text-gray-400 mb-6">
                  DEMOS
                </div>
                <h1
                  className="text-5xl md:text-6xl lg:text-7xl font-light tracking-tight mb-6"
                  style={{ fontFamily: "'Source Serif 4', Georgia, serif" }}
                >
                  Built with Enrich
                </h1>
                <p className="text-xl text-gray-400 max-w-xl">
                  Explore demos that showcase how to use Enrich, the most accurate contact enrichment API.
                </p>
              </ScrollReveal>
            </div>
          </section>

          {/* Demos Grid */}
          <section className="py-16 md:py-24 bg-white">
            <div className="max-w-6xl mx-auto px-6">
              <ScrollReveal>
                <h2
                  className="text-3xl md:text-4xl font-normal tracking-tight mb-12"
                  style={{ fontFamily: "'Source Serif 4', Georgia, serif" }}
                >
                  Demos and Tutorials
                </h2>
              </ScrollReveal>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {demos.map((demo, index) => (
                  <ScrollReveal key={demo.id} delay={index * 100}>
                    <DemoCard demo={demo} />
                  </ScrollReveal>
                ))}
              </div>
            </div>
          </section>

          {/* Code Example */}
          <section className="py-16 md:py-20 bg-gray-50 border-y border-gray-100">
            <div className="max-w-4xl mx-auto px-6">
              <ScrollReveal>
                <div className="text-center mb-10">
                  <h2
                    className="text-3xl font-normal tracking-tight mb-4"
                    style={{ fontFamily: "'Source Serif 4', Georgia, serif" }}
                  >
                    Simple API Integration
                  </h2>
                  <p className="text-gray-600">
                    Get started in minutes with our straightforward SDK.
                  </p>
                </div>
                <div className="bg-[#1a1a2e] rounded-2xl p-6 overflow-x-auto shadow-2xl">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-3 h-3 rounded-full bg-red-500" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500" />
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                  </div>
                  <pre className="text-sm text-gray-300 font-mono">
{`import Enrich from 'enrich-sdk';

const enrich = new Enrich({ apiKey: process.env.ENRICH_API_KEY });

// Find email from LinkedIn URL
const contact = await enrich.findEmail({
  linkedinUrl: 'linkedin.com/in/johndoe'
});

console.log(contact.email);      // john.doe@techcorp.com
console.log(contact.confidence); // 95
console.log(contact.verified);   // true`}
                  </pre>
                </div>
              </ScrollReveal>
            </div>
          </section>

          {/* CTA */}
          <section className="py-20 md:py-28 bg-white">
            <div className="max-w-4xl mx-auto px-6 text-center">
              <ScrollReveal>
                <h2
                  className="text-3xl md:text-4xl font-normal tracking-tight mb-4"
                  style={{ fontFamily: "'Source Serif 4', Georgia, serif" }}
                >
                  Ready to start building?
                </h2>
                <p className="text-gray-600 mb-8 text-lg">
                  Get 100 free credits when you sign up. No credit card required.
                </p>
                <div className="flex flex-col sm:flex-row justify-center gap-4">
                  <Link
                    href="/signup"
                    className="inline-flex items-center justify-center bg-[#111827] text-white hover:bg-black h-12 px-8 text-base font-medium rounded-lg transition-colors"
                  >
                    Start free trial
                  </Link>
                  <Link
                    href="/docs"
                    className="inline-flex items-center justify-center border border-gray-200 text-gray-700 hover:bg-gray-50 h-12 px-8 text-base font-medium rounded-lg transition-colors"
                  >
                    Read the docs
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
