"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Label } from "@/components/ui/label";
import {
  useCopyGeneratorLists,
  useCreateCopyGeneratorJob,
  usePreviewCopyGenerator,
} from "@/hooks/api/useCopyGenerator";
import {
  Loader2,
  Sparkles,
  ArrowRight,
  AlertCircle,
  RefreshCw,
  Lightbulb,
} from "lucide-react";
import { toast } from "sonner";

interface CopyGeneratorFlowProps {
  listId: string;
  listName: string;
  onJobCreated?: (jobId: string) => void;
}

const promptExamples = [
  "Write casual, friendly openers that reference their current role",
  "Focus on recent company news or achievements",
  "Mention specific pain points in their industry",
  "Reference mutual connections or shared interests",
];

export function CopyGeneratorFlow({
  listId,
  listName,
  onJobCreated,
}: CopyGeneratorFlowProps) {
  const [userPrompt, setUserPrompt] = useState(
    "Write personalized, engaging first lines that reference their role and company"
  );
  const [previewResult, setPreviewResult] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: listsData, isLoading: isLoadingLists } = useCopyGeneratorLists();
  const createJobMutation = useCreateCopyGeneratorJob();
  const previewMutation = usePreviewCopyGenerator();

  const listStats = listsData?.lists?.find((l) => l.id === listId);
  const leadsNeedingFirstLine = listStats?.leadsWithoutFirstLine ?? 0;

  const handlePreview = async () => {
    if (!userPrompt.trim()) {
      toast.error("Please enter a prompt");
      return;
    }

    // For preview, we'll skip it for now since we need a leadId
    // In a full implementation, we'd pick a random lead from the list
    toast.info("Preview requires selecting a specific lead - starting generation will process all leads.");
  };

  const handleStartGeneration = async () => {
    if (!userPrompt.trim()) {
      toast.error("Please enter a prompt");
      return;
    }

    setIsSubmitting(true);
    try {
      const job = await createJobMutation.mutateAsync({
        listId,
        userPrompt: userPrompt.trim(),
      });
      toast.success("First line generation started");
      onJobCreated?.(job.id);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to start generation"
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

  return (
    <div className="space-y-6">
      {/* List Summary */}
      <div className="p-4 bg-muted/50 rounded-lg">
        <h3 className="font-medium mb-2">{listName}</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Total Leads</p>
            <p className="font-semibold">{listStats?.totalLeads ?? 0}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Need First Lines</p>
            <p className="font-semibold">{leadsNeedingFirstLine}</p>
          </div>
        </div>
      </div>

      {/* Custom Prompt */}
      <div className="space-y-3">
        <Label htmlFor="prompt">Custom Prompt</Label>
        <textarea
          id="prompt"
          value={userPrompt}
          onChange={(e) => setUserPrompt(e.target.value)}
          placeholder="Describe how you want the first lines to be written..."
          className="w-full min-h-[100px] px-3 py-2 text-sm rounded-md border border-input bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
        />
        <div className="flex items-start gap-2 text-xs text-muted-foreground">
          <Lightbulb className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium mb-1">Tips for better results:</p>
            <ul className="space-y-0.5">
              {promptExamples.map((example, i) => (
                <li
                  key={i}
                  className="cursor-pointer hover:text-foreground"
                  onClick={() => setUserPrompt(example)}
                >
                  &bull; {example}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Preview */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Preview</Label>
          <Button
            variant="outline"
            size="sm"
            onClick={handlePreview}
            disabled={previewMutation.isPending || !userPrompt.trim()}
          >
            {previewMutation.isPending ? (
              <>
                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <RefreshCw className="w-3 h-3 mr-1" />
                Generate Preview
              </>
            )}
          </Button>
        </div>

        <div className="p-4 bg-muted/50 rounded-lg min-h-[80px] flex items-center justify-center">
          {previewResult ? (
            <p className="text-sm italic">&ldquo;{previewResult}&rdquo;</p>
          ) : (
            <p className="text-sm text-muted-foreground">
              Click &quot;Generate Preview&quot; to see a sample first line
            </p>
          )}
        </div>
      </div>

      {/* Cost Estimate */}
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-center gap-2 text-blue-800">
          <Sparkles className="w-4 h-4" />
          <span className="font-medium">AI-Powered Generation</span>
        </div>
        <p className="text-sm text-blue-700 mt-1">
          Uses Gemini 2.5 Flash via OpenRouter. Estimated cost: ~$0.001 per lead
          (${((leadsNeedingFirstLine * 0.001) || 0).toFixed(2)} total).
        </p>
      </div>

      {/* Start Button */}
      <Button
        onClick={handleStartGeneration}
        disabled={isSubmitting || leadsNeedingFirstLine === 0 || !userPrompt.trim()}
        className="w-full"
        size="lg"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Starting Generation...
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4 mr-2" />
            Generate First Lines for {leadsNeedingFirstLine} Leads
            <ArrowRight className="w-4 h-4 ml-2" />
          </>
        )}
      </Button>

      {leadsNeedingFirstLine === 0 && (
        <p className="text-center text-sm text-muted-foreground">
          All leads in this list already have first lines.
        </p>
      )}
    </div>
  );
}
