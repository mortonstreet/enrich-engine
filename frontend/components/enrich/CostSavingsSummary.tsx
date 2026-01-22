"use client";

import { useJobCostComparison } from "@/hooks/api/useEnrich";
import { Check, Loader2, DollarSign } from "lucide-react";

interface CostSavingsSummaryProps {
  jobId: string;
}

export function CostSavingsSummary({ jobId }: CostSavingsSummaryProps) {
  const { data, isLoading, error } = useJobCostComparison(jobId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground mr-2" />
        <span className="text-sm text-muted-foreground">Loading cost summary...</span>
      </div>
    );
  }

  if (error || !data || data.successfulEnrichments === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Summary Card */}
      <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
            <DollarSign className="w-5 h-5 text-green-600" />
          </div>
          <div className="flex-1">
            <p className="text-sm text-green-800">
              You paid <span className="font-bold">${data.actualCost.toFixed(2)}</span> for{" "}
              <span className="font-bold">{data.successfulEnrichments}</span> verified emails
            </p>
            <p className="text-xs text-green-700 mt-1">
              Cost per email: ${data.costPerEmail.toFixed(4)}
            </p>
          </div>
        </div>
      </div>

      {/* Competitor Comparison Table */}
      <div>
        <p className="text-sm font-medium text-muted-foreground mb-2">
          This would have cost you with other providers:
        </p>
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-3 font-medium">Provider</th>
                <th className="text-right p-3 font-medium">Cost</th>
                <th className="text-right p-3 font-medium">You Saved</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.competitorComparisons.map((comparison) => (
                <tr key={comparison.competitorId}>
                  <td className="p-3">{comparison.competitorName}</td>
                  <td className="p-3 text-right font-medium">
                    ${comparison.wouldHaveCost.toFixed(2)}
                  </td>
                  <td className="p-3 text-right">
                    <span className="inline-flex items-center gap-1 text-green-600 font-medium">
                      ${comparison.savings.toFixed(2)} ({comparison.percentageSaved}%)
                      <Check className="w-4 h-4" />
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
