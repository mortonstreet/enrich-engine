"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { EnrichEngineLogoStatic } from "./EnrichEngineLogo";

// Competitor logos as components
const EnrichLogo = () => (
  <div className="w-7 h-7 bg-[#E63946] rounded-md flex items-center justify-center overflow-hidden">
    <EnrichEngineLogoStatic size={20} color="#FFFFFF" />
  </div>
);

const ClayLogo = () => (
  <div className="w-7 h-7 bg-white rounded-md flex items-center justify-center overflow-hidden border border-gray-100">
    <Image
      src="/logos/clay.svg"
      alt="Clay"
      width={24}
      height={24}
      className="object-contain"
    />
  </div>
);

const ApolloLogo = () => (
  <div className="w-7 h-7 bg-black rounded-md flex items-center justify-center overflow-hidden">
    {/* Apollo's yellow pinwheel icon only */}
    <svg viewBox="0 0 36 36" className="w-5 h-5" fill="none">
      <path d="M19.5993 0.0862365L19.605 13.2568C19.6058 15.3375 17.4222 16.6715 15.6079 15.6986L2.58376 8.7153C3.57706 7.05795 4.82616 5.57609 6.27427 4.32386L16.489 13.8945C17.0303 14.4015 17.8835 13.8518 17.6605 13.1398L13.6992 0.493553C15.0326 0.17147 16.4233 0 17.8536 0C18.4428 0 19.0248 0.0296814 19.5993 0.0862365Z" fill="#F8FF2C"/>
      <path d="M16.0635 36.1087L16.0578 23.0046C16.057 20.9239 18.2407 19.5898 20.0549 20.5627L33.0838 27.5486C32.0838 29.2016 30.8289 30.6786 29.3751 31.925L19.1738 22.3668C18.6326 21.8598 17.7793 22.4095 18.0023 23.1215L21.9486 35.72C20.6338 36.0329 19.263 36.1989 17.8539 36.1989C17.2497 36.1989 16.6523 36.1683 16.0635 36.1087Z" fill="#F8FF2C"/>
      <path d="M22.0105 16.77L31.4705 6.39392C30.2362 4.92008 28.7742 3.6486 27.1384 2.63702L20.2306 15.8767C19.2709 17.716 20.5871 19.9298 22.6396 19.9288L35.6183 19.923C35.6775 19.3234 35.7082 18.7151 35.7082 18.0996C35.7082 16.6683 35.5436 15.2761 35.2338 13.9406L22.7549 17.9576C22.0526 18.1837 21.5103 17.3187 22.0105 16.77Z" fill="#F8FF2C"/>
      <path d="M0.0842758 16.3383L13.0237 16.3325C15.0764 16.3317 16.3923 18.5454 15.4327 20.3846L8.56047 33.5561C6.93095 32.547 5.47394 31.2801 4.24344 29.8121L13.653 19.4914C14.1531 18.9427 13.6107 18.0777 12.9084 18.3037L0.485078 22.3029C0.168551 20.954 0 19.5467 0 18.0994C0 17.5051 0.0290814 16.9177 0.0842758 16.3383Z" fill="#F8FF2C"/>
    </svg>
  </div>
);

const ProspeoLogo = () => (
  <div className="w-7 h-7 bg-[#8B1538] rounded-md flex items-center justify-center overflow-hidden">
    {/* Prospeo's bold maroon "P" mark */}
    <span className="text-white text-sm font-bold">P</span>
  </div>
);

const LushaLogo = () => (
  <div className="w-7 h-7 bg-[#7C3AED] rounded-md flex items-center justify-center overflow-hidden">
    {/* Lusha's speech bubble / contact icon */}
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none">
      <path d="M4 6c0-1.1.9-2 2-2h12a2 2 0 012 2v9a2 2 0 01-2 2h-3l-3 3-3-3H6a2 2 0 01-2-2V6z" fill="white"/>
      <circle cx="8.5" cy="10.5" r="1.5" fill="#7C3AED"/>
      <circle cx="12" cy="10.5" r="1.5" fill="#7C3AED"/>
      <circle cx="15.5" cy="10.5" r="1.5" fill="#7C3AED"/>
    </svg>
  </div>
);

