"use client";

import Link from "next/link";
import React from "react";
import {
  Mail,
  Phone,
  Upload,
  Download,
  History,
  Code,
  ArrowRight,
  Check,
  Search,
  Zap,
} from "lucide-react";
import { BentoGrid, BentoCard } from "@/components/landing/bento-grid";
import { Button } from "@/components/ui/Button";

const stats = [
  { value: "10M", suffix: "+", label: "Contacts Enriched" },
  { value: "95", suffix: "%", label: "Match Rate" },
  { value: "<1", suffix: "s", label: "Response Time" },
  { value: "API", suffix: "", label: "Access" },
];

const features = [
  {
    icon: Mail,
    title: "Email Finder",
    description:
      "Find verified professional email addresses from LinkedIn profiles with high accuracy.",
    span: "2x1" as const,
  },
  {
    icon: Phone,
    title: "Phone Enrichment",
    description:
      "Get direct mobile numbers when available to reach prospects faster.",
    span: "1x1" as const,
  },
  {
    icon: Upload,
    title: "Bulk Processing",
    description:
      "Upload CSV files with LinkedIn URLs and enrich hundreds of contacts at once.",
    span: "1x1" as const,
  },
  {
    icon: Download,
    title: "CSV Export",
    description:
      "Download enriched data in CSV format for easy import into your CRM or outreach tools.",
    span: "1x2" as const,
  },
  {
    icon: History,
    title: "Enrichment History",
    description:
      "Access all your past enrichments with full details and re-download anytime.",
    span: "1x1" as const,
  },
  {
    icon: Code,
    title: "API Access",
    description:
      "Integrate enrichment into your workflows with our simple REST API.",
    span: "2x1" as const,
  },
];

const steps = [
  {
    number: "01",
    title: "Paste LinkedIn URL",
    description:
      "Enter any LinkedIn profile URL or upload a CSV with multiple profiles to enrich.",
  },
  {
    number: "02",
    title: "Get Contact Info",
    description:
      "We find verified email addresses and phone numbers using our data network.",
  },
  {
    number: "03",
    title: "Export & Use",
    description:
      "Download results as CSV or access via API for your outreach campaigns.",
  },
];

