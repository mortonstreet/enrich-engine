import type { CompetitorPricing } from "@shared/types/src";

// ============================================
// Enrich Engine Cost Calculation
// ============================================
// Based on emailGuess.service.ts COSTS constants:
// - MillionVerifier validation: $0.0005 per check
// - Prospeo fallback: $0.05 per lookup
// - Average patterns tried: ~7 per lead
// - Guess success rate: ~70%
//
// Weighted average cost per successful email:
// - Guess success (70%): 7 validations × $0.0005 = $0.0035
// - Fallback (30%): $0.0035 + $0.05 = $0.0535
// - Weighted average: (0.70 × $0.0035) + (0.30 × $0.0535) = ~$0.018/email

export const ENRICH_ENGINE_COST_PER_EMAIL = 0.018;

// ============================================
// Competitor Pricing (as of 2025)
// ============================================
// Sources:
// - Apollo: https://www.apollo.io/pricing - Extra credits cost $0.20 each
// - Wiza: https://wiza.co/pricing - Per extra email on monthly plans
// - Clay: https://www.clay.com/pricing - 2-5 credits × $0.016-0.075/credit (Pro avg)
// - Prospeo: https://prospeo.io/pricing - 1 credit per enrichment

export const COMPETITOR_PRICING: CompetitorPricing[] = [
  {
    id: "apollo",
    name: "Apollo",
    costPerEmail: 0.20,
  },
  {
    id: "wiza",
    name: "Wiza",
    costPerEmail: 0.15,
  },
  {
    id: "clay",
    name: "Clay",
    costPerEmail: 0.05,
  },
  {
    id: "prospeo",
    name: "Prospeo",
    costPerEmail: 0.039,
  },
];

// Sort competitors by cost (highest first for display)
export const COMPETITORS_BY_COST = [...COMPETITOR_PRICING].sort(
  (a, b) => b.costPerEmail - a.costPerEmail
);
