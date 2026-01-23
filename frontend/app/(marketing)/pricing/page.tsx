"use client";

import Link from "next/link";
import { useState } from "react";
import { Check, ArrowRight, Zap, Building2, Calculator } from "lucide-react";
import { Button } from "@/components/ui/Button";
import Navigation from "@/components/landing/Navigation";
import ExaFooter from "@/components/landing/ExaFooter";
import AnimatedPixelBackground from "@/components/landing/AnimatedPixelBackground";

type PricingTab = "api" | "plans";

const apiPricing = {
  email: {
    name: "Email Enrichment",
    description: "Verified work emails with catch-all detection",
    tiers: [
      { range: "1-1,000", pricePerK: 18, perUnit: 0.018 },
      { range: "1,001-10,000", pricePerK: 15, perUnit: 0.015 },
      { range: "10,001-100,000", pricePerK: 12, perUnit: 0.012 },
      { range: "100,001+", pricePerK: 8, perUnit: 0.008 },
    ],
  },
  phone: {
    name: "Phone Number Lookup",
    description: "Direct dials and mobile numbers",
    tiers: [
      { range: "1-1,000", pricePerK: 25, perUnit: 0.025 },
      { range: "1,001-10,000", pricePerK: 20, perUnit: 0.020 },
      { range: "10,001+", pricePerK: 15, perUnit: 0.015 },
    ],
  },
  linkedin: {
    name: "LinkedIn Scraping",
    description: "Profile data extraction",
    tiers: [
      { range: "1-1,000", pricePerK: 10, perUnit: 0.010 },
      { range: "1,001-10,000", pricePerK: 8, perUnit: 0.008 },
      { range: "10,001+", pricePerK: 5, perUnit: 0.005 },
    ],
  },
};

const plans = [
  {
    name: "Starter",
    description: "For individuals and small teams",
    price: 29,
    credits: 2000,
    costPerCredit: 0.0145,
    features: [
      "2,000 credits/month",
      "Email enrichment",
      "LinkedIn scraping",
      "CSV export",
      "API access",
      "Email support",
    ],
    cta: "Get started",
    highlighted: false,
  },
  {
    name: "Pro",
    description: "For growing sales teams",
    price: 99,
    credits: 8000,
    costPerCredit: 0.0124,
    features: [
      "8,000 credits/month",
      "Everything in Starter",
      "Phone number lookup",
      "Bulk processing",
      "Priority queue",
      "Slack support",
    ],
    cta: "Start free trial",
    highlighted: true,
  },
  {
    name: "Enterprise",
    description: "Maximum coverage",
    price: null,
    credits: null,
    costPerCredit: null,
    features: [
      "Custom credit volume",
      "Everything in Pro",
      "Dedicated account manager",
      "Custom integrations",
      "SLA guarantee",
      "Phone support",
    ],
    cta: "Talk to us",
    highlighted: false,
  },
];

const competitorComparison = [
  { name: "Apollo", price: "$0.20" },
  { name: "ZoomInfo", price: "$0.50+" },
  { name: "Wiza", price: "$0.15" },
  { name: "Clay", price: "$0.05" },
  { name: "Enrich", price: "$0.018", highlight: true },
];

const faqs = [
  {
    q: "What counts as a credit?",
    a: "One credit equals one successful enrichment. If we can't find a verified result, you don't get charged.",
  },
  {
    q: "How does pay-as-you-go work?",
    a: "Add credits to your account and use them whenever you need. Credits never expire. Volume discounts apply automatically.",
  },
  {
    q: "Can I switch between plans and API?",
    a: "Yes. Plans include a set number of credits monthly. API access lets you top up anytime. Use both for maximum flexibility.",
  },
  {
    q: "Do unused credits roll over?",
    a: "Pay-as-you-go credits never expire. Plan credits roll over for up to 3 months on annual billing.",
  },
  {
    q: "Is there a free trial?",
    a: "Yes. Get $10 in free credits when you sign up. No credit card required.",
  },
  {
    q: "Why are you so much cheaper?",
    a: "We use smart email pattern matching with validation before falling back to paid providers. Same accuracy, fraction of the cost.",
  },
];