const WizaLogo = () => (
  <div className="w-7 h-7 bg-[#0D9488] rounded-md flex items-center justify-center overflow-hidden">
    {/* Wiza's targeting/scope icon */}
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none">
      <circle cx="12" cy="12" r="4" stroke="white" strokeWidth="2"/>
      <circle cx="12" cy="12" r="7" stroke="white" strokeWidth="1.5" strokeDasharray="2 2"/>
      <path d="M12 3v4M12 17v4M3 12h4M17 12h4" stroke="white" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  </div>
);

interface ProviderData {
  name: string;
  value: number;
  logo: React.ReactNode;
  isEnrich?: boolean;
}

interface BenchmarkData {
  category: string;
  providers: ProviderData[];
}

interface TabConfig {
  id: TabType;
  label: string;
  title: string;
  subtitle: string;
  maxValue: number;
  yAxisLabels: string[];
  formatValue: (value: number) => string;
  higherIsBetter: boolean;
}

// Cost per Credit data (lower is better)
const costData: BenchmarkData[] = [
  {
    category: "Email Enrichment",
    providers: [
      { name: "Enrich", value: 0.018, logo: <EnrichLogo />, isEnrich: true },
      { name: "Prospeo", value: 0.039, logo: <ProspeoLogo /> },
      { name: "Clay", value: 0.05, logo: <ClayLogo /> },
    ],
  },
  {
    category: "Phone Lookup",
    providers: [
      { name: "Enrich", value: 0.025, logo: <EnrichLogo />, isEnrich: true },
      { name: "Lusha", value: 0.15, logo: <LushaLogo /> },
      { name: "Apollo", value: 0.20, logo: <ApolloLogo /> },
    ],
  },
  {
    category: "LinkedIn Scrape",
    providers: [
      { name: "Enrich", value: 0.01, logo: <EnrichLogo />, isEnrich: true },
      { name: "Wiza", value: 0.15, logo: <WizaLogo /> },
      { name: "Clay", value: 0.05, logo: <ClayLogo /> },
    ],
  },
  {
    category: "Bulk Export",
    providers: [
      { name: "Enrich", value: 0.015, logo: <EnrichLogo />, isEnrich: true },
      { name: "Apollo", value: 0.20, logo: <ApolloLogo /> },
      { name: "Prospeo", value: 0.039, logo: <ProspeoLogo /> },
    ],
  },
];

// Accuracy data (higher is better) - percentage match rate
const accuracyData: BenchmarkData[] = [
  {
    category: "Email Enrichment",
    providers: [
      { name: "Enrich", value: 94.2, logo: <EnrichLogo />, isEnrich: true },
      { name: "Prospeo", value: 87.5, logo: <ProspeoLogo /> },
      { name: "Clay", value: 82.1, logo: <ClayLogo /> },
    ],
  },
  {
    category: "Phone Lookup",
    providers: [
      { name: "Enrich", value: 91.8, logo: <EnrichLogo />, isEnrich: true },
      { name: "Lusha", value: 85.3, logo: <LushaLogo /> },
      { name: "Apollo", value: 78.6, logo: <ApolloLogo /> },
    ],
  },
  {
    category: "LinkedIn Scrape",
    providers: [
      { name: "Enrich", value: 97.3, logo: <EnrichLogo />, isEnrich: true },
      { name: "Wiza", value: 89.1, logo: <WizaLogo /> },
      { name: "Clay", value: 84.7, logo: <ClayLogo /> },
    ],
  },
  {
    category: "Bulk Export",
    providers: [
      { name: "Enrich", value: 93.6, logo: <EnrichLogo />, isEnrich: true },
      { name: "Apollo", value: 81.2, logo: <ApolloLogo /> },
      { name: "Prospeo", value: 86.4, logo: <ProspeoLogo /> },
    ],
  },
];

