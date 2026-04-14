"use client";

import Link from "next/link";
import { ArrowRight, MapPin, Clock, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import DarkNavigation from "@/components/landing/DarkNavigation";
import DarkFooter from "@/components/landing/DarkFooter";
import DarkScrollReveal from "@/components/landing/DarkScrollReveal";
import { OmniDialLogoStatic } from "@/components/landing/OmniDialLogo";

const openPositions = [
  {
    title: "Senior Full-Stack Engineer",
    department: "Engineering",
    location: "Remote (US)",
    type: "Full-time",
    description: "Build the core product that powers thousands of sales calls daily. TypeScript, React, Node.js.",
  },
  {
    title: "Product Designer",
    department: "Design",
    location: "Remote (US)",
    type: "Full-time",
    description: "Design intuitive experiences for sales teams. Own the product design end-to-end.",
  },
  {
    title: "Account Executive",
    department: "Sales",
    location: "Remote (US)",
    type: "Full-time",
    description: "Sell OmniDial to sales teams. You'll use our own product daily.",
  },
  {
    title: "Customer Success Manager",
    department: "Customer Success",
    location: "Remote (US)",
    type: "Full-time",
    description: "Help customers get maximum value from OmniDial. Own onboarding and retention.",
  },
  {
    title: "DevOps Engineer",
    department: "Engineering",
    location: "Remote (US)",
    type: "Full-time",
    description: "Scale our infrastructure to handle millions of calls. AWS, Kubernetes, Terraform.",
  },
];

const values = [
  {
    title: "Ship fast, iterate faster",
    description: "We believe in getting things in front of users quickly and learning from real feedback.",
  },
  {
    title: "Customer obsession",
    description: "Every decision starts with the question: does this make our customers more successful?",
  },
  {
    title: "Transparency by default",
    description: "We share everything internally - metrics, strategy, challenges. No information silos.",
  },
  {
    title: "Work-life balance is real",
    description: "We work hard during work hours and actually disconnect after. No badge of honor for burnout.",
  },
];

const benefits = [
  "Competitive salary + equity",
  "Unlimited PTO (actually used)",
  "Remote-first culture",
  "Health, dental, vision",
  "Home office stipend",
  "Learning budget",
  "Quarterly team offsites",
  "Latest hardware",
];

export default function CareersPage() {
  return (
    <div className="min-h-screen text-white bg-[#0a0a0a]">
      <DarkNavigation />

      <div className="relative z-10 bg-[#0a0a0a] pt-16">
        <main>
          {/* Hero */}
          <section className="py-16 sm:py-20 md:py-24 lg:py-32">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
              <DarkScrollReveal>
                <div className="flex justify-center mb-8">
                  <OmniDialLogoStatic size={48} color="#fafafa" />
                </div>
                <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl tracking-tight mb-6 heading-display">
                  Build the future of sales
                </h1>
                <p className="text-white/50 text-lg sm:text-xl max-w-2xl mx-auto">
                  We&apos;re a small team building tools that help salespeople do their best work.
                  Join us.
                </p>
              </DarkScrollReveal>
            </div>
          </section>

          {/* Values */}
          <section className="py-16 sm:py-20 border-t border-white/5">
            <div className="max-w-6xl mx-auto px-4 sm:px-6">
              <DarkScrollReveal>
                <h2 className="text-2xl sm:text-3xl font-semibold text-center mb-12">
                  How we work
                </h2>
              </DarkScrollReveal>

              <div className="grid sm:grid-cols-2 gap-6 lg:gap-8">
                {values.map((value, i) => (
                  <DarkScrollReveal key={value.title} delay={i * 100}>
                    <div className="p-6 bg-[#111111] rounded-2xl border border-white/5">
                      <h3 className="font-semibold text-lg mb-2 text-white">{value.title}</h3>
                      <p className="text-white/50 text-sm leading-relaxed">{value.description}</p>
                    </div>
                  </DarkScrollReveal>
                ))}
              </div>
            </div>
          </section>

          {/* Benefits */}
          <section className="py-16 sm:py-20 border-t border-white/5">
            <div className="max-w-4xl mx-auto px-4 sm:px-6">
              <DarkScrollReveal>
                <h2 className="text-2xl sm:text-3xl font-semibold text-center mb-12">
                  Benefits & perks
                </h2>
              </DarkScrollReveal>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {benefits.map((benefit, i) => (
                  <DarkScrollReveal key={benefit} delay={i * 50}>
                    <div className="p-4 bg-white/5 rounded-xl text-center">
                      <span className="text-white/70 text-sm">{benefit}</span>
                    </div>
                  </DarkScrollReveal>
                ))}
              </div>
            </div>
          </section>

          {/* Open Positions */}
          <section className="py-16 sm:py-20 border-t border-white/5">
            <div className="max-w-4xl mx-auto px-4 sm:px-6">
              <DarkScrollReveal>
                <h2 className="text-2xl sm:text-3xl font-semibold text-center mb-4">
                  Open positions
                </h2>
                <p className="text-white/50 text-center mb-12">
                  {openPositions.length} roles available
                </p>
              </DarkScrollReveal>

              <div className="space-y-4">
                {openPositions.map((position, i) => (
                  <DarkScrollReveal key={position.title} delay={i * 100}>
                    <div className="group p-6 bg-[#111111] rounded-2xl border border-white/5 hover:border-white/10 transition-all">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                          <h3 className="font-semibold text-lg text-white group-hover:text-blue-400 transition-colors">
                            {position.title}
                          </h3>
                          <p className="text-white/50 text-sm mt-1 mb-3">
                            {position.description}
                          </p>
                          <div className="flex flex-wrap items-center gap-4 text-xs text-white/40">
                            <span className="flex items-center gap-1">
                              <Briefcase className="w-3 h-3" />
                              {position.department}
                            </span>
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {position.location}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {position.type}
                            </span>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          className="border-white/20 text-white hover:bg-white/10 rounded-lg shrink-0"
                        >
                          Apply
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                      </div>
                    </div>
                  </DarkScrollReveal>
                ))}
              </div>
            </div>
          </section>

          {/* CTA */}
          <section className="py-16 sm:py-20 border-t border-white/5">
            <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
              <DarkScrollReveal>
                <h2 className="text-2xl sm:text-3xl font-semibold mb-4">
                  Don&apos;t see the right role?
                </h2>
                <p className="text-white/50 mb-6">
                  We&apos;re always looking for talented people. Send us your resume and we&apos;ll keep you in mind.
                </p>
                <Link href="mailto:careers@omnidial.io">
                  <Button className="bg-white text-black hover:bg-white/90 rounded-xl px-8 h-12">
                    Send your resume
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              </DarkScrollReveal>
            </div>
          </section>
        </main>
      </div>

      <DarkFooter />
    </div>
  );
}
