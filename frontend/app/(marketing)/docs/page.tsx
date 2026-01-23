"use client";

import Link from "next/link";
import Navigation from "@/components/landing/Navigation";
import ExaFooter from "@/components/landing/ExaFooter";
import AnimatedPixelBackground from "@/components/landing/AnimatedPixelBackground";
import ScrollReveal from "@/components/landing/ScrollReveal";
import { Book, Code, Zap, Database, Webhook, Key, ArrowRight, Search } from "lucide-react";

const quickLinks = [
  {
    title: "Getting Started",
    description: "Set up your account and make your first API call",
    icon: Zap,
    href: "#getting-started",
    color: "bg-emerald-500",
  },
  {
    title: "API Reference",
    description: "Complete documentation for all endpoints",
    icon: Code,
    href: "#api-reference",
    color: "bg-blue-500",
  },
  {
    title: "SDKs & Libraries",
    description: "Official SDKs for Python, Node.js, and more",
    icon: Database,
    href: "#sdks",
    color: "bg-violet-500",
  },
  {
    title: "Webhooks",
    description: "Real-time notifications for async operations",
    icon: Webhook,
    href: "#webhooks",
    color: "bg-amber-500",
  },
];

const apiEndpoints = [
  {
    method: "POST",
    endpoint: "/v1/email/find",
    description: "Find email address for a LinkedIn profile",
  },
  {
    method: "POST",
    endpoint: "/v1/phone/find",
    description: "Find phone number for a professional",
  },
  {
    method: "POST",
    endpoint: "/v1/enrich/bulk",
    description: "Enrich multiple contacts at once",
  },
  {
    method: "GET",
    endpoint: "/v1/credits",
    description: "Get current credit balance",
  },
  {
    method: "POST",
    endpoint: "/v1/search",
    description: "Search for professionals by criteria",
  },
];

const sdks = [
  { name: "Python", version: "1.2.0", command: "pip install enrich-sdk" },
  { name: "Node.js", version: "1.1.5", command: "npm install @enrich/sdk" },
  { name: "Go", version: "0.8.0", command: "go get github.com/enrich/sdk-go" },
  { name: "Ruby", version: "0.5.0", command: "gem install enrich-sdk" },
];

