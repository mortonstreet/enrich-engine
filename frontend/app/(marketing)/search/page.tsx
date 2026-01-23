"use client";

import Link from "next/link";
import { ArrowRight, CheckCircle2, Search, Filter, Sparkles, Users, Building2, MapPin, Briefcase, Target, Zap } from "lucide-react";
import { Button } from "@/components/ui/Button";
import Navigation from "@/components/landing/Navigation";
import ExaFooter from "@/components/landing/ExaFooter";
import ScrollReveal from "@/components/landing/ScrollReveal";

const searchFilters = [
  { icon: Briefcase, label: "Job Title", example: "VP of Sales, SDR, Account Executive" },
  { icon: Building2, label: "Company", example: "Series B startups, Fortune 500" },
  { icon: MapPin, label: "Location", example: "San Francisco, New York, Remote" },
  { icon: Users, label: "Company Size", example: "50-200 employees, 1000+" },
  { icon: Target, label: "Industry", example: "SaaS, Fintech, Healthcare" },
  { icon: Sparkles, label: "Seniority", example: "C-Level, VP, Director, Manager" },
];

const features = [
  {
    icon: Search,
    title: "Natural Language Search",
    description: "Search like you think. Just describe who you're looking for in plain English.",
  },
  {
    icon: Filter,
    title: "Advanced Filters",
    description: "Narrow down results by title, company, location, industry, and more.",
  },
  {
    icon: Zap,
    title: "Instant Results",
    description: "Get results in milliseconds from our pre-indexed database of 500M+ profiles.",
  },
  {
    icon: Target,
    title: "ICP Matching",
    description: "Define your ideal customer profile and find prospects that match perfectly.",
  },
];

const useCases = [
  {
    title: "Sales Prospecting",
    description: "Find decision-makers at target accounts and get their verified contact info instantly.",
    query: "VP of Sales at Series B SaaS companies in the Bay Area",
    results: 2847,
  },
  {
    title: "Recruiting",
    description: "Source candidates by role, skills, company, and location with accurate contact data.",
    query: "Senior Software Engineers at FAANG who worked at startups",
    results: 1523,
  },
  {
    title: "Market Research",
    description: "Build lists of professionals in specific industries for surveys and outreach.",
    query: "Product Managers at fintech companies with 100+ employees",
    results: 3291,
  },
];

const sampleResults = [
  {
    name: "Sarah Chen",
    title: "VP of Sales",
    company: "Scale AI",
    location: "San Francisco, CA",
    avatar: "SC",
  },
  {
    name: "Mike Rodriguez",
    title: "Head of Revenue",
    company: "Notion",
    location: "New York, NY",
    avatar: "MR",
  },
  {
    name: "Jennifer Kim",
    title: "VP, Sales Operations",
    company: "Figma",
    location: "San Francisco, CA",
    avatar: "JK",
  },
  {
    name: "David Park",
    title: "Sales Director",
    company: "Linear",
    location: "Remote",
    avatar: "DP",
  },
];

