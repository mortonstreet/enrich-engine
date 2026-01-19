"use client";

import Link from "next/link";
import React, { useEffect, useRef, useState } from "react";
import {
  Mail,
  Phone,
  Search,
  Download,
  Layers,
  Code,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/Button";

const stats = [
  { value: 95, suffix: "%", label: "Email accuracy" },
  { value: 10, suffix: "x", label: "Faster" },
  { value: 1000, suffix: "+", label: "Profiles/hour" },
  { value: 29, suffix: "", prefix: "$", label: "Per month" },
];

const features = [
  {
    icon: Search,
    title: "LinkedIn Scraper",
    description: "Upload names or companies. Get LinkedIn profile URLs.",
    span: "2x1" as const,
  },
  {
    icon: Mail,
    title: "Email Finder",
    description: "95% accuracy. Verified business emails.",
    span: "1x1" as const,
  },
  {
    icon: Phone,
    title: "Phone Finder",
    description: "Direct dials. Mobile numbers.",
    span: "1x1" as const,
  },
  {
    icon: Download,
    title: "CSV Export",
    description: "Download enriched lists. Ready for outreach.",
    span: "1x1" as const,
  },
  {
    icon: Layers,
    title: "Bulk Processing",
    description: "1000+ profiles per hour. Background queue.",
    span: "2x1" as const,
  },
  {
    icon: Code,
    title: "API Access",
    description: "Integrate with your stack. REST endpoints.",
    span: "3x1" as const,
  },
];

const steps = [
  {
    number: "01",
    title: "Upload",
    description: "Import CSV with names, companies, or roles.",
  },
  {
    number: "02",
    title: "Scrape",
    description: "Find LinkedIn profiles automatically.",
  },
  {
    number: "03",
    title: "Enrich",
    description: "Get emails and phone numbers. Export.",
  },
];

// Animated counter hook
function useCounter(end: number, duration: number = 2000, shouldAnimate: boolean) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!shouldAnimate) return;

    let startTime: number | null = null;
    let animationFrame: number;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);

      // Easing function for smooth animation
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      setCount(Math.floor(easeOutQuart * end));

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [end, duration, shouldAnimate]);

  return count;
}

function StatCard({ value, suffix, prefix, label, shouldAnimate }: {
  value: number;
  suffix: string;
  prefix?: string;
  label: string;
  shouldAnimate: boolean;
}) {
  const count = useCounter(value, 2000, shouldAnimate);

  return (
    <div className="text-center">
      <div className="text-4xl md:text-5xl font-bold text-foreground mb-2 tracking-tight">
        {prefix && <span>{prefix}</span>}
        {shouldAnimate ? count : value}
        <span className="text-foreground/60">{suffix}</span>
      </div>
      <div className="text-sm text-muted-foreground font-medium">
        {label}
      </div>
    </div>
  );
}

export default function Home() {
  const statsRef = useRef<HTMLElement>(null);
  const [statsVisible, setStatsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setStatsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );

    if (statsRef.current) {
      observer.observe(statsRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="text-xl font-semibold tracking-tight">
              Enrich Engine
            </Link>
            <div className="flex items-center gap-3">
              <Link
                href="/login"
                className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Sign in
              </Link>
              <Link href="/waitlist">
                <Button size="default">
                  Waitlist
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <main>
        {/* Hero Section */}
        <section className="py-16 md:py-24 lg:py-32 overflow-hidden">
          <div className="max-w-6xl mx-auto px-6">
            <div className="text-center">
              {/* Giant "Scrape" headline */}
              <h1
                className="text-[clamp(4rem,15vw,12rem)] font-bold tracking-tighter text-foreground leading-none mb-8 animate-fade-in-up"
                style={{
                  fontFamily: "'Inter', -apple-system, sans-serif",
                  letterSpacing: "-0.05em",
                }}
              >
                Scrape
              </h1>

              <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed animate-fade-in-up-delay-1">
                Find LinkedIn profiles. Enrich with emails &amp; phones. Build lead lists.
              </p>

              <div className="flex justify-center animate-fade-in-up-delay-2">
                <Link href="/waitlist">
                  <Button size="lg" className="h-12 px-8 text-base font-medium">
                    Join Waitlist
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section ref={statsRef} className="py-16 md:py-20 border-y border-border bg-muted/30">
          <div className="max-w-6xl mx-auto px-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
              {stats.map((stat, i) => (
                <StatCard
                  key={i}
                  value={stat.value}
                  suffix={stat.suffix}
                  prefix={stat.prefix}
                  label={stat.label}
                  shouldAnimate={statsVisible}
                />
              ))}
            </div>
          </div>
        </section>

        {/* Features Bento Grid Section */}
        <section id="features" className="py-20 md:py-28">
          <div className="max-w-6xl mx-auto px-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 auto-rows-[minmax(160px,auto)]">
              {features.map((feature, i) => {
                const spanClasses: Record<string, string> = {
                  "1x1": "",
                  "2x1": "md:col-span-2",
                  "3x1": "md:col-span-3",
                  "1x2": "md:row-span-2",
                };
                const spanClass = spanClasses[feature.span] || "";

                return (
                  <div
                    key={i}
                    className={`
                      group relative flex flex-col justify-between overflow-hidden
                      rounded-xl border border-border bg-background p-6
                      transition-all duration-300 hover:border-foreground/20 hover:shadow-lg
                      ${spanClass}
                    `}
                  >
                    <div className="space-y-4">
                      <div className="w-11 h-11 rounded-lg bg-foreground/5 flex items-center justify-center text-foreground transition-colors group-hover:bg-foreground group-hover:text-background">
                        <feature.icon className="w-5 h-5" />
                      </div>
                      <h3 className="font-semibold text-foreground text-lg">{feature.title}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section className="py-20 md:py-28 bg-muted/30 border-y border-border">
          <div className="max-w-6xl mx-auto px-6">
            <div className="grid md:grid-cols-3 gap-8 md:gap-12">
              {steps.map((step, i) => (
                <div
                  key={i}
                  className="relative text-center md:text-left"
                >
                  <div className="text-7xl md:text-8xl font-bold text-border/60 mb-4 tracking-tighter">
                    {step.number}
                  </div>
                  <h3 className="text-xl font-semibold mb-3 text-foreground">{step.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {step.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-24 md:py-32">
          <div className="max-w-3xl mx-auto px-6 text-center">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-6">
              Join the waitlist
            </h2>
            <Link href="/waitlist">
              <Button size="lg" className="h-12 px-8 text-base font-medium">
                Join Waitlist
                <ArrowRight className="w-4 h-4 ml-2" />
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
                  Enrich Engine
                </Link>
                <div className="text-sm text-muted-foreground">
                  &copy; Enrich Engine 2026
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
