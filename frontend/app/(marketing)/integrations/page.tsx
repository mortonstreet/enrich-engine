"use client";

import Link from "next/link";
import Navigation from "@/components/landing/Navigation";
import ExaFooter from "@/components/landing/ExaFooter";
import AnimatedPixelBackground from "@/components/landing/AnimatedPixelBackground";
import ScrollReveal from "@/components/landing/ScrollReveal";
import { Button } from "@/components/ui/Button";
import { ArrowRight, Zap, Code, Webhook } from "lucide-react";

const integrationCategories = [
  {
    name: "CRM",
    description: "Sync enriched data directly to your CRM",
    integrations: [
      { name: "Salesforce", logo: "SF", color: "bg-blue-500", status: "live" },
      { name: "HubSpot", logo: "HS", color: "bg-orange-500", status: "live" },
      { name: "Pipedrive", logo: "PD", color: "bg-green-500", status: "live" },
      { name: "Close", logo: "CL", color: "bg-slate-700", status: "live" },
    ],
  },
  {
    name: "Sales Engagement",
    description: "Power your outreach with verified contacts",
    integrations: [
      { name: "Outreach", logo: "OR", color: "bg-purple-600", status: "live" },
      { name: "Salesloft", logo: "SL", color: "bg-blue-600", status: "live" },
      { name: "Apollo", logo: "AP", color: "bg-indigo-500", status: "live" },
      { name: "Lemlist", logo: "LL", color: "bg-pink-500", status: "beta" },
    ],
  },
  {
    name: "Automation",
    description: "Build custom workflows with no code",
    integrations: [
      { name: "Zapier", logo: "ZP", color: "bg-orange-600", status: "live" },
      { name: "Make", logo: "MK", color: "bg-violet-600", status: "live" },
      { name: "n8n", logo: "N8", color: "bg-red-500", status: "live" },
      { name: "Tray.io", logo: "TR", color: "bg-cyan-500", status: "coming" },
    ],
  },
  {
    name: "Data & Analytics",
    description: "Enrich your data warehouse and BI tools",
    integrations: [
      { name: "Snowflake", logo: "SF", color: "bg-sky-500", status: "live" },
      { name: "BigQuery", logo: "BQ", color: "bg-blue-400", status: "live" },
      { name: "Segment", logo: "SG", color: "bg-emerald-500", status: "beta" },
      { name: "Fivetran", logo: "FT", color: "bg-blue-700", status: "coming" },
    ],
  },
];

const developerTools = [
  {
    icon: Code,
    title: "REST API",
    description: "Full-featured API with comprehensive documentation. Enrich contacts programmatically with simple HTTP requests.",
  },
  {
    icon: Webhook,
    title: "Webhooks",
    description: "Real-time notifications for async operations. Get notified instantly when bulk enrichments complete.",
  },
  {
    icon: Zap,
    title: "SDKs",
    description: "Official libraries for Python, Node.js, Go, and Ruby. Get started in minutes with type-safe code.",
  },
];

const statusColors = {
  live: "bg-green-100 text-green-700",
  beta: "bg-yellow-100 text-yellow-700",
  coming: "bg-gray-100 text-gray-500",
};

const statusLabels = {
  live: "Live",
  beta: "Beta",
  coming: "Coming Soon",
};

