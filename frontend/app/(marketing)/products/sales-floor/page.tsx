"use client";

import { useState, useEffect } from "react";
import {
  Trophy,
  Zap,
  Activity,
  Medal,
  Flame,
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

// Enhanced Leaderboard Demo
function LeaderboardDemoEnhanced() {
  const [reps, setReps] = useState([
    { name: "Alex Martinez", calls: 127, connects: 34, meetings: 8, trend: "up" },
    { name: "Sarah Kim", calls: 118, connects: 31, meetings: 7, trend: "up" },
    { name: "Mike Thompson", calls: 105, connects: 28, meetings: 6, trend: "down" },
    { name: "Lisa Park", calls: 98, connects: 25, meetings: 5, trend: "up" },
    { name: "David Chen", calls: 89, connects: 22, meetings: 4, trend: "same" },
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

  const medals = ["bg-yellow-500", "bg-gray-400", "bg-amber-600"];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Trophy className="w-4 h-4 text-yellow-400" />
          <span className="text-sm font-medium text-white">
            Today&apos;s Leaderboard
          </span>
        </div>
        <span className="text-xs text-white/40">Live</span>
      </div>

      {/* Leaderboard */}
      <div className="space-y-2">
        {reps.map((rep, i) => (
          <div
            key={rep.name}
            className={`flex items-center gap-3 p-3 rounded-lg transition-all ${
              i === 0
                ? "bg-yellow-500/10 border border-yellow-500/20"
                : "bg-white/[0.02] border border-transparent"
            }`}
          >
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                i < 3 ? `${medals[i]} text-black` : "bg-white/10 text-white"
              }`}
            >
              {i + 1}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-white truncate">
                  {rep.name}
                </span>
                {i === 0 && <Flame className="w-3 h-3 text-orange-400" />}
              </div>
              <div className="text-xs text-white/40">
                {rep.connects} connects | {rep.meetings} meetings
              </div>
            </div>
            <div className="text-right">
              <div className="text-lg font-semibold text-white tabular-nums">
                {rep.calls}
              </div>
              <div className="text-xs text-white/40">calls</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Call Blitz Demo
function CallBlitzDemo() {
  const [timeLeft, setTimeLeft] = useState(1425);
  const [teamCalls, setTeamCalls] = useState(234);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
      if (Math.random() > 0.5) {
        setTeamCalls((prev) => prev + 1);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="space-y-4">
      {/* Blitz header */}
      <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-lg">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-purple-400" />
            <span className="font-semibold text-white">Power Hour Blitz</span>
          </div>
          <span className="text-sm text-purple-400">LIVE</span>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-3 bg-white/5 rounded-lg">
            <div className="text-3xl font-bold text-white tabular-nums">
              {formatTime(timeLeft)}
            </div>
            <div className="text-xs text-white/40">Time Remaining</div>
          </div>
          <div className="text-center p-3 bg-white/5 rounded-lg">
            <div className="text-3xl font-bold text-purple-400 tabular-nums">
              {teamCalls}
            </div>
            <div className="text-xs text-white/40">Team Calls</div>
          </div>
        </div>
      </div>

      {/* Activity feed */}
      <div className="space-y-2">
        <div className="text-xs text-white/40 uppercase tracking-wider">
          Live Activity
        </div>
        <div className="space-y-1.5">
          {[
            { name: "Alex M.", action: "connected", time: "just now" },
            { name: "Sarah K.", action: "set meeting", time: "1m ago" },
            { name: "Mike T.", action: "left voicemail", time: "2m ago" },
            { name: "Lisa P.", action: "connected", time: "3m ago" },
          ].map((item, i) => (
            <div
              key={i}
              className="flex items-center justify-between p-2 bg-white/[0.02] rounded-lg"
            >
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-[10px] text-white">
                  {item.name.split(" ")[0][0]}
                  {item.name.split(" ")[1][0]}
                </div>
                <span className="text-sm text-white">{item.name}</span>
                <span
                  className={`text-xs ${
                    item.action === "set meeting"
                      ? "text-green-400"
                      : item.action === "connected"
                      ? "text-blue-400"
                      : "text-white/40"
                  }`}
                >
                  {item.action}
                </span>
              </div>
              <span className="text-xs text-white/30">{item.time}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const features = [
  {
    title: "Live Leaderboards",
    description:
      "Real-time rankings that update as your team dials. See who's on top at any moment.",
    icon: Trophy,
  },
  {
    title: "Call Blitzes",
    description:
      "Run timed competitions to boost activity. Set goals and watch your team crush them.",
    icon: Zap,
  },
  {
    title: "Team Activity Feed",
    description:
      "See every connect, meeting, and win in real-time. Celebrate success as it happens.",
    icon: Activity,
  },
  {
    title: "Competitions",
    description:
      "Create daily, weekly, or custom competitions. Track progress and award top performers.",
    icon: Medal,
  },
];

const stats = [
  { value: "32%", label: "Increase in daily calls" },
  { value: "45%", label: "Higher engagement" },
  { value: "2.1x", label: "More meetings set" },
  { value: "89%", label: "Rep participation" },
];

export default function SalesFloorPage() {
  return (
    <div className="min-h-screen text-white bg-[#0a0a0a]">
      <DarkNavigation />

      <div className="relative z-10 bg-[#0a0a0a] pt-16">
        <main>
          <FeaturePageHero
            badge="Sales Floor"
            headline="Turn your team into a revenue machine"
            description="Real-time leaderboards, call blitzes, and team competitions that drive performance."
            icon={Trophy}
          />

          <StatsRow stats={stats} />

          <FeatureSection
            title="Leaderboards that drive competition"
            description="Real-time rankings keep your team motivated. Watch as reps climb the board and push each other to perform. The energy of the sales floor, digitized."
            demo={<LeaderboardDemoEnhanced />}
          />

          <FeatureSection
            title="Call blitzes that energize your team"
            description="Run power hours, daily competitions, or custom blitzes. Set team goals and watch the activity spike. Nothing motivates like a little friendly competition."
            demo={<CallBlitzDemo />}
            reversed
            delay={100}
          />

          <FeaturesGrid
            title="Built for high-performance teams"
            subtitle="Tools that create energy, accountability, and results"
            features={features}
          />

          <FeaturePageCTA
            headline="Ready to energize your sales floor?"
            description="Join the waitlist and give your team the motivation tools they need to hit quota."
          />
        </main>
      </div>

      <DarkFooter />
    </div>
  );
}
