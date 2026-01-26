"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { useCreateEnrichmentJob, useListsForEnrichment } from "@/hooks/api/useEnrich";
import { Loader2, Phone, ArrowRight, DollarSign, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface PhoneEnrichmentFlowProps {
  listId: string;
  listName: string;
  onJobCreated?: (jobId: string) => void;
}

export function PhoneEnrichmentFlow({
  listId,
  listName,
  onJobCreated,
}: PhoneEnrichmentFlowProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: listsData, isLoading: isLoadingLists } = useListsForEnrichment();
  const createJobMutation = useCreateEnrichmentJob();

  const listStats = listsData?.lists?.find((l) => l.id === listId);
  const leadsNeedingPhone = listStats?.unenrichedPhoneCount ?? 0;
  const hasLinkedinColumn = listStats?.hasLinkedinColumn ?? false;

  const handleStartEnrichment = async () => {
    setIsSubmitting(true);
    try {
      const job = await createJobMutation.mutateAsync({
        listId,
        enrichmentType: "phone",
      });
      toast.success("Phone enrichment job started");
      onJobCreated?.(job.id);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to start enrichment"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoadingLists) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Loading...</span>
      </div>
    );
  }

  if (!hasLinkedinColumn) {
    return (
      <div className="p-4 rounded-lg bg-orange-50 border border-orange-200 text-orange-800">
        <p className="flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          This list doesn&apos;t have a LinkedIn column. Phone enrichment requires LinkedIn URLs.
        </p>
      </div>
    );
  }

  const estimatedCost = leadsNeedingPhone * 0.05;

  return (
    <div className="space-y-6">
      {/* List Summary */}
      <div className="p-4 bg-muted/50 rounded-lg">
        <h3 className="font-medium mb-2">{listName}</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Enrichable Leads</p>
            <p className="font-semibold">{listStats?.leadsWithLinkedinCount ?? 0}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Need Phone Numbers</p>
            <p className="font-semibold">{leadsNeedingPhone}</p>
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="p-4 bg-muted/50 rounded-lg space-y-2">
        <div className="flex items-center gap-2">
          <Phone className="w-4 h-4 text-muted-foreground" />
          <span className="font-medium">Direct Phone Lookup</span>
        </div>
        <p className="text-sm text-muted-foreground">
          Uses Prospeo to find direct phone numbers from LinkedIn profiles.
          Works best for professional contacts with public phone numbers.
        </p>
      </div>

      {/* Cost Estimate */}
      <div className="p-4 bg-muted/50 rounded-lg space-y-3">
        <h4 className="font-medium flex items-center gap-2">
          <DollarSign className="w-4 h-4" />
          Cost Estimate
        </h4>

        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">
              {leadsNeedingPhone} leads @ $0.05 each
            </span>
            <span>${estimatedCost.toFixed(2)}</span>
          </div>
        </div>

        <div className="flex justify-between pt-2 border-t font-medium">
          <span>Estimated Total</span>
          <span>${estimatedCost.toFixed(2)}</span>
        </div>
      </div>

      {/* Start Button */}
      <Button
        onClick={handleStartEnrichment}
        disabled={isSubmitting || leadsNeedingPhone === 0}
        className="w-full"
        size="lg"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Starting Enrichment...
          </>
        ) : (
          <>
            <Phone className="w-4 h-4 mr-2" />
            Start Phone Enrichment
            <ArrowRight className="w-4 h-4 ml-2" />
          </>
        )}
      </Button>

      {leadsNeedingPhone === 0 && (
        <p className="text-center text-sm text-muted-foreground">
          All leads in this list have already been processed for phone enrichment.
        </p>
      )}
    </div>
  );
}
