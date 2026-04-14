"use client";

import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import {
  Users,
  BarChart3,
  Zap,
  ArrowRight,
  Mic,
  Target,
  Headphones,
  Menu,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { BentoGrid, BentoFeatureCard } from "@/components/landing/bento-grid";
import { Logo } from "@/components/brand";
import { AnimatedCounter } from "@/components/landing/AnimatedCounter";
import { ScrollProgress } from "@/components/landing/ScrollProgress";
import PrismaticBurst from "@/components/landing/PrismaticBurst";
import { WaveformVisual } from "@/components/landing/visuals/WaveformVisual";
import { SequenceDotsVisual } from "@/components/landing/visuals/SequenceDotsVisual";
import { MiniChartVisual } from "@/components/landing/visuals/MiniChartVisual";
import { VoicemailDropVisual } from "@/components/landing/visuals/VoicemailDropVisual";
import { PipelineVisual } from "@/components/landing/visuals/PipelineVisual";
import { TeamAvatarsVisual } from "@/components/landing/visuals/TeamAvatarsVisual";

// Get app URL for auth links
const getAppUrl = (path: string) => {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "";
  if (!appUrl || appUrl.includes("localhost")) {
    return path;
  }
  return `${appUrl}${path}`;
};

// Scroll reveal hook
function useScrollReveal() {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.1 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, []);

  return { ref, isVisible };
}

