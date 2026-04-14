"use client";

import Link from "next/link";
import { ArrowRight, Quote } from "lucide-react";
import { Button } from "@/components/ui/button";
import DarkNavigation from "@/components/landing/DarkNavigation";
import DarkFooter from "@/components/landing/DarkFooter";
import DarkScrollReveal from "@/components/landing/DarkScrollReveal";
import { OmniDialLogoStatic } from "@/components/landing/OmniDialLogo";

const caseStudies = [
  {
    company: "ScaleUp Solutions",
    industry: "B2B SaaS",
    logo: "SS",
    color: "#3B82F6",
    headline: "3x increase in meetings booked",
    description: "How ScaleUp Solutions tripled their SDR team's meeting output in 60 days with OmniDial.",
    stats: [
      { value: "3x", label: "More meetings" },
      { value: "45%", label: "Connect rate" },
      { value: "$150K", label: "Pipeline added" },
    ],
    quote: "We went from struggling to hit quota to consistently exceeding it. The power dialer changed everything.",
    author: "Sarah Chen",
    role: "VP of Sales",
    slug: "scaleup-solutions",
  },
  {
    company: "GrowthForce",
    industry: "Marketing Agency",
    logo: "GF",
    color: "#10B981",
    headline: "From 40 to 150 calls per day",
    description: "How a 5-person sales team at GrowthForce dramatically increased their outbound activity.",
    stats: [
      { value: "275%", label: "More calls" },
      { value: "2hr", label: "Time saved/day" },
      { value: "38%", label: "Connect rate" },
    ],
    quote: "The ROI was immediate. OmniDial paid for itself in the first week.",
    author: "Mike Rodriguez",
    role: "Founder & CEO",
    slug: "growthforce",
  },
  {
    company: "DataDriven Inc",
    industry: "Data Analytics",
    logo: "DD",
    color: "#8B5CF6",
    headline: "Cut ramp time by 50%",
    description: "How DataDriven uses call recordings and built-in coaching to onboard new SDRs faster.",
    stats: [
      { value: "50%", label: "Faster ramp" },
      { value: "28%", label: "Higher quota" },
      { value: "92%", label: "Rep retention" },
    ],
    quote: "New reps listen to winning calls and get up to speed in half the time. It's a game changer.",
    author: "Jennifer Park",
    role: "Sales Manager",
    slug: "datadriven",
  },
  {
    company: "TechStart Ventures",
    industry: "VC / Investing",
    logo: "TV",
    color: "#F59E0B",
    headline: "Sourcing 2x more deals",
    description: "How a VC firm uses OmniDial to reach more founders and source better investments.",
    stats: [
      { value: "2x", label: "More deals" },
      { value: "120", label: "Calls/week" },
      { value: "40%", label: "Response rate" },
    ],
    quote: "Cold outreach to founders actually works when you can get them on the phone.",
    author: "David Kim",
    role: "Partner",
    slug: "techstart-ventures",
  },
];

const logos = [
  { name: "ScaleUp", color: "#3B82F6" },
  { name: "GrowthForce", color: "#10B981" },
  { name: "DataDriven", color: "#8B5CF6" },
  { name: "TechStart", color: "#F59E0B" },
  { name: "CloudBase", color: "#EC4899" },
  { name: "NextGen", color: "#06B6D4" },
];

