"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import DarkNavigation from "@/components/landing/DarkNavigation";
import DarkFooter from "@/components/landing/DarkFooter";
import DarkScrollReveal from "@/components/landing/DarkScrollReveal";
import { OmniDialLogoStatic } from "@/components/landing/OmniDialLogo";

const faqCategories = [
  {
    name: "General",
    faqs: [
      {
        question: "What is OmniDial?",
        answer: "OmniDial is a browser-based VoIP sales dialer built for modern sales teams. It includes power dialing, call recording, voicemail drop, and a built-in CRM - everything you need to dial smarter and close more deals.",
      },
      {
        question: "How is OmniDial different from other dialers?",
        answer: "Most dialers are either expensive enterprise tools ($100+/seat) or basic click-to-call solutions. OmniDial offers enterprise-grade features at $20/month per seat with no hidden fees, per-minute charges, or feature gating.",
      },
      {
        question: "Is there a free trial?",
        answer: "Yes! We offer a 14-day free trial with full access to all features. No credit card required to start.",
      },
      {
        question: "What countries does OmniDial support?",
        answer: "OmniDial currently supports calling within the United States and Canada. International calling is on our roadmap for 2026.",
      },
    ],
  },
  {
    name: "Pricing & Billing",
    faqs: [
      {
        question: "How much does OmniDial cost?",
        answer: "OmniDial is $20/month per seat for our Starter plan, which includes unlimited calls, power dialer, call recording, and voicemail drop. Pro plan with built-in CRM is $40/month per seat.",
      },
      {
        question: "Are there any hidden fees?",
        answer: "No hidden fees whatsoever. No per-minute charges, no setup fees, no charges for recordings. The price you see is the price you pay.",
      },
      {
        question: "Do you offer annual billing?",
        answer: "Yes, you can save 20% by paying annually instead of monthly.",
      },
      {
        question: "Can I change plans at any time?",
        answer: "Absolutely. You can upgrade or downgrade your plan at any time. Changes take effect at the start of your next billing cycle.",
      },
      {
        question: "What payment methods do you accept?",
        answer: "We accept all major credit cards (Visa, Mastercard, Amex), ACH bank transfers, and wire transfers for enterprise accounts.",
      },
    ],
  },
  {
    name: "Features",
    faqs: [
      {
        question: "What is power dialing?",
        answer: "Power dialing automatically advances through your call list, eliminating the time spent manually dialing numbers. When a call ends, the next number is dialed immediately. Most users see a 3-4x increase in daily call volume.",
      },
      {
        question: "How does voicemail drop work?",
        answer: "Pre-record your voicemail message once, then drop it with a single click when you reach voicemail. The message plays while you move on to the next call, saving 30+ minutes per day.",
      },
      {
        question: "Are calls recorded automatically?",
        answer: "Yes, all calls are recorded by default (you can disable this if needed). Recordings are stored securely and can be played back, downloaded, or shared.",
      },
      {
        question: "What is local presence?",
        answer: "Local presence displays a phone number with the same area code as the person you're calling. This significantly increases answer rates - prospects are 4x more likely to answer a local number.",
      },
      {
        question: "Does OmniDial include a CRM?",
        answer: "The Pro plan includes a built-in CRM with contact management, deal pipeline, notes, and activity history. You can also integrate with external CRMs like Salesforce and HubSpot.",
      },
    ],
  },
  {
    name: "Technical",
    faqs: [
      {
        question: "What do I need to use OmniDial?",
        answer: "Just a modern web browser (Chrome, Firefox, Safari, or Edge) and a stable internet connection. OmniDial is entirely browser-based - no software to install.",
      },
      {
        question: "Can I use my existing phone number?",
        answer: "Yes, you can port your existing number to OmniDial or use one of our provided numbers. We support local numbers, toll-free numbers, and local presence.",
      },
      {
        question: "Is my data secure?",
        answer: "Absolutely. We use enterprise-grade encryption for all data in transit and at rest. Call recordings are stored securely in SOC 2 compliant data centers.",
      },
      {
        question: "What integrations are available?",
        answer: "We integrate with Salesforce, HubSpot, Pipedrive, Slack, Zapier, Google Calendar, and more. See our integrations page for the full list.",
      },
      {
        question: "Do you have an API?",
        answer: "Yes, our REST API allows you to build custom integrations, trigger calls programmatically, and pull analytics data. API access is included in all plans.",
      },
    ],
  },
  {
    name: "Support",
    faqs: [
      {
        question: "How do I get help?",
        answer: "You can reach our support team via email, live chat, or by scheduling a call. Starter plans include email support; Pro and Enterprise plans include priority support with live chat.",
      },
      {
        question: "Do you offer onboarding?",
        answer: "Yes! All new customers get a personalized onboarding session to help you set up your account, import contacts, and configure your dialer settings.",
      },
      {
        question: "Is training available for my team?",
        answer: "We offer group training sessions for teams of 5+ users. Enterprise customers also get access to dedicated customer success managers.",
      },
    ],
  },
];

function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border-b border-white/5">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full py-5 flex items-center justify-between text-left group"
      >
        <span className="font-medium text-white group-hover:text-white/80 pr-4">
          {question}
        </span>
        <ChevronDown
          className={`w-5 h-5 text-white/40 flex-shrink-0 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>
      {isOpen && (
        <div className="pb-5">
          <p className="text-white/50 text-sm leading-relaxed">{answer}</p>
        </div>
      )}
    </div>
  );
}

export default function FAQPage() {
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
                  <span className="text-2xl font-semibold">OmniDial</span>
                </div>
                <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl tracking-tight mb-4 heading-display">
                  Frequently Asked Questions
                </h1>
                <p className="text-white/50 text-lg max-w-2xl mx-auto">
                  Everything you need to know about OmniDial.
                </p>
              </DarkScrollReveal>
            </div>
          </section>

          {/* FAQ Categories */}
          <section className="py-12 sm:py-16">
            <div className="max-w-3xl mx-auto px-4 sm:px-6">
              {faqCategories.map((category, i) => (
                <DarkScrollReveal key={category.name} delay={i * 100}>
                  <div className="mb-12">
                    <h2 className="text-xl font-semibold text-white mb-6 pb-2 border-b border-white/10">
                      {category.name}
                    </h2>
                    <div>
                      {category.faqs.map((faq) => (
                        <FAQItem
                          key={faq.question}
                          question={faq.question}
                          answer={faq.answer}
                        />
                      ))}
                    </div>
                  </div>
                </DarkScrollReveal>
              ))}
            </div>
          </section>

          {/* CTA */}
          <section className="py-16 sm:py-20 border-t border-white/5">
            <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
              <DarkScrollReveal>
                <h2 className="text-2xl sm:text-3xl font-semibold mb-4">
                  Still have questions?
                </h2>
                <p className="text-white/50 mb-6">
                  Our team is here to help. Reach out anytime.
                </p>
                <div className="flex flex-col sm:flex-row justify-center gap-4">
                  <Link href="/contact">
                    <Button className="bg-white text-black hover:bg-white/90 rounded-xl px-8 h-12">
                      Contact us
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </Link>
                  <Link href="/docs">
                    <Button variant="outline" className="border-white/20 text-white hover:bg-white/10 rounded-xl px-8 h-12">
                      View documentation
                    </Button>
                  </Link>
                </div>
              </DarkScrollReveal>
            </div>
          </section>
        </main>
      </div>

      <DarkFooter />
    </div>
  );
}
