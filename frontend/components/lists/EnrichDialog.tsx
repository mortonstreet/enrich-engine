"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/Button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useListSelection } from "@/contexts/ListSelectionContext";
import {
  useListsForEnrichment,
  useVendors,
  useCreateEnrichmentJob,
} from "@/hooks/api/useEnrich";
import { toast } from "sonner";
import { Loader2, Mail, Phone, AlertCircle, Sparkles, FileText } from "lucide-react";
import { EnrichmentType } from "@shared/types/src";

interface EnrichDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EnrichDialog({ open, onOpenChange }: EnrichDialogProps) {
  const [enrichmentType, setEnrichmentType] = useState<EnrichmentType>("email");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { selectedListIds, clearSelection } = useListSelection();
  const { data: listsData, isLoading: isLoadingLists } = useListsForEnrichment();
  const { data: vendorsData } = useVendors();
  const createJobMutation = useCreateEnrichmentJob();

  const prospeoVendor = vendorsData?.vendors?.find((v) => v.id === "prospeo");
  const isProspeoConfigured = prospeoVendor?.isConfigured ?? false;

  // Get details for selected lists
  const selectedLists = listsData?.lists?.filter((l) => selectedListIds.has(l.id)) ?? [];

  // Calculate totals
  const totalUnenriched = selectedLists.reduce((sum, list) => {
    const count = enrichmentType === "email"
      ? list.unenrichedEmailCount
      : list.unenrichedPhoneCount;
    return sum + count;
  }, 0);

  const hasLinkedinIssue = selectedLists.some((l) => !l.hasLinkedinColumn);
  const canStart = selectedLists.length > 0 && totalUnenriched > 0 && isProspeoConfigured && !hasLinkedinIssue;

  const handleStartEnrichment = async () => {
    if (!canStart) return;

    setIsSubmitting(true);
    try {
      // Create enrichment jobs for each selected list
      for (const list of selectedLists) {
        const unenrichedCount = enrichmentType === "email"
          ? list.unenrichedEmailCount
          : list.unenrichedPhoneCount;

        if (unenrichedCount > 0 && list.hasLinkedinColumn) {
          await createJobMutation.mutateAsync({
            listId: list.id,
            enrichmentType,
          });
        }
      }

      toast.success(`Enrichment started for ${selectedLists.length} list${selectedLists.length !== 1 ? "s" : ""}`);
      clearSelection();
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to start enrichment");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Enrich Selected Lists
          </DialogTitle>
          <DialogDescription>
            Get emails or phone numbers from LinkedIn profiles in your selected lists.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Selected Lists */}
          <div className="space-y-3">
            <Label>Selected lists ({selectedLists.length})</Label>
            {isLoadingLists ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading lists...
              </div>
            ) : selectedLists.length === 0 ? (
              <p className="text-sm text-muted-foreground">No lists selected</p>
            ) : (
              <div className="max-h-40 overflow-y-auto space-y-2 border rounded-lg p-2">
                {selectedLists.map((list) => {
                  const unenrichedCount = enrichmentType === "email"
                    ? list.unenrichedEmailCount
                    : list.unenrichedPhoneCount;
                  return (
                    <div
                      key={list.id}
                      className="flex items-center justify-between px-2 py-1.5 rounded hover:bg-muted/50"
                    >
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm font-medium">{list.name}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {!list.hasLinkedinColumn ? (
                          <span className="text-orange-600">No LinkedIn column</span>
                        ) : unenrichedCount === 0 ? (
                          <span className="text-green-600">All enriched</span>
                        ) : (
                          <span>{unenrichedCount} to enrich</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Enrichment Type */}
          <div className="space-y-3">
            <Label>Enrichment type</Label>
            <RadioGroup
              value={enrichmentType}
              onValueChange={(value) => setEnrichmentType(value as EnrichmentType)}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="email" id="email" />
                <Label htmlFor="email" className="flex items-center gap-2 cursor-pointer font-normal">
                  <Mail className="w-4 h-4" />
                  Email
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="phone" id="phone" />
                <Label htmlFor="phone" className="flex items-center gap-2 cursor-pointer font-normal">
                  <Phone className="w-4 h-4" />
                  Phone
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Summary */}
          {selectedLists.length > 0 && (
            <div className="text-sm text-muted-foreground">
              {totalUnenriched > 0 ? (
                <p>
                  Total: <span className="font-medium text-foreground">{totalUnenriched}</span> leads to enrich for {enrichmentType}
                </p>
              ) : (
                <p className="text-green-600 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4" />
                  All leads have already been enriched for {enrichmentType}.
                </p>
              )}
            </div>
          )}

          {/* API Key Warning */}
          {!isProspeoConfigured && (
            <div className="p-4 rounded-lg bg-orange-50 border border-orange-200">
              <p className="text-sm text-orange-800 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>
                  Prospeo API key not configured.{" "}
                  <a href="/dashboard/settings" className="underline font-medium">
                    Configure it in Settings
                  </a>{" "}
                  to start enriching.
                </span>
              </p>
            </div>
          )}

          {/* LinkedIn Warning */}
          {hasLinkedinIssue && (
            <div className="p-4 rounded-lg bg-orange-50 border border-orange-200">
              <p className="text-sm text-orange-800 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                Some selected lists don&apos;t have LinkedIn columns and will be skipped.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleStartEnrichment} disabled={!canStart || isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Starting...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Start Enrichment
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
