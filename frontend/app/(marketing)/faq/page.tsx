"use client";

import { useState } from "react";
import Link from "next/link";
import Navigation from "@/components/landing/Navigation";
import ExaFooter from "@/components/landing/ExaFooter";
import AnimatedPixelBackground from "@/components/landing/AnimatedPixelBackground";
import ScrollReveal from "@/components/landing/ScrollReveal";
import { ChevronDown, Search } from "lucide-react";

const categories = [
  { id: "all", name: "All" },
  { id: "general", name: "General" },
  { id: "pricing", name: "Pricing" },
  { id: "api", name: "API" },
  { id: "data", name: "Data Quality" },
  { id: "privacy", name: "Privacy" },
];

const faqs = [
  {
    category: "general",
    question: "What is Enrich Engine?",
    answer: "Enrich Engine is a B2B data enrichment platform that helps you find verified email addresses, phone numbers, and other professional information. We combine smart email guessing with multi-source verification to deliver high accuracy at a fraction of the cost of traditional providers.",
  },
  {
    category: "general",
    question: "How does Enrich Engine work?",
    answer: "You provide us with a LinkedIn URL or professional details, and our system searches multiple data sources to find and verify contact information. We use SMTP validation, DNS checks, and proprietary algorithms to ensure high accuracy.",
  },
  {
    category: "pricing",
    question: "What counts as a credit?",
    answer: "One credit equals one successful enrichment. If we can't find a verified email or phone number, you don't get charged. This ensures you only pay for successful results.",
  },
  {
    category: "pricing",
    question: "Do unused credits roll over?",
    answer: "Yes! Credits roll over for up to 3 months on annual plans. Monthly plans reset each billing period, but you can upgrade to annual at any time to preserve your credits.",
  },
  {
    category: "pricing",
    question: "Can I get a refund?",
    answer: "We offer a 30-day money-back guarantee if you're not satisfied with your first month. Contact our support team to request a refund.",
  },
  {
    category: "api",
    question: "What's the API rate limit?",
    answer: "Rate limits depend on your plan: Starter (100 req/min), Growth (500 req/min), Scale (2000 req/min). Enterprise plans have custom limits. We also support batch processing for high-volume operations.",
  },
  {
    category: "api",
    question: "Do you have SDKs available?",
    answer: "Yes! We offer official SDKs for Python, Node.js, Go, and Ruby. All SDKs are open-source and available on GitHub.",
  },
  {
    category: "api",
    question: "How do webhooks work?",
    answer: "For async operations like bulk enrichment, we send webhook notifications when processing is complete. You can configure webhook URLs in your dashboard, and we support retry logic for failed deliveries.",
  },
  {
    category: "data",
    question: "What's your email accuracy rate?",
    answer: "We maintain a 95%+ accuracy rate for email verification. Every email goes through SMTP validation and deliverability checks before being returned as verified.",
  },
  {
    category: "data",
    question: "Where does your data come from?",
    answer: "We aggregate data from multiple sources including public web data, business databases, and partnerships with data providers. All data is collected and processed in compliance with applicable regulations.",
  },
  {
    category: "data",
    question: "How often is data updated?",
    answer: "Our data is continuously updated. Email verification happens in real-time, and our database is refreshed weekly to ensure accuracy.",
  },
  {
    category: "privacy",
    question: "Is Enrich Engine GDPR compliant?",
    answer: "Yes, we are fully GDPR compliant. We only process B2B data, provide data subject access rights, and have proper data processing agreements in place.",
  },
  {
    category: "privacy",
    question: "Is Enrich Engine CCPA compliant?",
    answer: "Yes, we comply with CCPA requirements. Users can request data deletion and opt-out of data sales as required by the regulation.",
  },
  {
    category: "privacy",
    question: "How do you handle data security?",
    answer: "All data is encrypted in transit (TLS 1.3) and at rest (AES-256). We undergo regular security audits and are SOC 2 Type II certified.",
  },
];

export default function FAQPage() {
  const [activeCategory, setActiveCategory] = useState("all");
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredFaqs = faqs.filter((faq) => {
    const matchesCategory = activeCategory === "all" || faq.category === activeCategory;
    const matchesSearch = searchQuery === "" ||
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

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
                  Frequently Asked Questions
                </h1>
                <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-8">
                  Everything you need to know about Enrich Engine.
                </p>
                {/* Search */}
                <div className="max-w-xl mx-auto">
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search FAQs..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-12 pr-4 py-4 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#E63946]/30 focus:border-[#E63946]"
                    />
                  </div>
                </div>
              </ScrollReveal>
            </div>
          </section>

          {/* Categories */}
          <section className="py-6 bg-gray-50 border-y border-gray-100">
            <div className="max-w-4xl mx-auto px-6">
              <div className="flex items-center gap-2 overflow-x-auto pb-2">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.id)}
                    className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                      activeCategory === cat.id
                        ? "bg-[#111827] text-white"
                        : "bg-white border border-gray-200 text-gray-600 hover:border-gray-300"
                    }`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* FAQs */}
          <section className="py-16 md:py-20 bg-white">
            <div className="max-w-4xl mx-auto px-6">
              <div className="space-y-4">
                {filteredFaqs.map((faq, i) => (
                  <ScrollReveal key={i} delay={i * 50}>
                    <div className="border border-gray-100 rounded-2xl overflow-hidden">
                      <button
                        onClick={() => setExpandedIndex(expandedIndex === i ? null : i)}
                        className="w-full flex items-center justify-between p-6 text-left hover:bg-gray-50 transition-colors"
                      >
                        <span className="font-semibold pr-4">{faq.question}</span>
                        <ChevronDown
                          className={`w-5 h-5 text-gray-400 flex-shrink-0 transition-transform ${
                            expandedIndex === i ? "rotate-180" : ""
                          }`}
                        />
                      </button>
                      {expandedIndex === i && (
                        <div className="px-6 pb-6">
                          <p className="text-gray-600 leading-relaxed">{faq.answer}</p>
                        </div>
                      )}
                    </div>
                  </ScrollReveal>
                ))}
              </div>

              {filteredFaqs.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-gray-500">No FAQs match your search.</p>
                </div>
              )}
            </div>
          </section>

          {/* Still have questions */}
          <section className="py-16 bg-gray-50">
            <div className="max-w-4xl mx-auto px-6 text-center">
              <ScrollReveal>
                <h2 className="text-2xl font-semibold mb-4">
                  Still have questions?
                </h2>
                <p className="text-gray-600 mb-8">
                  Can&apos;t find what you&apos;re looking for? Our team is here to help.
                </p>
                <div className="flex flex-col sm:flex-row justify-center gap-4">
                  <Link href="/contact">
                    <button className="bg-[#111827] text-white hover:bg-black rounded-xl px-8 py-3 font-medium transition-colors">
                      Contact support
                    </button>
                  </Link>
                  <Link href="/docs">
                    <button className="border border-gray-200 text-gray-700 hover:bg-white rounded-xl px-8 py-3 font-medium transition-colors">
                      Read the docs
                    </button>
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
