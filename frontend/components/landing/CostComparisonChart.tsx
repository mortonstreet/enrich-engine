"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { EnrichEngineLogoStatic } from "./EnrichEngineLogo";

interface Provider {
  name: string;
  logo: string; // Path to logo image or single letter fallback
  logoType: "image" | "letter";
  color: string;
  costPerContact: number;
  emailAccuracy: number;
  avgLatency: number; // in seconds
}

const providers: Provider[] = [
  {
    name: "Enrich",
    logo: "E",
    logoType: "letter",
    color: "#E63946",
    costPerContact: 0.029,
    emailAccuracy: 95,
    avgLatency: 0.8,
  },
  {
    name: "Clay",
    logo: "/logos/clay.svg",
    logoType: "image",
    color: "#4DBCE9",
    costPerContact: 0.15,
    emailAccuracy: 88,
    avgLatency: 1.4,
  },
  {
    name: "Apollo",
    logo: "/logos/apollo.svg",
    logoType: "image",
    color: "#F8FF2C",
    costPerContact: 0.47,
    emailAccuracy: 91,
    avgLatency: 2.1,
  },
  {
    name: "Forager",
    logo: "/logos/forager.svg",
    logoType: "image",
    color: "#5A42FF",
    costPerContact: 0.12,
    emailAccuracy: 87,
    avgLatency: 1.2,
  },
  {
    name: "Prospeo",
    logo: "/logos/prospeo.svg",
    logoType: "image",
    color: "#8B1538",
    costPerContact: 0.22,
    emailAccuracy: 89,
    avgLatency: 1.3,
  },
  {
    name: "Wiza",
    logo: "/logos/wiza.svg",
    logoType: "image",
    color: "#551EA8",
    costPerContact: 0.35,
    emailAccuracy: 89,
    avgLatency: 1.5,
  },
  {
    name: "RocketReach",
    logo: "R",
    logoType: "letter",
    color: "#10B981",
    costPerContact: 0.52,
    emailAccuracy: 88,
    avgLatency: 2.8,
  },
  {
    name: "ZoomInfo",
    logo: "Z",
    logoType: "letter",
    color: "#F59E0B",
    costPerContact: 0.62,
    emailAccuracy: 92,
    avgLatency: 1.9,
  },
  {
    name: "Clearbit",
    logo: "C",
    logoType: "letter",
    color: "#3B82F6",
    costPerContact: 0.71,
    emailAccuracy: 90,
    avgLatency: 2.4,
  },
];

type MetricType = "cost" | "accuracy" | "latency";

const tabs: { id: MetricType; label: string }[] = [
  { id: "cost", label: "Cost per Contact" },
  { id: "accuracy", label: "Email Accuracy" },
  { id: "latency", label: "Latency" },
];

