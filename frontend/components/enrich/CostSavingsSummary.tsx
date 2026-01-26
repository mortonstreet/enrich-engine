"use client";

import { useJobCostComparison } from "@/hooks/api/useEnrich";
import { Check, Loader2, DollarSign, Mail, AlertTriangle, HelpCircle, XCircle } from "lucide-react";

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

  const totalValidations = data.emailBreakdown
    ? data.emailBreakdown.validEmails.count +
      data.emailBreakdown.catchAllEmails.count +
      data.emailBreakdown.invalidEmails.count +
      data.emailBreakdown.unknownEmails.count
    : 0;

  return (
    <div className="space-y-4">
      {/* Summary Card */}
      <div className="p-4 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
            <DollarSign className="w-5 h-5 text-green-600" />
          </div>
          <div className="flex-1">
            <p className="text-sm text-green-800 dark:text-green-200">
              You paid <span className="font-bold">${data.actualCost.toFixed(2)}</span> for{" "}
              <span className="font-bold">{data.successfulEnrichments}</span> verified emails
            </p>
            <p className="text-xs text-green-700 dark:text-green-300 mt-1">
              Cost per email: ${data.costPerEmail.toFixed(4)}
            </p>
          </div>
        </div>
      </div>

      {/* Email Breakdown by Status */}
      {data.emailBreakdown && totalValidations > 0 && (
        <div>
          <p className="text-sm font-medium text-muted-foreground mb-2">
            Email Validation Breakdown
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Valid Emails */}
            <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800">
              <div className="flex items-center gap-2 mb-1">
                <Mail className="w-4 h-4 text-green-600" />
                <span className="text-xs font-medium text-green-700 dark:text-green-300">Valid</span>
              </div>
              <p className="text-lg font-bold text-green-700 dark:text-green-300">
                {data.emailBreakdown.validEmails.count}
              </p>
              <p className="text-xs text-green-600 dark:text-green-400">
                ${data.emailBreakdown.validEmails.cost.toFixed(4)}
              </p>
            </div>

            {/* Catch-All Emails */}
            <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span className="text-xs font-medium text-amber-700 dark:text-amber-300">Catch-All</span>
              </div>
              <p className="text-lg font-bold text-amber-700 dark:text-amber-300">
                {data.emailBreakdown.catchAllEmails.count}
              </p>
              <p className="text-xs text-amber-600 dark:text-amber-400">
                ${data.emailBreakdown.catchAllEmails.cost.toFixed(4)}
              </p>
            </div>

            {/* Invalid Emails */}
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800">
              <div className="flex items-center gap-2 mb-1">
                <XCircle className="w-4 h-4 text-red-600" />
                <span className="text-xs font-medium text-red-700 dark:text-red-300">Invalid</span>
              </div>
              <p className="text-lg font-bold text-red-700 dark:text-red-300">
                {data.emailBreakdown.invalidEmails.count}
              </p>
              <p className="text-xs text-red-600 dark:text-red-400">
                ${data.emailBreakdown.invalidEmails.cost.toFixed(4)}
              </p>
            </div>

            {/* Unknown Emails */}
            <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-950/30 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2 mb-1">
                <HelpCircle className="w-4 h-4 text-gray-600" />
                <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Unknown</span>
              </div>
              <p className="text-lg font-bold text-gray-700 dark:text-gray-300">
                {data.emailBreakdown.unknownEmails.count}
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                ${data.emailBreakdown.unknownEmails.cost.toFixed(4)}
              </p>
            </div>
          </div>
        </div>
      )}

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
