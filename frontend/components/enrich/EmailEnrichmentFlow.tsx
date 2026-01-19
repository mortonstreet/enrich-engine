"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  useEmailGuessPreview,
  useCreateEmailGuessJob,
  useCreateEnrichmentJob,
} from "@/hooks/api/useEnrich";
import { EnrichmentStrategy } from "@shared/types/src";
import {
  Loader2,
  Zap,
  Brain,
  DollarSign,
  ArrowRight,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";

interface EmailEnrichmentFlowProps {
  listId: string;
  listName: string;
  onJobCreated?: (jobId: string) => void;
}

const strategies = [
  {
    id: "guess_first" as EnrichmentStrategy,
    name: "Smart Enrichment",
    description:
      "Try email guessing first (cheap), fall back to Prospeo if needed",
    icon: Brain,
    badge: "Recommended",
  },
  {
    id: "guess_only" as EnrichmentStrategy,
    name: "Guess Only",
    description: "Only use email guessing. Cheapest option but may miss some emails",
    icon: DollarSign,
  },
  {
    id: "direct" as EnrichmentStrategy,
    name: "Direct Prospeo",
    description: "Use Prospeo for all lookups. Most reliable but costs more",
    icon: Zap,
  },
];

export function EmailEnrichmentFlow({
  listId,
  listName,
  onJobCreated,
}: EmailEnrichmentFlowProps) {
  const [strategy, setStrategy] = useState<EnrichmentStrategy>("guess_first");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: preview, isLoading: isLoadingPreview } =
    useEmailGuessPreview(listId);
  const createGuessJobMutation = useCreateEmailGuessJob();
  const createDirectJobMutation = useCreateEnrichmentJob();

  const handleStartEnrichment = async () => {
    setIsSubmitting(true);
    try {
      let job;
      if (strategy === "direct") {
        job = await createDirectJobMutation.mutateAsync({
          listId,
          enrichmentType: "email",
        });
      } else {
        job = await createGuessJobMutation.mutateAsync({
          listId,
          strategy,
        });
      }
      toast.success("Enrichment job started");
      onJobCreated?.(job.id);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to start enrichment"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoadingPreview) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Analyzing list...</span>
      </div>
    );
  }

  if (!preview) {
    return (
      <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-800">
        <p className="flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          Failed to load preview. Please try again.
        </p>
      </div>
    );
  }

  const estimatedCost =
    strategy === "direct"
      ? preview.estimatedCosts.comparedToDirectProspeo
      : preview.estimatedCosts.totalCost;

  const savings =
    strategy !== "direct"
      ? preview.estimatedCosts.comparedToDirectProspeo -
        preview.estimatedCosts.totalCost
      : 0;

  return (
    <div className="space-y-6">
      {/* List Summary */}
      <div className="p-4 bg-muted/50 rounded-lg">
        <h3 className="font-medium mb-2">{listName}</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Total Leads</p>
            <p className="font-semibold">{preview.totalLeads}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Need Emails</p>
            <p className="font-semibold">{preview.leadsNeedingEmails}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Have Domain</p>
            <p className="font-semibold text-green-600">
              {preview.leadsWithDomains}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Need Domain Search</p>
            <p className="font-semibold text-orange-600">
              {preview.leadsNeedingDomainSearch}
            </p>
          </div>
        </div>
      </div>

      {/* Strategy Selection */}
      <div className="space-y-3">
        <Label>Enrichment Strategy</Label>
        <RadioGroup
          value={strategy}
          onValueChange={(value) => setStrategy(value as EnrichmentStrategy)}
          className="space-y-3"
        >
          {strategies.map((s) => {
            const Icon = s.icon;
            return (
              <div
                key={s.id}
                className={`
                  flex items-start space-x-3 p-4 rounded-lg border-2 cursor-pointer transition-all
                  ${
                    strategy === s.id
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }
                `}
                onClick={() => setStrategy(s.id)}
              >
                <RadioGroupItem value={s.id} id={s.id} className="mt-1" />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4 text-muted-foreground" />
                    <Label
                      htmlFor={s.id}
                      className="font-medium cursor-pointer"
                    >
                      {s.name}
                    </Label>
                    {s.badge && (
                      <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-primary/10 text-primary">
                        {s.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {s.description}
                  </p>
                </div>
              </div>
            );
          })}
        </RadioGroup>
      </div>

      {/* Cost Breakdown */}
      <div className="p-4 bg-muted/50 rounded-lg space-y-3">
        <h4 className="font-medium flex items-center gap-2">
          <DollarSign className="w-4 h-4" />
          Cost Estimate
        </h4>

        {strategy !== "direct" && (
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Domain Search</span>
              <span>${preview.estimatedCosts.domainSearchCost.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Email Validation</span>
              <span>${preview.estimatedCosts.validationCost.toFixed(2)}</span>
            </div>
            {strategy === "guess_first" && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  Prospeo Fallback (est. 30%)
                </span>
                <span>
                  ${preview.estimatedCosts.prospeoFallbackCost.toFixed(2)}
                </span>
              </div>
            )}
          </div>
        )}

        <div className="flex justify-between pt-2 border-t font-medium">
          <span>Estimated Total</span>
          <span>${estimatedCost.toFixed(2)}</span>
        </div>

        {savings > 0 && (
          <div className="flex items-center gap-2 text-green-600 text-sm">
            <CheckCircle className="w-4 h-4" />
            <span>
              Save ~${savings.toFixed(2)} compared to direct Prospeo lookups
            </span>
          </div>
        )}
      </div>

      {/* Start Button */}
      <Button
        onClick={handleStartEnrichment}
        disabled={isSubmitting || preview.leadsNeedingEmails === 0}
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
            Start Email Enrichment
            <ArrowRight className="w-4 h-4 ml-2" />
          </>
        )}
      </Button>

      {preview.leadsNeedingEmails === 0 && (
        <p className="text-center text-sm text-muted-foreground">
          All leads in this list already have emails.
        </p>
      )}
    </div>
  );
}
