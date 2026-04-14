"use client";

import { useState, useEffect } from "react";
import {
  Zap,
  Users,
  MapPin,
  Clock,
  ArrowRight,
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

// Enhanced Power Dialer Demo
function PowerDialerDemoEnhanced() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [callTimer, setCallTimer] = useState(0);
  const contacts = [
    {
      name: "Sarah Chen",
      company: "Acme Corp",
      phone: "(555) 123-4567",
      status: "connected",
    },
    {
      name: "Mike Johnson",
      company: "TechStart",
      phone: "(555) 234-5678",
      status: "no-answer",
    },
    {
      name: "Lisa Park",
      company: "GrowthCo",
      phone: "(555) 345-6789",
      status: "voicemail",
    },
    {
      name: "David Kim",
      company: "ScaleUp",
      phone: "(555) 456-7890",
      status: "queued",
    },
    {
      name: "Emma Wilson",
      company: "StartupHQ",
      phone: "(555) 567-8901",
      status: "queued",
    },
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
      {/* Active call indicator */}
      <div className="flex items-center justify-between p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span className="text-sm text-green-400 font-medium">
            Active Call
          </span>
        </div>
        <span className="text-sm text-white/60 tabular-nums">
          {formatTime(callTimer)}
        </span>
      </div>

      {/* Contact queue */}
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
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-medium ${
                  isActive
                    ? "bg-green-500 text-black"
                    : isPast
                    ? "bg-white/5 text-white/40"
                    : "bg-white/10 text-white"
                }`}
              >
                {contact.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm text-white truncate">
                  {contact.name}
                </div>
                <div className="text-xs text-white/40 truncate">
                  {contact.company}
                </div>
              </div>
              <div className="text-right">
                {isActive ? (
                  <div className="text-xs text-green-400 font-medium">
                    Connected
                  </div>
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

      {/* Auto-advance indicator */}
      <div className="flex items-center justify-center gap-2 pt-2 text-xs text-white/40">
        <ArrowRight className="w-3 h-3" />
        <span>Auto-advancing to next contact</span>
      </div>
    </div>
  );
}

// Parallel Dialer Demo
function ParallelDialerDemo() {
  const [lines, setLines] = useState([
    { number: "(555) 111-2222", status: "ringing", name: "John Smith" },
    { number: "(555) 333-4444", status: "ringing", name: "Jane Doe" },
    { number: "(555) 555-6666", status: "ringing", name: "Bob Wilson" },
    { number: "(555) 777-8888", status: "ringing", name: "Alice Brown" },
  ]);

  useEffect(() => {
    const interval = setInterval(() => {
      setLines((prev) =>
        prev.map((line) => {
          const rand = Math.random();
          if (rand > 0.7) {
            return { ...line, status: "connected" };
          } else if (rand > 0.4) {
            return { ...line, status: "no-answer" };
          }
          return line;
        })
      );
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const statusColors: Record<string, string> = {
    ringing: "text-yellow-400",
    connected: "text-green-400",
    "no-answer": "text-red-400",
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm text-white/60">Parallel Lines</span>
        <span className="text-xs px-2 py-1 bg-blue-500/20 text-blue-400 rounded-full">
          4 active
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {lines.map((line, i) => (
          <div
            key={i}
            className={`p-3 rounded-lg border transition-all ${
              line.status === "connected"
                ? "bg-green-500/10 border-green-500/20"
                : line.status === "no-answer"
                ? "bg-red-500/5 border-red-500/10"
                : "bg-white/5 border-white/10"
            }`}
          >
            <div className="text-xs text-white/40 mb-1">Line {i + 1}</div>
            <div className="text-sm font-medium text-white truncate">
              {line.name}
            </div>
            <div className={`text-xs ${statusColors[line.status]} capitalize`}>
              {line.status === "no-answer" ? "No Answer" : line.status}
            </div>
          </div>
        ))}
      </div>

      <div className="text-center pt-2">
        <span className="text-xs text-white/40">
          First connect gets routed to you
        </span>
      </div>
    </div>
  );
}

const features = [
  {
    title: "Auto-Advance",
    description:
      "Move through your call list automatically. No manual clicking between calls.",
    icon: ArrowRight,
  },
  {
    title: "Parallel Dialing",
    description:
      "Call multiple lines simultaneously. Get connected to the first person who answers.",
    icon: Users,
  },
  {
    title: "Smart Queue",
    description:
      "Prioritize high-value leads. Automatically retry busy numbers at optimal times.",
    icon: Clock,
  },
  {
    title: "Local Presence",
    description:
      "Display local caller IDs to increase answer rates by up to 400%.",
    icon: MapPin,
  },
];

const stats = [
  { value: "10x", label: "More calls per hour" },
  { value: "400%", label: "Higher answer rates" },
  { value: "2.5x", label: "More conversations" },
  { value: "45min", label: "Saved per day" },
];

export default function PowerDialerPage() {
  return (
    <div className="min-h-screen text-white bg-[#0a0a0a]">
      <DarkNavigation />

      <div className="relative z-10 bg-[#0a0a0a] pt-16">
        <main>
          <FeaturePageHero
            badge="Power & Parallel Dialer"
            headline="10x your daily call volume"
            description="Auto-dial through lists or call multiple lines at once. Spend less time dialing, more time selling."
            icon={Zap}
          />

          <StatsRow stats={stats} />

          <FeatureSection
            title="Power through your list"
            description="The power dialer automatically advances through your contact list. When a call ends, the next number dials immediately. Stay in flow and maximize your talk time."
            demo={<PowerDialerDemoEnhanced />}
          />

          <FeatureSection
            title="Connect faster with parallel dialing"
            description="Dial up to 4 lines simultaneously. The first person to answer gets connected to you. No more waiting through rings and voicemails."
            demo={<ParallelDialerDemo />}
            reversed
            delay={100}
          />

          <FeaturesGrid
            title="Built for high-velocity sales"
            subtitle="Every feature designed to maximize your time on the phone"
            features={features}
          />

          <FeaturePageCTA
            headline="Ready to make more calls?"
            description="Join the waitlist and be first to experience the fastest dialer for sales teams."
          />
        </main>
      </div>

      <DarkFooter />
    </div>
  );
}