// Speed data (lower is better) - average response time in seconds
const speedData: BenchmarkData[] = [
  {
    category: "Email Enrichment",
    providers: [
      { name: "Enrich", value: 0.8, logo: <EnrichLogo />, isEnrich: true },
      { name: "Prospeo", value: 2.1, logo: <ProspeoLogo /> },
      { name: "Clay", value: 3.4, logo: <ClayLogo /> },
    ],
  },
  {
    category: "Phone Lookup",
    providers: [
      { name: "Enrich", value: 1.2, logo: <EnrichLogo />, isEnrich: true },
      { name: "Lusha", value: 2.8, logo: <LushaLogo /> },
      { name: "Apollo", value: 4.1, logo: <ApolloLogo /> },
    ],
  },
  {
    category: "LinkedIn Scrape",
    providers: [
      { name: "Enrich", value: 1.5, logo: <EnrichLogo />, isEnrich: true },
      { name: "Wiza", value: 3.2, logo: <WizaLogo /> },
      { name: "Clay", value: 4.8, logo: <ClayLogo /> },
    ],
  },
  {
    category: "Bulk Export",
    providers: [
      { name: "Enrich", value: 2.3, logo: <EnrichLogo />, isEnrich: true },
      { name: "Apollo", value: 5.6, logo: <ApolloLogo /> },
      { name: "Prospeo", value: 4.2, logo: <ProspeoLogo /> },
    ],
  },
];

type TabType = "cost" | "accuracy" | "speed";

const tabConfigs: Record<TabType, TabConfig> = {
  cost: {
    id: "cost",
    label: "Cost per Credit",
    title: "Enrichment Provider Costs",
    subtitle: "[Lower is better]",
    maxValue: 0.25,
    yAxisLabels: ["$0.25", "$0.20", "$0.15", "$0.10", "$0.05", "$0.00"],
    formatValue: (v: number) => `$${v.toFixed(v < 0.1 ? 3 : 2)}`,
    higherIsBetter: false,
  },
  accuracy: {
    id: "accuracy",
    label: "Accuracy",
    title: "Enrichment Provider Accuracy",
    subtitle: "[Higher is better]",
    maxValue: 100,
    yAxisLabels: ["100%", "80%", "60%", "40%", "20%", "0%"],
    formatValue: (v: number) => `${v.toFixed(1)}%`,
    higherIsBetter: true,
  },
  speed: {
    id: "speed",
    label: "Speed",
    title: "Average Response Time",
    subtitle: "[Lower is better]",
    maxValue: 6,
    yAxisLabels: ["6s", "5s", "4s", "3s", "2s", "1s", "0s"],
    formatValue: (v: number) => `${v.toFixed(1)}s`,
    higherIsBetter: false,
  },
};

const tabs = Object.values(tabConfigs);

const dataByTab: Record<TabType, BenchmarkData[]> = {
  cost: costData,
  accuracy: accuracyData,
  speed: speedData,
};

