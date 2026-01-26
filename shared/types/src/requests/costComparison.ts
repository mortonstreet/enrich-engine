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
// Enhanced Cost Breakdown Types
// ============================================

export interface EmailCategoryBreakdown {
  count: number;
  cost: number;
}

export interface EnhancedCostBreakdown {
  validEmails: EmailCategoryBreakdown;
  catchAllEmails: EmailCategoryBreakdown;
  invalidEmails: EmailCategoryBreakdown;
  unknownEmails: EmailCategoryBreakdown;
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
  // Enhanced breakdown by email status
  emailBreakdown?: EnhancedCostBreakdown;
}

export interface PricingComparisonResponse {
  enrichEngineCostPerEmail: number;
  competitors: CompetitorPricing[];
}
