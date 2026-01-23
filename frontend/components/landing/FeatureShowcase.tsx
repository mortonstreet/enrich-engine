"use client";

import { useState } from "react";
import { Search, FileText, Zap, Database } from "lucide-react";

const features = [
  {
    id: "search",
    title: "Search",
    description: "Find leads by role, company, or location",
    icon: Search,
    code: `enrich.search_profiles(
  "VP of Sales at series B startups in SF"
)`,
    results: [
      { name: "Sarah Chen", company: "Scale AI", role: "VP Sales", time: "2 days ago" },
      { name: "Mike Rodriguez", company: "Notion", role: "Head of Sales", time: "1 week ago" },
      { name: "Jennifer Kim", company: "Figma", role: "VP Revenue", time: "3 days ago" },
      { name: "David Park", company: "Linear", role: "Sales Director", time: "5 days ago" },
    ],
  },
  {
    id: "enrich",
    title: "Enrich",
    description: "Get verified emails and phone numbers",
    icon: Zap,
    code: `enrich.get_contact_info(
  linkedin_url="linkedin.com/in/sarahchen"
)`,
    results: [
      { name: "Email Found", company: "sarah.chen@scale.ai", role: "Verified", time: "95% confidence" },
      { name: "Phone Found", company: "+1 (415) 555-0123", role: "Mobile", time: "Direct dial" },
    ],
  },
  {
    id: "bulk",
    title: "Bulk Process",
    description: "Enrich thousands of leads at once",
    icon: Database,
    code: `enrich.bulk_process(
  csv_file="leads.csv",
  fields=["email", "phone"]
)`,
    results: [
      { name: "Processing", company: "1,247 / 1,500 leads", role: "In progress", time: "~3 min left" },
      { name: "Emails Found", company: "1,184 verified", role: "95% hit rate", time: "" },
      { name: "Phones Found", company: "892 direct dials", role: "71% hit rate", time: "" },
    ],
  },
  {
    id: "export",
    title: "Export",
    description: "Download enriched data as CSV",
    icon: FileText,
    code: `enrich.export(
  format="csv",
  include=["name", "email", "phone", "company"]
)`,
    results: [
      { name: "leads_enriched.csv", company: "Ready to download", role: "1,247 rows", time: "2.3 MB" },
    ],
  },
];

const productCards = [
  {
    title: "LinkedIn Scraper",
    description: "Find profiles by name, company, or role",
    image: "bg-gradient-to-br from-blue-500 to-blue-700",
  },
  {
    title: "Email Finder",
    description: "95% accuracy verified business emails",
    image: "bg-gradient-to-br from-indigo-500 to-purple-700",
  },
  {
    title: "Phone Finder",
    description: "Direct dials and mobile numbers",
    image: "bg-gradient-to-br from-violet-500 to-pink-600",
  },
  {
    title: "Bulk Enrich",
    description: "Process thousands per hour",
    image: "bg-gradient-to-br from-cyan-500 to-blue-600",
  },
];

export default function FeatureShowcase() {
  const [activeFeature, setActiveFeature] = useState(features[0]);

  return (
    <section className="py-20 md:py-32 bg-white">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-start">
          {/* Left side - Code demo */}
          <div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-normal mb-3 sm:mb-4 tracking-tight" style={{ fontFamily: "'Source Serif 4', Georgia, serif" }}>
              {activeFeature.title}
            </h2>
            <p className="text-gray-600 text-base sm:text-lg mb-6 sm:mb-8">
              {activeFeature.description}
            </p>

            {/* Code block */}
            <div className="bg-[#1a1a2e] rounded-xl sm:rounded-2xl overflow-hidden shadow-2xl">
              <div className="p-4 sm:p-6 overflow-x-auto">
                <pre className="text-xs sm:text-sm text-gray-300 font-mono whitespace-pre">
                  <code>
                    <span className="text-blue-400">enrich</span>
                    <span className="text-gray-400">.</span>
                    <span className="text-yellow-300">{activeFeature.code.split("(")[0].split(".")[1]}</span>
                    <span className="text-gray-400">(</span>
                    {"\n"}
                    <span className="text-green-400">  &quot;{activeFeature.code.match(/"([^"]+)"/)?.[1]}&quot;</span>
                    {"\n"}
                    <span className="text-gray-400">)</span>
                  </code>
                </pre>
              </div>

              {/* Results */}
              <div className="border-t border-white/10 bg-white rounded-t-xl sm:rounded-t-2xl -mb-px">
                <div className="p-3 sm:p-4 space-y-1 sm:space-y-2">
                  {activeFeature.results.map((result, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg sm:rounded-xl hover:bg-gray-50 transition-colors group"
                    >
                      <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-[#E63946]/10 flex items-center justify-center text-[#E63946] group-hover:bg-[#E63946] group-hover:text-white transition-colors flex-shrink-0">
                        <activeFeature.icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-xs sm:text-sm text-gray-900 truncate">
                          {result.name}
                        </div>
                        <div className="text-[10px] sm:text-xs text-gray-500 truncate">
                          {result.company}
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="text-[10px] sm:text-xs text-gray-400">{result.role}</div>
                        {result.time && (
                          <div className="text-[10px] sm:text-xs text-blue-500">{result.time}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Right side - Product cards */}
          <div className="grid grid-cols-2 lg:grid-cols-1 gap-3 sm:gap-4 lg:space-y-6 lg:gap-0">
            {features.map((feature) => (
              <button
                key={feature.id}
                onClick={() => setActiveFeature(feature)}
                className={`w-full text-left p-4 sm:p-6 rounded-xl sm:rounded-2xl border transition-all duration-300 ${
                  activeFeature.id === feature.id
                    ? "border-[#E63946] bg-[#E63946]/5 shadow-lg"
                    : "border-gray-100 hover:border-gray-200 hover:shadow-md bg-white"
                }`}
              >
                <div className="flex flex-col sm:flex-row items-start gap-3 sm:gap-4">
                  <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl flex items-center justify-center transition-colors flex-shrink-0 ${
                    activeFeature.id === feature.id
                      ? "bg-[#E63946] text-white"
                      : "bg-gray-100 text-gray-600"
                  }`}>
                    <feature.icon className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-base sm:text-lg mb-0.5 sm:mb-1">{feature.title}</h3>
                    <p className="text-gray-600 text-xs sm:text-sm line-clamp-2">{feature.description}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
