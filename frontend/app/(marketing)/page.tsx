"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import DarkFooter from "@/components/landing/DarkFooter";
import DarkScrollReveal from "@/components/landing/DarkScrollReveal";
import DarkNavigation from "@/components/landing/DarkNavigation";
import DarkBenchmarkChart from "@/components/landing/DarkBenchmarkChart";
import DarkFeaturesGrid from "@/components/landing/DarkFeaturesGrid";
import {
  Phone,
  ArrowRight,
  Trophy,
  Headphones,
  Sparkles,
  GitBranch,
  Chrome,
  Upload,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  Database,
  ArrowDown,
  FileSpreadsheet,
} from "lucide-react";

// ─── DIALER MOCKUPS ──────────────────────────────────────────────

function DialerQueueMockup() {
  const [activeIndex, setActiveIndex] = useState(0);
  const contacts = [
    { name: "Sarah Chen", company: "Acme Corp", time: "2:34" },
    { name: "Mike Johnson", company: "TechStart", time: "--:--" },
    { name: "Lisa Park", company: "GrowthCo", time: "--:--" },
    { name: "David Kim", company: "ScaleUp", time: "--:--" },
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % contacts.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [contacts.length]);

  return (
    <div className="bg-[#111111] rounded-xl border border-white/10 p-4 space-y-3">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <Phone className="w-4 h-4 text-green-400" />
          <span className="text-xs font-medium text-white/70">Power Dialer</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
          <span className="text-[11px] text-green-400">Active</span>
        </div>
      </div>
      {contacts.map((c, i) => {
        const isActive = i === activeIndex;
        const isPast = i < activeIndex;
        return (
          <div
            key={i}
            className={`flex items-center gap-3 p-2.5 rounded-lg transition-all duration-500 border ${
              isActive
                ? "bg-green-500/10 border-green-500/20"
                : isPast
                ? "opacity-40 border-transparent"
                : "border-white/5 bg-white/[0.02]"
            }`}
          >
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-semibold ${
                isActive
                  ? "bg-green-500 text-black"
                  : "bg-white/10 text-white/60"
              }`}
            >
              {c.name
                .split(" ")
                .map((n) => n[0])
                .join("")}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium text-white truncate">
                {c.name}
              </div>
              <div className="text-[10px] text-white/40">{c.company}</div>
            </div>
            <span
              className={`text-[10px] tabular-nums ${
                isActive ? "text-green-400" : "text-white/30"
              }`}
            >
              {isActive ? c.time : "--:--"}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function LeaderboardMockup() {
  const [reps, setReps] = useState([
    { name: "Alex M.", calls: 47, connects: 12 },
    { name: "Sarah K.", calls: 43, connects: 10 },
    { name: "Mike T.", calls: 38, connects: 9 },
  ]);

  useEffect(() => {
    const interval = setInterval(() => {
      setReps((prev) =>
        prev
          .map((r) => ({
            ...r,
            calls: r.calls + (Math.random() > 0.6 ? 1 : 0),
            connects: r.connects + (Math.random() > 0.85 ? 1 : 0),
          }))
          .sort((a, b) => b.calls - a.calls)
      );
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-[#111111] rounded-xl border border-white/10 p-4 space-y-3">
      <div className="flex items-center gap-2 mb-1">
        <Trophy className="w-4 h-4 text-purple-400" />
        <span className="text-xs font-medium text-white/70">Sales Floor</span>
        <span className="ml-auto text-[10px] px-2 py-0.5 bg-purple-500/15 text-purple-400 rounded-full">
          Blitz Active
        </span>
      </div>
      {reps.map((rep, i) => (
        <div
          key={rep.name}
          className={`flex items-center gap-2.5 p-2.5 rounded-lg ${
            i === 0
              ? "bg-yellow-500/10 border border-yellow-500/15"
              : "bg-white/[0.03]"
          }`}
        >
          <div
            className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold ${
              i === 0
                ? "bg-yellow-500 text-black"
                : "bg-white/15 text-white/60"
            }`}
          >
            {i + 1}
          </div>
          <span className="text-xs font-medium text-white flex-1">
            {rep.name}
          </span>
          <div className="text-right">
            <div className="text-xs font-semibold text-white tabular-nums">
              {rep.calls}
            </div>
            <div className="text-[9px] text-white/40">
              {rep.connects} connects
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function CoachingMockup() {
  const score = 8.5;
  const skills = [
    { label: "Opening", score: 9, color: "bg-green-500" },
    { label: "Discovery", score: 8, color: "bg-blue-500" },
    { label: "Objections", score: 6, color: "bg-yellow-500" },
    { label: "Close", score: 9, color: "bg-green-500" },
  ];

  return (
    <div className="bg-[#111111] rounded-xl border border-white/10 p-4 space-y-3">
      <div className="flex items-center gap-2 mb-1">
        <Headphones className="w-4 h-4 text-green-400" />
        <span className="text-xs font-medium text-white/70">AI Coach</span>
      </div>
      <div className="flex items-center gap-3 p-3 bg-white/[0.03] rounded-lg">
        <div className="relative w-12 h-12 flex-shrink-0">
          <svg className="w-12 h-12 -rotate-90">
            <circle
              cx="24"
              cy="24"
              r="20"
              fill="none"
              stroke="rgba(255,255,255,0.08)"
              strokeWidth="4"
            />
            <circle
              cx="24"
              cy="24"
              r="20"
              fill="none"
              stroke="#22c55e"
              strokeWidth="4"
              strokeDasharray={`${(score / 10) * 126} 126`}
              strokeLinecap="round"
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-white">
            {score}
          </span>
        </div>
        <div>
          <div className="text-sm font-semibold text-green-400">
            High Performer
          </div>
          <div className="text-[10px] text-white/40">Top 15% this week</div>
        </div>
      </div>
      <div className="space-y-2">
        {skills.map((s) => (
          <div key={s.label} className="flex items-center gap-2">
            <span className="text-[11px] text-white/50 w-16 truncate">
              {s.label}
            </span>
            <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
              <div
                className={`h-full ${s.color} rounded-full`}
                style={{ width: `${s.score * 10}%` }}
              />
            </div>
            <span className="text-[10px] text-white/40 tabular-nums w-4 text-right">
              {s.score}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function PipelineMockup() {
  const stages = [
    {
      name: "Prospect",
      deals: ["Acme", "Tech"],
      color: "border-blue-500/30",
    },
    {
      name: "Discovery",
      deals: ["Growth", "Scale", "Start"],
      color: "border-yellow-500/30",
    },
    { name: "Proposal", deals: ["Enter"], color: "border-purple-500/30" },
    {
      name: "Closing",
      deals: ["Big", "Mega"],
      color: "border-green-500/30",
    },
  ];

  return (
    <div className="bg-[#111111] rounded-xl border border-white/10 p-4 space-y-3">
      <div className="flex items-center gap-2 mb-1">
        <GitBranch className="w-4 h-4 text-blue-400" />
        <span className="text-xs font-medium text-white/70">CRM Pipeline</span>
        <span className="ml-auto text-[10px] text-white/40">$380K</span>
      </div>
      <div className="grid grid-cols-4 gap-1.5">
        {stages.map((s) => (
          <div key={s.name} className="space-y-1.5">
            <div className="text-[9px] text-white/40 truncate text-center">
              {s.name}
            </div>
            <div
              className={`min-h-[60px] rounded border ${s.color} bg-white/[0.015] p-1 space-y-1`}
            >
              {s.deals.map((d) => (
                <div
                  key={d}
                  className="px-1.5 py-1 bg-[#0a0a0a] rounded text-[9px] text-white/60 truncate border border-white/5"
                >
                  {d}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── ENRICH MOCKUPS ──────────────────────────────────────────────

function WaterfallMockup() {
  const [step, setStep] = useState(0);
  const providers = [
    { name: "Apollo", status: "miss", icon: Database },
    { name: "Clearbit", status: "miss", icon: Search },
    { name: "Lusha", status: "hit", icon: CheckCircle2 },
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setStep((prev) => (prev + 1) % 4);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-[#111111] rounded-xl border border-white/10 p-4 space-y-3">
      <div className="flex items-center gap-2 mb-1">
        <Sparkles className="w-4 h-4 text-amber-400" />
        <span className="text-xs font-medium text-white/70">
          Waterfall Enrichment
        </span>
      </div>

      {/* Input lead */}
      <div className="p-2.5 bg-white/[0.03] rounded-lg border border-white/5">
        <div className="text-xs font-medium text-white">Sarah Chen</div>
        <div className="text-[10px] text-white/40">VP Sales, Acme Corp</div>
        <div className="text-[10px] text-red-400/70 mt-1 flex items-center gap-1">
          <XCircle className="w-3 h-3" />
          No phone number
        </div>
      </div>

      <div className="flex justify-center">
        <ArrowDown className="w-3.5 h-3.5 text-white/20" />
      </div>

      {/* Provider waterfall */}
      <div className="space-y-2">
        {providers.map((p, i) => {
          const isActive = step === i + 1 || (step === 0 && i === 0);
          const isComplete = step > i + 1 || step === 0;
          const isHit = p.status === "hit" && isComplete;
          const isMiss = p.status === "miss" && isComplete;

          return (
            <div
              key={p.name}
              className={`flex items-center gap-2.5 p-2 rounded-lg border transition-all duration-500 ${
                isActive && step !== 0
                  ? "bg-amber-500/10 border-amber-500/20"
                  : isHit
                  ? "bg-green-500/10 border-green-500/20"
                  : isMiss
                  ? "bg-white/[0.02] border-white/5 opacity-50"
                  : "bg-white/[0.02] border-white/5"
              }`}
            >
              <div
                className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                  isHit
                    ? "bg-green-500/20 text-green-400"
                    : isActive && step !== 0
                    ? "bg-amber-500/20 text-amber-400"
                    : "bg-white/5 text-white/30"
                }`}
              >
                {isActive && step !== 0 ? (
                  <Clock className="w-3.5 h-3.5 animate-spin" />
                ) : isHit ? (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                ) : isMiss ? (
                  <XCircle className="w-3.5 h-3.5 text-white/20" />
                ) : (
                  <p.icon className="w-3.5 h-3.5" />
                )}
              </div>
              <span className="text-xs text-white/60 flex-1">{p.name}</span>
              {isHit && (
                <span className="text-[10px] text-green-400 font-medium">
                  Found
                </span>
              )}
              {isMiss && (
                <span className="text-[10px] text-white/30">No result</span>
              )}
              {isActive && step !== 0 && (
                <span className="text-[10px] text-amber-400">
                  Searching...
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Result */}
      {step === 0 && (
        <div className="p-2.5 bg-green-500/10 border border-green-500/20 rounded-lg">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
            <span className="text-xs text-green-400 font-medium">
              +1 (555) 234-5678
            </span>
          </div>
          <div className="text-[10px] text-white/40 mt-1 ml-5.5">
            via Lusha &middot; 94% confidence
          </div>
        </div>
      )}
    </div>
  );
}

function ChromeExtMockup() {
  return (
    <div className="bg-[#111111] rounded-xl border border-white/10 p-4 space-y-3">
      <div className="flex items-center gap-2 mb-1">
        <Chrome className="w-4 h-4 text-blue-400" />
        <span className="text-xs font-medium text-white/70">
          Chrome Extension
        </span>
      </div>

      {/* Simulated browser bar */}
      <div className="rounded-lg bg-white/[0.03] border border-white/5 overflow-hidden">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-white/[0.03] border-b border-white/5">
          <div className="flex gap-1">
            <div className="w-2 h-2 rounded-full bg-white/10" />
            <div className="w-2 h-2 rounded-full bg-white/10" />
            <div className="w-2 h-2 rounded-full bg-white/10" />
          </div>
          <div className="flex-1 mx-2 px-2 py-0.5 bg-white/5 rounded text-[9px] text-white/30 truncate">
            linkedin.com/in/sarah-chen
          </div>
        </div>

        {/* Extension popup */}
        <div className="p-3 space-y-2.5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-[10px] font-bold text-blue-400">
              SC
            </div>
            <div>
              <div className="text-xs font-medium text-white">Sarah Chen</div>
              <div className="text-[10px] text-white/40">
                VP Sales &middot; Acme Corp
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between p-1.5 bg-green-500/10 rounded border border-green-500/15">
              <span className="text-[10px] text-white/50">Phone</span>
              <span className="text-[10px] text-green-400 font-medium">
                +1 (555) 234-5678
              </span>
            </div>
            <div className="flex items-center justify-between p-1.5 bg-green-500/10 rounded border border-green-500/15">
              <span className="text-[10px] text-white/50">Email</span>
              <span className="text-[10px] text-green-400 font-medium">
                sarah@acme.com
              </span>
            </div>
            <div className="flex items-center justify-between p-1.5 bg-white/[0.03] rounded border border-white/5">
              <span className="text-[10px] text-white/50">Mobile</span>
              <span className="text-[10px] text-amber-400">Enriching...</span>
            </div>
          </div>

          <button className="w-full py-1.5 bg-white text-black text-[10px] font-medium rounded hover:bg-white/90 transition-colors">
            Add to OmniDial
          </button>
        </div>
      </div>
    </div>
  );
}

function BulkUploadMockup() {
  return (
    <div className="bg-[#111111] rounded-xl border border-white/10 p-4 space-y-3">
      <div className="flex items-center gap-2 mb-1">
        <Upload className="w-4 h-4 text-cyan-400" />
        <span className="text-xs font-medium text-white/70">Bulk Enrich</span>
      </div>

      {/* Upload area */}
      <div className="border border-dashed border-white/10 rounded-lg p-4 text-center bg-white/[0.015]">
        <FileSpreadsheet className="w-6 h-6 text-white/20 mx-auto mb-2" />
        <div className="text-[11px] text-white/50">leads_q1.csv</div>
        <div className="text-[10px] text-white/30 mt-0.5">
          2,450 contacts uploaded
        </div>
      </div>

      {/* Progress */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-[10px]">
          <span className="text-white/50">Enrichment progress</span>
          <span className="text-white/70 font-medium tabular-nums">
            1,847 / 2,450
          </span>
        </div>
        <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all"
            style={{ width: "75%" }}
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        <div className="p-2 bg-white/[0.03] rounded text-center">
          <div className="text-sm font-semibold text-green-400 tabular-nums">
            1,623
          </div>
          <div className="text-[9px] text-white/40">Phones found</div>
        </div>
        <div className="p-2 bg-white/[0.03] rounded text-center">
          <div className="text-sm font-semibold text-blue-400 tabular-nums">
            1,789
          </div>
          <div className="text-[9px] text-white/40">Emails found</div>
        </div>
        <div className="p-2 bg-white/[0.03] rounded text-center">
          <div className="text-sm font-semibold text-white tabular-nums">
            88%
          </div>
          <div className="text-[9px] text-white/40">Match rate</div>
        </div>
      </div>
    </div>
  );
}

// ─── MAIN PAGE ───────────────────────────────────────────────────

export default function MarketingHome() {
  return (
    <div className="min-h-screen text-white bg-[#0a0a0a]">
      {/* Navigation with mega menus - fixed at top */}
      <DarkNavigation />

      {/* Main content wrapper - scrolls over sticky footer */}
      <div className="relative z-10 bg-[#0a0a0a] pt-16">
        <main>
          {/* Hero Section */}
          <section className="relative min-h-[80vh] sm:min-h-[85vh] flex items-center overflow-hidden">
            {/* Subtle gradient background */}
            <div
              className="absolute inset-0"
              style={{
                background: "radial-gradient(ellipse at 50% 0%, rgba(255, 255, 255, 0.03) 0%, transparent 60%)",
              }}
            />

            {/* Hero Content */}
            <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 w-full py-12 sm:py-16 md:py-20">
              <div className="text-center">
                {/* Headline */}
                <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl text-white mb-8 sm:mb-10 tracking-tight heading-display">
                  The dialer built for closers
                </h1>

                {/* CTA Buttons */}
                <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4">
                  <Link href="/waitlist">
                    <Button className="w-full sm:w-auto bg-white text-black hover:bg-white/90 rounded-xl px-6 sm:px-8 py-3 sm:py-4 text-sm sm:text-base font-medium h-12 sm:h-14">
                      Join the waitlist
                    </Button>
                  </Link>
                  <a href="https://cal.com/mortonstreet/15min" target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" className="w-full sm:w-auto border-white/20 text-white hover:bg-white/10 rounded-xl px-6 sm:px-8 py-3 sm:py-4 text-sm sm:text-base font-medium h-12 sm:h-14">
                      Book a demo
                    </Button>
                  </a>
                </div>
              </div>
            </div>
          </section>

          {/* ─── DIALER PRODUCT SHOWCASE ────────────────────── */}
          <section className="py-20 sm:py-28 md:py-36 relative overflow-hidden">
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background:
                  "radial-gradient(ellipse at 30% 50%, rgba(59, 130, 246, 0.04) 0%, transparent 50%)",
              }}
            />
            <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6">
              <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
                {/* Text */}
                <div>
                  <DarkScrollReveal>
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 mb-6">
                      <Phone className="w-3.5 h-3.5 text-white/60" />
                      <span className="text-xs font-medium text-white/60">
                        Dialer
                      </span>
                    </div>
                    <h2 className="text-3xl sm:text-4xl md:text-5xl tracking-tight text-white mb-6 heading-display">
                      The complete sales
                      <br />
                      dialing platform
                    </h2>
                    <p className="text-white/50 text-base sm:text-lg mb-8 max-w-lg font-light leading-relaxed">
                      Power dialing, AI coaching, team competitions, CRM, and
                      campaigns. Everything your team needs to make more calls
                      and close more deals.
                    </p>
                    <Link
                      href="/products/dialer"
                      className="inline-flex items-center gap-2 text-white font-medium text-sm hover:gap-3 transition-all group"
                    >
                      Explore Dialer
                      <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                    </Link>
                  </DarkScrollReveal>
                </div>

                {/* Mockups grid */}
                <div className="grid grid-cols-2 gap-3">
                  <DarkScrollReveal>
                    <DialerQueueMockup />
                  </DarkScrollReveal>
                  <DarkScrollReveal delay={100}>
                    <LeaderboardMockup />
                  </DarkScrollReveal>
                  <DarkScrollReveal delay={200}>
                    <CoachingMockup />
                  </DarkScrollReveal>
                  <DarkScrollReveal delay={300}>
                    <PipelineMockup />
                  </DarkScrollReveal>
                </div>
              </div>
            </div>
          </section>

          {/* ─── ENRICH PRODUCT SHOWCASE ────────────────────── */}
          <section className="py-20 sm:py-28 md:py-36 relative overflow-hidden border-t border-white/5">
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background:
                  "radial-gradient(ellipse at 70% 50%, rgba(251, 191, 36, 0.03) 0%, transparent 50%)",
              }}
            />
            <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6">
              <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
                {/* Mockups grid - left on desktop */}
                <div className="order-2 lg:order-1 grid grid-cols-2 gap-3">
                  <div className="col-span-2 sm:col-span-1">
                    <DarkScrollReveal>
                      <WaterfallMockup />
                    </DarkScrollReveal>
                  </div>
                  <div className="col-span-2 sm:col-span-1 space-y-3">
                    <DarkScrollReveal delay={100}>
                      <ChromeExtMockup />
                    </DarkScrollReveal>
                    <DarkScrollReveal delay={200}>
                      <BulkUploadMockup />
                    </DarkScrollReveal>
                  </div>
                </div>

                {/* Text - right on desktop */}
                <div className="order-1 lg:order-2">
                  <DarkScrollReveal>
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 mb-6">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400/70" />
                      <span className="text-xs font-medium text-white/60">
                        Enrich
                      </span>
                    </div>
                    <h2 className="text-3xl sm:text-4xl md:text-5xl tracking-tight text-white mb-6 heading-display">
                      Find every number
                      <br />
                      before you dial
                    </h2>
                    <p className="text-white/50 text-base sm:text-lg mb-8 max-w-lg font-light leading-relaxed">
                      Chrome extension and multivendor bulk enrichment. Waterfall
                      through data providers to find direct dials, mobiles, and
                      emails for every prospect on your list.
                    </p>
                    <a
                      href="https://enrich.omnidial.io"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-white font-medium text-sm hover:gap-3 transition-all group"
                    >
                      Explore Enrich
                      <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                    </a>
                  </DarkScrollReveal>
                </div>
              </div>
            </div>
          </section>

          {/* Features Grid */}
          <DarkFeaturesGrid />

          {/* Benchmark Comparison Chart */}
          <DarkBenchmarkChart />

          {/* How it works */}
          <section className="py-20 sm:py-24 md:py-32 lg:py-40 border-y border-white/5">
            <div className="max-w-6xl mx-auto px-4 sm:px-6">
              <DarkScrollReveal>
                <h2 className="text-3xl sm:text-4xl md:text-5xl mb-12 sm:mb-16 lg:mb-20 tracking-tight text-white heading-display">
                  How it works
                </h2>
              </DarkScrollReveal>

              <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-12 sm:gap-16 lg:gap-20">
                <DarkScrollReveal>
                  <div className="text-center sm:text-left group">
                    <div className="text-6xl sm:text-7xl lg:text-8xl font-medium text-white/10 font-mono mb-4 sm:mb-6 transition-colors group-hover:text-white/20">
                      01
                    </div>
                    <h3 className="text-lg sm:text-xl font-medium text-white mb-3">Upload your list</h3>
                    <p className="text-base text-white/50 leading-relaxed font-light">
                      Import CSV or connect your CRM. Map your fields and you&apos;re ready to dial.
                    </p>
                  </div>
                </DarkScrollReveal>
                <DarkScrollReveal delay={150}>
                  <div className="text-center sm:text-left group">
                    <div className="text-6xl sm:text-7xl lg:text-8xl font-medium text-white/10 font-mono mb-4 sm:mb-6 transition-colors group-hover:text-white/20">
                      02
                    </div>
                    <h3 className="text-lg sm:text-xl font-medium text-white mb-3">Configure settings</h3>
                    <p className="text-base text-white/50 leading-relaxed font-light">
                      Set your caller ID, record voicemails, customize dispositions and outcomes.
                    </p>
                  </div>
                </DarkScrollReveal>
                <DarkScrollReveal delay={300}>
                  <div className="text-center sm:text-left sm:col-span-2 md:col-span-1 group">
                    <div className="text-6xl sm:text-7xl lg:text-8xl font-medium text-white/10 font-mono mb-4 sm:mb-6 transition-colors group-hover:text-white/20">
                      03
                    </div>
                    <h3 className="text-lg sm:text-xl font-medium text-white mb-3">Start dialing</h3>
                    <p className="text-base text-white/50 leading-relaxed font-light">
                      Hit start. Auto-advance keeps you in flow. Focus on conversations, not clicking.
                    </p>
                  </div>
                </DarkScrollReveal>
              </div>
            </div>
          </section>

          {/* CTA Section */}
          <section className="py-16 sm:py-24 md:py-32 relative overflow-hidden">
            {/* Subtle radial gradient */}
            <div
              className="absolute inset-0"
              style={{
                background: "radial-gradient(ellipse at 50% 100%, rgba(255, 255, 255, 0.02) 0%, transparent 60%)",
              }}
            />

            <div className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 text-center">
              <DarkScrollReveal>
                <h2
                  className="text-3xl sm:text-4xl md:text-5xl mb-4 sm:mb-6 leading-tight text-white heading-display"
                >
                  Ready to dial smarter?
                </h2>
                <p className="text-white/50 text-base sm:text-lg mb-8 sm:mb-10 max-w-xl mx-auto font-light">
                  Join the waitlist and be first to experience the future of sales dialing.
                </p>
                <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4">
                  <Link href="/waitlist">
                    <Button className="w-full sm:w-auto bg-white text-black hover:bg-white/90 rounded-xl px-6 sm:px-8 py-3 sm:py-4 text-sm sm:text-base font-medium h-12 sm:h-14">
                      Join the waitlist
                    </Button>
                  </Link>
                  <a href="https://cal.com/mortonstreet/15min" target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" className="w-full sm:w-auto border-white/20 text-white hover:bg-white/10 rounded-xl px-6 sm:px-8 py-3 sm:py-4 text-sm sm:text-base font-medium h-12 sm:h-14">
                      Talk to us
                    </Button>
                  </a>
                </div>
              </DarkScrollReveal>
            </div>
          </section>
        </main>
      </div>

      {/* Footer - sticky at bottom, revealed as content scrolls */}
      <DarkFooter />
    </div>
  );
}
