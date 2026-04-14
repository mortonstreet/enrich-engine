"use client";

import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import DarkNavigation from "@/components/landing/DarkNavigation";
import DarkFooter from "@/components/landing/DarkFooter";
import DarkScrollReveal from "@/components/landing/DarkScrollReveal";
import { OmniDialLogoStatic } from "@/components/landing/OmniDialLogo";

// Brand logo SVG components for the marketing page
const SlackIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z"/>
  </svg>
);

const SalesforceIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 48 48" fill="none" className={className}>
    <path d="M12 30.1c0-2.6 1.8-4.7 4.2-5a5.2 5.2 0 0 1 4.8-4c.5 0 1 .07 1.4.2A6.2 6.2 0 0 1 28.5 17c3 0 5.6 2.2 6 5a4.7 4.7 0 0 1 3.7 4.6c0 2.6-2.1 4.7-4.7 4.7H16.5c-2.5 0-4.5-2-4.5-4.5v3.3z" fill="#00A1E0"/>
  </svg>
);

const HubSpotIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 48 48" fill="none" className={className}>
    <g transform="translate(10, 8)" fill="#FF7A59">
      <rect x="14" y="2" width="3" height="7" rx="1.5"/>
      <circle cx="15.5" cy="1.5" r="2.5"/>
      <circle cx="15.5" cy="18" r="5.5" stroke="#FF7A59" strokeWidth="2.8" fill="none"/>
      <rect x="13.5" y="8.5" width="4" height="5" rx="1"/>
      <line x1="10.5" y1="18" x2="3" y2="12.5" stroke="#FF7A59" strokeWidth="2.2" strokeLinecap="round"/>
      <circle cx="2" cy="11.5" r="3" stroke="#FF7A59" strokeWidth="2.2" fill="none"/>
      <line x1="20" y1="22" x2="23" y2="24.5" stroke="#FF7A59" strokeWidth="2.2" strokeLinecap="round"/>
      <circle cx="24" cy="26" r="2.5"/>
    </g>
  </svg>
);

const PipedriveIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 48 48" fill="none" className={className}>
    <g transform="translate(14, 10)">
      <circle cx="10" cy="8" r="7" stroke="#017737" strokeWidth="3.5" fill="none"/>
      <line x1="10" y1="15" x2="10" y2="30" stroke="#017737" strokeWidth="3.5" strokeLinecap="round"/>
    </g>
  </svg>
);

const MondayIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 48 48" fill="none" className={className}>
    <circle cx="14" cy="34" r="3.2" fill="#FF3D57"/>
    <circle cx="24" cy="34" r="3.2" fill="#00CA72"/>
    <path d="M11 18c0-1.7 1.3-3 3-3s3 1.3 3 3v10c0 1.7-1.3 3-3 3s-3-1.3-3-3V18z" fill="#FF3D57"/>
    <path d="M21 22c0-1.7 1.3-3 3-3s3 1.3 3 3v6c0 1.7-1.3 3-3 3s-3-1.3-3-3v-6z" fill="#FFCB00"/>
    <path d="M31 25c0-1.7 1.3-3 3-3s3 1.3 3 3v3c0 1.7-1.3 3-3 3s-3-1.3-3-3v-3z" fill="#00CA72"/>
  </svg>
);

const AttioIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 48 48" fill="none" className={className}>
    <path d="M15 36L24 12L33 36" stroke="#5856D6" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M18 29h12" stroke="#5856D6" strokeWidth="3.5" strokeLinecap="round"/>
    <circle cx="24" cy="12" r="2.5" fill="#5856D6"/>
  </svg>
);

type LogoRenderer = (className: string) => React.ReactNode;
const LOGO_ICONS: Record<string, LogoRenderer> = {
  salesforce: (cls) => <SalesforceIcon className={cls} />,
  hubspot: (cls) => <HubSpotIcon className={cls} />,
  pipedrive: (cls) => <PipedriveIcon className={cls} />,
  monday: (cls) => <MondayIcon className={cls} />,
  attio: (cls) => <AttioIcon className={cls} />,
  slack: (cls) => <SlackIcon className={cls} />,
};

