"use client";

import Link from "next/link";
import {
  Search,
  FileText,
  Wand2,
  Database,
  Key,
  BarChart3,
  BookOpen,
  ExternalLink,
  ArrowUpRight,
  Copy,
  Check,
  X,
} from "lucide-react";
import { useState } from "react";

// Endpoint cards data
const endpoints = [
  {
    id: "search",
    name: "/search",
    description: "Find leads by name, company, or role",
    href: "/dashboard/search",
    icon: Search,
    preview: (
      <div className="mt-4 space-y-2">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-gray-900"></div>
          <div className="h-2 w-16 bg-gray-200 rounded"></div>
          <div className="flex-1 h-2 bg-gray-100 rounded"></div>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[#E63946]"></div>
          <div className="h-2 w-16 bg-gray-200 rounded"></div>
          <div className="flex-1 h-2 bg-gray-100 rounded"></div>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-blue-500"></div>
          <div className="h-2 w-16 bg-gray-200 rounded"></div>
          <div className="flex-1 h-2 bg-gray-100 rounded"></div>
        </div>
      </div>
    ),
  },
  {
    id: "scrape",
    name: "/scrape",
    description: "Extract LinkedIn profiles from CSV",
    href: "/dashboard/scrape",
    icon: FileText,
    preview: (
      <div className="mt-4 rounded-lg bg-gray-50 p-3">
        <div className="text-xs text-gray-500 mb-2">LinkedIn Profile</div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-32 bg-gray-200 rounded"></div>
        </div>
        <div className="mt-2 h-2 w-24 bg-gray-100 rounded"></div>
      </div>
    ),
  },
  {
    id: "enrich",
    name: "/enrich",
    description: "Get verified emails and phone numbers",
    href: "/dashboard/enrich",
    icon: Wand2,
    preview: (
      <div className="mt-4 rounded-lg bg-gray-50 p-3 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-400">Email</span>
          <span className="text-xs text-green-600">Verified</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-40 bg-blue-100 rounded text-xs text-blue-600 flex items-center px-2">
            john@company.com
          </div>
        </div>
      </div>
    ),
  },
  {
    id: "bulk",
    name: "/bulk",
    description: "Process thousands of leads at once",
    href: "/dashboard/bulk",
    icon: Database,
    preview: (
      <div className="mt-4 space-y-1.5">
        <div className="text-xs text-gray-400">Processing 1,247 leads...</div>
        <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full w-3/4 bg-[#E63946] rounded-full"></div>
        </div>
        <div className="text-xs text-gray-500">Found 892 profiles</div>
      </div>
    ),
  },
];

// Quick action suggestions
const quickActions = [
  "Find tech startup founders",
  "Enrich my lead list",
  "Search for VPs of Sales",
];

export default function DashboardHome() {
  const [apiKeyCopied, setApiKeyCopied] = useState(false);
  const [showBanner, setShowBanner] = useState(true);

  const handleCopyApiKey = () => {
    navigator.clipboard.writeText("ee_live_••••••••••••••••");
    setApiKeyCopied(true);
    setTimeout(() => setApiKeyCopied(false), 2000);
  };

  return (
    <div className="min-h-full flex flex-col">
      {/* Announcement Banner */}
      {showBanner && (
        <div className="bg-gradient-to-r from-[#E63946] to-[#F07178] text-white">
          <div className="max-w-5xl mx-auto px-6 py-3 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium">
                Introducing Enrich Engine Bulk Processing
              </span>
              <Link
                href="/dashboard/bulk"
                className="inline-flex items-center gap-1 text-sm font-medium px-3 py-1 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
              >
                Try it now
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            <button
              onClick={() => setShowBanner(false)}
              className="p-1 hover:bg-white/20 rounded transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 max-w-5xl mx-auto px-6 py-12 w-full">
        {/* Hero */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-medium text-gray-900 tracking-tight">
            The enrichment API built for outreach
          </h1>
          <p className="mt-4 text-lg text-gray-500 max-w-2xl mx-auto">
            Find verified contact data, enrich leads at scale, and power your sales pipeline with accurate data.
          </p>
        </div>

        {/* Endpoints Section */}
        <div className="mb-16">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-medium text-gray-500">Our endpoints</h2>
            <div className="flex items-center gap-2 text-sm">
              <span className="w-2 h-2 rounded-full bg-green-500"></span>
              <span className="text-gray-500">API status</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {endpoints.map((endpoint) => (
              <Link
                key={endpoint.id}
                href={endpoint.href}
                className="group p-5 rounded-xl border border-gray-200 bg-white hover:border-[#E63946]/30 hover:shadow-lg hover:shadow-[#E63946]/5 transition-all duration-200"
              >
                <div className="flex items-start justify-between">
                  <h3 className="font-mono text-lg font-semibold text-gray-900 group-hover:text-[#E63946] transition-colors">
                    {endpoint.name}
                  </h3>
                  <ArrowUpRight className="h-4 w-4 text-gray-300 group-hover:text-[#E63946] transition-colors" />
                </div>
                <p className="text-sm text-gray-500 mt-1">{endpoint.description}</p>
                {endpoint.preview}
              </Link>
            ))}
          </div>
        </div>

        {/* Get Started Section */}
        <div className="mb-16">
          <h2 className="text-lg font-medium text-gray-500 mb-6">Get started</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* API Key Card */}
            <div className="p-5 rounded-xl border border-gray-200 bg-white">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-lg bg-[#E63946]/10 flex items-center justify-center">
                  <Key className="h-4 w-4 text-[#E63946]" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">API Key</h3>
                  <p className="text-xs text-gray-500">Get started in 5 min</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 px-3 py-2 rounded-lg bg-gray-50 font-mono text-sm text-gray-600 truncate">
                  ee_live_••••••••••••••••
                </div>
                <button
                  onClick={handleCopyApiKey}
                  className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                  title="Copy API key"
                >
                  {apiKeyCopied ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4 text-gray-400" />
                  )}
                </button>
              </div>
            </div>

            {/* Usage Card */}
            <div className="p-5 rounded-xl border border-gray-200 bg-white">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                  <BarChart3 className="h-4 w-4 text-blue-500" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">Usage</h3>
                  <p className="text-xs text-gray-500">Past month</p>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full w-1/3 bg-[#E63946] rounded-full"></div>
                  </div>
                  <span className="text-xs text-gray-500">1.2k / 5k</span>
                </div>
                <p className="text-xs text-gray-400">API calls this month</p>
              </div>
            </div>

            {/* Docs Card */}
            <div className="p-5 rounded-xl border border-gray-200 bg-white hover:border-gray-300 transition-colors">
              <Link href="/docs" className="block">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
                    <BookOpen className="h-4 w-4 text-gray-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900">Docs</h3>
                    <p className="text-xs text-gray-500">Learn the API</p>
                  </div>
                  <ExternalLink className="h-4 w-4 text-gray-300" />
                </div>
              </Link>
              <Link href="/demos" className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
                <span className="text-sm text-gray-600">Demos</span>
                <span className="px-1.5 py-0.5 text-[10px] font-medium bg-[#E63946] text-white rounded">
                  NEW
                </span>
                <ExternalLink className="h-3 w-3 text-gray-300 ml-auto" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Section - Quick Actions & Search */}
      <div className="border-t border-gray-100 bg-gray-50/50 py-8 px-6">
        <div className="max-w-3xl mx-auto">
          {/* Quick Action Pills */}
          <div className="flex flex-wrap justify-center gap-2 mb-6">
            {quickActions.map((action, i) => (
              <button
                key={i}
                className="px-4 py-2 text-sm text-gray-600 bg-white border border-gray-200 rounded-full hover:border-[#E63946]/30 hover:text-[#E63946] transition-colors"
              >
                {action}
              </button>
            ))}
          </div>

          {/* Search/Chat Input */}
          <div className="relative">
            <input
              type="text"
              placeholder="Chat to build or ask about the API"
              className="w-full px-5 py-4 text-base border border-gray-200 rounded-2xl bg-white shadow-sm focus:outline-none focus:border-[#E63946]/30 focus:ring-2 focus:ring-[#E63946]/10 transition-all"
            />
            <button className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-lg hover:bg-gray-100 transition-colors">
              <ArrowUpRight className="h-5 w-5 text-gray-400" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
