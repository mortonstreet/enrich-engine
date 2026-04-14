"use client";

import Link from "next/link";
import { useState } from "react";
import { Check, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import DarkNavigation from "@/components/landing/DarkNavigation";
import DarkFooter from "@/components/landing/DarkFooter";
import DarkScrollReveal from "@/components/landing/DarkScrollReveal";

const plans = [
  {
    name: "Starter",
    description: "For individuals and small teams",
    monthlyPrice: 15,
    annualPrice: 150,
    period: "per seat/month",
    features: [
      "Unlimited calls",
      "Power dialer",
      "Call recording",
      "Voicemail drop",
      "Built-in CRM",
      "Team campaigns",
      "Basic analytics",
      "Email support",
    ],
    cta: "Start free trial",
    highlighted: false,
    planParam: "starter",
  },
  {
    name: "Pro",
    description: "For growing sales teams",
    monthlyPrice: 25,
    annualPrice: 250,
    period: "per seat/month",
    features: [
      "Everything in Starter",
      "AI Sales Coaching",
      "Call Intelligence",
      "Advanced analytics",
      "Call transcription",
      "Priority support",
      "Custom integrations",
    ],
    cta: "Start free trial",
    highlighted: true,
    planParam: "pro",
  },
  {
    name: "Enterprise",
    description: "For large organizations",
    monthlyPrice: null,
    annualPrice: null,
    period: "Custom pricing",
    features: [
      "Everything in Pro",
      "Unlimited seats",
      "Dedicated account manager",
      "Custom SLAs",
      "SSO & SAML",
      "API access",
      "On-premise option",
    ],
    cta: "Contact sales",
    highlighted: false,
    planParam: null,
  },
];

const faqs = [
  {
    question: "What's included in a seat?",
    answer: "Each seat includes full access to all features in your plan, including unlimited calling minutes within the US and Canada.",
  },
  {
    question: "Can I change plans later?",
    answer: "Yes, you can upgrade or downgrade your plan at any time. Changes take effect at the start of your next billing cycle.",
  },
  {
    question: "Do you offer a free trial?",
    answer: "Yes, every plan starts with a 14-day free trial with full access to Pro features. A credit card is required to start the trial.",
  },
  {
    question: "What payment methods do you accept?",
    answer: "We accept all major credit cards, ACH transfers, and wire transfers for enterprise accounts.",
  },
  {
    question: "Is there a minimum commitment?",
    answer: "No minimum commitment required. Pay monthly and cancel anytime.",
  },
  {
    question: "Do you offer discounts for annual billing?",
    answer: "Yes, save up to 17% when you pay annually instead of monthly.",
  },
];

export default function PricingPage() {
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">("monthly");

  return (
    <div className="min-h-screen text-white bg-[#0a0a0a]">
      <DarkNavigation />

      <div className="relative z-10 bg-[#0a0a0a] pt-16">
        <main>
          {/* Hero */}
          <section className="py-16 sm:py-20 md:py-24">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
              <DarkScrollReveal>
                <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl tracking-tight mb-4 sm:mb-6 heading-display">
                  Simple, transparent pricing
                </h1>
                <p className="text-white/50 text-base sm:text-lg max-w-2xl mx-auto mb-8">
                  No hidden fees. No per-minute charges. Start with a 14-day free trial.
                </p>

                {/* Billing toggle */}
                <div className="inline-flex items-center gap-4 p-1 bg-white/5 rounded-full">
                  <button
                    onClick={() => setBillingCycle("monthly")}
                    className={`px-4 py-2 text-sm font-medium rounded-full transition-colors ${
                      billingCycle === "monthly"
                        ? "bg-white text-black"
                        : "text-white/60 hover:text-white"
                    }`}
                  >
                    Monthly
                  </button>
                  <button
                    onClick={() => setBillingCycle("annual")}
                    className={`px-4 py-2 text-sm font-medium rounded-full transition-colors ${
                      billingCycle === "annual"
                        ? "bg-white text-black"
                        : "text-white/60 hover:text-white"
                    }`}
                  >
                    Annual
                    <span className="ml-2 text-xs text-green-400">Save 17%</span>
                  </button>
                </div>
              </DarkScrollReveal>
            </div>
          </section>

          {/* Pricing cards */}
          <section className="pb-16 sm:pb-20 md:pb-24">
            <div className="max-w-6xl mx-auto px-4 sm:px-6">
              <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
                {plans.map((plan, i) => (
                  <DarkScrollReveal key={plan.name} delay={i * 100}>
                    <div
                      className={`relative p-6 sm:p-8 rounded-2xl border ${
                        plan.highlighted
                          ? "bg-white/5 border-white/20"
                          : "bg-[#111111] border-white/5"
                      }`}
                    >
                      {plan.highlighted && (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                          <span className="px-3 py-1 bg-white text-black text-xs font-medium rounded-full">
                            Most popular
                          </span>
                        </div>
                      )}

                      <div className="mb-6">
                        <h3 className="text-xl font-semibold text-white mb-2">
                          {plan.name}
                        </h3>
                        <p className="text-white/50 text-sm">{plan.description}</p>
                      </div>

                      <div className="mb-6">
                        {plan.monthlyPrice ? (
                          <>
                            <span className="text-4xl sm:text-5xl font-bold text-white">
                              ${billingCycle === "annual"
                                ? Math.round((plan.annualPrice ?? 0) / 12)
                                : plan.monthlyPrice}
                            </span>
                            <span className="text-white/50 text-sm ml-2">
                              {plan.period}
                            </span>
                            {billingCycle === "annual" && (
                              <p className="text-sm text-white/40 mt-1">
                                ${plan.annualPrice}/seat billed annually
                              </p>
                            )}
                          </>
                        ) : (
                          <span className="text-2xl font-semibold text-white">
                            {plan.period}
                          </span>
                        )}
                      </div>

                      <ul className="space-y-3 mb-8">
                        {plan.features.map((feature) => (
                          <li key={feature} className="flex items-start gap-3">
                            <Check className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                            <span className="text-white/70 text-sm">{feature}</span>
                          </li>
                        ))}
                      </ul>

                      <Link
                        href={
                          plan.cta === "Contact sales"
                            ? "/contact"
                            : `/signup?plan=${plan.planParam}&interval=${billingCycle === "annual" ? "year" : "month"}`
                        }
                      >
                        <Button
                          className={`w-full rounded-xl h-12 ${
                            plan.highlighted
                              ? "bg-white text-black hover:bg-white/90"
                              : "bg-white/10 text-white hover:bg-white/20"
                          }`}
                        >
                          {plan.cta}
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                      </Link>
                    </div>
                  </DarkScrollReveal>
                ))}
              </div>
            </div>
          </section>

          {/* FAQ */}
          <section className="py-16 sm:py-20 md:py-24 border-t border-white/5">
            <div className="max-w-4xl mx-auto px-4 sm:px-6">
              <DarkScrollReveal>
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-semibold text-center mb-12">
                  Frequently asked questions
                </h2>
              </DarkScrollReveal>

              <div className="grid sm:grid-cols-2 gap-6 lg:gap-8">
                {faqs.map((faq, i) => (
                  <DarkScrollReveal key={i} delay={i * 50}>
                    <div>
                      <h3 className="font-semibold text-white mb-2">
                        {faq.question}
                      </h3>
                      <p className="text-white/50 text-sm leading-relaxed">
                        {faq.answer}
                      </p>
                    </div>
                  </DarkScrollReveal>
                ))}
              </div>
            </div>
          </section>

          {/* CTA */}
          <section className="py-16 sm:py-20 md:py-24 border-t border-white/5">
            <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
              <DarkScrollReveal>
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-semibold mb-4">
                  Ready to start dialing?
                </h2>
                <p className="text-white/50 mb-8">
                  Start your 14-day free trial today. No commitment required.
                </p>
                <div className="flex flex-col sm:flex-row justify-center gap-4">
                  <Link href="/signup?plan=pro&interval=month">
                    <Button className="w-full sm:w-auto bg-white text-black hover:bg-white/90 rounded-xl px-8 h-12">
                      Start free trial
                    </Button>
                  </Link>
                  <a href="https://cal.com/mortonstreet/15min" target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" className="w-full sm:w-auto border-white/20 text-white hover:bg-white/10 rounded-xl px-8 h-12">
                      Book a demo
                    </Button>
                  </a>
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
