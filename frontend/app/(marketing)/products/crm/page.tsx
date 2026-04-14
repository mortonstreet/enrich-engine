"use client";

import {
  Briefcase,
  Users,
  History,
  Link2,
  ArrowRight,
  Phone,
  Mail,
  Calendar,
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

// Pipeline Kanban Demo
function PipelineKanbanDemo() {
  const stages = [
    {
      name: "Prospecting",
      deals: [
        { name: "Acme Corp", value: "$25,000", daysInStage: 3 },
        { name: "TechStart", value: "$15,000", daysInStage: 1 },
      ],
      color: "border-blue-500/30",
    },
    {
      name: "Discovery",
      deals: [
        { name: "GrowthCo", value: "$45,000", daysInStage: 5 },
        { name: "ScaleUp", value: "$30,000", daysInStage: 2 },
        { name: "StartupHQ", value: "$20,000", daysInStage: 4 },
      ],
      color: "border-yellow-500/30",
    },
    {
      name: "Proposal",
      deals: [
        { name: "Enterprise Inc", value: "$80,000", daysInStage: 2 },
      ],
      color: "border-purple-500/30",
    },
    {
      name: "Negotiation",
      deals: [
        { name: "BigCorp", value: "$120,000", daysInStage: 7 },
        { name: "MegaTech", value: "$65,000", daysInStage: 3 },
      ],
      color: "border-green-500/30",
    },
  ];

  return (
    <div className="space-y-4">
      {/* Pipeline header */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-white">Pipeline View</span>
        <span className="text-xs text-white/40">$400K total value</span>
      </div>

      {/* Kanban columns */}
      <div className="grid grid-cols-4 gap-2">
        {stages.map((stage) => (
          <div key={stage.name} className="space-y-2">
            <div className="text-xs text-white/40 truncate">{stage.name}</div>
            <div
              className={`min-h-[120px] rounded-lg border ${stage.color} bg-white/[0.02] p-2 space-y-2`}
            >
              {stage.deals.map((deal, i) => (
                <div
                  key={i}
                  className="p-2 bg-[#111111] rounded border border-white/5 hover:border-white/10 transition-colors cursor-pointer"
                >
                  <div className="text-xs font-medium text-white truncate">
                    {deal.name}
                  </div>
                  <div className="text-[10px] text-green-400">
                    {deal.value}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-2">
        <div className="p-2 bg-white/5 rounded-lg text-center">
          <div className="text-lg font-semibold text-white">12</div>
          <div className="text-[10px] text-white/40">Open deals</div>
        </div>
        <div className="p-2 bg-white/5 rounded-lg text-center">
          <div className="text-lg font-semibold text-green-400">$400K</div>
          <div className="text-[10px] text-white/40">Pipeline value</div>
        </div>
        <div className="p-2 bg-white/5 rounded-lg text-center">
          <div className="text-lg font-semibold text-white">28d</div>
          <div className="text-[10px] text-white/40">Avg cycle</div>
        </div>
      </div>
    </div>
  );
}

// Contact Activity Demo
function ContactActivityDemo() {
  const activities = [
    {
      type: "call",
      icon: Phone,
      title: "Outbound call",
      detail: "Connected - 4:32",
      time: "Today, 2:30 PM",
      color: "text-green-400",
    },
    {
      type: "email",
      icon: Mail,
      title: "Email sent",
      detail: "Proposal follow-up",
      time: "Today, 11:15 AM",
      color: "text-blue-400",
    },
    {
      type: "meeting",
      icon: Calendar,
      title: "Meeting scheduled",
      detail: "Demo call with team",
      time: "Yesterday, 3:00 PM",
      color: "text-purple-400",
    },
    {
      type: "call",
      icon: Phone,
      title: "Outbound call",
      detail: "Voicemail left",
      time: "Yesterday, 10:45 AM",
      color: "text-yellow-400",
    },
  ];

  return (
    <div className="space-y-4">
      {/* Contact header */}
      <div className="flex items-center gap-4 p-4 bg-white/5 rounded-lg">
        <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-lg font-medium text-white">
          SC
        </div>
        <div className="flex-1">
          <div className="font-semibold text-white">Sarah Chen</div>
          <div className="text-sm text-white/40">VP of Sales, Acme Corp</div>
        </div>
        <div className="text-right">
          <div className="text-xs px-2 py-1 bg-green-500/20 text-green-400 rounded-full">
            Hot Lead
          </div>
        </div>
      </div>

      {/* Activity timeline */}
      <div className="space-y-1">
        <div className="text-xs text-white/40 uppercase tracking-wider mb-3">
          Activity Timeline
        </div>
        {activities.map((activity, i) => (
          <div
            key={i}
            className="flex items-start gap-3 p-3 hover:bg-white/[0.02] rounded-lg transition-colors"
          >
            <div
              className={`w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center ${activity.color}`}
            >
              <activity.icon className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm text-white">{activity.title}</div>
              <div className="text-xs text-white/40">{activity.detail}</div>
            </div>
            <div className="text-xs text-white/30 whitespace-nowrap">
              {activity.time}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const features = [
  {
    title: "Deal Stages",
    description:
      "Customizable pipeline stages that match your sales process. Track deals from first touch to close.",
    icon: ArrowRight,
  },
  {
    title: "Contact Management",
    description:
      "Complete contact profiles with all interactions logged automatically. Never lose context.",
    icon: Users,
  },
  {
    title: "Activity Logging",
    description:
      "Every call, email, and meeting automatically tracked. Full history at your fingertips.",
    icon: History,
  },
  {
    title: "Integrations",
    description:
      "Connect with your existing tools. Sync with Salesforce, HubSpot, and more.",
    icon: Link2,
  },
];

const stats = [
  { value: "100%", label: "Activities auto-logged" },
  { value: "40%", label: "Less time on admin" },
  { value: "2.3x", label: "Better follow-up rate" },
  { value: "15min", label: "Saved per deal" },
];

export default function CRMPage() {
  return (
    <div className="min-h-screen text-white bg-[#0a0a0a]">
      <DarkNavigation />

      <div className="relative z-10 bg-[#0a0a0a] pt-16">
        <main>
          <FeaturePageHero
            badge="Native CRM"
            headline="Pipeline management without the bloat"
            description="A CRM built for dialers. Track deals, log activities, and manage contacts without switching tabs."
            icon={Briefcase}
          />

          <StatsRow stats={stats} />

          <FeatureSection
            title="Your pipeline at a glance"
            description="See every deal across all stages in one view. Drag and drop to update status. Focus on what matters - closing deals, not updating CRM fields."
            demo={<PipelineKanbanDemo />}
          />

          <FeatureSection
            title="Complete contact history"
            description="Every call, email, and meeting logged automatically. Never ask 'when did we last talk?' again. Full context for every conversation."
            demo={<ContactActivityDemo />}
            reversed
            delay={100}
          />

          <FeaturesGrid
            title="CRM that works the way you do"
            subtitle="Built for sales teams who spend their day on the phone"
            features={features}
          />

          <FeaturePageCTA
            headline="Ready for a CRM that doesn't slow you down?"
            description="Join the waitlist and experience pipeline management built for high-velocity sales."
          />
        </main>
      </div>

      <DarkFooter />
    </div>
  );
}