export default function PricingPage() {
  const [activeTab, setActiveTab] = useState<PricingTab>("api");
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "annual">("monthly");
  const [calculatorValue, setCalculatorValue] = useState(5000);
  const discount = billingPeriod === "annual" ? 0.8 : 1;

  // Calculate API cost based on tiered pricing
  const calculateApiCost = (quantity: number) => {
    let remaining = quantity;
    let total = 0;
    const tiers = apiPricing.email.tiers;

    if (remaining <= 1000) {
      return remaining * 0.018;
    } else if (remaining <= 10000) {
      total += 1000 * 0.018;
      remaining -= 1000;
      total += remaining * 0.015;
      return total;
    } else if (remaining <= 100000) {
      total += 1000 * 0.018;
      total += 9000 * 0.015;
      remaining -= 10000;
      total += remaining * 0.012;
      return total;
    } else {
      total += 1000 * 0.018;
      total += 9000 * 0.015;
      total += 90000 * 0.012;
      remaining -= 100000;
      total += remaining * 0.008;
      return total;
    }
  };

  const calculatedCost = calculateApiCost(calculatorValue);
  const effectiveRate = calculatedCost / calculatorValue;

  return (
    <div className="min-h-screen text-[#111827]">
      <AnimatedPixelBackground />

      <div className="relative z-10 bg-white">
        <Navigation />

        <main>
          {/* Hero */}
          <section className="pt-20 pb-8 sm:pb-12 md:pt-28 md:pb-16 bg-white">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
              <h1
                className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-normal tracking-tight mb-4 sm:mb-6"
                style={{ fontFamily: "'Source Serif 4', Georgia, serif" }}
              >
                Data enrichment that<br className="hidden sm:block" />
                <span className="text-[#E63946]">doesn't break the bank</span>
              </h1>
              <p className="text-base sm:text-lg md:text-xl text-gray-600 mb-4 max-w-2xl mx-auto">
                The most cost-effective email and phone enrichment on the market.
                Same accuracy as premium providers, up to 90% cheaper.
              </p>

              {/* Competitor Price Comparison - inline */}
              <div className="flex flex-wrap justify-center items-center gap-x-4 sm:gap-x-6 gap-y-2 mt-6 sm:mt-8 mb-8 sm:mb-12">
                {competitorComparison.map((comp) => (
                  <div key={comp.name} className="flex items-center gap-1.5 sm:gap-2">
                    <span className={`text-xs sm:text-sm ${comp.highlight ? "font-semibold text-[#111827]" : "text-gray-400"}`}>
                      {comp.name}
                    </span>
                    <span className={`text-xs sm:text-sm font-mono ${
                      comp.highlight
                        ? "text-[#E63946] font-bold sm:text-base"
                        : "text-gray-400 line-through"
                    }`}>
                      {comp.price}
                    </span>
                  </div>
                ))}
              </div>

              {/* Tab Toggle */}
              <div className="inline-flex items-center p-1 sm:p-1.5 bg-gray-100 rounded-xl sm:rounded-2xl">
                <button
                  onClick={() => setActiveTab("api")}
                  className={`flex items-center gap-1.5 sm:gap-2 px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium transition-all ${
                    activeTab === "api"
                      ? "bg-white shadow-sm text-gray-900"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  <Zap className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  API
                </button>
                <button
                  onClick={() => setActiveTab("plans")}
                  className={`flex items-center gap-1.5 sm:gap-2 px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium transition-all ${
                    activeTab === "plans"
                      ? "bg-white shadow-sm text-gray-900"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  <Building2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  Plans
                </button>
              </div>
            </div>
          </section>

          {/* API Pricing Tab */}
          {activeTab === "api" && (
            <section className="pb-16 sm:pb-20 md:pb-28 bg-white">
              <div className="max-w-6xl mx-auto px-4 sm:px-6">
                {/* Two Column Layout */}
                <div className="grid md:grid-cols-2 gap-4 sm:gap-6 lg:gap-8 mb-10 sm:mb-16">
                  {/* Pay as you go */}
                  <div className="rounded-xl sm:rounded-2xl border border-gray-200 bg-gray-50/50 p-5 sm:p-8 md:p-10">
                    <h2
                      className="text-2xl sm:text-3xl md:text-4xl font-normal mb-3 sm:mb-4"
                      style={{ fontFamily: "'Source Serif 4', Georgia, serif" }}
                    >
                      Pay as you go
                    </h2>
                    <p className="text-sm sm:text-base text-gray-600 mb-2">
                      For individuals and teams of any size. Get started with{" "}
                      <span className="font-semibold text-[#111827]">$10 in free credits</span>.
                    </p>
                    <p className="text-xs sm:text-sm text-gray-500 mb-6 sm:mb-8">
                      No monthly commitment. Volume discounts apply automatically.
                    </p>

                    <Link href="/signup">
                      <Button className="w-full bg-[#111827] text-white hover:bg-black h-12 sm:h-14 text-sm sm:text-base font-medium rounded-xl mb-3 sm:mb-4">
                        Get started for free
                      </Button>
                    </Link>
                    <p className="text-center text-xs sm:text-sm text-gray-500">No credit card required</p>
                  </div>

                  {/* Custom/Enterprise */}
                  <div className="rounded-xl sm:rounded-2xl border border-gray-200 bg-gray-50/50 p-5 sm:p-8 md:p-10">
                    <h2
                      className="text-2xl sm:text-3xl md:text-4xl font-normal mb-3 sm:mb-4"
                      style={{ fontFamily: "'Source Serif 4', Georgia, serif" }}
                    >
                      Custom
                    </h2>
                    <p className="text-sm sm:text-base text-gray-600 mb-6 sm:mb-8">
                      For high volume, custom datasets, enterprise security, and more.
                    </p>

                    <Link href="/contact">
                      <Button className="w-full bg-[#111827] text-white hover:bg-black h-12 sm:h-14 text-sm sm:text-base font-medium rounded-xl mb-3 sm:mb-4">
                        Talk to us
                      </Button>
                    </Link>

                    <ul className="space-y-2 mt-6 sm:mt-8">
                      <li className="flex items-center gap-2 text-xs sm:text-sm text-gray-600">
                        <Check className="w-4 h-4 text-[#E63946] flex-shrink-0" />
                        Custom rate limits
                      </li>
                      <li className="flex items-center gap-2 text-xs sm:text-sm text-gray-600">
                        <Check className="w-4 h-4 text-[#E63946] flex-shrink-0" />
                        Volume discounts
                      </li>
                      <li className="flex items-center gap-2 text-xs sm:text-sm text-gray-600">
                        <Check className="w-4 h-4 text-[#E63946] flex-shrink-0" />
                        Dedicated support
                      </li>
                    </ul>
                  </div>
                </div>

                {/* API Pricing Tables */}
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-10 sm:mb-16">
                  {Object.entries(apiPricing).map(([key, product]) => (
                    <div key={key} className="rounded-xl sm:rounded-2xl border border-gray-200 p-4 sm:p-6">
                      <h3 className="text-base sm:text-lg font-semibold mb-1">{product.name}</h3>
                      <p className="text-xs sm:text-sm text-gray-500 mb-4 sm:mb-6">{product.description}</p>

                      <p className="text-[10px] sm:text-xs font-medium text-gray-400 uppercase tracking-wide mb-2 sm:mb-3">
                        Price per 1k requests
                      </p>

                      <div className="space-y-2 sm:space-y-3">
                        {product.tiers.map((tier, i) => (
                          <div
                            key={i}
                            className="flex items-center justify-between py-1.5 sm:py-2 border-b border-gray-100 last:border-0"
                          >
                            <span className="text-xs sm:text-sm text-gray-600">{tier.range}</span>
                            <span className="text-base sm:text-lg font-semibold">${tier.pricePerK}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Cost Calculator */}
                <div className="max-w-2xl mx-auto">
                  <div className="rounded-2xl border border-gray-200 bg-gradient-to-br from-gray-50 to-white p-8">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-10 h-10 rounded-xl bg-[#E63946]/10 flex items-center justify-center">
                        <Calculator className="w-5 h-5 text-[#E63946]" />
                      </div>
                      <h3 className="text-xl font-semibold">Cost Calculator</h3>
                    </div>

                    <div className="mb-6">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        How many emails do you need to enrich?
                      </label>
                      <input
                        type="number"
                        value={calculatorValue}
                        onChange={(e) => setCalculatorValue(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#E63946]/30 focus:border-[#E63946] text-lg font-medium transition-all"
                      />
                      <input
                        type="range"
                        min="100"
                        max="100000"
                        step="100"
                        value={calculatorValue}
                        onChange={(e) => setCalculatorValue(parseInt(e.target.value))}
                        className="w-full mt-3 accent-[#E63946]"
                      />
                    </div>

                    <div className="flex items-end justify-between p-4 bg-[#111827] rounded-xl text-white">
                      <div>
                        <p className="text-sm text-gray-400 mb-1">Total cost</p>
                        <p className="text-3xl font-bold">${calculatedCost.toFixed(2)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-400 mb-1">Effective rate</p>
                        <p className="text-lg font-semibold text-[#E63946]">
                          ${effectiveRate.toFixed(4)}/email
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Plans Tab */}
          {activeTab === "plans" && (
            <section className="pb-20 md:pb-28 bg-white">
              <div className="max-w-6xl mx-auto px-6">
                {/* Billing toggle */}
                <div className="flex justify-center mb-12">
                  <div className="inline-flex items-center gap-4 p-1.5 bg-gray-100 rounded-xl">
                    <button
                      onClick={() => setBillingPeriod("monthly")}
                      className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                        billingPeriod === "monthly"
                          ? "bg-white shadow-sm text-gray-900"
                          : "text-gray-500 hover:text-gray-700"
                      }`}
                    >
                      Monthly
                    </button>
                    <button
                      onClick={() => setBillingPeriod("annual")}
                      className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                        billingPeriod === "annual"
                          ? "bg-white shadow-sm text-gray-900"
                          : "text-gray-500 hover:text-gray-700"
                      }`}
                    >
                      Annual
                      <span className="ml-2 text-xs text-[#E63946] font-semibold">Save 20%</span>
                    </button>
                  </div>
                </div>

                {/* Pricing cards */}
                <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
                  {plans.map((plan) => (
                    <div
                      key={plan.name}
                      className={`relative rounded-2xl p-8 ${
                        plan.highlighted
                          ? "bg-[#E63946] text-white ring-2 ring-[#C5303C]"
                          : "bg-white border border-gray-200"
                      }`}
                    >
                      {plan.highlighted && (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-white text-[#E63946] text-xs font-semibold rounded-full shadow-sm">
                          Most Popular
                        </div>
                      )}

                      <div className="mb-6">
                        <h3
                          className="text-2xl font-normal mb-2"
                          style={{ fontFamily: "'Source Serif 4', Georgia, serif" }}
                        >
                          {plan.name}
                        </h3>
                        <p className={`text-sm ${plan.highlighted ? "text-white/80" : "text-gray-500"}`}>
                          {plan.description}
                        </p>
                      </div>

                      <div className="mb-6">
                        {plan.price !== null ? (
                          <>
                            <div className="flex items-baseline gap-1">
                              <span className="text-4xl font-bold">
                                ${Math.round(plan.price * discount)}
                              </span>
                              <span className={`text-sm ${plan.highlighted ? "text-white/70" : "text-gray-500"}`}>
                                /month
                              </span>
                            </div>
                            <p className={`text-sm mt-1 ${plan.highlighted ? "text-white/70" : "text-gray-500"}`}>
                              {plan.credits?.toLocaleString()} credits included
                            </p>
                          </>
                        ) : (
                          <div className="flex items-baseline gap-1">
                            <span
                              className="text-3xl font-normal"
                              style={{ fontFamily: "'Source Serif 4', Georgia, serif" }}
                            >
                              Custom
                            </span>
                          </div>
                        )}
                      </div>

                      <Link href={plan.name === "Enterprise" ? "/contact" : "/signup"}>
                        <Button
                          className={`w-full mb-8 h-12 text-base font-medium rounded-xl ${
                            plan.highlighted
                              ? "bg-white hover:bg-gray-100 text-[#E63946]"
                              : "bg-gray-100 hover:bg-gray-200 text-gray-900"
                          }`}
                        >
                          {plan.cta}
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                      </Link>

                      <ul className="space-y-3">
                        {plan.features.map((feature) => (
                          <li key={feature} className="flex items-start gap-3 text-sm">
                            <Check className={`w-5 h-5 flex-shrink-0 ${plan.highlighted ? "text-white" : "text-[#E63946]"}`} />
                            <span className={plan.highlighted ? "text-white/90" : "text-gray-600"}>
                              {feature}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>

                {/* API mention */}
                <p className="text-center text-gray-500 mt-8">
                  All plans include API access.{" "}
                  <button
                    onClick={() => setActiveTab("api")}
                    className="text-[#E63946] hover:underline font-medium"
                  >
                    See API pricing
                  </button>
                </p>
              </div>
            </section>
          )}

          {/* Why We're Cheaper Section */}
          <section className="py-16 bg-gray-50 border-t border-gray-100">
            <div className="max-w-4xl mx-auto px-6">
              <h2
                className="text-2xl md:text-3xl font-normal mb-4 text-center"
                style={{ fontFamily: "'Source Serif 4', Georgia, serif" }}
              >
                How we keep costs so low
              </h2>
              <p className="text-gray-600 text-center mb-10 max-w-2xl mx-auto">
                We built proprietary email pattern matching that achieves 95%+ accuracy before
                falling back to expensive third-party providers. You get the same quality data at a fraction of the cost.
              </p>

              <div className="grid md:grid-cols-3 gap-8">
                <div className="text-center">
                  <div className="w-12 h-12 rounded-2xl bg-[#E63946]/10 flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl">1</span>
                  </div>
                  <h3 className="font-semibold mb-2">Smart Pattern Matching</h3>
                  <p className="text-sm text-gray-600">
                    Our algorithms predict email patterns with high accuracy using public data signals.
                  </p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 rounded-2xl bg-[#E63946]/10 flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl">2</span>
                  </div>
                  <h3 className="font-semibold mb-2">Real-time Validation</h3>
                  <p className="text-sm text-gray-600">
                    Every email is verified against SMTP servers to ensure deliverability.
                  </p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 rounded-2xl bg-[#E63946]/10 flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl">3</span>
                  </div>
                  <h3 className="font-semibold mb-2">Smart Fallbacks</h3>
                  <p className="text-sm text-gray-600">
                    Only use premium providers when needed, passing the savings directly to you.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* FAQs */}
          <section className="py-20 md:py-28 bg-white">
            <div className="max-w-4xl mx-auto px-6">
              <h2
                className="text-3xl md:text-4xl font-normal tracking-tight mb-12 text-center"
                style={{ fontFamily: "'Source Serif 4', Georgia, serif" }}
              >
                Frequently asked questions
              </h2>

              <div className="grid md:grid-cols-2 gap-x-12 gap-y-8">
                {faqs.map((faq, i) => (
                  <div key={i}>
                    <h3 className="font-semibold mb-2">{faq.q}</h3>
                    <p className="text-gray-600 text-sm leading-relaxed">{faq.a}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Final CTA */}
          <section className="py-16 bg-white">
            <div className="max-w-4xl mx-auto px-6 text-center">
              <h2
                className="text-2xl md:text-3xl font-normal mb-4 text-[#111827]"
                style={{ fontFamily: "'Source Serif 4', Georgia, serif" }}
              >
                Ready to cut your enrichment costs?
              </h2>
              <p className="text-gray-600 mb-8 max-w-xl mx-auto">
                Start with $10 in free credits. No credit card required.
              </p>
              <div className="flex flex-col sm:flex-row justify-center gap-4">
                <Link href="/signup">
                  <Button className="bg-[#111827] text-white hover:bg-black h-12 px-8 text-base font-medium rounded-xl">
                    Get started free
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
                <Link href="/contact">
                  <Button variant="outline" className="border-gray-300 text-[#111827] hover:bg-gray-100 h-12 px-8 text-base font-medium rounded-xl">
                    Talk to sales
                  </Button>
                </Link>
              </div>
            </div>
          </section>
        </main>
      </div>

      <ExaFooter />
    </div>
  );
}
