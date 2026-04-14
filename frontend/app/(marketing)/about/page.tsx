"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import DarkNavigation from "@/components/landing/DarkNavigation";
import DarkFooter from "@/components/landing/DarkFooter";
import DarkScrollReveal from "@/components/landing/DarkScrollReveal";
import { OmniDialLogoStatic } from "@/components/landing/OmniDialLogo";

export default function AboutPage() {
  return (
    <div className="min-h-screen text-white bg-[#0a0a0a]">
      <DarkNavigation />

      <div className="relative z-10 bg-[#0a0a0a] pt-16">
        <main>
          {/* Hero */}
          <section className="py-16 sm:py-20 md:py-24 lg:py-32">
            <div className="max-w-4xl mx-auto px-4 sm:px-6">
              <DarkScrollReveal>
                <div className="flex justify-center mb-8">
                  <OmniDialLogoStatic size={64} color="#fafafa" />
                </div>
                <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl tracking-tight text-center mb-6 heading-display">
                  Sales teams deserve better tools
                </h1>
                <p className="text-white/50 text-lg sm:text-xl text-center max-w-2xl mx-auto leading-relaxed">
                  We&apos;re building the dialer we always wanted. Fast, reliable, affordable.
                  No bloat. No enterprise pricing games.
                </p>
              </DarkScrollReveal>
            </div>
          </section>

          {/* Mission */}
          <section className="py-16 sm:py-20 md:py-24 border-t border-white/5">
            <div className="max-w-4xl mx-auto px-4 sm:px-6">
              <div className="grid md:grid-cols-2 gap-12 lg:gap-20">
                <DarkScrollReveal>
                  <div>
                    <h2 className="text-2xl sm:text-3xl font-semibold mb-6">
                      The problem with dialers
                    </h2>
                    <div className="space-y-4 text-white/60 leading-relaxed">
                      <p>
                        Most sales dialers are either expensive enterprise software
                        that charges $100+ per seat, or cheap tools that break when
                        you need them most.
                      </p>
                      <p>
                        Features are locked behind premium tiers. Per-minute charges
                        add up. You need three different tools to make a call, log it,
                        and update your CRM.
                      </p>
                      <p>
                        We think sales teams deserve better.
                      </p>
                    </div>
                  </div>
                </DarkScrollReveal>

                <DarkScrollReveal delay={100}>
                  <div>
                    <h2 className="text-2xl sm:text-3xl font-semibold mb-6">
                      Our approach
                    </h2>
                    <div className="space-y-4 text-white/60 leading-relaxed">
                      <p>
                        OmniDial is built for one thing: helping you connect with
                        more prospects. Power dialer, call recording, voicemail drop,
                        and a built-in CRM - all for $20/month.
                      </p>
                      <p>
                        No hidden fees. No per-minute charges. No feature gating.
                        Everything you need to dial smarter, included.
                      </p>
                      <p>
                        We&apos;re a small team of builders who&apos;ve spent years in sales.
                        We know what works and what doesn&apos;t.
                      </p>
                    </div>
                  </div>
                </DarkScrollReveal>
              </div>
            </div>
          </section>

          {/* Values */}
          <section className="py-16 sm:py-20 md:py-24 border-t border-white/5">
            <div className="max-w-4xl mx-auto px-4 sm:px-6">
              <DarkScrollReveal>
                <h2 className="text-2xl sm:text-3xl font-semibold text-center mb-12">
                  What we believe
                </h2>
              </DarkScrollReveal>

              <div className="grid sm:grid-cols-2 gap-8 lg:gap-12">
                <DarkScrollReveal delay={0}>
                  <div className="p-6 bg-[#111111] rounded-2xl border border-white/5">
                    <h3 className="font-semibold text-lg mb-3">Simple is better</h3>
                    <p className="text-white/50 text-sm leading-relaxed">
                      We build focused tools that do one thing exceptionally well.
                      No bloated feature sets. No overwhelming dashboards.
                    </p>
                  </div>
                </DarkScrollReveal>

                <DarkScrollReveal delay={100}>
                  <div className="p-6 bg-[#111111] rounded-2xl border border-white/5">
                    <h3 className="font-semibold text-lg mb-3">Transparent pricing</h3>
                    <p className="text-white/50 text-sm leading-relaxed">
                      One price. All features. No surprise bills, no per-minute
                      charges, no premium tiers that hold features hostage.
                    </p>
                  </div>
                </DarkScrollReveal>

                <DarkScrollReveal delay={200}>
                  <div className="p-6 bg-[#111111] rounded-2xl border border-white/5">
                    <h3 className="font-semibold text-lg mb-3">Reliability first</h3>
                    <p className="text-white/50 text-sm leading-relaxed">
                      Your dialer can&apos;t drop calls. We invest heavily in
                      infrastructure to ensure 99.9% uptime.
                    </p>
                  </div>
                </DarkScrollReveal>

                <DarkScrollReveal delay={300}>
                  <div className="p-6 bg-[#111111] rounded-2xl border border-white/5">
                    <h3 className="font-semibold text-lg mb-3">Built for SDRs</h3>
                    <p className="text-white/50 text-sm leading-relaxed">
                      Every feature is designed by and for sales development
                      reps. We understand the grind.
                    </p>
                  </div>
                </DarkScrollReveal>
              </div>
            </div>
          </section>

          {/* CTA */}
          <section className="py-16 sm:py-20 md:py-24 border-t border-white/5">
            <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
              <DarkScrollReveal>
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-semibold mb-4">
                  Ready to try OmniDial?
                </h2>
                <p className="text-white/50 mb-8">
                  Join the waitlist and be first to experience the future of sales dialing.
                </p>
                <div className="flex flex-col sm:flex-row justify-center gap-4">
                  <Link href="/waitlist">
                    <Button className="w-full sm:w-auto bg-white text-black hover:bg-white/90 rounded-xl px-8 h-12">
                      Join waitlist
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </Link>
                  <Link href="/contact">
                    <Button variant="outline" className="w-full sm:w-auto border-white/20 text-white hover:bg-white/10 rounded-xl px-8 h-12">
                      Contact us
                    </Button>
                  </Link>
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