const integrations = [
  {
    name: "Salesforce",
    category: "CRM",
    description: "Sync contacts, log calls, and update opportunities automatically.",
    logo: "salesforce",
    color: "#00A1E0",
    features: ["Two-way sync", "Auto call logging", "Click-to-dial from records"],
    status: "Available",
  },
  {
    name: "HubSpot",
    category: "CRM",
    description: "Connect your HubSpot CRM for seamless contact and deal management.",
    logo: "hubspot",
    color: "#FF7A59",
    features: ["Contact sync", "Call logging", "Workflow triggers"],
    status: "Available",
  },
  {
    name: "Pipedrive",
    category: "CRM",
    description: "Keep your Pipedrive pipeline in sync with every call.",
    logo: "pipedrive",
    color: "#017737",
    features: ["Deal updates", "Activity logging", "Contact enrichment"],
    status: "Available",
  },
  {
    name: "Monday CRM",
    category: "CRM",
    description: "Manage contacts and deals from your Monday CRM boards.",
    logo: "monday",
    color: "#FF3D57",
    features: ["Board sync", "Activity tracking", "Contact management"],
    status: "Available",
  },
  {
    name: "Attio",
    category: "CRM",
    description: "Sync your Attio workspace with real-time call data and contacts.",
    logo: "attio",
    color: "#5856D6",
    features: ["Contact sync", "Call logging", "Relationship intelligence"],
    status: "Available",
  },
  {
    name: "Slack",
    category: "Communication",
    description: "Get call notifications and team updates in your Slack channels.",
    logo: "slack",
    color: "#4A154B",
    features: ["Call alerts", "Meeting reminders", "Team leaderboards"],
    status: "Available",
  },
  {
    name: "Zapier",
    category: "Automation",
    description: "Connect OmniDial to 5,000+ apps with Zapier automations.",
    logo: "ZP",
    color: "#FF4A00",
    features: ["Custom triggers", "Multi-app workflows", "No code required"],
    status: "Available",
  },
  {
    name: "Google Calendar",
    category: "Productivity",
    description: "Sync meetings and block calling time on your calendar.",
    logo: "GC",
    color: "#4285F4",
    features: ["Meeting sync", "Availability blocking", "Reminders"],
    status: "Available",
  },
  {
    name: "Outreach",
    category: "Sales Engagement",
    description: "Combine power dialing with your Outreach sequences.",
    logo: "OR",
    color: "#5951FF",
    features: ["Sequence integration", "Task sync", "Unified analytics"],
    status: "Coming Soon",
  },
  {
    name: "Salesloft",
    category: "Sales Engagement",
    description: "Enhance your Salesloft cadences with power dialing.",
    logo: "SL",
    color: "#FF5733",
    features: ["Cadence sync", "Call steps", "Performance tracking"],
    status: "Coming Soon",
  },
  {
    name: "Gong",
    category: "Revenue Intelligence",
    description: "Send call recordings to Gong for AI-powered analysis.",
    logo: "GG",
    color: "#7B6CCC",
    features: ["Auto-upload", "Deal insights", "Coaching alerts"],
    status: "Coming Soon",
  },
];

const categories = ["All", "CRM", "Communication", "Automation", "Productivity", "Sales Engagement", "Revenue Intelligence"];

export default function IntegrationsPage() {
  return (
    <div className="min-h-screen text-white bg-[#0a0a0a]">
      <DarkNavigation />

      <div className="relative z-10 bg-[#0a0a0a] pt-16">
        <main>
          {/* Hero */}
          <section className="py-16 sm:py-20 md:py-24">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
              <DarkScrollReveal>
                <div className="flex items-center justify-center gap-3 mb-8">
                  <OmniDialLogoStatic size={40} color="#fafafa" />
                  <span className="text-2xl font-medium tracking-tight">OmniDial</span>
                </div>
                <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl tracking-tight mb-4 heading-display">
                  Integrations
                </h1>
                <p className="text-white/50 text-lg max-w-2xl mx-auto font-light">
                  Connect OmniDial with your favorite tools. Sync data, automate workflows, and work smarter.
                </p>
              </DarkScrollReveal>
            </div>
          </section>

          {/* Categories */}
          <section className="pb-8">
            <div className="max-w-6xl mx-auto px-4 sm:px-6">
              <div className="flex flex-wrap gap-2 justify-center">
                {categories.map((category) => (
                  <button
                    key={category}
                    className={`px-4 py-2 text-sm rounded-full transition-colors ${
                      category === "All"
                        ? "bg-white text-black"
                        : "bg-white/5 text-white/60 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* Integrations Grid */}
          <section className="py-12 sm:py-16">
            <div className="max-w-6xl mx-auto px-4 sm:px-6">
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {integrations.map((integration, i) => (
                  <DarkScrollReveal key={integration.name} delay={i * 50}>
                    <div className="p-6 bg-[#111111] rounded-2xl border border-white/5 hover:border-white/10 transition-all h-full flex flex-col">
                      <div className="flex items-start justify-between mb-4">
                        <div
                          className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-medium text-sm"
                          style={{ backgroundColor: LOGO_ICONS[integration.logo] ? "#111" : integration.color }}
                        >
                          {LOGO_ICONS[integration.logo] ? (
                            LOGO_ICONS[integration.logo]("w-8 h-8")
                          ) : (
                            integration.logo
                          )}
                        </div>
                        <span
                          className={`px-2 py-1 text-xs rounded-full ${
                            integration.status === "Available"
                              ? "bg-green-500/20 text-green-400"
                              : "bg-yellow-500/20 text-yellow-400"
                          }`}
                        >
                          {integration.status}
                        </span>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-medium text-lg text-white">{integration.name}</h3>
                        </div>
                        <p className="text-white/40 text-xs mb-3 font-light">{integration.category}</p>
                        <p className="text-white/50 text-sm mb-4 font-light">{integration.description}</p>
                        <ul className="space-y-2">
                          {integration.features.map((feature) => (
                            <li key={feature} className="flex items-center gap-2 text-sm text-white/60">
                              <Check className="w-4 h-4 text-green-400" />
                              {feature}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <Button
                        variant="outline"
                        className="mt-6 w-full border-white/10 text-white hover:bg-white/10 rounded-xl"
                        disabled={integration.status !== "Available"}
                      >
                        {integration.status === "Available" ? "Connect" : "Coming Soon"}
                      </Button>
                    </div>
                  </DarkScrollReveal>
                ))}
              </div>
            </div>
          </section>

          {/* Request Integration */}
          <section className="py-16 sm:py-20 border-t border-white/5">
            <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
              <DarkScrollReveal>
                <h2 className="text-2xl sm:text-3xl font-medium mb-4">
                  Don&apos;t see your tool?
                </h2>
                <p className="text-white/50 mb-6 font-light">
                  Let us know what integrations you need. We&apos;re constantly adding new ones.
                </p>
                <Link href="/contact">
                  <Button className="bg-white text-black hover:bg-white/90 rounded-xl px-8 h-12">
                    Request an integration
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              </DarkScrollReveal>
            </div>
          </section>
        </main>
      </div>

      <DarkFooter />
    </div>
  );
}
