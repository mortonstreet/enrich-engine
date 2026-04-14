"use client";

import { useState } from "react";
import {
  FolderOpen,
  Star,
  Filter,
  Upload,
  Download,
  Search,
  Layers,
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

// Lead List Demo with Folders
function LeadListDemo() {
  const [activeFolder, setActiveFolder] = useState("enterprise");
  const folders = [
    { id: "all", name: "All Leads", count: 2450, icon: Layers },
    { id: "enterprise", name: "Enterprise", count: 450, icon: FolderOpen },
    { id: "smb", name: "SMB", count: 1200, icon: FolderOpen },
    { id: "favorites", name: "Favorites", count: 89, icon: Star },
  ];

  const leads = [
    {
      name: "Sarah Chen",
      company: "Acme Corp",
      title: "VP of Sales",
      status: "hot",
    },
    {
      name: "Mike Johnson",
      company: "TechStart",
      title: "CEO",
      status: "warm",
    },
    {
      name: "Lisa Park",
      company: "GrowthCo",
      title: "Director",
      status: "cold",
    },
    {
      name: "David Kim",
      company: "ScaleUp",
      title: "Founder",
      status: "hot",
    },
    {
      name: "Emma Wilson",
      company: "StartupHQ",
      title: "CRO",
      status: "warm",
    },
  ];

  const statusColors: Record<string, string> = {
    hot: "bg-red-500/20 text-red-400",
    warm: "bg-yellow-500/20 text-yellow-400",
    cold: "bg-blue-500/20 text-blue-400",
  };

  return (
    <div className="space-y-4">
      {/* Folder sidebar simulation */}
      <div className="grid grid-cols-4 gap-2">
        {folders.map((folder) => (
          <button
            key={folder.id}
            onClick={() => setActiveFolder(folder.id)}
            className={`p-2 rounded-lg text-left transition-colors ${
              activeFolder === folder.id
                ? "bg-white/10 border border-white/20"
                : "bg-white/[0.02] border border-transparent hover:border-white/10"
            }`}
          >
            <folder.icon
              className={`w-4 h-4 mb-1 ${
                folder.id === "favorites" ? "text-yellow-400" : "text-white/40"
              }`}
            />
            <div className="text-xs font-medium text-white truncate">
              {folder.name}
            </div>
            <div className="text-[10px] text-white/40">{folder.count}</div>
          </button>
        ))}
      </div>

      {/* Lead list */}
      <div className="space-y-1.5">
        {leads.map((lead, i) => (
          <div
            key={i}
            className="flex items-center gap-3 p-3 bg-white/[0.02] rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
          >
            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-xs font-medium text-white">
              {lead.name
                .split(" ")
                .map((n) => n[0])
                .join("")}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-white truncate">
                {lead.name}
              </div>
              <div className="text-xs text-white/40 truncate">
                {lead.title} at {lead.company}
              </div>
            </div>
            <div
              className={`text-[10px] px-2 py-0.5 rounded-full capitalize ${
                statusColors[lead.status]
              }`}
            >
              {lead.status}
            </div>
            <button className="p-1 hover:bg-white/10 rounded transition-colors">
              <Star className="w-4 h-4 text-white/20 hover:text-yellow-400" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// Filters Demo
function FiltersDemo() {
  const activeFilters = [
    { label: "Industry: SaaS", removable: true },
    { label: "Size: 50-200", removable: true },
    { label: "Last contact: 7+ days", removable: true },
  ];

  const savedFilters = [
    { name: "High-value prospects", count: 234 },
    { name: "Needs follow-up", count: 89 },
    { name: "Decision makers", count: 456 },
  ];

  return (
    <div className="space-y-4">
      {/* Search bar */}
      <div className="flex items-center gap-2 p-3 bg-white/5 rounded-lg border border-white/10">
        <Search className="w-4 h-4 text-white/40" />
        <input
          type="text"
          placeholder="Search leads..."
          className="bg-transparent text-sm text-white placeholder:text-white/30 outline-none flex-1"
          readOnly
        />
        <Filter className="w-4 h-4 text-white/40" />
      </div>

      {/* Active filters */}
      <div className="space-y-2">
        <div className="text-xs text-white/40 uppercase tracking-wider">
          Active Filters
        </div>
        <div className="flex flex-wrap gap-2">
          {activeFilters.map((filter, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1 px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded-full"
            >
              {filter.label}
              <button className="hover:text-blue-300">&times;</button>
            </span>
          ))}
        </div>
      </div>

      {/* Saved filters */}
      <div className="space-y-2">
        <div className="text-xs text-white/40 uppercase tracking-wider">
          Saved Filters
        </div>
        <div className="space-y-1.5">
          {savedFilters.map((filter, i) => (
            <div
              key={i}
              className="flex items-center justify-between p-2 bg-white/[0.02] rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
            >
              <span className="text-sm text-white">{filter.name}</span>
              <span className="text-xs text-white/40">{filter.count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Quick actions */}
      <div className="flex gap-2">
        <button className="flex-1 flex items-center justify-center gap-2 p-2 bg-white/5 rounded-lg text-xs text-white/60 hover:bg-white/10 transition-colors">
          <Upload className="w-3 h-3" />
          Import
        </button>
        <button className="flex-1 flex items-center justify-center gap-2 p-2 bg-white/5 rounded-lg text-xs text-white/60 hover:bg-white/10 transition-colors">
          <Download className="w-3 h-3" />
          Export
        </button>
      </div>
    </div>
  );
}

const features = [
  {
    title: "Smart Folders",
    description:
      "Organize leads into folders that make sense for your workflow. Nest, rename, and color-code.",
    icon: FolderOpen,
  },
  {
    title: "Favorites",
    description:
      "Star your top prospects for quick access. Never lose track of your hottest leads.",
    icon: Star,
  },
  {
    title: "Advanced Filters",
    description:
      "Filter by any field. Save filters for quick access. Build segments that update dynamically.",
    icon: Filter,
  },
  {
    title: "Import & Export",
    description:
      "Import from CSV, Excel, or your CRM. Export anytime. Your data, your way.",
    icon: Upload,
  },
];

const stats = [
  { value: "10K+", label: "Leads per list" },
  { value: "50+", label: "Filter options" },
  { value: "1-click", label: "Import setup" },
  { value: "Unlimited", label: "Folders & tags" },
];

export default function LeadsPage() {
  return (
    <div className="min-h-screen text-white bg-[#0a0a0a]">
      <DarkNavigation />

      <div className="relative z-10 bg-[#0a0a0a] pt-16">
        <main>
          <FeaturePageHero
            badge="Lead Lists & Database"
            headline="Organize leads your way"
            description="Folders, favorites, and smart filters that help you find the right leads at the right time."
            icon={FolderOpen}
          />

          <StatsRow stats={stats} />

          <FeatureSection
            title="Folders that match your workflow"
            description="Organize leads into folders and sub-folders. Star your favorites for quick access. Find any lead in seconds with powerful search."
            demo={<LeadListDemo />}
          />

          <FeatureSection
            title="Find exactly who you need"
            description="Filter by any field - industry, size, last contact, deal stage, and more. Save filters as smart lists that update automatically."
            demo={<FiltersDemo />}
            reversed
            delay={100}
          />

          <FeaturesGrid
            title="Your leads, organized"
            subtitle="Tools that help you work smarter with your prospect database"
            features={features}
          />

          <FeaturePageCTA
            headline="Ready to organize your leads?"
            description="Join the waitlist and experience lead management built for modern sales teams."
          />
        </main>
      </div>

      <DarkFooter />
    </div>
  );
}