// Reveal wrapper component
function Reveal({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const { ref, isVisible } = useScrollReveal();

  return (
    <div
      ref={ref}
      className="reveal"
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? "translateY(0)" : "translateY(20px)",
        transition: `opacity 0.6s ease-out ${delay}ms, transform 0.6s ease-out ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      {/* Navigation */}
      <nav
        className={`sticky top-0 z-50 transition-all duration-300 ${
          scrolled
            ? "bg-background/95 backdrop-blur-md border-b border-border"
            : "bg-background border-b border-transparent"
        }`}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex justify-between items-center h-14 sm:h-16">
            <Link href="/" className="flex items-center">
              <Logo scrollCollapse scrollThreshold={50} />
            </Link>

            {/* Desktop nav */}
            <div className="hidden sm:flex items-center gap-3">
              <a
                href={getAppUrl("/login")}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors px-4 py-2"
              >
                Sign in
              </a>
              <Button asChild>
                <Link href="/waitlist">Waitlist</Link>
              </Button>
            </div>

            {/* Mobile menu button */}
            <button
              className="sm:hidden p-2 -mr-2 text-muted-foreground hover:text-foreground"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>

          {/* Mobile menu */}
          {mobileMenuOpen && (
            <div className="sm:hidden py-4 border-t border-border space-y-3">
              <a
                href={getAppUrl("/login")}
                className="block text-sm text-muted-foreground hover:text-foreground transition-colors py-2"
              >
                Sign in
              </a>
              <Button asChild className="w-full">
                <Link href="/waitlist">Waitlist</Link>
              </Button>
            </div>
          )}
        </div>
        <ScrollProgress />
      </nav>

      <main>
        {/* Hero Section */}
        <section className="relative py-16 sm:py-24 md:py-32 lg:py-40 overflow-hidden">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="max-w-4xl mx-auto text-center space-y-8 sm:space-y-10">
              <h1
                className="font-display font-bold leading-[0.85] tracking-tighter animate-fade-in"
                style={{ fontSize: "clamp(4rem, 15vw, 14rem)" }}
              >
                Dial
              </h1>

              <p
                className="text-lg sm:text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto leading-relaxed animate-fade-in"
                style={{ animationDelay: "150ms" }}
              >
                Browser-based VoIP dialer. Power dial, call recording, voicemail drop, native CRM.
              </p>

              <div
                className="flex justify-center gap-4 animate-fade-in"
                style={{ animationDelay: "300ms" }}
              >
                <Button asChild size="xl">
                  <Link href="/waitlist">
                    Join Waitlist
                    <ArrowRight className="w-5 h-5" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="py-20 sm:py-24 md:py-32 border-y border-border">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 sm:gap-12">
              <Reveal>
                <div className="text-center">
                  <p className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-foreground font-mono">
                    <AnimatedCounter value={10} suffix="x" />
                  </p>
                  <p className="text-sm sm:text-base text-muted-foreground mt-2 sm:mt-3">Faster</p>
                </div>
              </Reveal>
              <Reveal delay={150}>
                <div className="text-center">
                  <p className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-foreground font-mono">
                    <AnimatedCounter value={98} suffix="%" />
                  </p>
                  <p className="text-sm sm:text-base text-muted-foreground mt-2 sm:mt-3">Connect rate</p>
                </div>
              </Reveal>
              <Reveal delay={300}>
                <div className="text-center">
                  <p className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-foreground font-mono">
                    <AnimatedCounter value={2} suffix="hr" />
                  </p>
                  <p className="text-sm sm:text-base text-muted-foreground mt-2 sm:mt-3">Saved daily</p>
                </div>
              </Reveal>
              <Reveal delay={450}>
                <div className="text-center">
                  <p className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-foreground font-mono">
                    <AnimatedCounter value={20} prefix="$" />
                  </p>
                  <p className="text-sm sm:text-base text-muted-foreground mt-2 sm:mt-3">Per month</p>
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        {/* Features Bento Grid */}
        <section className="py-20 sm:py-24 md:py-32 lg:py-40">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <Reveal>
              <h2 className="font-display font-bold text-4xl sm:text-5xl md:text-6xl lg:text-7xl mb-12 sm:mb-16 lg:mb-20 tracking-tight">
                Features
              </h2>
            </Reveal>

            <BentoGrid>
              <BentoFeatureCard
                icon={<Zap className="w-5 h-5" />}
                title="Power Dialer"
                description="Auto-advance through your list. Set pace, hit numbers."
                size="2x1"
              >
                <SequenceDotsVisual />
              </BentoFeatureCard>
              <BentoFeatureCard
                icon={<Mic className="w-5 h-5" />}
                title="Recording"
                description="Every call recorded. Playback, download, share."
              >
                <WaveformVisual />
              </BentoFeatureCard>
              <BentoFeatureCard
                icon={<Headphones className="w-5 h-5" />}
                title="Voicemail Drop"
                description="One click. Move to next call."
              >
                <VoicemailDropVisual />
              </BentoFeatureCard>
              <BentoFeatureCard
                icon={<Target className="w-5 h-5" />}
                title="Native CRM"
                description="Pipeline, deals, history. One place."
                size="1x2"
              >
                <PipelineVisual />
              </BentoFeatureCard>
              <BentoFeatureCard
                icon={<Users className="w-5 h-5" />}
                title="Team Campaigns"
                description="Round-robin. Track performance."
              >
                <TeamAvatarsVisual />
              </BentoFeatureCard>
              <BentoFeatureCard
                icon={<BarChart3 className="w-5 h-5" />}
                title="Analytics"
                description="Metrics, connect rates, leaderboards."
                size="2x1"
              >
                <MiniChartVisual />
              </BentoFeatureCard>
            </BentoGrid>
          </div>
        </section>

        {/* How it works */}
        <section className="py-20 sm:py-24 md:py-32 lg:py-40 border-y border-border">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <Reveal>
              <h2 className="font-display font-bold text-4xl sm:text-5xl md:text-6xl lg:text-7xl mb-12 sm:mb-16 lg:mb-20 tracking-tight">
                How
              </h2>
            </Reveal>

            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-12 sm:gap-16 lg:gap-20">
              <Reveal>
                <div className="text-center sm:text-left group">
                  <div className="text-6xl sm:text-7xl lg:text-8xl font-bold text-foreground font-mono mb-4 sm:mb-6 transition-transform group-hover:scale-105">
                    01
                  </div>
                  <h3 className="text-lg sm:text-xl font-semibold text-foreground mb-3">Upload</h3>
                  <p className="text-base text-muted-foreground leading-relaxed">
                    Import CSV or connect CRM. Map fields.
                  </p>
                </div>
              </Reveal>
              <Reveal delay={150}>
                <div className="text-center sm:text-left group">
                  <div className="text-6xl sm:text-7xl lg:text-8xl font-bold text-foreground font-mono mb-4 sm:mb-6 transition-transform group-hover:scale-105">
                    02
                  </div>
                  <h3 className="text-lg sm:text-xl font-semibold text-foreground mb-3">Configure</h3>
                  <p className="text-base text-muted-foreground leading-relaxed">
                    Set caller ID. Record voicemail. Customize dispositions.
                  </p>
                </div>
              </Reveal>
              <Reveal delay={300}>
                <div className="text-center sm:text-left sm:col-span-2 md:col-span-1 group">
                  <div className="text-6xl sm:text-7xl lg:text-8xl font-bold text-foreground font-mono mb-4 sm:mb-6 transition-transform group-hover:scale-105">
                    03
                  </div>
                  <h3 className="text-lg sm:text-xl font-semibold text-foreground mb-3">Dial</h3>
                  <p className="text-base text-muted-foreground leading-relaxed">
                    Hit start. Auto-advance keeps you in flow.
                  </p>
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="relative py-16 sm:py-20 md:py-24 overflow-hidden">
          {/* PrismaticBurst Background */}
          <div className="absolute inset-0 z-0">
            <PrismaticBurst
              colors={["#fafafa", "#404040"]}
              intensity={2}
              speed={0.4}
              animationType="rotate3d"
              mixBlendMode="overlay"
            />
          </div>

          <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 text-center">
            <Reveal>
              <h2
                className="font-display font-bold mb-6 sm:mb-8 tracking-tight"
                style={{ fontSize: "clamp(2rem, 8vw, 5rem)" }}
              >
                Join the waitlist
              </h2>
            </Reveal>
            <Reveal delay={150}>
              <Button asChild size="lg">
                <Link href="/waitlist">
                  Join Waitlist
                  <ArrowRight className="w-5 h-5" />
                </Link>
              </Button>
            </Reveal>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="py-12 sm:py-16 md:py-20 border-t border-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-6 sm:gap-8">
            <Link href="/" className="flex items-center">
              <Logo variant="full" />
            </Link>
            <div className="flex items-center gap-6 sm:gap-8 text-sm text-muted-foreground">
              <a href={getAppUrl("/login")} className="hover:text-foreground transition-colors">
                Sign In
              </a>
              <Link href="/waitlist" className="hover:text-foreground transition-colors">
                Waitlist
              </Link>
              <Link href="/privacy" className="hover:text-foreground transition-colors">
                Privacy
              </Link>
              <Link href="/terms" className="hover:text-foreground transition-colors">
                Terms
              </Link>
            </div>
            <p className="text-sm text-muted-foreground">&copy; OmniDial 2026</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