export default function IntegrationsPage() {
  return (
    <div className="min-h-screen text-[#111827]">
      <AnimatedPixelBackground />
      <div className="relative z-10 bg-white">
        <Navigation />
        <main>
          {/* Hero */}
          <section className="py-20 md:py-28 bg-white">
            <div className="max-w-4xl mx-auto px-6 text-center">
              <ScrollReveal>
                <h1
                  className="text-4xl md:text-5xl lg:text-6xl font-normal tracking-tight mb-6"
                  style={{ fontFamily: "'Source Serif 4', Georgia, serif" }}
                >
                  Integrations
                </h1>
                <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                  Connect Enrich Engine to your existing tools. Automatically sync enriched data
                  to your CRM, sales tools, and data warehouse.
                </p>
              </ScrollReveal>
            </div>
          </section>

          {/* Integration Categories */}
          <section className="py-16 md:py-20 bg-gray-50">
            <div className="max-w-6xl mx-auto px-6">
              {integrationCategories.map((category, categoryIndex) => (
                <div key={category.name} className="mb-16 last:mb-0">
                  <ScrollReveal delay={categoryIndex * 50}>
                    <h2 className="text-2xl font-semibold mb-2">{category.name}</h2>
                    <p className="text-gray-600 mb-8">{category.description}</p>
                  </ScrollReveal>

                  <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {category.integrations.map((integration, i) => (
                      <ScrollReveal key={integration.name} delay={categoryIndex * 50 + i * 30}>
                        <div className="bg-white rounded-2xl p-6 border border-gray-100 hover:border-[#E63946]/30 hover:shadow-lg transition-all cursor-pointer group">
                          <div className="flex items-start justify-between mb-4">
                            <div className={`w-12 h-12 ${integration.color} rounded-xl flex items-center justify-center text-white font-bold text-sm`}>
                              {integration.logo}
                            </div>
                            <span className={`text-xs font-medium px-2 py-1 rounded-full ${statusColors[integration.status as keyof typeof statusColors]}`}>
                              {statusLabels[integration.status as keyof typeof statusLabels]}
                            </span>
                          </div>
                          <h3 className="font-semibold text-lg group-hover:text-[#E63946] transition-colors">
                            {integration.name}
                          </h3>
                        </div>
                      </ScrollReveal>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Developer Tools */}
          <section className="py-20 md:py-28 bg-white">
            <div className="max-w-6xl mx-auto px-6">
              <ScrollReveal>
                <div className="text-center mb-12">
                  <h2
                    className="text-3xl md:text-4xl font-normal tracking-tight mb-4"
                    style={{ fontFamily: "'Source Serif 4', Georgia, serif" }}
                  >
                    Build custom integrations
                  </h2>
                  <p className="text-gray-600 max-w-2xl mx-auto">
                    Need something custom? Our developer tools make it easy to integrate
                    Enrich Engine into any workflow.
                  </p>
                </div>
              </ScrollReveal>

              <div className="grid md:grid-cols-3 gap-8">
                {developerTools.map((tool, i) => (
                  <ScrollReveal key={tool.title} delay={i * 80}>
                    <div className="bg-gray-50 rounded-2xl p-8 h-full">
                      <div className="w-12 h-12 rounded-xl bg-[#E63946]/10 flex items-center justify-center text-[#E63946] mb-6">
                        <tool.icon className="w-6 h-6" />
                      </div>
                      <h3 className="text-xl font-semibold mb-3">{tool.title}</h3>
                      <p className="text-gray-600">{tool.description}</p>
                    </div>
                  </ScrollReveal>
                ))}
              </div>

              <ScrollReveal delay={300}>
                <div className="text-center mt-12">
                  <Link href="/docs">
                    <Button variant="outline" className="border-gray-200 text-gray-700 hover:bg-gray-50 h-12 px-8 text-base">
                      View API documentation
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </Link>
                </div>
              </ScrollReveal>
            </div>
          </section>

          {/* Request Integration */}
          <section className="py-16 bg-white">
            <div className="max-w-4xl mx-auto px-6 text-center">
              <ScrollReveal>
                <h2 className="text-2xl md:text-3xl font-semibold text-[#111827] mb-4">
                  Don&apos;t see your tool?
                </h2>
                <p className="text-gray-600 mb-8 max-w-xl mx-auto">
                  We&apos;re always adding new integrations. Let us know what you need and
                  we&apos;ll prioritize it on our roadmap.
                </p>
                <div className="flex flex-col sm:flex-row justify-center gap-4">
                  <Link href="/contact">
                    <Button className="bg-[#E63946] hover:bg-[#C5303C] text-white h-12 px-8 text-base">
                      Request an integration
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </Link>
                  <Link href="/signup">
                    <Button variant="outline" className="border-gray-200 text-gray-700 hover:bg-gray-50 h-12 px-8 text-base">
                      Start free trial
                    </Button>
                  </Link>
                </div>
              </ScrollReveal>
            </div>
          </section>
        </main>
      </div>
      <ExaFooter />
    </div>
  );
}
