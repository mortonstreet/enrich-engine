// ============================================
// Cost Comparison Types
// ============================================

export interface CompetitorPricing {
  id: string;
  name: string;
  costPerEmail: number;
}

export interface CompetitorComparison {
  competitorId: string;
  competitorName: string;
  wouldHaveCost: number;
  savings: number;
  percentageSaved: number;
}

// ============================================
// Response Types
// ============================================

export interface JobCostComparisonResponse {
  jobId: string;
  actualCost: number;
  costPerEmail: number;
  successfulEnrichments: number;
  competitorComparisons: CompetitorComparison[];
}

export interface PricingComparisonResponse {
  enrichEngineCostPerEmail: number;
  competitors: CompetitorPricing[];
}