export default function SearchPage() {
  return (
    <div className="min-h-screen text-[#111827]">
      <div className="relative z-10 bg-white">
        <Navigation />

        <main>
          {/* Hero Section */}
          <section className="pt-20 pb-16 md:pt-28 md:pb-24 bg-white">
            <div className="max-w-6xl mx-auto px-6">
              <ScrollReveal>
                <div className="grid lg:grid-cols-2 gap-12 items-center">
                  <div>
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#E63946]/10 text-[#E63946] rounded-full text-sm font-medium mb-6">
                      <Search className="w-4 h-4" />
                      Lead Search
                    </div>
                    <h1
                      className="text-4xl md:text-5xl lg:text-6xl font-normal tracking-tight mb-6"
                      style={{ fontFamily: "'Source Serif 4', Georgia, serif" }}
                    >
                      Find your ideal prospects instantly
                    </h1>
                    <p className="text-xl text-gray-600 mb-8 leading-relaxed">
                      Search 500M+ professional profiles by role, company, location, and more. Get verified contact info for every result.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4">
                      <Link href="/signup">
                        <Button className="bg-[#111827] text-white hover:bg-black h-12 px-8 text-base font-medium rounded-xl">
                          Start searching free
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                      </Link>
                      <Link href="/docs#search">
                        <Button variant="outline" className="border-gray-200 text-gray-700 hover:bg-gray-50 h-12 px-8 text-base font-medium rounded-xl">
                          View API docs
                        </Button>
                      </Link>
                    </div>
                  </div>

                  {/* Search Preview Card */}
                  <div className="relative">
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-2xl overflow-hidden">
                      {/* Search bar */}
                      <div className="p-4 border-b border-gray-100">
                        <div className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-3">
                          <Search className="w-5 h-5 text-gray-400" />
                          <span className="text-gray-600">VP of Sales at Series B startups in SF</span>
                        </div>
                      </div>
                      {/* Results */}
                      <div className="divide-y divide-gray-100">
                        {sampleResults.map((result, i) => (
                          <div key={i} className="p-4 hover:bg-gray-50 transition-colors">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-[#E63946]/10 text-[#E63946] flex items-center justify-center text-sm font-semibold">
                                {result.avatar}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="font-semibold text-sm text-gray-900">{result.name}</div>
                                <div className="text-xs text-gray-500 truncate">{result.title} at {result.company}</div>
                              </div>
                              <div className="text-xs text-gray-400">{result.location}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="p-4 bg-gray-50 text-center">
                        <span className="text-sm text-gray-600">Showing 4 of <span className="font-semibold text-[#E63946]">2,847</span> results</span>
                      </div>
                    </div>
                  </div>
                </div>
              </ScrollReveal>
            </div>
          </section>

          {/* Filter Options */}
          <section className="py-12 bg-gray-50 border-y border-gray-100">
            <div className="max-w-6xl mx-auto px-6">
              <ScrollReveal>
                <p className="text-center text-sm text-gray-500 mb-6">Search by any combination of</p>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                  {searchFilters.map((filter) => (
                    <div key={filter.label} className="bg-white rounded-xl p-4 border border-gray-200 text-center">
                      <filter.icon className="w-5 h-5 text-[#E63946] mx-auto mb-2" />
                      <div className="font-semibold text-sm mb-1">{filter.label}</div>
                      <div className="text-xs text-gray-500">{filter.example}</div>
                    </div>
                  ))}
                </div>
              </ScrollReveal>
            </div>
          </section>

          {/* Features */}
          <section className="py-20 bg-white">
            <div className="max-w-6xl mx-auto px-6">
              <ScrollReveal>
                <div className="text-center mb-16">
                  <h2
                    className="text-3xl md:text-4xl font-normal tracking-tight mb-4"
                    style={{ fontFamily: "'Source Serif 4', Georgia, serif" }}
                  >
                    Powerful search capabilities
                  </h2>
                  <p className="text-gray-600 max-w-2xl mx-auto">
                    Find exactly who you&apos;re looking for with our intelligent search engine.
                  </p>
                </div>
              </ScrollReveal>

              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                {features.map((feature, i) => (
                  <ScrollReveal key={feature.title} delay={i * 100}>
                    <div className="bg-white rounded-2xl p-6 border border-gray-100 hover:border-gray-200 hover:shadow-lg transition-all duration-300 group h-full">
                      <div className="w-12 h-12 rounded-xl bg-[#E63946]/10 flex items-center justify-center text-[#E63946] mb-5 group-hover:bg-[#E63946] group-hover:text-white transition-colors">
                        <feature.icon className="w-6 h-6" />
                      </div>
                      <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
                      <p className="text-gray-600 text-sm leading-relaxed">{feature.description}</p>
                    </div>
                  </ScrollReveal>
                ))}
              </div>
            </div>
          </section>

          {/* Use Cases */}
          <section className="py-20 bg-gray-50">
            <div className="max-w-6xl mx-auto px-6">
              <ScrollReveal>
                <div className="text-center mb-16">
                  <h2
                    className="text-3xl md:text-4xl font-normal tracking-tight mb-4"
                    style={{ fontFamily: "'Source Serif 4', Georgia, serif" }}
                  >
                    Built for every team
                  </h2>
                  <p className="text-gray-600 max-w-xl mx-auto">
                    From sales to recruiting, find the people that matter to your business.
                  </p>
                </div>
              </ScrollReveal>

              <div className="grid md:grid-cols-3 gap-6">
                {useCases.map((useCase, i) => (
                  <ScrollReveal key={useCase.title} delay={i * 100}>
                    <div className="bg-white rounded-2xl border border-gray-200 p-6 h-full">
                      <h3 className="font-semibold text-lg mb-2">{useCase.title}</h3>
                      <p className="text-gray-600 text-sm mb-4">{useCase.description}</p>
                      <div className="bg-gray-50 rounded-lg p-3 mb-3">
                        <div className="flex items-center gap-2 text-sm">
                          <Search className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-700 truncate">{useCase.query}</span>
                        </div>
                      </div>
                      <div className="text-sm">
                        <span className="text-gray-500">Found </span>
                        <span className="font-semibold text-[#E63946]">{useCase.results.toLocaleString()}</span>
                        <span className="text-gray-500"> matches</span>
                      </div>
                    </div>
                  </ScrollReveal>
                ))}
              </div>
            </div>
          </section>

          {/* API Example */}
          <section className="py-20 bg-white">
            <div className="max-w-6xl mx-auto px-6">
              <div className="grid lg:grid-cols-2 gap-12 items-center">
                <ScrollReveal>
                  <h2
                    className="text-3xl md:text-4xl font-normal tracking-tight mb-6"
                    style={{ fontFamily: "'Source Serif 4', Georgia, serif" }}
                  >
                    Integrate search into your workflow
                  </h2>
                  <p className="text-gray-600 mb-6">
                    Use our API to programmatically search and retrieve contact data for your applications.
                  </p>
                  <div className="space-y-4">
                    {[
                      "RESTful API with comprehensive documentation",
                      "Webhooks for real-time notifications",
                      "SDKs for Python, Node.js, and more",
                      "Rate limits up to 10,000 requests/minute",
                    ].map((item) => (
                      <div key={item} className="flex items-center gap-3">
                        <CheckCircle2 className="w-5 h-5 text-[#E63946] flex-shrink-0" />
                        <span className="text-gray-700">{item}</span>
                      </div>
                    ))}
                  </div>
                </ScrollReveal>

                <ScrollReveal>
                  <div className="bg-[#1a1a2e] rounded-2xl p-6 shadow-2xl">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-3 h-3 rounded-full bg-red-500" />
                      <div className="w-3 h-3 rounded-full bg-yellow-500" />
                      <div className="w-3 h-3 rounded-full bg-green-500" />
                    </div>
                    <pre className="text-sm text-gray-300 font-mono overflow-x-auto">
{`import Enrich from 'enrich-sdk';

const enrich = new Enrich({
  apiKey: process.env.ENRICH_API_KEY
});

// Search for leads
const results = await enrich.search({
  query: "VP of Sales at Series B startups",
  filters: {
    location: "San Francisco, CA",
    companySize: "50-200",
    industry: "SaaS"
  },
  limit: 100
});

// Each result includes verified contact info
results.forEach(lead => {
  console.log(lead.name, lead.email, lead.phone);
});`}
                    </pre>
                  </div>
                </ScrollReveal>
              </div>
            </div>
          </section>

          {/* CTA */}
          <section className="py-20 bg-white">
            <div className="max-w-4xl mx-auto px-6 text-center">
              <ScrollReveal>
                <h2
                  className="text-3xl md:text-4xl font-normal mb-4 text-[#111827]"
                  style={{ fontFamily: "'Source Serif 4', Georgia, serif" }}
                >
                  Start finding your ideal customers
                </h2>
                <p className="text-gray-600 mb-8 max-w-xl mx-auto">
                  Get $10 in free credits to search and enrich prospects. No credit card required.
                </p>
                <div className="flex flex-col sm:flex-row justify-center gap-4">
                  <Link href="/signup">
                    <Button className="bg-[#E63946] text-white hover:bg-[#C5303C] h-12 px-8 text-base font-medium rounded-xl">
                      Start free trial
                    </Button>
                  </Link>
                  <Link href="/pricing">
                    <Button variant="outline" className="border-gray-200 text-gray-700 hover:bg-gray-50 h-12 px-8 text-base font-medium rounded-xl">
                      View pricing
                    </Button>
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
