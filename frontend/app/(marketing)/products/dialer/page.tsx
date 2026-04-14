"use client";

import { useState, useEffect } from "react";
import {
  Phone,
  Zap,
  Users,
  MapPin,
  Headphones,
  Trophy,
  Target,
  FolderOpen,
  GitBranch,
  ArrowRight,
  Sparkles,
  Mic,
  BarChart3,
} from "lucide-react";
import DarkNavigation from "@/components/landing/DarkNavigation";
import DarkFooter from "@/components/landing/DarkFooter";
import {
  FeaturePageHero,
  FeatureSection,
  StatsRow,
  FeaturePageCTA,
  FeaturesGrid,
} from "@/components/landing/features";

// Power Dialer Demo
function PowerDialerDemo() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [callTimer, setCallTimer] = useState(0);
  const contacts = [
    { name: "Sarah Chen", company: "Acme Corp", status: "connected" },
    { name: "Mike Johnson", company: "TechStart", status: "no-answer" },
    { name: "Lisa Park", company: "GrowthCo", status: "voicemail" },
    { name: "David Kim", company: "ScaleUp", status: "queued" },
    { name: "Emma Wilson", company: "StartupHQ", status: "queued" },
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % contacts.length);
      setCallTimer(0);
    }, 4000);
    return () => clearInterval(interval);
  }, [contacts.length]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCallTimer((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [activeIndex]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span className="text-sm text-green-400 font-medium">Active Call</span>
        </div>
        <span className="text-sm text-white/60 tabular-nums">{formatTime(callTimer)}</span>
      </div>

      <div className="space-y-2">
        {contacts.map((contact, i) => {
          const isActive = i === activeIndex;
          const isPast = i < activeIndex;
          return (
            <div
              key={i}
              className={`flex items-center gap-3 p-3 rounded-lg transition-all duration-300 border ${
                isActive
                  ? "bg-green-500/10 border-green-500/20 scale-[1.02]"
                  : isPast
                  ? "opacity-50 border-transparent"
                  : "border-white/5 bg-white/[0.02]"
              }`}
            >
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-medium ${
                isActive ? "bg-green-500 text-black" : isPast ? "bg-white/5 text-white/40" : "bg-white/10 text-white"
              }`}>
                {contact.name.split(" ").map((n) => n[0]).join("")}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm text-white truncate">{contact.name}</div>
                <div className="text-xs text-white/40 truncate">{contact.company}</div>
              </div>
              <div className="text-right">
                {isActive ? (
                  <div className="text-xs text-green-400 font-medium">Connected</div>
                ) : isPast ? (
                  <div className="text-xs text-white/40">Completed</div>
                ) : (
                  <div className="text-xs text-white/40">Queued</div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-center gap-2 pt-2 text-xs text-white/40">
        <ArrowRight className="w-3 h-3" />
        <span>Auto-advancing to next contact</span>
      </div>
    </div>
  );
}

// AI Sales Coach Demo
function SalesCoachDemo() {
  const score = 8.5;
  const insights = [
    { label: "Opening", rating: "Strong", score: 9, color: "text-green-400", bgColor: "bg-green-500/20" },
    { label: "Discovery Questions", rating: "Good", score: 8, color: "text-blue-400", bgColor: "bg-blue-500/20" },
    { label: "Objection Handling", rating: "Needs Work", score: 6, color: "text-yellow-400", bgColor: "bg-yellow-500/20" },
    { label: "Close Attempt", rating: "Strong", score: 9, color: "text-green-400", bgColor: "bg-green-500/20" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 p-4 bg-white/5 rounded-lg">
        <div className="relative w-20 h-20">
          <svg className="w-20 h-20 -rotate-90">
            <circle cx="40" cy="40" r="34" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="6" />
            <circle cx="40" cy="40" r="34" fill="none" stroke="#22c55e" strokeWidth="6" strokeDasharray={`${(score / 10) * 214} 214`} strokeLinecap="round" />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-2xl font-bold text-white">{score}</span>
        </div>
        <div>
          <div className="text-sm text-white/40 mb-1">Call Score</div>
          <div className="text-xl font-semibold text-green-400">High Performer</div>
          <div className="text-xs text-white/40 mt-1">Top 15% this week</div>
        </div>
      </div>

      <div className="space-y-2">
        {insights.map((insight, i) => (
          <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-white/[0.02] hover:bg-white/5 transition-colors">
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-lg ${insight.bgColor} flex items-center justify-center`}>
                <span className={`text-xs font-bold ${insight.color}`}>{insight.score}</span>
              </div>
              <span className="text-sm text-white">{insight.label}</span>
            </div>
            <span className={`text-xs font-medium ${insight.color}`}>{insight.rating}</span>
          </div>
        ))}
      </div>

      <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
        <div className="flex items-start gap-2">
          <Sparkles className="w-4 h-4 text-blue-400 mt-0.5" />
          <div>
            <div className="text-xs text-blue-400 font-medium mb-1">AI Suggestion</div>
            <p className="text-xs text-white/60">Try using the SPIN framework when handling objections. Ask about the impact of not solving their problem.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Sales Floor Leaderboard Demo
function SalesFloorDemo() {
  const [reps, setReps] = useState([
    { name: "Alex M.", calls: 47, connects: 12, active: true },
    { name: "Sarah K.", calls: 43, connects: 10, active: false },
    { name: "Mike T.", calls: 38, connects: 9, active: true },
    { name: "Lisa P.", calls: 31, connects: 7, active: false },
  ]);

  useEffect(() => {
    const interval = setInterval(() => {
      setReps((prev) =>
        prev
          .map((rep) => ({
            ...rep,
            calls: rep.calls + (Math.random() > 0.7 ? 1 : 0),
            connects: rep.connects + (Math.random() > 0.9 ? 1 : 0),
          }))
          .sort((a, b) => b.calls - a.calls)
      );
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 px-3 py-2 bg-purple-500/10 border border-purple-500/20 rounded-lg">
        <Trophy className="w-4 h-4 text-purple-400" />
        <span className="text-xs text-purple-400 font-medium">Call Blitz Active</span>
        <span className="ml-auto text-xs text-white/40 tabular-nums">23:45 remaining</span>
      </div>

      {reps.map((rep, i) => (
        <div key={i} className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
          i === 0 ? "bg-yellow-500/10 border border-yellow-500/20" : "bg-white/5"
        }`}>
          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
            i === 0 ? "bg-yellow-500 text-black" : "bg-white/20 text-white"
          }`}>
            {i + 1}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-white">{rep.name}</span>
              {rep.active && <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />}
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm font-semibold text-white tabular-nums">{rep.calls}</div>
            <div className="text-xs text-white/40">{rep.connects} connects</div>
          </div>
        </div>
      ))}
    </div>
  );
}

// Pipeline CRM Demo
function PipelineDemo() {
  const stages = [
    {
      name: "Prospecting",
      deals: [
        { name: "Acme Corp", value: "$25,000" },
        { name: "TechStart", value: "$15,000" },
      ],
      color: "border-blue-500/30",
    },
    {
      name: "Discovery",
      deals: [
        { name: "GrowthCo", value: "$45,000" },
        { name: "ScaleUp", value: "$30,000" },
      ],
      color: "border-yellow-500/30",
    },
    {
      name: "Proposal",
      deals: [{ name: "Enterprise Inc", value: "$80,000" }],
      color: "border-purple-500/30",
    },
    {
      name: "Negotiation",
      deals: [
        { name: "BigCorp", value: "$120,000" },
        { name: "MegaTech", value: "$65,000" },
      ],
      color: "border-green-500/30",
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-white">Pipeline View</span>
        <span className="text-xs text-white/40">$380K total value</span>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {stages.map((stage) => (
          <div key={stage.name} className="space-y-2">
            <div className="text-xs text-white/40 truncate">{stage.name}</div>
            <div className={`min-h-[100px] rounded-lg border ${stage.color} bg-white/[0.02] p-2 space-y-2`}>
              {stage.deals.map((deal, i) => (
                <div key={i} className="p-2 bg-[#111111] rounded border border-white/5 hover:border-white/10 transition-colors">
                  <div className="text-xs font-medium text-white truncate">{deal.name}</div>
                  <div className="text-[10px] text-green-400">{deal.value}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Campaigns Demo
function CampaignsDemo() {
  const campaigns = [
    { name: "Q1 Enterprise Outreach", leads: 450, dialed: 312, connected: 89, status: "Active" },
    { name: "Startup Revival", leads: 230, dialed: 180, connected: 42, status: "Active" },
    { name: "Webinar Follow-up", leads: 125, dialed: 125, connected: 31, status: "Complete" },
  ];

  return (
    <div className="space-y-3">
      {campaigns.map((campaign, i) => (
        <div key={i} className="p-4 bg-white/5 rounded-lg hover:bg-white/10 transition-colors">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-white">{campaign.name}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full ${
              campaign.status === "Active" ? "bg-green-500/20 text-green-400" : "bg-white/10 text-white/50"
            }`}>
              {campaign.status}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <div className="text-lg font-semibold text-white tabular-nums">{campaign.leads}</div>
              <div className="text-xs text-white/40">Leads</div>
            </div>
            <div>
              <div className="text-lg font-semibold text-blue-400 tabular-nums">{campaign.dialed}</div>
              <div className="text-xs text-white/40">Dialed</div>
            </div>
            <div>
              <div className="text-lg font-semibold text-green-400 tabular-nums">{campaign.connected}</div>
              <div className="text-xs text-white/40">Connected</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

const stats = [
  { value: "10x", label: "More calls per hour" },
  { value: "400%", label: "Higher answer rates" },
  { value: "23%", label: "Better close rate" },
  { value: "45min", label: "Saved per day" },
];

const gridFeatures = [
  {
    title: "Power Dialing",
    description: "Auto-advance through your call list. No manual clicking between calls.",
    icon: Zap,
  },
  {
    title: "Parallel Dialing",
    description: "Call multiple lines simultaneously. First to answer gets connected.",
    icon: Users,
  },
  {
    title: "AI Sales Coach",
    description: "Every call scored by AI with actionable coaching insights.",
    icon: Headphones,
  },
  {
    title: "Sales Floor",
    description: "Real-time leaderboards and call blitzes that drive competition.",
    icon: Trophy,
  },
  {
    title: "CRM Pipeline",
    description: "Built-in pipeline management from prospect to close.",
    icon: GitBranch,
  },
  {
    title: "Campaigns",
    description: "Organize outreach, track dials, and measure results.",
    icon: Target,
  },
  {
    title: "Lead Lists",
    description: "Organize leads with folders, favorites, and smart filters.",
    icon: FolderOpen,
  },
  {
    title: "Local Presence",
    description: "Display local caller IDs to increase answer rates by up to 400%.",
    icon: MapPin,
  },
  {
    title: "Call Recording",
    description: "Every call recorded and transcribed. Search and share clips.",
    icon: Mic,
  },
  {
    title: "Real-time Analytics",
    description: "Connect rates, talk time, dispositions, and performance dashboards.",
    icon: BarChart3,
  },
];

export default function DialerPage() {
  return (
    <div className="min-h-screen text-white bg-[#0a0a0a]">
      <DarkNavigation />

      <div className="relative z-10 bg-[#0a0a0a] pt-16">
        <main>
          <FeaturePageHero
            badge="OmniDial"
            headline="The dialer built for closers"
            description="Power dialing, AI coaching, team competitions, CRM, and campaigns — all in one platform built for high-velocity sales teams."
            icon={Phone}
          />

          <StatsRow stats={stats} />

          <FeatureSection
            title="Power through your list"
            description="The power dialer automatically advances through your contact list. When a call ends, the next number dials immediately. Stay in flow and maximize your talk time."
            demo={<PowerDialerDemo />}
          />

          <FeatureSection
            title="AI coaching on every call"
            description="Every call is automatically analyzed and scored across key selling behaviors. Get specific, actionable feedback that helps you close more deals."
            demo={<SalesCoachDemo />}
            reversed
            delay={100}
          />

          <FeatureSection
            title="Drive team performance"
            description="Run call blitzes, track live activity, and drive team competitions with real-time leaderboards. See who's dialing, who's connecting, and who's closing."
            demo={<SalesFloorDemo />}
          />

          <FeatureSection
            title="Pipeline at a glance"
            description="A CRM built for dialers. Track deals through customizable stages, log activities automatically, and manage your pipeline without switching tabs."
            demo={<PipelineDemo />}
            reversed
            delay={100}
          />

          <FeatureSection
            title="Organize your outreach"
            description="Create targeted campaigns, distribute leads across your team, track dials, and measure results. Know exactly what's working and what's not."
            demo={<CampaignsDemo />}
          />

          <FeaturesGrid
            title="Everything you need to close more deals"
            subtitle="Every feature designed to maximize your time on the phone and your team's performance"
            features={gridFeatures}
          />

          <FeaturePageCTA
            headline="Ready to dial smarter?"
            description="Join the waitlist and be first to experience the complete sales dialing platform."
          />
        </main>
      </div>

      <DarkFooter />
    </div>
  );
}