export default function DocsPage() {
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
                  Documentation
                </h1>
                <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-8">
                  Everything you need to integrate Enrich Engine into your applications.
                </p>
                {/* Search */}
                <div className="max-w-xl mx-auto">
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search documentation..."
                      className="w-full pl-12 pr-4 py-4 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#E63946]/30 focus:border-[#E63946]"
                    />
                  </div>
                </div>
              </ScrollReveal>
            </div>
          </section>

          {/* Quick Links */}
          <section className="py-12 bg-gray-50">
            <div className="max-w-6xl mx-auto px-6">
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                {quickLinks.map((link, i) => (
                  <ScrollReveal key={i} delay={i * 80}>
                    <a
                      href={link.href}
                      className="block bg-white rounded-2xl p-6 border border-gray-100 hover:shadow-lg hover:border-[#E63946]/30 transition-all group"
                    >
                      <div className={`w-12 h-12 ${link.color} rounded-xl flex items-center justify-center text-white mb-4`}>
                        <link.icon className="w-6 h-6" />
                      </div>
                      <h3 className="font-semibold text-lg mb-1 group-hover:text-[#E63946] transition-colors">
                        {link.title}
                      </h3>
                      <p className="text-gray-600 text-sm">{link.description}</p>
                    </a>
                  </ScrollReveal>
                ))}
              </div>
            </div>
          </section>

          {/* Getting Started */}
          <section id="getting-started" className="py-16 md:py-20 bg-white">
            <div className="max-w-4xl mx-auto px-6">
              <ScrollReveal>
                <h2 className="text-2xl font-semibold mb-8 flex items-center gap-3">
                  <Key className="w-6 h-6 text-[#E63946]" />
                  Getting Started
                </h2>
                <div className="space-y-6">
                  <div className="p-6 rounded-xl border border-gray-100 bg-gray-50">
                    <h3 className="font-semibold mb-2">1. Get your API key</h3>
                    <p className="text-gray-600 text-sm mb-4">
                      Sign up for a free account and grab your API key from the dashboard.
                    </p>
                    <Link href="/signup" className="text-[#E63946] text-sm font-medium hover:underline">
                      Create free account →
                    </Link>
                  </div>
                  <div className="p-6 rounded-xl border border-gray-100 bg-gray-50">
                    <h3 className="font-semibold mb-2">2. Install the SDK</h3>
                    <p className="text-gray-600 text-sm mb-4">
                      Choose your preferred language and install the official SDK.
                    </p>
                    <div className="bg-[#1a1a2e] rounded-lg p-4">
                      <code className="text-sm text-gray-300 font-mono">
                        npm install @enrich/sdk
                      </code>
                    </div>
                  </div>
                  <div className="p-6 rounded-xl border border-gray-100 bg-gray-50">
                    <h3 className="font-semibold mb-2">3. Make your first call</h3>
                    <p className="text-gray-600 text-sm mb-4">
                      Initialize the client and start enriching data.
                    </p>
                    <div className="bg-[#1a1a2e] rounded-lg p-4 overflow-x-auto">
                      <pre className="text-sm text-gray-300 font-mono">
{`import Enrich from '@enrich/sdk';

const client = new Enrich({ apiKey: 'your_api_key' });

const result = await client.findEmail({
  linkedinUrl: 'linkedin.com/in/johndoe'
});`}
                      </pre>
                    </div>
                  </div>
                </div>
              </ScrollReveal>
            </div>
          </section>

          {/* API Reference */}
          <section id="api-reference" className="py-16 md:py-20 bg-gray-50">
            <div className="max-w-4xl mx-auto px-6">
              <ScrollReveal>
                <h2 className="text-2xl font-semibold mb-8 flex items-center gap-3">
                  <Code className="w-6 h-6 text-[#E63946]" />
                  API Reference
                </h2>
                <div className="space-y-3">
                  {apiEndpoints.map((endpoint, i) => (
                    <a
                      key={i}
                      href="#"
                      className="flex items-center gap-4 p-4 bg-white rounded-xl border border-gray-100 hover:border-[#E63946]/30 hover:shadow-md transition-all group"
                    >
                      <span className={`px-2 py-1 rounded text-xs font-mono font-bold ${
                        endpoint.method === "GET" ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700"
                      }`}>
                        {endpoint.method}
                      </span>
                      <code className="font-mono text-sm text-gray-800">{endpoint.endpoint}</code>
                      <span className="text-gray-500 text-sm ml-auto">{endpoint.description}</span>
                      <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-[#E63946] transition-colors" />
                    </a>
                  ))}
                </div>
              </ScrollReveal>
            </div>
          </section>

          {/* SDKs */}
          <section id="sdks" className="py-16 md:py-20 bg-white">
            <div className="max-w-4xl mx-auto px-6">
              <ScrollReveal>
                <h2 className="text-2xl font-semibold mb-8 flex items-center gap-3">
                  <Database className="w-6 h-6 text-[#E63946]" />
                  SDKs & Libraries
                </h2>
                <div className="grid md:grid-cols-2 gap-4">
                  {sdks.map((sdk, i) => (
                    <div key={i} className="p-5 rounded-xl border border-gray-100 bg-gray-50">
                      <div className="flex items-center justify-between mb-3">
                        <span className="font-semibold">{sdk.name}</span>
                        <span className="text-xs text-gray-500">v{sdk.version}</span>
                      </div>
                      <div className="bg-[#1a1a2e] rounded-lg p-3">
                        <code className="text-sm text-gray-300 font-mono">{sdk.command}</code>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollReveal>
            </div>
          </section>

          {/* Help */}
          <section className="py-16 bg-white">
            <div className="max-w-4xl mx-auto px-6 text-center">
              <h2 className="text-2xl md:text-3xl font-semibold text-gray-900 mb-4">
                Need help?
              </h2>
              <p className="text-gray-600 mb-6">
                Our support team is here to help you get started.
              </p>
              <div className="flex flex-col sm:flex-row justify-center gap-4">
                <Link href="/contact">
                  <button className="bg-[#E63946] text-white hover:bg-[#d32f3d] rounded-xl px-8 py-3 font-medium transition-colors">
                    Contact support
                  </button>
                </Link>
                <a
                  href="https://github.com"
                  className="border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-xl px-8 py-3 font-medium transition-colors"
                >
                  GitHub Discussions
                </a>
              </div>
            </div>
          </section>
        </main>
      </div>
      <ExaFooter />
    </div>
  );
}
