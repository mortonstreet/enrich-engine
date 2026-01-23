"use client";

import Link from "next/link";
import Navigation from "@/components/landing/Navigation";
import ExaFooter from "@/components/landing/ExaFooter";
import AnimatedPixelBackground from "@/components/landing/AnimatedPixelBackground";
import ScrollReveal from "@/components/landing/ScrollReveal";
import DataArtIcon from "@/components/landing/DataArtIcon";
import { Button } from "@/components/ui/Button";

export default function AboutPage() {
  return (
    <div className="min-h-screen text-[#111827]">
      <AnimatedPixelBackground />
      <div className="relative z-10 bg-white">
        <Navigation />
        <main>
          {/* Hero */}
          <section className="py-20 md:py-32 bg-white">
            <div className="max-w-4xl mx-auto px-6">
              <ScrollReveal>
                <h1
                  className="text-4xl md:text-5xl lg:text-6xl font-normal tracking-tight mb-12 text-center"
                  style={{ fontFamily: "'Source Serif 4', Georgia, serif" }}
                >
                  Most B2B data is incomplete, outdated, or wrong
                </h1>
              </ScrollReveal>

              <div className="space-y-6 text-lg text-gray-600 leading-relaxed">
                <ScrollReveal delay={50}>
                  <p>
                    Every sales team deserves accurate contact data. You should be able to enrich
                    any lead with verified emails and phone numbers, no matter the volume or budget.
                  </p>
                </ScrollReveal>

                <ScrollReveal delay={100}>
                  <p>
                    You should be able to make requests like{" "}
                    <em className="text-gray-800">&quot;find the verified email for this LinkedIn profile&quot;</em>{" "}
                    or{" "}
                    <em className="text-gray-800">&quot;enrich these 10,000 leads with direct phone numbers&quot;</em>.{" "}
                    You can&apos;t do this reliably because traditional data providers use stale databases
                    optimized for enterprise contracts.
                  </p>
                </ScrollReveal>

                <ScrollReveal delay={150}>
                  <p>
                    Enrich Engine is the first enrichment API built from the ground up for accuracy and
                    affordability. We&apos;re a technical team building novel approaches to contact verification.
                    And we charge usage-based pricing—no minimums, no annual contracts.
                  </p>
                </ScrollReveal>

                <ScrollReveal delay={200}>
                  <p>
                    Our ultimate goal is perfect B2B data: to give every company access to the same
                    data quality that was previously reserved for enterprises.
                  </p>
                </ScrollReveal>
              </div>
            </div>
          </section>

          {/* How We're Doing It */}
          <section className="py-20 md:py-28 bg-white border-t border-gray-100">
            <div className="max-w-6xl mx-auto px-6">
              <ScrollReveal>
                <p className="text-xs font-medium text-gray-400 uppercase tracking-widest mb-8">
                  HOW WE&apos;RE DOING IT
                </p>
              </ScrollReveal>

              {/* Multi-source Verification */}
              <div className="grid md:grid-cols-2 gap-12 items-start mb-24">
                <div>
                  <ScrollReveal>
                    <h2
                      className="text-3xl md:text-4xl font-normal tracking-tight mb-6"
                      style={{ fontFamily: "'Source Serif 4', Georgia, serif" }}
                    >
                      Multi-source verification
                    </h2>
                  </ScrollReveal>
                  <ScrollReveal delay={50}>
                    <p className="text-gray-600 leading-relaxed mb-4">
                      We don&apos;t rely on a single data source. Every email and phone number goes through
                      multiple verification layers: SMTP validation, catch-all detection, deliverability
                      scoring, and cross-referencing with public records.
                    </p>
                  </ScrollReveal>
                  <ScrollReveal delay={100}>
                    <p className="text-gray-600 leading-relaxed">
                      This multi-layered approach is why we achieve 95% email accuracy—significantly
                      higher than providers relying on outdated databases alone.
                    </p>
                  </ScrollReveal>
                </div>
                <ScrollReveal delay={100}>
                  <div className="bg-gray-50 rounded-2xl p-8 border border-gray-100">
                    <div className="space-y-4">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                          <span className="text-green-600 text-lg">✓</span>
                        </div>
                        <div>
                          <div className="font-medium text-sm">SMTP Validation</div>
                          <div className="text-gray-500 text-xs">Real-time mailbox verification</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                          <span className="text-green-600 text-lg">✓</span>
                        </div>
                        <div>
                          <div className="font-medium text-sm">Catch-all Detection</div>
                          <div className="text-gray-500 text-xs">Identify risky domains</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                          <span className="text-green-600 text-lg">✓</span>
                        </div>
                        <div>
                          <div className="font-medium text-sm">Deliverability Scoring</div>
                          <div className="text-gray-500 text-xs">Confidence-based results</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                          <span className="text-green-600 text-lg">✓</span>
                        </div>
                        <div>
                          <div className="font-medium text-sm">Cross-reference Validation</div>
                          <div className="text-gray-500 text-xs">Multiple data sources checked</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </ScrollReveal>
              </div>

              {/* AI-powered Email Finding */}
              <div className="grid md:grid-cols-2 gap-12 items-start mb-24">
                <div>
                  <ScrollReveal>
                    <h2
                      className="text-3xl md:text-4xl font-normal tracking-tight mb-6"
                      style={{ fontFamily: "'Source Serif 4', Georgia, serif" }}
                    >
                      AI-powered email finding
                    </h2>
                  </ScrollReveal>
                  <ScrollReveal delay={50}>
                    <p className="text-gray-600 leading-relaxed mb-4">
                      When a verified email doesn&apos;t exist in our database, we don&apos;t give up. Our
                      system analyzes company email patterns, generates likely formats, and verifies
                      them in real-time.
                    </p>
                  </ScrollReveal>
                  <ScrollReveal delay={100}>
                    <p className="text-gray-600 leading-relaxed">
                      This intelligent approach means we find emails that other providers miss—without
                      sacrificing accuracy. Every result is verified before it reaches you.
                    </p>
                  </ScrollReveal>
                </div>
                <ScrollReveal delay={100}>
                  <div className="bg-[#1a1a2e] rounded-2xl p-6 font-mono text-sm">
                    <div className="text-gray-400 mb-4"># Pattern analysis</div>
                    <div className="space-y-2">
                      <div><span className="text-blue-400">patterns</span> = [</div>
                      <div className="pl-4 text-green-400">&quot;first.last@company.com&quot;,</div>
                      <div className="pl-4 text-green-400">&quot;flast@company.com&quot;,</div>
                      <div className="pl-4 text-green-400">&quot;first@company.com&quot;,</div>
                      <div>]</div>
                      <div className="mt-4"><span className="text-purple-400">for</span> pattern <span className="text-purple-400">in</span> patterns:</div>
                      <div className="pl-4"><span className="text-yellow-400">verify</span>(pattern)</div>
                      <div className="mt-4 text-gray-400"># Result: sarah.chen@scale.ai ✓</div>
                    </div>
                  </div>
                </ScrollReveal>
              </div>

              {/* Infrastructure at Scale */}
              <div className="grid md:grid-cols-2 gap-12 items-start">
                <div>
                  <ScrollReveal>
                    <h2
                      className="text-3xl md:text-4xl font-normal tracking-tight mb-6"
                      style={{ fontFamily: "'Source Serif 4', Georgia, serif" }}
                    >
                      Infrastructure at scale
                    </h2>
                  </ScrollReveal>
                  <ScrollReveal delay={50}>
                    <p className="text-gray-600 leading-relaxed mb-4">
                      Processing millions of enrichment requests requires serious infrastructure.
                      We&apos;ve built distributed systems that handle bulk requests efficiently while
                      maintaining real-time response times for individual lookups.
                    </p>
                  </ScrollReveal>
                  <ScrollReveal delay={100}>
                    <p className="text-gray-600 leading-relaxed">
                      This engineering investment is why we can offer 10x lower pricing than legacy
                      providers. Efficiency at scale means savings passed directly to you.
                    </p>
                  </ScrollReveal>
                </div>
                <ScrollReveal delay={100}>
                  <div className="bg-gray-50 rounded-2xl p-8 border border-gray-100">
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <div className="text-3xl font-bold text-[#E63946]">10M+</div>
                        <div className="text-gray-500 text-sm">Verified contacts</div>
                      </div>
                      <div>
                        <div className="text-3xl font-bold text-[#E63946]">&lt;200ms</div>
                        <div className="text-gray-500 text-sm">Avg response time</div>
                      </div>
                      <div>
                        <div className="text-3xl font-bold text-[#E63946]">95%</div>
                        <div className="text-gray-500 text-sm">Email accuracy</div>
                      </div>
                      <div>
                        <div className="text-3xl font-bold text-[#E63946]">99.9%</div>
                        <div className="text-gray-500 text-sm">API uptime</div>
                      </div>
                    </div>
                  </div>
                </ScrollReveal>
              </div>
            </div>
          </section>

          {/* Bottom CTA */}
          <section className="py-24 md:py-32 bg-white">
            <div className="max-w-4xl mx-auto px-6 text-center">
              <ScrollReveal>
                <div className="flex justify-center mb-8">
                  <DataArtIcon />
                </div>
              </ScrollReveal>
              <ScrollReveal delay={100}>
                <h2
                  className="text-3xl md:text-4xl lg:text-5xl font-normal tracking-tight mb-8"
                  style={{ fontFamily: "'Source Serif 4', Georgia, serif" }}
                >
                  Enrichment built for your pipeline
                </h2>
              </ScrollReveal>
              <ScrollReveal delay={150}>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link href="/contact">
                    <Button className="bg-[#111827] text-white hover:bg-black rounded-xl px-8 py-4 text-base font-medium h-14">
                      Book a demo
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