const benefits = [
  "Verified email addresses",
  "Direct phone numbers",
  "Bulk CSV processing",
  "Real-time enrichment",
  "API integration",
  "Data accuracy guarantee",
];

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="text-xl font-semibold tracking-tight">
              EnrichEngine
            </Link>
            <div className="flex items-center gap-3">
              <Link
                href="/login"
                className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Sign in
              </Link>
              <Link href="/waitlist">
                <Button size="default">Get Started</Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <main>
        {/* Hero Section */}
        <section className="py-20 md:py-28">
          <div className="max-w-6xl mx-auto px-6">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium bg-primary/10 text-primary mb-6">
                <Search className="w-3.5 h-3.5" />
                LinkedIn Contact Enrichment
              </div>

              <h1 className="text-4xl md:text-5xl lg:text-6xl font-semibold tracking-tight text-foreground mb-6 leading-[1.1]">
                Find Anyone&apos;s Email & Phone
                <br />
                <span className="text-primary">from LinkedIn</span>
              </h1>

              <p className="text-lg text-muted-foreground max-w-xl mb-8 leading-relaxed">
                Turn LinkedIn profiles into actionable contact data. Get verified
                email addresses and phone numbers in seconds.
              </p>

              <div className="flex flex-col sm:flex-row gap-3">
                <Link href="/waitlist">
                  <Button size="lg" className="w-full sm:w-auto">
                    Join the Waitlist
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </Link>
                <Link href="#features">
                  <Button
                    variant="outline"
                    size="lg"
                    className="w-full sm:w-auto"
                  >
                    See Features
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="py-16 border-y border-border bg-muted/50">
          <div className="max-w-6xl mx-auto px-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {stats.map((stat, i) => (
                <div key={i} className="text-center">
                  <div className="text-3xl md:text-4xl font-semibold text-foreground mb-1">
                    {stat.value}
                    <span className="text-primary">{stat.suffix}</span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-20 md:py-24">
          <div className="max-w-6xl mx-auto px-6">
            <div className="text-center mb-14">
              <h2 className="text-2xl md:text-3xl font-semibold tracking-tight mb-3">
                Everything you need to enrich contacts
              </h2>
              <p className="text-muted-foreground max-w-lg mx-auto">
                Powerful tools to find and verify contact information from
                LinkedIn profiles at scale.
              </p>
            </div>

            <BentoGrid>
              {features.map((feature, i) => (
                <BentoCard
                  key={i}
                  icon={<feature.icon className="w-5 h-5" />}
                  title={feature.title}
                  description={feature.description}
                  span={feature.span}
                />
              ))}
            </BentoGrid>
          </div>
        </section>

        {/* How It Works Section */}
        <section className="py-20 md:py-24 bg-muted/30 border-y border-border">
          <div className="max-w-6xl mx-auto px-6">
            <div className="text-center mb-14">
              <h2 className="text-2xl md:text-3xl font-semibold tracking-tight mb-3">
                Get started in three steps
              </h2>
              <p className="text-muted-foreground max-w-lg mx-auto">
                From LinkedIn profile to contact data in seconds. Simple,
                fast, and accurate.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {steps.map((step, i) => (
                <div
                  key={i}
                  className="relative p-6 rounded-xl border border-border bg-background"
                >
                  <div className="text-5xl font-semibold text-border mb-4">
                    {step.number}
                  </div>
                  <h3 className="text-lg font-medium mb-2">{step.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {step.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Benefits Section */}
        <section className="py-20 md:py-24">
          <div className="max-w-6xl mx-auto px-6">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-2xl md:text-3xl font-semibold tracking-tight mb-4">
                  Built for sales teams
                  <br />
                  that move fast
                </h2>
                <p className="text-muted-foreground mb-8 leading-relaxed">
                  Whether you&apos;re doing outbound sales, recruiting, or lead
                  generation, our enrichment engine helps you connect with the
                  right people faster.
                </p>

                <div className="grid grid-cols-2 gap-3">
                  {benefits.map((benefit, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Check className="w-3 h-3 text-primary" />
                      </div>
                      <span className="text-muted-foreground">{benefit}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="relative">
                <div className="p-6 rounded-xl border border-border bg-background">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Zap className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <div className="font-medium text-sm">Enrichment Stats</div>
                      <div className="text-xs text-muted-foreground">
                        Today&apos;s activity
                      </div>
                    </div>
                    <div className="ml-auto flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-green-500"></div>
                      <span className="text-xs text-green-600 font-medium">
                        Live
                      </span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {[
                      { label: "Profiles Enriched", value: 847 },
                      { label: "Emails Found", value: 792 },
                      { label: "Phones Found", value: 423 },
                    ].map((metric) => (
                      <div key={metric.label}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-muted-foreground">
                            {metric.label}
                          </span>
                          <span className="font-medium">{metric.value}</span>
                        </div>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full transition-all duration-500"
                            style={{ width: `${(metric.value / 847) * 100}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 md:py-24 bg-muted/30 border-t border-border">
          <div className="max-w-3xl mx-auto px-6 text-center">
            <h2 className="text-2xl md:text-3xl font-semibold tracking-tight mb-4">
              Ready to enrich your contacts?
            </h2>
            <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
              Join the waitlist for early access to the most accurate LinkedIn
              enrichment tool.
            </p>
            <Link href="/waitlist">
              <Button size="lg">
                Join the Waitlist
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </div>
        </section>

        {/* Footer */}
        <footer className="py-10 border-t border-border">
          <div className="max-w-6xl mx-auto px-6">
            <div className="flex flex-col md:flex-row justify-between items-center gap-6">
              <div className="flex flex-col items-center md:items-start gap-3">
                <Link href="/" className="text-lg font-semibold">
                  EnrichEngine
                </Link>
                <div className="text-sm text-muted-foreground">
                  &copy; {new Date().getFullYear()} EnrichEngine. All rights reserved.
                </div>
              </div>
              <div className="flex gap-6 text-sm text-muted-foreground">
                <Link
                  href="/login"
                  className="hover:text-foreground transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  href="/waitlist"
                  className="hover:text-foreground transition-colors"
                >
                  Waitlist
                </Link>
                <Link
                  href="/privacy"
                  className="hover:text-foreground transition-colors"
                >
                  Privacy
                </Link>
                <Link
                  href="/terms"
                  className="hover:text-foreground transition-colors"
                >
                  Terms
                </Link>
              </div>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
