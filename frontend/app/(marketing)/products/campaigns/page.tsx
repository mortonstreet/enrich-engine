"use client";

import { useState, useEffect } from "react";
import {
  Target,
  BarChart3,
  Users,
  TrendingUp,
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

// Campaign Progress Demo
function CampaignProgressDemo() {
  const [campaigns, setCampaigns] = useState([
    {
      name: "Q1 Enterprise Outreach",
      leads: 450,
      dialed: 312,
      connected: 89,
      meetings: 23,
      status: "active",
    },
    {
      name: "Startup Revival",
      leads: 230,
      dialed: 180,
      connected: 42,
      meetings: 11,
      status: "active",
    },
    {
      name: "Webinar Follow-up",
      leads: 125,
      dialed: 125,
      connected: 31,
      meetings: 8,
      status: "complete",
    },
  ]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCampaigns((prev) =>
        prev.map((c) => {
          if (c.status !== "active") return c;
          const newDialed = Math.min(c.dialed + 1, c.leads);
          const newConnected =
            c.connected + (Math.random() > 0.7 && newDialed > c.dialed ? 1 : 0);
          return {
            ...c,
            dialed: newDialed,
            connected: newConnected,
          };
        })
      );
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-4">
      {campaigns.map((campaign, i) => {
        const progress = Math.round((campaign.dialed / campaign.leads) * 100);
        return (
          <div
            key={i}
            className="p-4 bg-white/[0.02] rounded-lg border border-white/5 hover:border-white/10 transition-colors"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="font-medium text-white">{campaign.name}</span>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full ${
                    campaign.status === "active"
                      ? "bg-green-500/20 text-green-400"
                      : "bg-white/10 text-white/50"
                  }`}
                >
                  {campaign.status === "active" ? "Active" : "Complete"}
                </span>
              </div>
              {campaign.status === "active" && (
                <span className="text-xs text-white/40 tabular-nums">
                  {progress}%
                </span>
              )}
            </div>

            {/* Progress bar */}
            <div className="h-2 bg-white/10 rounded-full overflow-hidden mb-3">
              <div
                className={`h-full transition-all duration-500 ${
                  campaign.status === "active" ? "bg-blue-500" : "bg-green-500"
                }`}
                style={{ width: `${progress}%` }}
              />
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-4 gap-2 text-center">
              <div>
                <div className="text-sm font-semibold text-white tabular-nums">
                  {campaign.leads}
                </div>
                <div className="text-[10px] text-white/40">Leads</div>
              </div>
              <div>
                <div className="text-sm font-semibold text-blue-400 tabular-nums">
                  {campaign.dialed}
                </div>
                <div className="text-[10px] text-white/40">Dialed</div>
              </div>
              <div>
                <div className="text-sm font-semibold text-green-400 tabular-nums">
                  {campaign.connected}
                </div>
                <div className="text-[10px] text-white/40">Connected</div>
              </div>
              <div>
                <div className="text-sm font-semibold text-purple-400 tabular-nums">
                  {campaign.meetings}
                </div>
                <div className="text-[10px] text-white/40">Meetings</div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Campaign Analytics Demo
function CampaignAnalyticsDemo() {
  const metrics = [
    { label: "Total Dials", value: "2,847", change: "+234 today" },
    { label: "Connect Rate", value: "28.4%", change: "+2.1%" },
    { label: "Meetings Set", value: "42", change: "+8 this week" },
    { label: "Pipeline Generated", value: "$234K", change: "+$45K" },
  ];

  const dayStats = [
    { day: "Mon", dials: 145, connects: 38 },
    { day: "Tue", dials: 178, connects: 52 },
    { day: "Wed", dials: 156, connects: 41 },
    { day: "Thu", dials: 189, connects: 58 },
    { day: "Fri", dials: 134, connects: 35 },
  ];

  const maxDials = Math.max(...dayStats.map((d) => d.dials));

  return (
    <div className="space-y-4">
      {/* Metric cards */}
      <div className="grid grid-cols-2 gap-2">
        {metrics.map((metric, i) => (
          <div
            key={i}
            className="p-3 bg-white/5 rounded-lg hover:bg-white/[0.07] transition-colors"
          >
            <div className="text-xs text-white/40 mb-1">{metric.label}</div>
            <div className="text-xl font-semibold text-white tabular-nums">
              {metric.value}
            </div>
            <div className="text-xs text-green-400">{metric.change}</div>
          </div>
        ))}
      </div>

      {/* Activity chart */}
      <div className="p-4 bg-white/[0.02] rounded-lg">
        <div className="text-xs text-white/40 mb-4">This Week</div>
        <div className="flex items-end justify-between h-24 gap-2">
          {dayStats.map((day, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full flex flex-col gap-0.5">
                <div
                  className="w-full bg-blue-500/60 rounded-sm transition-all"
                  style={{ height: `${(day.dials / maxDials) * 60}px` }}
                />
                <div
                  className="w-full bg-green-500/60 rounded-sm transition-all"
                  style={{ height: `${(day.connects / maxDials) * 60}px` }}
                />
              </div>
              <span className="text-[10px] text-white/40">{day.day}</span>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-center gap-4 mt-3">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-blue-500/60 rounded-sm" />
            <span className="text-[10px] text-white/40">Dials</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-green-500/60 rounded-sm" />
            <span className="text-[10px] text-white/40">Connects</span>
          </div>
        </div>
      </div>
    </div>
  );
}

const features = [
  {
    title: "Campaign Creation",
    description:
      "Build targeted campaigns in minutes. Assign leads, set goals, and launch with one click.",
    icon: Target,
  },
  {
    title: "Progress Tracking",
    description:
      "Real-time visibility into every campaign. Track dials, connects, and conversions as they happen.",
    icon: TrendingUp,
  },
  {
    title: "Analytics",
    description:
      "Deep insights into what's working. Compare campaigns, identify top performers, optimize your approach.",
    icon: BarChart3,
  },
  {
    title: "Team Assignment",
    description:
      "Distribute leads across your team. Balance workloads and track individual contribution.",
    icon: Users,
  },
];

const stats = [
  { value: "3.2x", label: "More organized outreach" },
  { value: "45%", label: "Higher completion rate" },
  { value: "Real-time", label: "Progress visibility" },
  { value: "100%", label: "Activities tracked" },
];

export default function CampaignsPage() {
  return (
    <div className="min-h-screen text-white bg-[#0a0a0a]">
      <DarkNavigation />

      <div className="relative z-10 bg-[#0a0a0a] pt-16">
        <main>
          <FeaturePageHero
            badge="Campaigns"
            headline="Track every dial, measure every result"
            description="Organize outreach into campaigns. Know exactly where you stand and what's working."
            icon={Target}
          />

          <StatsRow stats={stats} />

          <FeatureSection
            title="See your progress in real-time"
            description="Watch as your team works through campaigns. Track dials, connects, and meetings as they happen. Never wonder 'where are we?' again."
            demo={<CampaignProgressDemo />}
          />

          <FeatureSection
            title="Analytics that drive decisions"
            description="Understand what's working and what's not. Compare campaigns, track trends, and optimize your approach based on real data."
            demo={<CampaignAnalyticsDemo />}
            reversed
            delay={100}
          />

          <FeaturesGrid
            title="Campaign management done right"
            subtitle="Tools that help you plan, execute, and measure your outreach"
            features={features}
          />

          <FeaturePageCTA
            headline="Ready to organize your outreach?"
            description="Join the waitlist and experience campaign management built for sales teams."
          />
        </main>
      </div>

      <DarkFooter />
    </div>
  );
}
