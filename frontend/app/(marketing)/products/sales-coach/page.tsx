"use client";

import { useState } from "react";
import {
  Headphones,
  Sparkles,
  TrendingUp,
  BookOpen,
  Target,
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

// Enhanced Sales Coach Demo
function SalesCoachDemoEnhanced() {
  const [score] = useState(8.5);
  const insights = [
    {
      label: "Opening",
      rating: "Strong",
      score: 9,
      color: "text-green-400",
      bgColor: "bg-green-500/20",
    },
    {
      label: "Discovery Questions",
      rating: "Good",
      score: 8,
      color: "text-blue-400",
      bgColor: "bg-blue-500/20",
    },
    {
      label: "Objection Handling",
      rating: "Needs Work",
      score: 6,
      color: "text-yellow-400",
      bgColor: "bg-yellow-500/20",
    },
    {
      label: "Close Attempt",
      rating: "Strong",
      score: 9,
      color: "text-green-400",
      bgColor: "bg-green-500/20",
    },
  ];

  return (
    <div className="space-y-4">
      {/* Overall score */}
      <div className="flex items-center gap-4 p-4 bg-white/5 rounded-lg">
        <div className="relative w-20 h-20">
          <svg className="w-20 h-20 -rotate-90">
            <circle
              cx="40"
              cy="40"
              r="34"
              fill="none"
              stroke="rgba(255,255,255,0.1)"
              strokeWidth="6"
            />
            <circle
              cx="40"
              cy="40"
              r="34"
              fill="none"
              stroke="#22c55e"
              strokeWidth="6"
              strokeDasharray={`${(score / 10) * 214} 214`}
              strokeLinecap="round"
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-2xl font-bold text-white">
            {score}
          </span>
        </div>
        <div>
          <div className="text-sm text-white/40 mb-1">Call Score</div>
          <div className="text-xl font-semibold text-green-400">
            High Performer
          </div>
          <div className="text-xs text-white/40 mt-1">Top 15% this week</div>
        </div>
      </div>

      {/* Detailed breakdown */}
      <div className="space-y-2">
        {insights.map((insight, i) => (
          <div
            key={i}
            className="flex items-center justify-between p-3 rounded-lg bg-white/[0.02] hover:bg-white/5 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-8 h-8 rounded-lg ${insight.bgColor} flex items-center justify-center`}
              >
                <span className={`text-xs font-bold ${insight.color}`}>
                  {insight.score}
                </span>
              </div>
              <span className="text-sm text-white">{insight.label}</span>
            </div>
            <span className={`text-xs font-medium ${insight.color}`}>
              {insight.rating}
            </span>
          </div>
        ))}
      </div>

      {/* AI suggestion */}
      <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
        <div className="flex items-start gap-2">
          <Sparkles className="w-4 h-4 text-blue-400 mt-0.5" />
          <div>
            <div className="text-xs text-blue-400 font-medium mb-1">
              AI Suggestion
            </div>
            <p className="text-xs text-white/60">
              Try using the SPIN framework when handling objections. Ask about
              the impact of not solving their problem.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Real-time Insights Demo
function RealTimeInsightsDemo() {
  const transcript = [
    {
      speaker: "You",
      text: "What challenges are you facing with your current solution?",
      insight: "Great discovery question",
      insightColor: "text-green-400",
    },
    {
      speaker: "Prospect",
      text: "We're struggling with manual data entry taking too much time.",
      insight: null,
      insightColor: "",
    },
    {
      speaker: "You",
      text: "That sounds frustrating. How much time would you say...",
      insight: "Digging deeper - nice!",
      insightColor: "text-blue-400",
    },
  ];

  return (
    <div className="space-y-4">
      {/* Live indicator */}
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
        <span className="text-xs text-red-400 font-medium">
          Live Call Analysis
        </span>
      </div>

      {/* Transcript with insights */}
      <div className="space-y-3">
        {transcript.map((item, i) => (
          <div key={i} className="space-y-1">
            <div
              className={`p-3 rounded-lg ${
                item.speaker === "You"
                  ? "bg-blue-500/10 border border-blue-500/20"
                  : "bg-white/5 border border-white/5"
              }`}
            >
              <span className="text-xs text-white/40 block mb-1">
                {item.speaker}
              </span>
              <p className="text-sm text-white/80">{item.text}</p>
            </div>
            {item.insight && (
              <div className="flex items-center gap-1 ml-3">
                <Sparkles className={`w-3 h-3 ${item.insightColor}`} />
                <span className={`text-xs ${item.insightColor}`}>
                  {item.insight}
                </span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Talk ratio */}
      <div className="p-3 bg-white/5 rounded-lg">
        <div className="flex justify-between text-xs text-white/40 mb-2">
          <span>Talk Ratio</span>
          <span>You: 42% | Prospect: 58%</span>
        </div>
        <div className="h-2 bg-white/10 rounded-full overflow-hidden flex">
          <div className="h-full bg-blue-500 w-[42%]" />
          <div className="h-full bg-white/30 w-[58%]" />
        </div>
        <div className="text-xs text-green-400 mt-2">
          Great balance - keep letting them talk
        </div>
      </div>
    </div>
  );
}

const features = [
  {
    title: "Call Scoring",
    description:
      "Every call automatically scored on key selling behaviors. Know exactly where to improve.",
    icon: Target,
  },
  {
    title: "Real-time Insights",
    description:
      "Get AI coaching suggestions during live calls. Never miss an opportunity to improve.",
    icon: Sparkles,
  },
  {
    title: "Performance Tracking",
    description:
      "Track your progress over time. See how your scores improve as you develop your skills.",
    icon: TrendingUp,
  },
  {
    title: "Training Library",
    description:
      "Access curated examples of top-performing calls. Learn from the best in your team.",
    icon: BookOpen,
  },
];

const stats = [
  { value: "23%", label: "Improvement in close rate" },
  { value: "500+", label: "Calls analyzed per rep" },
  { value: "3.5x", label: "Faster rep ramp time" },
  { value: "100%", label: "Calls automatically scored" },
];

export default function SalesCoachPage() {
  return (
    <div className="min-h-screen text-white bg-[#0a0a0a]">
      <DarkNavigation />

      <div className="relative z-10 bg-[#0a0a0a] pt-16">
        <main>
          <FeaturePageHero
            badge="Sales Coach"
            headline="AI-powered call coaching that scales"
            description="Every call scored, every rep coached. Get actionable insights that turn good sellers into great ones."
            icon={Headphones}
          />

          <StatsRow stats={stats} />

          <FeatureSection
            title="Know exactly where to improve"
            description="Every call is automatically analyzed and scored across key selling behaviors. Get specific, actionable feedback that helps you close more deals."
            demo={<SalesCoachDemoEnhanced />}
          />

          <FeatureSection
            title="Real-time coaching on every call"
            description="Get AI-powered suggestions while you're on the phone. Know when you're talking too much, when to dig deeper, and when to go for the close."
            demo={<RealTimeInsightsDemo />}
            reversed
            delay={100}
          />

          <FeaturesGrid
            title="Built for continuous improvement"
            subtitle="Tools that help every rep reach their full potential"
            features={features}
          />

          <FeaturePageCTA
            headline="Ready to coach your team to success?"
            description="Join the waitlist and give your reps the coaching they need to close more deals."
          />
        </main>
      </div>

      <DarkFooter />
    </div>
  );
}
