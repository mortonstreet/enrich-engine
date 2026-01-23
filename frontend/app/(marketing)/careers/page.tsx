"use client";

import Link from "next/link";
import Navigation from "@/components/landing/Navigation";
import ExaFooter from "@/components/landing/ExaFooter";
import AnimatedPixelBackground from "@/components/landing/AnimatedPixelBackground";
import ScrollReveal from "@/components/landing/ScrollReveal";
import { Button } from "@/components/ui/Button";
import { MapPin, Clock, ArrowRight } from "lucide-react";

const benefits = [
  { title: "Competitive Salary", description: "Top-of-market compensation with equity" },
  { title: "Remote First", description: "Work from anywhere in the world" },
  { title: "Health & Wellness", description: "Comprehensive health, dental, and vision" },
  { title: "Unlimited PTO", description: "Take the time you need to recharge" },
  { title: "Learning Budget", description: "$2,000/year for courses and conferences" },
  { title: "Home Office", description: "$1,000 stipend for your workspace" },
];

const openings = [
  {
    title: "Senior Backend Engineer",
    team: "Engineering",
    location: "Remote",
    type: "Full-time",
    description: "Build scalable APIs and data pipelines that power our enrichment engine.",
  },
  {
    title: "Full Stack Engineer",
    team: "Engineering",
    location: "Remote",
    type: "Full-time",
    description: "Create delightful user experiences across our web applications.",
  },
  {
    title: "Data Engineer",
    team: "Data",
    location: "Remote",
    type: "Full-time",
    description: "Design and optimize our data infrastructure for billion-scale operations.",
  },
  {
    title: "Product Designer",
    team: "Design",
    location: "Remote",
    type: "Full-time",
    description: "Shape the future of our product with beautiful, intuitive designs.",
  },
  {
    title: "Account Executive",
    team: "Sales",
    location: "Remote (US)",
    type: "Full-time",
    description: "Help growing companies discover the power of accurate B2B data.",
  },
];

export default function CareersPage() {
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
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#E63946]/10 text-[#E63946] rounded-full text-sm font-medium mb-8">
                  <span className="w-2 h-2 bg-[#E63946] rounded-full animate-pulse" />
                  We&apos;re hiring
                </div>
                <h1
                  className="text-4xl md:text-5xl lg:text-6xl font-normal tracking-tight mb-6"
                  style={{ fontFamily: "'Source Serif 4', Georgia, serif" }}
                >
                  Build the future of B2B data
                </h1>
                <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                  Join a small, passionate team solving hard problems in data enrichment.
                  Remote-first, async-friendly, and focused on impact.
                </p>
              </ScrollReveal>
            </div>
          </section>

          {/* Benefits */}
          <section className="py-16 bg-gray-50">
            <div className="max-w-6xl mx-auto px-6">
              <ScrollReveal>
                <h2 className="text-2xl font-semibold mb-8 text-center">Why join us?</h2>
              </ScrollReveal>
              <div className="grid md:grid-cols-3 gap-6">
                {benefits.map((benefit, i) => (
                  <ScrollReveal key={i} delay={i * 50}>
                    <div className="bg-white p-6 rounded-xl border border-gray-100">
                      <h3 className="font-semibold mb-1">{benefit.title}</h3>
                      <p className="text-gray-600 text-sm">{benefit.description}</p>
                    </div>
                  </ScrollReveal>
                ))}
              </div>
            </div>
          </section>

          {/* Open Positions */}
          <section className="py-20 md:py-28 bg-white">
            <div className="max-w-4xl mx-auto px-6">
              <ScrollReveal>
                <h2
                  className="text-3xl md:text-4xl font-normal tracking-tight mb-4 text-center"
                  style={{ fontFamily: "'Source Serif 4', Georgia, serif" }}
                >
                  Open Positions
                </h2>
                <p className="text-gray-600 text-center mb-12">
                  Don&apos;t see a role that fits? Email us at careers@enrich.dev
                </p>
              </ScrollReveal>

              <div className="space-y-4">
                {openings.map((job, i) => (
                  <ScrollReveal key={i} delay={i * 80}>
                    <div className="group p-6 rounded-2xl border border-gray-100 hover:border-[#E63946]/30 hover:shadow-lg transition-all cursor-pointer">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="text-xs font-medium text-[#E63946] mb-1">{job.team}</div>
                          <h3 className="text-lg font-semibold mb-2 group-hover:text-[#E63946] transition-colors">
                            {job.title}
                          </h3>
                          <p className="text-gray-600 text-sm mb-3">{job.description}</p>
                          <div className="flex items-center gap-4 text-sm text-gray-500">
                            <span className="flex items-center gap-1">
                              <MapPin className="w-4 h-4" />
                              {job.location}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              {job.type}
                            </span>
                          </div>
                        </div>
                        <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-[#E63946] transition-colors" />
                      </div>
                    </div>
                  </ScrollReveal>
                ))}
              </div>
            </div>
          </section>

          {/* CTA */}
          <section className="py-16 bg-white">
            <div className="max-w-4xl mx-auto px-6 text-center">
              <h2 className="text-2xl md:text-3xl font-semibold text-[#111827] mb-4">
                Ready to make an impact?
              </h2>
              <p className="text-gray-600 mb-8">
                We&apos;re always looking for talented people to join our team.
              </p>
              <Link href="mailto:careers@enrich.dev">
                <Button className="bg-[#E63946] hover:bg-[#C5303C] text-white px-8 py-3 h-12">
                  Get in touch
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>
          </section>
        </main>
      </div>
      <ExaFooter />
    </div>
  );
}
