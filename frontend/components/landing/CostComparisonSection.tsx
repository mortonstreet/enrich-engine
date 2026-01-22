"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/Button";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

// Competitor pricing data (static for landing page performance)
const COMPETITORS = [
  { id: "apollo", name: "Apollo", costPerEmail: 0.20, color: "bg-slate-500" },
  { id: "wiza", name: "Wiza", costPerEmail: 0.15, color: "bg-slate-400" },
  { id: "clay", name: "Clay", costPerEmail: 0.05, color: "bg-slate-300" },
  { id: "prospeo", name: "Prospeo", costPerEmail: 0.039, color: "bg-slate-200" },
];

const ENRICH_ENGINE_COST = 0.018;

// Get max cost for bar width calculation
const MAX_COST = Math.max(...COMPETITORS.map((c) => c.costPerEmail));

interface CostBarProps {
  name: string;
  cost: number;
  maxCost: number;
  color: string;
  isEnrichEngine?: boolean;
  shouldAnimate: boolean;
}

function CostBar({ name, cost, maxCost, color, isEnrichEngine, shouldAnimate }: CostBarProps) {
  const percentage = (cost / maxCost) * 100;
  const [width, setWidth] = useState(0);

  useEffect(() => {
    if (shouldAnimate) {
      const timer = setTimeout(() => setWidth(percentage), 100);
      return () => clearTimeout(timer);
    }
  }, [shouldAnimate, percentage]);

  return (
    <div className="flex items-center gap-4">
      <div className="w-24 text-sm font-medium text-right text-muted-foreground">
        {name}
      </div>
      <div className="flex-1 relative h-8">
        <div
          className={`absolute inset-y-0 left-0 rounded-r-lg transition-all duration-1000 ease-out ${
            isEnrichEngine ? "bg-green-500" : color
          }`}
          style={{ width: shouldAnimate ? `${width}%` : `${percentage}%` }}
        />
      </div>
      <div className={`w-16 text-sm font-medium ${isEnrichEngine ? "text-green-600 font-bold" : "text-muted-foreground"}`}>
        ${cost.toFixed(cost < 0.01 ? 3 : 2)}
      </div>
    </div>
  );
}

function AnimatedNumber({ value, prefix = "", suffix = "", duration = 2000, shouldAnimate }: {
  value: number;
  prefix?: string;
  suffix?: string;
  duration?: number;
  shouldAnimate: boolean;
}) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!shouldAnimate) return;

    let startTime: number | null = null;
    let animationFrame: number;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      setCount(easeOutQuart * value);

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [value, duration, shouldAnimate]);

  const displayValue = shouldAnimate ? count : value;

  return (
    <span>
      {prefix}
      {displayValue.toFixed(value < 1 ? 0 : 0)}
      {suffix}
    </span>
  );
}

export function CostComparisonSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [leadCount, setLeadCount] = useState(1000);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.2 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const enrichEngineCost = leadCount * ENRICH_ENGINE_COST;
  const maxCompetitorCost = leadCount * MAX_COST;
  const maxSavings = maxCompetitorCost - enrichEngineCost;
  const maxSavingsPercent = Math.round((maxSavings / maxCompetitorCost) * 100);

  return (
    <section ref={sectionRef} className="py-20 md:py-28 bg-muted/30 border-y border-border">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
            Cut Your Enrichment Costs by Up to <span className="text-green-600">{maxSavingsPercent}%</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            We use smart email guessing with validation before falling back to paid providers.
            Same accuracy, fraction of the cost.
          </p>
        </div>

        {/* Cost Bar Chart */}
        <div className="max-w-3xl mx-auto mb-12 space-y-3 p-6 bg-background rounded-xl border border-border">
          <p className="text-sm font-medium text-muted-foreground mb-4">Cost per email enrichment</p>
          {COMPETITORS.map((competitor) => (
            <CostBar
              key={competitor.id}
              name={competitor.name}
              cost={competitor.costPerEmail}
              maxCost={MAX_COST}
              color={competitor.color}
              shouldAnimate={isVisible}
            />
          ))}
          <CostBar
            name="Enrich Engine"
            cost={ENRICH_ENGINE_COST}
            maxCost={MAX_COST}
            isEnrichEngine
            color=""
            shouldAnimate={isVisible}
          />
        </div>

        {/* Interactive Calculator */}
        <div className="max-w-2xl mx-auto p-6 bg-background rounded-xl border border-border">
          <div className="mb-6">
            <label htmlFor="leadCount" className="block text-sm font-medium text-muted-foreground mb-2">
              How many leads do you enrich monthly?
            </label>
            <input
              id="leadCount"
              type="number"
              value={leadCount}
              onChange={(e) => setLeadCount(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-full px-4 py-2 rounded-lg border border-border bg-muted/50 focus:outline-none focus:ring-2 focus:ring-green-500/50 text-lg font-medium"
            />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {COMPETITORS.map((competitor) => (
              <div key={competitor.id} className="text-center p-3 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground">{competitor.name}</p>
                <p className="text-lg font-semibold">${(leadCount * competitor.costPerEmail).toFixed(0)}</p>
              </div>
            ))}
          </div>

          <div className="border-t border-border pt-4">
            <div className="flex justify-between items-center mb-4">
              <div>
                <p className="text-sm text-muted-foreground">Enrich Engine</p>
                <p className="text-2xl font-bold text-green-600">${enrichEngineCost.toFixed(0)}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">You save up to</p>
                <p className="text-2xl font-bold">
                  <span className="text-green-600">${maxSavings.toFixed(0)}</span>
                  <span className="text-lg text-muted-foreground ml-1">({maxSavingsPercent}%)</span>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center mt-10">
          <Link href="/waitlist">
            <Button size="lg" className="h-12 px-8 text-base font-medium bg-green-600 hover:bg-green-700">
              Start Saving Now
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
