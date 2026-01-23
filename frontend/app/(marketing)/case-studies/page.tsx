"use client";

import Link from "next/link";
import Navigation from "@/components/landing/Navigation";
import ExaFooter from "@/components/landing/ExaFooter";
import AnimatedPixelBackground from "@/components/landing/AnimatedPixelBackground";
import ScrollReveal from "@/components/landing/ScrollReveal";
import { ArrowRight } from "lucide-react";

const caseStudies = [
  {
    company: "ScaleUp Ventures",
    logo: "S",
    industry: "Venture Capital",
    color: "bg-violet-500",
    headline: "3x increase in founder outreach efficiency",
    description: "How ScaleUp Ventures uses Enrich to source and contact 1,000+ founders per quarter.",
    stats: [
      { label: "Founders Contacted", value: "1,200+" },
      { label: "Email Hit Rate", value: "94%" },
      { label: "Time Saved", value: "40hrs/mo" },
    ],
  },
  {
    company: "TechRecruit Pro",
    logo: "T",
    industry: "Recruiting",
    color: "bg-emerald-500",
    headline: "Reduced sourcing costs by 70%",
    description: "TechRecruit Pro switched from ZoomInfo and cut their data costs while improving accuracy.",
    stats: [
      { label: "Cost Reduction", value: "70%" },
      { label: "Candidates/Month", value: "5,000" },
      { label: "Accuracy", value: "96%" },
    ],
  },
  {
    company: "GrowthLabs",
    logo: "G",
    industry: "SaaS",
    color: "bg-blue-500",
    headline: "Built a 50K contact pipeline in 30 days",
    description: "How GrowthLabs used bulk enrichment to jumpstart their outbound sales program.",
    stats: [
      { label: "Contacts Enriched", value: "50,000" },
      { label: "Meetings Booked", value: "420" },
      { label: "Pipeline Value", value: "$2.1M" },
    ],
  },
  {
    company: "Enterprise Corp",
    logo: "E",
    industry: "Enterprise Software",
    color: "bg-amber-500",
    headline: "Unified data across 5 sales teams",
    description: "Enterprise Corp consolidated their enrichment tools and improved data quality across the board.",
    stats: [
      { label: "Teams Unified", value: "5" },
      { label: "Data Quality", value: "98%" },
      { label: "Tools Replaced", value: "3" },
    ],
  },
];

export default function CaseStudiesPage() {
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
                  Customer Success Stories
                </h1>
                <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                  See how leading companies use Enrich Engine to power their sales and recruiting pipelines.
                </p>
              </ScrollReveal>
            </div>
          </section>

          {/* Case Studies Grid */}
          <section className="py-16 md:py-20 bg-gray-50">
            <div className="max-w-6xl mx-auto px-6">
              <div className="grid md:grid-cols-2 gap-8">
                {caseStudies.map((study, i) => (
                  <ScrollReveal key={i} delay={i * 100}>
                    <div className="bg-white rounded-2xl overflow-hidden border border-gray-100 hover:shadow-xl transition-all group cursor-pointer">
                      {/* Header */}
                      <div className={`${study.color} p-6`}>
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center font-bold text-xl text-gray-800">
                            {study.logo}
                          </div>
                          <div>
                            <div className="font-semibold text-white">{study.company}</div>
                            <div className="text-white/70 text-sm">{study.industry}</div>
                          </div>
                        </div>
                        <h3 className="text-xl font-semibold text-white">{study.headline}</h3>
                      </div>

                      {/* Content */}
                      <div className="p-6">
                        <p className="text-gray-600 mb-6">{study.description}</p>

                        {/* Stats */}
                        <div className="grid grid-cols-3 gap-4 mb-6">
                          {study.stats.map((stat, j) => (
                            <div key={j}>
                              <div className="text-2xl font-bold text-[#E63946]">{stat.value}</div>
                              <div className="text-xs text-gray-500">{stat.label}</div>
                            </div>
                          ))}
                        </div>

                        <div className="flex items-center text-[#E63946] font-medium text-sm group-hover:gap-2 transition-all">
                          Read case study
                          <ArrowRight className="w-4 h-4 ml-1" />
                        </div>
                      </div>
                    </div>
                  </ScrollReveal>
                ))}
              </div>
            </div>
          </section>

          {/* CTA */}
          <section className="py-20 bg-white">
            <div className="max-w-4xl mx-auto px-6 text-center">
              <ScrollReveal>
                <h2
                  className="text-3xl md:text-4xl font-normal tracking-tight mb-4"
                  style={{ fontFamily: "'Source Serif 4', Georgia, serif" }}
                >
                  Ready to write your success story?
                </h2>
                <p className="text-gray-600 mb-8">
                  Join hundreds of companies using Enrich Engine to power their growth.
                </p>
                <div className="flex flex-col sm:flex-row justify-center gap-4">
                  <Link href="/signup">
                    <button className="bg-[#111827] text-white hover:bg-black rounded-xl px-8 py-4 text-base font-medium">
                      Start free trial
                    </button>
                  </Link>
                  <Link href="/contact">
                    <button className="border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-xl px-8 py-4 text-base font-medium">
                      Contact sales
                    </button>
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
