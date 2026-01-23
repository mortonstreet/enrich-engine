"use client";

import Link from "next/link";
import { Button } from "@/components/ui/Button";
import ExaFooter from "@/components/landing/ExaFooter";
import ScrollReveal from "@/components/landing/ScrollReveal";
import Navigation from "@/components/landing/Navigation";
import FeatureShowcase from "@/components/landing/FeatureShowcase";
import AnimatedPixelBackground from "@/components/landing/AnimatedPixelBackground";
import AnimatedSearchBar from "@/components/landing/AnimatedSearchBar";
import EnrichCoreLogo from "@/components/landing/EnrichCoreLogo";
import BenchmarkChart from "@/components/landing/BenchmarkChart";
import FeaturesGrid from "@/components/landing/FeaturesGrid";

export default function Home() {
  return (
    <div className="min-h-screen text-[#111827]">
      {/* Animated pixel background */}
      <AnimatedPixelBackground />

      {/* Navigation with mega menus - fixed at top */}
      <Navigation />

      {/* Main content wrapper - scrolls over sticky footer */}
      <div className="relative z-10 bg-white pt-16">
        <main>
          {/* Hero Section */}
          <section className="relative min-h-[80vh] sm:min-h-[85vh] flex items-center overflow-hidden bg-white/80 backdrop-blur-sm">
            {/* Hero Content */}
            <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 w-full py-12 sm:py-16 md:py-20">
              <div className="text-center">
                {/* Data Art Icon */}
                <div className="flex justify-center mb-6 sm:mb-8 md:mb-10 animate-fade-in-up">
                  <EnrichCoreLogo />
                </div>

                {/* Headline */}
                <h1
                  className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-normal text-[#111827] mb-6 sm:mb-8 md:mb-10 animate-fade-in-up tracking-tight"
                  style={{ fontFamily: "'Source Serif 4', Georgia, serif" }}
                >
                  Enrichment built for your outreach
                </h1>

                {/* Animated Search Bar */}
                <div className="mb-8 sm:mb-10 animate-fade-in-up-delay-1">
                  <AnimatedSearchBar />
                </div>

                {/* CTA Buttons */}
                <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4 animate-fade-in-up-delay-2">
                  <Link href="/signup">
                    <Button className="w-full sm:w-auto bg-[#111827] text-white hover:bg-black rounded-xl px-6 sm:px-8 py-3 sm:py-4 text-sm sm:text-base font-medium h-12 sm:h-14">
                      Try the API for free
                    </Button>
                  </Link>
                  <a href="https://cal.com/mortonstreet/15min" target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" className="w-full sm:w-auto border-gray-200 text-gray-700 hover:bg-gray-50 rounded-xl px-6 sm:px-8 py-3 sm:py-4 text-sm sm:text-base font-medium h-12 sm:h-14">
                      Book a demo
                    </Button>
                  </a>
                </div>
              </div>
            </div>
          </section>

          {/* Feature Showcase */}
          <section className="bg-white">
            <FeatureShowcase />
          </section>

          {/* Features Grid */}
          <FeaturesGrid />

          {/* Benchmark Comparison Chart */}
          <BenchmarkChart />

          {/* CTA Section */}
          <section className="py-16 sm:py-24 md:py-32 bg-white relative overflow-hidden">
            <div className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 text-center">
              <ScrollReveal>
                <div className="flex justify-center mb-6 sm:mb-8">
                  <EnrichCoreLogo />
                </div>

                <h2
                  className="text-3xl sm:text-4xl md:text-5xl font-normal mb-4 sm:mb-6 leading-tight text-[#111827]"
                  style={{ fontFamily: "'Source Serif 4', Georgia, serif" }}
                >
                  Ready to enrich your leads?
                </h2>
                <p className="text-gray-600 text-base sm:text-lg mb-8 sm:mb-10 max-w-xl mx-auto">
                  Get verified emails and phone numbers for any prospect. Start building your pipeline today.
                </p>
                <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4">
                  <Link href="/signup">
                    <Button className="w-full sm:w-auto bg-[#111827] text-white hover:bg-black rounded-xl px-6 sm:px-8 py-3 sm:py-4 text-sm sm:text-base font-medium h-12 sm:h-14">
                      Get started free
                    </Button>
                  </Link>
                  <a href="https://cal.com/mortonstreet/15min" target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" className="w-full sm:w-auto border-gray-200 text-gray-700 hover:bg-gray-50 rounded-xl px-6 sm:px-8 py-3 sm:py-4 text-sm sm:text-base font-medium h-12 sm:h-14">
                      Talk to sales
                    </Button>
                  </a>
                </div>
              </ScrollReveal>
            </div>
          </section>
        </main>
      </div>

      {/* Footer - sticky at bottom, revealed as content scrolls */}
      <ExaFooter />
    </div>
  );
}
