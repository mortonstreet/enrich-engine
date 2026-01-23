"use client";

import Link from "next/link";
import { ArrowUpRight, CheckCircle2, Database, Mail, Phone, Linkedin, BarChart3, Shield, Clock, Users } from "lucide-react";
import { Button } from "@/components/ui/Button";
import Navigation from "@/components/landing/Navigation";
import ExaFooter from "@/components/landing/ExaFooter";
import AnimatedPixelBackground from "@/components/landing/AnimatedPixelBackground";
import ScrollReveal from "@/components/landing/ScrollReveal";

// Provider logo components
const EnrichLogo = () => (
  <div className="w-10 h-10 bg-[#E63946] rounded-lg flex items-center justify-center">
    <span className="text-white text-sm font-bold">E</span>
  </div>
);

const ClayLogo = () => (
  <div className="w-10 h-10 bg-black rounded-lg flex items-center justify-center overflow-hidden">
    <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none">
      <rect x="4" y="6" width="16" height="2.5" rx="0.5" fill="white"/>
      <rect x="4" y="10.75" width="16" height="2.5" rx="0.5" fill="white"/>
      <rect x="4" y="15.5" width="16" height="2.5" rx="0.5" fill="white"/>
    </svg>
  </div>
);

const ApolloLogo = () => (
  <div className="w-10 h-10 bg-[#6366F1] rounded-lg flex items-center justify-center overflow-hidden">
    <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none">
      <path d="M12 4L4 20h4l1.5-4h5l1.5 4h4L12 4zm0 6l1.5 4h-3L12 10z" fill="white"/>
    </svg>
  </div>
);

const ProspeoLogo = () => (
  <div className="w-10 h-10 bg-[#4F46E5] rounded-lg flex items-center justify-center overflow-hidden">
    <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none">
      <path d="M8 4v16M8 4h6a5 5 0 010 10H8" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  </div>
);

const LushaLogo = () => (
  <div className="w-10 h-10 bg-[#7C3AED] rounded-lg flex items-center justify-center overflow-hidden">
    <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none">
      <path d="M8 4v16h10" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  </div>
);

const WizaLogo = () => (
  <div className="w-10 h-10 bg-gray-500 rounded-lg flex items-center justify-center overflow-hidden">
    <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none">
      <circle cx="12" cy="12" r="6" stroke="white" strokeWidth="2"/>
      <path d="M12 2v6M12 16v6M2 12h6M16 12h6" stroke="white" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  </div>
);

const methodologyLinks = [
  {
    title: "Pricing Data",
    description: "Based on publicly available pricing as of January 2025 for mid-tier plans.",
    href: "#pricing-data",
  },
  {
    title: "Verification Method",
    description: "All emails verified using SMTP validation and deliverability checks.",
    href: "#verification",
  },
  {
    title: "Test Dataset",
    description: "10,000 B2B contacts across tech, finance, and healthcare industries.",
    href: "#test-dataset",
  },
  {
    title: "Full Pricing",
    description: "View our complete pricing breakdown and volume discounts.",
    href: "/pricing",
  },
];

const comparisonMetrics = [
  {
    metric: "Email Enrichment",
    enrich: "$0.018",
    competitors: "$0.04 - $0.20",
    savings: "Up to 91%",
  },
  {
    metric: "Phone Lookup",
    enrich: "$0.025",
    competitors: "$0.15 - $0.50",
    savings: "Up to 95%",
  },
  {
    metric: "LinkedIn Scrape",
    enrich: "$0.010",
    competitors: "$0.05 - $0.15",
    savings: "Up to 93%",
  },
  {
    metric: "Bulk Export",
    enrich: "$0.015",
    competitors: "$0.04 - $0.20",
    savings: "Up to 92%",
  },
];

const verificationSteps = [
  {
    step: 1,
    title: "Pattern Recognition",
    description: "Our AI analyzes company email patterns from multiple public sources to predict email formats with 95%+ accuracy.",
    icon: <Database className="w-5 h-5" />,
  },
  {
    step: 2,
    title: "SMTP Validation",
    description: "Every predicted email is verified against the mail server using SMTP handshake without sending actual emails.",
    icon: <Mail className="w-5 h-5" />,
  },
  {
    step: 3,
    title: "Deliverability Check",
    description: "We check for catch-all domains, spam traps, and disposable email patterns to ensure real deliverability.",
    icon: <Shield className="w-5 h-5" />,
  },
  {
    step: 4,
    title: "Fallback Providers",
    description: "Only when our direct methods can't verify, we use premium providers - passing the cost savings to you.",
    icon: <CheckCircle2 className="w-5 h-5" />,
  },
];