export default function BenchmarkChart() {
  const [activeTab, setActiveTab] = useState<TabType>("cost");
  const [displayedTab, setDisplayedTab] = useState<TabType>("cost");
  const [isVisible, setIsVisible] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [animationKey, setAnimationKey] = useState(0);
  const chartRef = useRef<HTMLDivElement>(null);

  const config = tabConfigs[displayedTab];
  const currentData = dataByTab[displayedTab];

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.2 }
    );

    if (chartRef.current) {
      observer.observe(chartRef.current);
    }

    return () => observer.disconnect();
  }, []);

  // Handle tab change with smooth fade transition
  const handleTabChange = (tab: TabType) => {
    if (tab === activeTab) return;

    // Start fade out
    setIsTransitioning(true);
    setActiveTab(tab);

    // After fade out completes, update displayed content and fade in
    setTimeout(() => {
      setDisplayedTab(tab);
      setAnimationKey((prev) => prev + 1);

      // Small delay before fading back in for smoother transition
      setTimeout(() => {
        setIsTransitioning(false);
      }, 50);
    }, 250);
  };

  return (
    <section className="py-20 md:py-32 bg-white" ref={chartRef}>
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid lg:grid-cols-[1fr,320px] gap-12 lg:gap-16">
          {/* Chart Area */}
          <div>
            {/* Tabs */}
            <div className="flex items-center gap-0.5 sm:gap-1 mb-6 sm:mb-8 border-b border-gray-100 overflow-x-auto">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`px-3 sm:px-5 py-2.5 sm:py-3 text-xs sm:text-sm font-medium transition-colors relative whitespace-nowrap ${
                    activeTab === tab.id
                      ? "text-[#111827]"
                      : "text-gray-400 hover:text-gray-600"
                  }`}
                >
                  {tab.label}
                  {activeTab === tab.id && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#111827]" />
                  )}
                </button>
              ))}
            </div>

            {/* Chart Title */}
            <div
              className={`mb-4 sm:mb-6 transition-opacity duration-250 ease-out ${
                isTransitioning ? "opacity-0" : "opacity-100"
              }`}
            >
              <h2 className="text-xl sm:text-2xl md:text-3xl font-normal text-gray-800">
                {config.title}
              </h2>
              <p className="text-xs sm:text-sm text-gray-400 mt-1">{config.subtitle}</p>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap items-center gap-3 sm:gap-6 mb-6 sm:mb-8 text-xs sm:text-sm">
              <div className="flex items-center gap-2">
                <EnrichLogo />
                <span className="text-gray-600">Enrich Engine</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 bg-gray-200 rounded-md" />
                <span className="text-gray-600">Competitors</span>
              </div>
            </div>

            {/* Y-axis + Bars */}
            <div
              className={`flex gap-2 sm:gap-4 transition-opacity duration-250 ease-out ${
                isTransitioning ? "opacity-0" : "opacity-100"
              }`}
            >
              {/* Y-axis labels */}
              <div className="flex flex-col justify-between text-[10px] sm:text-xs text-gray-400 py-2 w-8 sm:w-10 text-right flex-shrink-0">
                {config.yAxisLabels.map((label, i) => (
                  <span key={i}>{label}</span>
                ))}
              </div>

              {/* Chart grid and bars - scrollable on mobile */}
              <div className="flex-1 relative overflow-x-auto -mx-2 px-2 sm:mx-0 sm:px-0">
                <div className="min-w-[480px] sm:min-w-0">
                  {/* Grid lines */}
                  <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                    {config.yAxisLabels.map((_, i) => (
                      <div key={i} className="border-b border-gray-100" />
                    ))}
                  </div>

                  {/* Grouped bars */}
                  <div key={animationKey} className="relative h-64 sm:h-80 flex items-end justify-around px-2 sm:px-4">
                    {currentData.map((group, groupIdx) => (
                      <div key={group.category} className="flex flex-col items-center gap-1 sm:gap-2">
                        {/* Bars group */}
                        <div className="flex items-end gap-1 sm:gap-1.5 h-48 sm:h-64">
                          {group.providers.map((provider, idx) => {
                            const heightPercent = (provider.value / config.maxValue) * 100;
                            const barHeight = Math.min(heightPercent, 100);

                            return (
                              <div
                                key={provider.name}
                                className="flex flex-col items-center"
                              >
                                {/* Value label */}
                                <span
                                  className={`text-[10px] sm:text-xs font-semibold mb-0.5 sm:mb-1 ${
                                    provider.isEnrich ? "text-[#E63946]" : "text-gray-600"
                                  }`}
                                >
                                  {config.formatValue(provider.value)}
                                </span>

                                {/* Bar */}
                                <div
                                  className={`w-8 sm:w-10 md:w-14 rounded-t-md transition-all duration-700 relative ${
                                    provider.isEnrich ? "bg-[#E63946]" : "bg-gray-200"
                                  }`}
                                  style={{
                                    height: isVisible ? `${barHeight * 2}px` : "0px",
                                    transitionDelay: `${groupIdx * 100 + idx * 50}ms`,
                                  }}
                                >
                                  {/* Logo inside bar */}
                                  <div className="absolute top-1.5 sm:top-2 left-1/2 -translate-x-1/2 scale-75 sm:scale-100">
                                    {provider.logo}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Category label */}
                        <span className="text-[10px] sm:text-xs text-gray-500 mt-1 sm:mt-2 text-center max-w-16 sm:max-w-24 leading-tight">
                          {group.category}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Methodology Sidebar */}
          <div className="mt-8 lg:mt-0 pt-8 lg:pt-0 border-t lg:border-t-0 lg:border-l border-gray-100 lg:pl-10">
            <h3 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4 text-gray-800 flex items-center gap-3">
              Methodology
              <span className="flex-1 h-px bg-gray-200" />
            </h3>
            <div
              className={`transition-opacity duration-250 ease-out ${
                isTransitioning ? "opacity-0" : "opacity-100"
              }`}
            >
              <p className="text-sm text-gray-600 leading-relaxed mb-8">
                {displayedTab === "cost" &&
                  "We compared the cost per credit across major enrichment providers using their standard pricing tiers. All costs include verification."}
                {displayedTab === "accuracy" &&
                  "Accuracy measured by comparing enriched data against verified ground truth across 10,000 contacts. Higher percentage means more accurate results."}
                {displayedTab === "speed" &&
                  "Response time measured as average API latency across 1,000 sequential requests during peak hours. Lower times indicate faster processing."}
              </p>

              <div className="space-y-5">
                {displayedTab === "cost" && (
                <>
                  <a href="/methodology#pricing-data" className="block group">
                    <p className="text-sm font-semibold text-gray-800 group-hover:text-[#E63946] transition-colors underline decoration-gray-300 underline-offset-2">
                      Pricing Data
                      <span className="ml-1 no-underline">↗</span>
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      Based on publicly available pricing as of January 2025 for mid-tier plans.
                    </p>
                  </a>

                  <a href="/methodology#verification" className="block group">
                    <p className="text-sm font-semibold text-gray-800 group-hover:text-[#E63946] transition-colors underline decoration-gray-300 underline-offset-2">
                      Verification Method
                      <span className="ml-1 no-underline">↗</span>
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      All emails verified using SMTP validation and deliverability checks.
                    </p>
                  </a>
                </>
              )}

                {displayedTab === "accuracy" && (
                <>
                  <a href="/methodology#accuracy-testing" className="block group">
                    <p className="text-sm font-semibold text-gray-800 group-hover:text-[#E63946] transition-colors underline decoration-gray-300 underline-offset-2">
                      Testing Protocol
                      <span className="ml-1 no-underline">↗</span>
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      Double-blind verification against known valid contacts with manual spot checks.
                    </p>
                  </a>

                  <a href="/methodology#match-criteria" className="block group">
                    <p className="text-sm font-semibold text-gray-800 group-hover:text-[#E63946] transition-colors underline decoration-gray-300 underline-offset-2">
                      Match Criteria
                      <span className="ml-1 no-underline">↗</span>
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      Exact match required for emails; fuzzy match with 95% threshold for names and titles.
                    </p>
                  </a>
                </>
              )}

                {displayedTab === "speed" && (
                <>
                  <a href="/methodology#speed-testing" className="block group">
                    <p className="text-sm font-semibold text-gray-800 group-hover:text-[#E63946] transition-colors underline decoration-gray-300 underline-offset-2">
                      Testing Environment
                      <span className="ml-1 no-underline">↗</span>
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      Tests run from US-East data center with consistent network conditions.
                    </p>
                  </a>

                  <a href="/methodology#latency-measurement" className="block group">
                    <p className="text-sm font-semibold text-gray-800 group-hover:text-[#E63946] transition-colors underline decoration-gray-300 underline-offset-2">
                      Latency Measurement
                      <span className="ml-1 no-underline">↗</span>
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      End-to-end response time including API overhead and data processing.
                    </p>
                  </a>
                </>
              )}

                <a href="/methodology#test-dataset" className="block group">
                  <p className="text-sm font-semibold text-gray-800 group-hover:text-[#E63946] transition-colors underline decoration-gray-300 underline-offset-2">
                    Test Dataset
                    <span className="ml-1 no-underline">↗</span>
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    10,000 B2B contacts across tech, finance, and healthcare industries.
                  </p>
                </a>

                <a href="/pricing" className="block group">
                  <p className="text-sm font-semibold text-gray-800 group-hover:text-[#E63946] transition-colors underline decoration-gray-300 underline-offset-2">
                    Full Pricing
                    <span className="ml-1 no-underline">↗</span>
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    View our complete pricing breakdown and volume discounts.
                  </p>
                </a>
              </div>
            </div>

            {/* Provider logos */}
            <div className="mt-10 pt-8 border-t border-gray-100">
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-4">
                Providers Compared
              </p>
              <div className="flex flex-wrap gap-3">
                <EnrichLogo />
                <ClayLogo />
                <ApolloLogo />
                <ProspeoLogo />
                <LushaLogo />
                <WizaLogo />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
