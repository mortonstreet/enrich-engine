"use client";

import { Mail, Phone, Search, Download, Layers, Code } from "lucide-react";
import ScrollReveal from "./ScrollReveal";

const features = [
  {
    icon: Search,
    title: "LinkedIn Scraper",
    description: "Upload names or companies. Get LinkedIn profile URLs instantly.",
  },
  {
    icon: Mail,
    title: "Email Finder",
    description: "95% accuracy. Verified business emails with SMTP validation.",
  },
  {
    icon: Phone,
    title: "Phone Finder",
    description: "Direct dials and mobile numbers. Reach decision makers.",
  },
  {
    icon: Download,
    title: "CSV Export",
    description: "Download enriched lists. Ready for your outreach campaigns.",
  },
  {
    icon: Layers,
    title: "Bulk Processing",
    description: "1000+ profiles per hour. Background queue processing.",
  },
  {
    icon: Code,
    title: "API Access",
    description: "Integrate with your stack. RESTful endpoints with webhooks.",
  },
];

export default function FeaturesGrid() {
  return (
    <section id="features" className="py-12 sm:py-16 md:py-20 lg:py-28 bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <ScrollReveal>
          <div className="text-center mb-10 sm:mb-12 md:mb-16">
            <h2
              className="text-2xl sm:text-3xl md:text-4xl font-normal tracking-tight mb-3 sm:mb-4"
              style={{ fontFamily: "'Source Serif 4', Georgia, serif" }}
            >
              Everything you need to enrich leads
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto text-sm sm:text-base">
              From LinkedIn scraping to verified contact info, we&apos;ve got you covered.
            </p>
          </div>
        </ScrollReveal>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {features.map((feature, i) => (
            <ScrollReveal key={i} delay={i * 80}>
              <div className="bg-white rounded-2xl p-6 border border-gray-100 hover:border-gray-200 hover:shadow-lg transition-all duration-300 group">
                <div className="w-12 h-12 rounded-xl bg-[#E63946]/10 flex items-center justify-center text-[#E63946] mb-5 group-hover:bg-[#E63946] group-hover:text-white transition-colors">
                  <feature.icon className="w-6 h-6" />
                </div>
                <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  {feature.description}
                </p>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