const testDatasetBreakdown = [
  { industry: "Technology", contacts: 4000, percentage: 40 },
  { industry: "Finance", contacts: 3000, percentage: 30 },
  { industry: "Healthcare", contacts: 3000, percentage: 30 },
];

const accuracyResults = [
  { provider: "Enrich Engine", accuracy: 94.2, verified: 9420 },
  { provider: "Apollo", accuracy: 91.8, verified: 9180 },
  { provider: "Prospeo", accuracy: 89.5, verified: 8950 },
  { provider: "Clay", accuracy: 88.7, verified: 8870 },
  { provider: "Lusha", accuracy: 87.3, verified: 8730 },
];

export default function MethodologyPage() {
  return (
    <div className="min-h-screen text-[#111827]">
      <AnimatedPixelBackground />

      <div className="relative z-10 bg-white">
        <Navigation />

        <main>
          {/* Hero Section */}
          <section className="pt-20 pb-16 md:pt-28 md:pb-20 bg-white">
            <div className="max-w-4xl mx-auto px-6">
              <ScrollReveal>
                <h1
                  className="text-4xl md:text-5xl lg:text-6xl font-normal tracking-tight mb-6"
                  style={{ fontFamily: "'Source Serif 4', Georgia, serif" }}
                >
                  Methodology
                </h1>
                <p className="text-xl text-gray-600 max-w-2xl leading-relaxed">
                  We compared the cost per credit across major enrichment providers using their publicly available pricing. Here's how we conducted our research and validated our results.
                </p>
              </ScrollReveal>
            </div>
          </section>

          {/* Quick Links */}
          <section className="py-12 bg-gray-50 border-y border-gray-100">
            <div className="max-w-4xl mx-auto px-6">
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {methodologyLinks.map((link) => (
                  <Link
                    key={link.title}
                    href={link.href}
                    className="group p-4 bg-white rounded-xl border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all"
                  >
                    <p className="font-semibold text-gray-900 group-hover:text-[#E63946] transition-colors flex items-center gap-1">
                      {link.title}
                      <ArrowUpRight className="w-4 h-4" />
                    </p>
                    <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                      {link.description}
                    </p>
                  </Link>
                ))}
              </div>

              {/* Providers Compared */}
              <div className="mt-8 pt-8 border-t border-gray-200">
                <p className="text-xs text-gray-400 uppercase tracking-wider mb-4">
                  Providers Compared
                </p>
                <div className="flex flex-wrap gap-4 items-center">
                  <EnrichLogo />
                  <ClayLogo />
                  <ApolloLogo />
                  <ProspeoLogo />
                  <LushaLogo />
                  <WizaLogo />
                </div>
              </div>
            </div>
          </section>

          {/* Pricing Data Section */}
          <section id="pricing-data" className="py-20 bg-white scroll-mt-20">
            <div className="max-w-4xl mx-auto px-6">
              <ScrollReveal>
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 rounded-2xl bg-[#E63946]/10 flex items-center justify-center">
                    <BarChart3 className="w-6 h-6 text-[#E63946]" />
                  </div>
                  <h2
                    className="text-3xl font-normal"
                    style={{ fontFamily: "'Source Serif 4', Georgia, serif" }}
                  >
                    Pricing Data
                  </h2>
                </div>
                <p className="text-gray-600 mb-8 leading-relaxed">
                  All pricing data was collected from publicly available sources in January 2025. We used mid-tier pricing plans for fair comparison, as these represent the typical customer segment for B2B data enrichment.
                </p>
              </ScrollReveal>

              {/* Comparison Table */}
              <ScrollReveal>
                <div className="rounded-2xl border border-gray-200 overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left py-4 px-6 text-sm font-semibold text-gray-900">Service</th>
                        <th className="text-left py-4 px-6 text-sm font-semibold text-[#E63946]">Enrich</th>
                        <th className="text-left py-4 px-6 text-sm font-semibold text-gray-900">Competitors</th>
                        <th className="text-left py-4 px-6 text-sm font-semibold text-gray-900">Your Savings</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {comparisonMetrics.map((row) => (
                        <tr key={row.metric}>
                          <td className="py-4 px-6 text-gray-900 font-medium">{row.metric}</td>
                          <td className="py-4 px-6 text-[#E63946] font-bold">{row.enrich}</td>
                          <td className="py-4 px-6 text-gray-500 line-through">{row.competitors}</td>
                          <td className="py-4 px-6 text-green-600 font-semibold">{row.savings}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-sm text-gray-500 mt-4">
                  * Prices shown are per successful enrichment. Failed lookups are not charged.
                </p>
              </ScrollReveal>
            </div>
          </section>

          {/* Verification Method Section */}
          <section id="verification" className="py-20 bg-gray-50 scroll-mt-20">
            <div className="max-w-4xl mx-auto px-6">
              <ScrollReveal>
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 rounded-2xl bg-[#E63946]/10 flex items-center justify-center">
                    <Shield className="w-6 h-6 text-[#E63946]" />
                  </div>
                  <h2
                    className="text-3xl font-normal"
                    style={{ fontFamily: "'Source Serif 4', Georgia, serif" }}
                  >
                    Verification Method
                  </h2>
                </div>
                <p className="text-gray-600 mb-12 leading-relaxed">
                  Every email we return goes through a multi-step verification process. This is how we achieve 94%+ accuracy while keeping costs dramatically lower than competitors.
                </p>
              </ScrollReveal>

              <div className="grid md:grid-cols-2 gap-6">
                {verificationSteps.map((step, index) => (
                  <ScrollReveal key={step.step}>
                    <div className="bg-white rounded-2xl border border-gray-200 p-6">
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-xl bg-[#E63946] text-white flex items-center justify-center font-bold text-lg flex-shrink-0">
                          {step.step}
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900 mb-2">{step.title}</h3>
                          <p className="text-sm text-gray-600 leading-relaxed">{step.description}</p>
                        </div>
                      </div>
                    </div>
                  </ScrollReveal>
                ))}
              </div>

              {/* SMTP Validation Details */}
              <ScrollReveal>
                <div className="mt-12 p-6 bg-white rounded-2xl border border-gray-200">
                  <h3 className="font-semibold text-gray-900 mb-4">How SMTP Validation Works</h3>
                  <div className="space-y-3 text-sm text-gray-600">
                    <p>
                      <strong className="text-gray-900">1. DNS Lookup:</strong> We query the MX records for the domain to find the mail server.
                    </p>
                    <p>
                      <strong className="text-gray-900">2. Connection:</strong> We establish an SMTP connection to the mail server.
                    </p>
                    <p>
                      <strong className="text-gray-900">3. RCPT TO Check:</strong> We send a recipient check command without actually sending an email.
                    </p>
                    <p>
                      <strong className="text-gray-900">4. Response Analysis:</strong> Based on the server response, we determine if the mailbox exists.
                    </p>
                    <p>
                      <strong className="text-gray-900">5. Catch-all Detection:</strong> We test for catch-all domains that accept all addresses.
                    </p>
                  </div>
                </div>
              </ScrollReveal>
            </div>
          </section>

          {/* Test Dataset Section */}
          <section id="test-dataset" className="py-20 bg-white scroll-mt-20">
            <div className="max-w-4xl mx-auto px-6">
              <ScrollReveal>
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 rounded-2xl bg-[#E63946]/10 flex items-center justify-center">
                    <Users className="w-6 h-6 text-[#E63946]" />
                  </div>
                  <h2
                    className="text-3xl font-normal"
                    style={{ fontFamily: "'Source Serif 4', Georgia, serif" }}
                  >
                    Test Dataset
                  </h2>
                </div>
                <p className="text-gray-600 mb-8 leading-relaxed">
                  Our benchmark tests were conducted on a diverse dataset of 10,000 B2B contacts across multiple industries. The dataset was sourced from publicly available company directories and LinkedIn profiles.
                </p>
              </ScrollReveal>

              {/* Dataset Breakdown */}
              <ScrollReveal>
                <div className="grid md:grid-cols-3 gap-6 mb-12">
                  {testDatasetBreakdown.map((item) => (
                    <div key={item.industry} className="bg-gray-50 rounded-2xl p-6 text-center">
                      <p className="text-3xl font-bold text-[#111827] mb-1">
                        {item.contacts.toLocaleString()}
                      </p>
                      <p className="text-gray-600 font-medium">{item.industry}</p>
                      <p className="text-sm text-gray-400 mt-1">{item.percentage}% of dataset</p>
                    </div>
                  ))}
                </div>
              </ScrollReveal>

              {/* Dataset Criteria */}
              <ScrollReveal>
                <div className="bg-gray-50 rounded-2xl p-6 mb-12">
                  <h3 className="font-semibold text-gray-900 mb-4">Selection Criteria</h3>
                  <ul className="grid sm:grid-cols-2 gap-3">
                    {[
                      "Companies with 50-10,000 employees",
                      "B2B SaaS, fintech, and healthtech",
                      "US and Europe based contacts",
                      "Manager level and above",
                      "Active LinkedIn profiles",
                      "Work email domains only",
                    ].map((item) => (
                      <li key={item} className="flex items-center gap-2 text-sm text-gray-600">
                        <CheckCircle2 className="w-4 h-4 text-[#E63946] flex-shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </ScrollReveal>

              {/* Accuracy Results */}
              <ScrollReveal>
                <h3
                  className="text-xl font-normal mb-6"
                  style={{ fontFamily: "'Source Serif 4', Georgia, serif" }}
                >
                  Accuracy Results
                </h3>
                <div className="rounded-2xl border border-gray-200 overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left py-4 px-6 text-sm font-semibold text-gray-900">Provider</th>
                        <th className="text-left py-4 px-6 text-sm font-semibold text-gray-900">Accuracy</th>
                        <th className="text-left py-4 px-6 text-sm font-semibold text-gray-900">Verified Emails</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {accuracyResults.map((row, index) => (
                        <tr key={row.provider} className={index === 0 ? "bg-[#E63946]/5" : ""}>
                          <td className={`py-4 px-6 font-medium ${index === 0 ? "text-[#E63946]" : "text-gray-900"}`}>
                            {row.provider}
                            {index === 0 && <span className="ml-2 text-xs bg-[#E63946] text-white px-2 py-0.5 rounded-full">Best</span>}
                          </td>
                          <td className={`py-4 px-6 font-semibold ${index === 0 ? "text-[#E63946]" : "text-gray-700"}`}>
                            {row.accuracy}%
                          </td>
                          <td className="py-4 px-6 text-gray-600">
                            {row.verified.toLocaleString()} / 10,000
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-sm text-gray-500 mt-4">
                  * Accuracy measured by successful email delivery to verified addresses within 30 days of enrichment.
                </p>
              </ScrollReveal>
            </div>
          </section>

          {/* Data Sources Section */}
          <section className="py-20 bg-gray-50">
            <div className="max-w-4xl mx-auto px-6">
              <ScrollReveal>
                <h2
                  className="text-3xl font-normal mb-6"
                  style={{ fontFamily: "'Source Serif 4', Georgia, serif" }}
                >
                  Data Sources
                </h2>
                <p className="text-gray-600 mb-8 leading-relaxed">
                  We aggregate data from multiple publicly available sources to build our enrichment database. No personal data is scraped from private profiles or purchased from third-party data brokers.
                </p>
              </ScrollReveal>

              <div className="grid md:grid-cols-2 gap-6">
                {[
                  {
                    title: "Professional Networks",
                    description: "Public LinkedIn profiles and company pages with user consent.",
                    icon: <Linkedin className="w-5 h-5" />,
                  },
                  {
                    title: "Company Websites",
                    description: "Team pages, press releases, and public job postings.",
                    icon: <Database className="w-5 h-5" />,
                  },
                  {
                    title: "Business Directories",
                    description: "Public business registries and industry directories.",
                    icon: <Users className="w-5 h-5" />,
                  },
                  {
                    title: "API Partners",
                    description: "Licensed data from compliant third-party providers.",
                    icon: <Shield className="w-5 h-5" />,
                  },
                ].map((source) => (
                  <ScrollReveal key={source.title}>
                    <div className="bg-white rounded-2xl border border-gray-200 p-6">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-xl bg-[#E63946]/10 flex items-center justify-center text-[#E63946]">
                          {source.icon}
                        </div>
                        <h3 className="font-semibold text-gray-900">{source.title}</h3>
                      </div>
                      <p className="text-sm text-gray-600">{source.description}</p>
                    </div>
                  </ScrollReveal>
                ))}
              </div>
            </div>
          </section>

          {/* CTA Section */}
          <section className="py-20 bg-white">
            <div className="max-w-4xl mx-auto px-6 text-center">
              <ScrollReveal>
                <h2
                  className="text-3xl md:text-4xl font-normal mb-4 text-[#111827]"
                  style={{ fontFamily: "'Source Serif 4', Georgia, serif" }}
                >
                  Ready to see the results for yourself?
                </h2>
                <p className="text-gray-600 mb-8 max-w-xl mx-auto">
                  Try Enrich Engine with $10 in free credits. No credit card required.
                </p>
                <div className="flex flex-col sm:flex-row justify-center gap-4">
                  <Link href="/signup">
                    <Button className="bg-[#E63946] text-white hover:bg-[#C5303C] h-12 px-8 text-base font-medium rounded-xl">
                      Get started free
                    </Button>
                  </Link>
                  <Link href="/pricing">
                    <Button variant="outline" className="border-gray-200 text-gray-700 hover:bg-gray-50 h-12 px-8 text-base font-medium rounded-xl">
                      View pricing
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
