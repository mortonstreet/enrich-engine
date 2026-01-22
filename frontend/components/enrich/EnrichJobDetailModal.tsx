"use client";

import { useEnrichmentJob } from "@/hooks/api/useEnrich";
import { CostSavingsSummary } from "./CostSavingsSummary";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  Mail,
  AlertTriangle,
  HelpCircle,
  User,
  Building,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useState } from "react";
import { ListEnrichmentJobItemResponse } from "@shared/types/src";

interface EnrichJobDetailModalProps {
  jobId: string | null;
  onClose: () => void;
}

const statusIcons = {
  valid: { icon: CheckCircle, className: "text-green-600" },
  bounced: { icon: XCircle, className: "text-red-600" },
  catch_all: { icon: AlertTriangle, className: "text-yellow-600" },
  unknown: { icon: HelpCircle, className: "text-gray-500" },
  error: { icon: XCircle, className: "text-red-600" },
};

const itemStatusConfig = {
  pending: { icon: Clock, className: "text-yellow-600", label: "Pending", animate: false },
  processing: { icon: Loader2, className: "text-blue-600", label: "Processing", animate: true },
  completed: { icon: CheckCircle, className: "text-green-600", label: "Completed", animate: false },
  failed: { icon: XCircle, className: "text-red-600", label: "Failed", animate: false },
  not_found: { icon: HelpCircle, className: "text-gray-500", label: "Not Found", animate: false },
};

const strategyLabels = {
  direct: "Direct Prospeo",
  guess_first: "Smart Enrichment",
  guess_only: "Guess Only",
};

function LeadItemRow({ item }: { item: ListEnrichmentJobItemResponse }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const hasAttempts = item.validationAttempts && item.validationAttempts.length > 0;
  const statusConfig = itemStatusConfig[item.status as keyof typeof itemStatusConfig] || itemStatusConfig.pending;
  const StatusIcon = statusConfig.icon;

  const leadName = item.lead
    ? [item.lead.firstName, item.lead.lastName].filter(Boolean).join(" ") || "Unknown"
    : "Unknown";

  return (
    <div className="border rounded-lg overflow-hidden">
      <div
        className={`flex items-center gap-3 p-3 bg-muted/30 ${hasAttempts ? "cursor-pointer hover:bg-muted/50" : ""}`}
        onClick={() => hasAttempts && setIsExpanded(!isExpanded)}
      >
        {hasAttempts ? (
          isExpanded ? (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          )
        ) : (
          <div className="w-4" />
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-muted-foreground" />
            <span className="font-medium truncate">{leadName}</span>
            {item.lead?.company && (
              <>
                <Building className="w-3.5 h-3.5 text-muted-foreground ml-2" />
                <span className="text-sm text-muted-foreground truncate">
                  {item.lead.company}
                </span>
              </>
            )}
          </div>
          {item.lead?.companyDomain && (
            <p className="text-xs text-muted-foreground mt-0.5">
              @{item.lead.companyDomain}
            </p>
          )}
        </div>

        <div className="flex items-center gap-3">
          {item.enrichedEmail && (
            <div className="flex items-center gap-1.5 px-2 py-1 bg-green-100 text-green-800 rounded-md text-sm">
              <Mail className="w-3.5 h-3.5" />
              <span className="font-medium">{item.enrichedEmail}</span>
            </div>
          )}

          <span className={`flex items-center gap-1 text-sm ${statusConfig.className}`}>
            <StatusIcon className={`w-4 h-4 ${statusConfig.animate ? "animate-spin" : ""}`} />
            {statusConfig.label}
          </span>
        </div>
      </div>

      {isExpanded && hasAttempts && (
        <div className="border-t bg-white p-3">
          <p className="text-xs font-medium text-muted-foreground mb-2">
            Email Validation Attempts ({item.validationAttempts!.length})
          </p>
          <div className="space-y-1.5">
            {item.validationAttempts!.map((attempt) => {
              const attemptStatus = statusIcons[attempt.status as keyof typeof statusIcons] || statusIcons.unknown;
              const AttemptIcon = attemptStatus.icon;
              const isValid = attempt.status === "valid";

              return (
                <div
                  key={attempt.id}
                  className={`flex items-center gap-2 p-2 rounded text-sm ${
                    isValid ? "bg-green-50 border border-green-200" : "bg-muted/50"
                  }`}
                >
                  <AttemptIcon className={`w-4 h-4 ${attemptStatus.className}`} />
                  <span className={`font-mono ${isValid ? "font-medium" : ""}`}>
                    {attempt.email}
                  </span>
                  <span className="text-xs text-muted-foreground px-1.5 py-0.5 bg-muted rounded">
                    {attempt.pattern}
                  </span>
                  <span className={`text-xs ml-auto ${attemptStatus.className}`}>
                    {attempt.status}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {item.errorMessage && (
        <div className="border-t bg-red-50 p-2 text-sm text-red-700">
          {item.errorMessage}
        </div>
      )}
    </div>
  );
}

export function EnrichJobDetailModal({ jobId, onClose }: EnrichJobDetailModalProps) {
  const { data, isLoading, error } = useEnrichmentJob(jobId ?? undefined, {
    polling: true,
  });

  const isOpen = jobId !== null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Enrichment Job Details</DialogTitle>
          {data && (
            <DialogDescription>
              {data.job.listName} - {data.job.enrichmentType} enrichment
            </DialogDescription>
          )}
        </DialogHeader>

        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Loading job details...</span>
          </div>
        )}

        {error && (
          <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-800">
            Failed to load job details. Please try again.
          </div>
        )}

        {data && (
          <div className="flex-1 overflow-y-auto space-y-4">
            {/* Job Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted/50 rounded-lg">
              <div>
                <p className="text-xs text-muted-foreground">Status</p>
                <p className="font-medium capitalize">{data.job.status}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Strategy</p>
                <p className="font-medium">
                  {data.job.enrichmentStrategy
                    ? strategyLabels[data.job.enrichmentStrategy]
                    : "Direct"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Progress</p>
                <p className="font-medium">
                  {data.job.processedRows}/{data.job.totalRows} leads
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Created</p>
                <p className="font-medium">
                  {formatDistanceToNow(new Date(data.job.createdAt), { addSuffix: true })}
                </p>
              </div>
            </div>

            {/* Success/Failure Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted/50 rounded-lg">
              <div>
                <p className="text-xs text-muted-foreground">Successful</p>
                <p className="font-medium text-green-600">{data.job.successCount}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Failed</p>
                <p className="font-medium text-red-600">{data.job.errorCount}</p>
              </div>
              {data.job.guessSuccessCount !== undefined && (
                <div>
                  <p className="text-xs text-muted-foreground">Found via Guessing</p>
                  <p className="font-medium text-blue-600">{data.job.guessSuccessCount}</p>
                </div>
              )}
              {data.job.fallbackCount !== undefined && (
                <div>
                  <p className="text-xs text-muted-foreground">Fallback to Prospeo</p>
                  <p className="font-medium text-orange-600">{data.job.fallbackCount}</p>
                </div>
              )}
            </div>

            {/* Cost Savings Summary (only for completed jobs) */}
            {data.job.status === "completed" && data.job.successCount > 0 && (
              <CostSavingsSummary jobId={data.job.id} />
            )}

            {/* Lead Items */}
            <div>
              <h3 className="text-sm font-medium mb-3">
                Leads ({data.items.length})
              </h3>
              <div className="space-y-2">
                {data.items.map((item) => (
                  <LeadItemRow key={item.id} item={item} />
                ))}
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