export default function CostComparisonChart() {
  const [activeTab, setActiveTab] = useState<MetricType>("cost");
  const [displayedTab, setDisplayedTab] = useState<MetricType>("cost");
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [hasAnimated, setHasAnimated] = useState(false);
  const chartRef = useRef<HTMLDivElement>(null);

  // Handle tab switching with fade transition
  const handleTabChange = (newTab: MetricType) => {
    if (newTab === activeTab) return;
    setIsTransitioning(true);
    setActiveTab(newTab);

    // After fade out, update displayed content and fade in
    setTimeout(() => {
      setDisplayedTab(newTab);
      setTimeout(() => {
        setIsTransitioning(false);
      }, 50);
    }, 200);
  };

  // Animate bars on initial view
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated) {
          setHasAnimated(true);
          observer.disconnect();
        }
      },
      { threshold: 0.2 }
    );

    if (chartRef.current) {
      observer.observe(chartRef.current);
    }

    return () => observer.disconnect();
  }, [hasAnimated]);

  const getBarHeight = (provider: Provider) => {
    if (displayedTab === "cost") {
      // Lower cost is better, so invert for visual (max cost ~$0.75)
      const maxCost = 0.75;
      return ((maxCost - provider.costPerContact) / maxCost) * 100;
    } else if (displayedTab === "accuracy") {
      // Higher accuracy is better
      return provider.emailAccuracy;
    } else {
      // Lower latency is better, so invert (max latency ~3s)
      const maxLatency = 3;
      return ((maxLatency - provider.avgLatency) / maxLatency) * 100;
    }
  };

  const getDisplayValue = (provider: Provider) => {
    if (displayedTab === "cost") {
      return `$${provider.costPerContact.toFixed(2)}`;
    } else if (displayedTab === "accuracy") {
      return `${provider.emailAccuracy}%`;
    } else {
      return `${provider.avgLatency}s`;
    }
  };

  const getBarColor = (provider: Provider) => {
    if (provider.name === "Enrich") {
      return provider.color;
    }
    return "#E5E7EB"; // gray for competitors
  };

  // Sort providers based on displayed metric
  const sortedProviders = [...providers].sort((a, b) => {
    if (displayedTab === "cost") {
      return a.costPerContact - b.costPerContact; // Lower is better (first)
    } else if (displayedTab === "accuracy") {
      return b.emailAccuracy - a.emailAccuracy; // Higher is better (first)
    } else {
      return a.avgLatency - b.avgLatency; // Lower is better (first)
    }
  });

  return (
    <section className="py-20 md:py-32 bg-white">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid lg:grid-cols-[1fr,320px] gap-12">
          {/* Main chart area */}
          <div>
            {/* Header */}
            <h2
              className="text-3xl md:text-4xl font-normal tracking-tight mb-3"
              style={{ fontFamily: "'Source Serif 4', Georgia, serif" }}
            >
              10x cheaper than the competition
            </h2>
            <p className="text-gray-600 mb-8">
              We built our enrichment engine in-house, passing the savings directly to you.
            </p>

            {/* Tabs */}
            <div className="flex items-center gap-1 mb-8 border-b border-gray-100">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`px-4 py-3 text-sm font-medium transition-colors relative ${
                    activeTab === tab.id
                      ? "text-[#111827]"
                      : "text-gray-400 hover:text-gray-600"
                  }`}
                >
                  {tab.label}
                  {activeTab === tab.id && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#111827] transition-all duration-300" />
                  )}
                </button>
              ))}
            </div>

            {/* Chart title */}
            <div
              className={`mb-2 transition-opacity duration-200 ${
                isTransitioning ? "opacity-0" : "opacity-100"
              }`}
            >
              <h3 className="text-2xl font-normal text-gray-800">
                {displayedTab === "cost" && "Cost per Enriched Contact"}
                {displayedTab === "accuracy" && "Email Verification Accuracy"}
                {displayedTab === "latency" && "Average API Response Time"}
              </h3>
              <p className="text-sm text-gray-400">
                {displayedTab === "cost" && "[Lower is better]"}
                {displayedTab === "accuracy" && "[Higher is better]"}
                {displayedTab === "latency" && "[Lower is better]"}
              </p>
            </div>

            {/* Legend */}
            <div className="flex items-center gap-6 mb-6 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-[#E63946]" />
                <span className="text-gray-600">Enrich Engine</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-gray-200" />
                <span className="text-gray-600">Competitors</span>
              </div>
            </div>

            {/* Y-axis labels + Chart */}
            <div
              ref={chartRef}
              className={`flex gap-4 transition-opacity duration-200 ${
                isTransitioning ? "opacity-0" : "opacity-100"
              }`}
            >
              {/* Y-axis */}
              <div className="flex flex-col justify-between text-xs text-gray-400 py-2 w-12 text-right">
                {displayedTab === "cost" && (
                  <>
                    <span>$0.00</span>
                    <span>$0.25</span>
                    <span>$0.50</span>
                    <span>$0.75</span>
                  </>
                )}
                {displayedTab === "accuracy" && (
                  <>
                    <span>100%</span>
                    <span>90%</span>
                    <span>80%</span>
                    <span>70%</span>
                  </>
                )}
                {displayedTab === "latency" && (
                  <>
                    <span>0s</span>
                    <span>1s</span>
                    <span>2s</span>
                    <span>3s</span>
                  </>
                )}
              </div>

              {/* Bars */}
              <div className="flex-1 relative">
                {/* Grid lines */}
                <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                  <div className="border-b border-gray-100" />
                  <div className="border-b border-gray-100" />
                  <div className="border-b border-gray-100" />
                  <div className="border-b border-gray-100" />
                </div>

                {/* Bar chart */}
                <div className="relative h-80 flex items-end justify-around gap-2 md:gap-4">
                  {sortedProviders.map((provider, index) => {
                    const barHeight = getBarHeight(provider);
                    const isEnrich = provider.name === "Enrich";
                    const animationDelay = hasAnimated ? 0 : index * 80;

                    return (
                      <div
                        key={provider.name}
                        className="flex flex-col items-center gap-2 flex-1 max-w-20"
                        style={{
                          animation: hasAnimated
                            ? "none"
                            : `fadeSlideUp 0.6s ease-out ${animationDelay}ms forwards`,
                          opacity: hasAnimated ? 1 : 0,
                        }}
                      >
                        {/* Value label */}
                        <span
                          className={`text-xs md:text-sm font-semibold transition-all duration-300 ${
                            isEnrich ? "text-[#E63946]" : "text-gray-600"
                          }`}
                        >
                          {getDisplayValue(provider)}
                        </span>

                        {/* Bar */}
                        <div
                          className="w-full rounded-t-lg transition-all duration-500 ease-out relative group"
                          style={{
                            height: `${Math.max(barHeight * 2.8, 20)}px`,
                            backgroundColor: getBarColor(provider),
                          }}
                        >
                          {/* Logo on bar */}
                          <div
                            className={`absolute top-3 left-1/2 -translate-x-1/2 w-6 h-6 md:w-8 md:h-8 rounded-md flex items-center justify-center text-xs md:text-sm font-bold overflow-hidden transition-transform duration-300 hover:scale-110 ${
                              isEnrich
                                ? "bg-white text-[#E63946]"
                                : "bg-white/90 text-gray-700"
                            }`}
                          >
                            {provider.name === "Enrich" ? (
                              <EnrichEngineLogoStatic size={20} color="#E63946" />
                            ) : provider.logoType === "image" ? (
                              <Image
                                src={provider.logo}
                                alt={provider.name}
                                width={24}
                                height={24}
                                className="object-contain p-0.5"
                              />
                            ) : (
                              provider.logo
                            )}
                          </div>

                          {/* Tooltip on hover */}
                          <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none">
                            {provider.name}
                          </div>
                        </div>

                        {/* Provider name */}
                        <span className="text-xs text-gray-500 truncate max-w-full">
                          {provider.name}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Methodology sidebar */}
          <div className="lg:border-l lg:border-gray-100 lg:pl-12">
            <h3 className="text-xl font-semibold mb-4 text-gray-800">
              Methodology
              <span className="ml-2 inline-block w-16 h-px bg-gray-200 align-middle" />
            </h3>
            <p className="text-sm text-gray-600 leading-relaxed mb-6">
              We tested each provider by enriching the same list of 10,000 B2B
              contacts across various industries. Cost is calculated per
              successfully enriched contact with verified email.
            </p>

            <div className="space-y-4">
              <a
                href="#"
                className="block text-sm font-semibold text-gray-800 hover:text-[#E63946] transition-colors"
              >
                Test Dataset
                <span className="ml-1">↗</span>
                <p className="font-normal text-gray-500 mt-1">
                  10,000 contacts from LinkedIn Sales Navigator exports across
                  tech, finance, and healthcare.
                </p>
              </a>

              <a
                href="#"
                className="block text-sm font-semibold text-gray-800 hover:text-[#E63946] transition-colors"
              >
                Verification Method
                <span className="ml-1">↗</span>
                <p className="font-normal text-gray-500 mt-1">
                  All emails verified using SMTP validation and deliverability
                  checks.
                </p>
              </a>

              <a
                href="#"
                className="block text-sm font-semibold text-gray-800 hover:text-[#E63946] transition-colors"
              >
                Pricing Data
                <span className="ml-1">↗</span>
                <p className="font-normal text-gray-500 mt-1">
                  Based on publicly available pricing as of January 2025 for
                  mid-tier plans.
                </p>
              </a>

              <a
                href="#"
                className="block text-sm font-semibold text-gray-800 hover:text-[#E63946] transition-colors"
              >
                Full Report
                <span className="ml-1">↗</span>
                <p className="font-normal text-gray-500 mt-1">
                  Download our complete comparison including data quality
                  metrics.
                </p>
              </a>
            </div>

            {/* Provider logos grid */}
            <div className="mt-8 pt-6 border-t border-gray-100">
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-4">
                Providers Tested
              </p>
              <div className="grid grid-cols-4 gap-3">
                {providers.map((p) => (
                  <div
                    key={p.name}
                    className="w-10 h-10 rounded-lg border border-gray-100 flex items-center justify-center text-sm font-bold overflow-hidden"
                    style={{ color: p.color }}
                    title={p.name}
                  >
                    {p.name === "Enrich" ? (
                      <EnrichEngineLogoStatic size={28} color="#E63946" />
                    ) : p.logoType === "image" ? (
                      <Image
                        src={p.logo}
                        alt={p.name}
                        width={32}
                        height={32}
                        className="object-contain"
                      />
                    ) : (
                      p.logo
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