export default function CaseStudiesPage() {
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
                  Customer Stories
                </h1>
                <p className="text-white/50 text-lg max-w-2xl mx-auto">
                  See how sales teams are using OmniDial to dial smarter and close more deals.
                </p>
              </DarkScrollReveal>
            </div>
          </section>

          {/* Logo Bar */}
          <section className="py-8 border-t border-white/5">
            <div className="max-w-6xl mx-auto px-4 sm:px-6">
              <DarkScrollReveal>
                <p className="text-center text-white/40 text-sm mb-6">
                  Trusted by sales teams at
                </p>
                <div className="flex flex-wrap justify-center gap-8">
                  {logos.map((logo) => (
                    <div
                      key={logo.name}
                      className="flex items-center gap-2 text-white/60"
                    >
                      <div
                        className="w-8 h-8 rounded-md flex items-center justify-center text-white text-xs font-bold"
                        style={{ backgroundColor: logo.color }}
                      >
                        {logo.name[0]}
                      </div>
                      <span className="text-sm font-medium">{logo.name}</span>
                    </div>
                  ))}
                </div>
              </DarkScrollReveal>
            </div>
          </section>

          {/* Case Studies */}
          <section className="py-12 sm:py-16">
            <div className="max-w-6xl mx-auto px-4 sm:px-6">
              <div className="space-y-8">
                {caseStudies.map((study, i) => (
                  <DarkScrollReveal key={study.slug} delay={i * 100}>
                    <article className="p-6 sm:p-8 bg-[#111111] rounded-2xl border border-white/5 hover:border-white/10 transition-all">
                      <div className="grid lg:grid-cols-[1fr,300px] gap-8">
                        <div>
                          {/* Company Header */}
                          <div className="flex items-center gap-4 mb-6">
                            <div
                              className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold"
                              style={{ backgroundColor: study.color }}
                            >
                              {study.logo}
                            </div>
                            <div>
                              <h3 className="font-semibold text-white">{study.company}</h3>
                              <p className="text-white/40 text-sm">{study.industry}</p>
                            </div>
                          </div>

                          {/* Headline */}
                          <h2 className="text-2xl sm:text-3xl font-semibold text-white mb-4">
                            {study.headline}
                          </h2>
                          <p className="text-white/50 mb-6">{study.description}</p>

                          {/* Stats */}
                          <div className="grid grid-cols-3 gap-4 mb-6">
                            {study.stats.map((stat) => (
                              <div key={stat.label}>
                                <div className="text-2xl font-bold text-white">{stat.value}</div>
                                <div className="text-white/40 text-sm">{stat.label}</div>
                              </div>
                            ))}
                          </div>

                          <Button
                            variant="outline"
                            className="border-white/20 text-white hover:bg-white/10 rounded-xl"
                          >
                            Read full story
                            <ArrowRight className="w-4 h-4 ml-2" />
                          </Button>
                        </div>

                        {/* Quote */}
                        <div className="flex flex-col justify-center p-6 bg-white/5 rounded-xl">
                          <Quote className="w-8 h-8 text-white/20 mb-4" />
                          <blockquote className="text-white/70 text-sm leading-relaxed mb-4 italic">
                            &ldquo;{study.quote}&rdquo;
                          </blockquote>
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                              <span className="text-sm font-medium text-white">
                                {study.author.split(" ").map((n) => n[0]).join("")}
                              </span>
                            </div>
                            <div>
                              <div className="text-white text-sm font-medium">{study.author}</div>
                              <div className="text-white/40 text-xs">{study.role}, {study.company}</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </article>
                  </DarkScrollReveal>
                ))}
              </div>
            </div>
          </section>

          {/* CTA */}
          <section className="py-16 sm:py-20 border-t border-white/5">
            <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
              <DarkScrollReveal>
                <div className="flex items-center justify-center gap-3 mb-6">
                  <OmniDialLogoStatic size={32} color="#fafafa" />
                  <span className="text-xl font-semibold">OmniDial</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-semibold mb-4">
                  Ready to write your success story?
                </h2>
                <p className="text-white/50 mb-6">
                  Join the waitlist and see what OmniDial can do for your team.
                </p>
                <div className="flex flex-col sm:flex-row justify-center gap-4">
                  <Link href="/waitlist">
                    <Button className="bg-white text-black hover:bg-white/90 rounded-xl px-8 h-12">
                      Join waitlist
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </Link>
                  <a href="https://cal.com/mortonstreet/15min" target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" className="border-white/20 text-white hover:bg-white/10 rounded-xl px-8 h-12">
                      Book a demo
                    </Button>
                  </a>
                </div>
              </DarkScrollReveal>
            </div>
          </section>
        </main>
      </div>

      <DarkFooter />
    </div>
  );
}
