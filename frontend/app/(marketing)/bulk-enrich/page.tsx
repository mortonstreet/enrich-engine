"use client";

import Link from "next/link";
import { ArrowRight, CheckCircle2, Database, Upload, Download, Zap, Clock, Shield, FileText, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import Navigation from "@/components/landing/Navigation";
import ExaFooter from "@/components/landing/ExaFooter";
import ScrollReveal from "@/components/landing/ScrollReveal";

const features = [
  {
    icon: Upload,
    title: "CSV Upload",
    description: "Upload your lead list in CSV format with LinkedIn URLs, names, or company domains.",
  },
  {
    icon: Database,
    title: "Parallel Processing",
    description: "Process thousands of records simultaneously with our distributed infrastructure.",
  },
  {
    icon: Zap,
    title: "Real-time Progress",
    description: "Watch your enrichment progress in real-time with live status updates.",
  },
  {
    icon: Download,
    title: "Instant Export",
    description: "Download enriched data as CSV with emails, phones, and verification status.",
  },
];

const benefits = [
  "Process up to 10,000 contacts per batch",
  "95%+ email verification accuracy",
  "Only pay for successful enrichments",
  "No rate limits or throttling",
  "Background processing - no timeouts",
  "Automatic deduplication",
];

const steps = [
  {
    step: 1,
    title: "Upload your CSV",
    description: "Drop your CSV file with LinkedIn URLs, names, or email domains. We support flexible column mapping.",
  },
  {
    step: 2,
    title: "Select enrichment fields",
    description: "Choose what data you need: emails, phones, company info, job titles, and more.",
  },
  {
    step: 3,
    title: "Start processing",
    description: "We process your list in parallel with real-time progress tracking and status updates.",
  },
  {
    step: 4,
    title: "Download results",
    description: "Get your enriched CSV with verified contact data and confidence scores.",
  },
];

const stats = [
  { value: "10K+", label: "Contacts per batch" },
  { value: "95%", label: "Accuracy rate" },
  { value: "< 1min", label: "Per 1,000 contacts" },
  { value: "$0.015", label: "Per enrichment" },
];

export default function BulkEnrichPage() {
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
                      <Database className="w-4 h-4" />
                      Bulk Enrichment
                    </div>
                    <h1
                      className="text-4xl md:text-5xl lg:text-6xl font-normal tracking-tight mb-6"
                      style={{ fontFamily: "'Source Serif 4', Georgia, serif" }}
                    >
                      Enrich thousands of leads at once
                    </h1>
                    <p className="text-xl text-gray-600 mb-8 leading-relaxed">
                      Upload your CSV and get verified emails, phone numbers, and company data for your entire lead list in minutes, not hours.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4">
                      <Link href="/signup">
                        <Button className="bg-[#111827] text-white hover:bg-black h-12 px-8 text-base font-medium rounded-xl">
                          Start enriching free
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                      </Link>
                      <Link href="/docs#bulk">
                        <Button variant="outline" className="border-gray-200 text-gray-700 hover:bg-gray-50 h-12 px-8 text-base font-medium rounded-xl">
                          View API docs
                        </Button>
                      </Link>
                    </div>
                  </div>

                  {/* Preview Card */}
                  <div className="relative">
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-2xl overflow-hidden">
                      <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-[#E63946]/10 flex items-center justify-center">
                            <Database className="w-5 h-5 text-[#E63946]" />
                          </div>
                          <div>
                            <div className="font-semibold text-sm">leads_q4_2024.csv</div>
                            <div className="text-xs text-gray-500">1,247 contacts</div>
                          </div>
                        </div>
                        <div className="text-xs text-green-600 font-medium bg-green-50 px-2 py-1 rounded-full">
                          Processing
                        </div>
                      </div>
                      <div className="p-4 space-y-3">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">Progress</span>
                          <span className="font-semibold">89%</span>
                        </div>
                        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className="w-[89%] h-full bg-[#E63946] rounded-full" />
                        </div>
                        <div className="grid grid-cols-3 gap-4 pt-2">
                          <div className="text-center">
                            <div className="text-lg font-bold text-gray-900">1,109</div>
                            <div className="text-xs text-gray-500">Processed</div>
                          </div>
                          <div className="text-center">
                            <div className="text-lg font-bold text-green-600">1,054</div>
                            <div className="text-xs text-gray-500">Emails found</div>
                          </div>
                          <div className="text-center">
                            <div className="text-lg font-bold text-blue-600">782</div>
                            <div className="text-xs text-gray-500">Phones found</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </ScrollReveal>
            </div>
          </section>

          {/* Stats */}
          <section className="py-12 bg-gray-50 border-y border-gray-100">
            <div className="max-w-6xl mx-auto px-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                {stats.map((stat) => (
                  <div key={stat.label} className="text-center">
                    <div className="text-3xl md:text-4xl font-bold text-[#111827] mb-1">{stat.value}</div>
                    <div className="text-sm text-gray-600">{stat.label}</div>
                  </div>
                ))}
              </div>
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
                    Built for scale
                  </h2>
                  <p className="text-gray-600 max-w-2xl mx-auto">
                    Our infrastructure handles massive enrichment jobs without breaking a sweat.
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

          {/* How it works */}
          <section className="py-20 bg-gray-50">
            <div className="max-w-4xl mx-auto px-6">
              <ScrollReveal>
                <div className="text-center mb-16">
                  <h2
                    className="text-3xl md:text-4xl font-normal tracking-tight mb-4"
                    style={{ fontFamily: "'Source Serif 4', Georgia, serif" }}
                  >
                    How bulk enrichment works
                  </h2>
                  <p className="text-gray-600 max-w-xl mx-auto">
                    Four simple steps to enrich your entire lead database.
                  </p>
                </div>
              </ScrollReveal>

              <div className="space-y-6">
                {steps.map((step, i) => (
                  <ScrollReveal key={step.step} delay={i * 100}>
                    <div className="bg-white rounded-2xl border border-gray-200 p-6 flex items-start gap-6">
                      <div className="w-12 h-12 rounded-xl bg-[#E63946] text-white flex items-center justify-center font-bold text-xl flex-shrink-0">
                        {step.step}
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg mb-2">{step.title}</h3>
                        <p className="text-gray-600">{step.description}</p>
                      </div>
                    </div>
                  </ScrollReveal>
                ))}
              </div>
            </div>
          </section>

          {/* Benefits */}
          <section className="py-20 bg-white">
            <div className="max-w-6xl mx-auto px-6">
              <div className="grid lg:grid-cols-2 gap-12 items-center">
                <ScrollReveal>
                  <h2
                    className="text-3xl md:text-4xl font-normal tracking-tight mb-6"
                    style={{ fontFamily: "'Source Serif 4', Georgia, serif" }}
                  >
                    Why teams choose Enrich for bulk processing
                  </h2>
                  <div className="grid sm:grid-cols-2 gap-4">
                    {benefits.map((benefit) => (
                      <div key={benefit} className="flex items-center gap-3">
                        <CheckCircle2 className="w-5 h-5 text-[#E63946] flex-shrink-0" />
                        <span className="text-gray-700">{benefit}</span>
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

// Bulk enrich from CSV
const job = await enrich.bulk.create({
  file: 'leads.csv',
  fields: ['email', 'phone', 'company'],
  webhookUrl: 'https://your-app.com/webhook'
});

// Check progress
const status = await enrich.bulk.status(job.id);
console.log(status.progress); // 89%

// Download when complete
const results = await enrich.bulk.download(job.id);`}
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
                  Ready to enrich your lead list?
                </h2>
                <p className="text-gray-600 mb-8 max-w-xl mx-auto">
                  Start with $10 in free credits. Process your first batch today.
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
