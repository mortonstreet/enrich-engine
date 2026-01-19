"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Page } from "@/components/dashboard/Page";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EnrichJobsTable } from "@/components/enrich/EnrichJobsTable";
import { EnrichJobDetailModal } from "@/components/enrich/EnrichJobDetailModal";
import {
  EnrichmentTypeSelector,
  EnrichmentFlowType,
} from "@/components/enrich/EnrichmentTypeSelector";
import { ListSelector } from "@/components/enrich/ListSelector";
import { EmailEnrichmentFlow } from "@/components/enrich/EmailEnrichmentFlow";
import { PhoneEnrichmentFlow } from "@/components/enrich/PhoneEnrichmentFlow";
import { CopyGeneratorFlow } from "@/components/enrich/CopyGeneratorFlow";
import { useEnrichmentJobs, useVendors } from "@/hooks/api/useEnrich";
import { useCopyGeneratorJobs } from "@/hooks/api/useCopyGenerator";
import {
  Loader2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Check,
} from "lucide-react";

type Step = "select_type" | "select_list" | "configure";

export default function EnrichPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("select_type");
  const [enrichmentType, setEnrichmentType] =
    useState<EnrichmentFlowType>("email");
  const [selectedListId, setSelectedListId] = useState<string | null>(null);
  const [selectedListName, setSelectedListName] = useState<string>("");
  const [viewingJobId, setViewingJobId] = useState<string | null>(null);

  const { data: jobsData, isLoading: isLoadingJobs } = useEnrichmentJobs();
  const { data: copyGenJobsData, isLoading: isLoadingCopyGenJobs } =
    useCopyGeneratorJobs();
  const { data: vendorsData } = useVendors();

  const prospeoVendor = vendorsData?.vendors?.find((v) => v.id === "prospeo");
  const millionVerifierVendor = vendorsData?.vendors?.find(
    (v) => v.id === "millionverifier"
  );
  const openrouterVendor = vendorsData?.vendors?.find(
    (v) => v.id === "openrouter"
  );

  const isProspeoConfigured = prospeoVendor?.isConfigured ?? false;
  const isMillionVerifierConfigured = millionVerifierVendor?.isConfigured ?? false;
  const isOpenRouterConfigured = openrouterVendor?.isConfigured ?? false;

  // Check API key requirements based on enrichment type
  const getMissingApiKeys = () => {
    const missing: string[] = [];
    if (enrichmentType === "email") {
      if (!isProspeoConfigured) missing.push("Prospeo");
      if (!isMillionVerifierConfigured) missing.push("MillionVerifier");
    } else if (enrichmentType === "phone") {
      if (!isProspeoConfigured) missing.push("Prospeo");
    } else if (enrichmentType === "first_line") {
      if (!isOpenRouterConfigured) missing.push("OpenRouter");
    }
    return missing;
  };

  const missingApiKeys = getMissingApiKeys();
  const hasRequiredApiKeys = missingApiKeys.length === 0;

  const handleSelectList = (listId: string, listName: string) => {
    setSelectedListId(listId);
    setSelectedListName(listName);
  };

  const handleJobCreated = (jobId: string) => {
    // Reset flow after job creation
    setStep("select_type");
    setSelectedListId(null);
    setSelectedListName("");
  };

  const canProceedToList = hasRequiredApiKeys;
  const canProceedToConfigure = selectedListId !== null;

  const goToStep = (newStep: Step) => {
    setStep(newStep);
  };

  const renderStepIndicator = () => {
    const steps = [
      { id: "select_type", label: "Type", number: 1 },
      { id: "select_list", label: "List", number: 2 },
      { id: "configure", label: "Configure", number: 3 },
    ];

    const currentIndex = steps.findIndex((s) => s.id === step);

    return (
      <div className="flex items-center justify-center mb-6">
        {steps.map((s, i) => {
          const isCompleted = i < currentIndex;
          const isCurrent = s.id === step;

          return (
            <div key={s.id} className="flex items-center">
              <div
                className={`
                  flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium transition-all
                  ${
                    isCompleted
                      ? "bg-primary text-primary-foreground"
                      : isCurrent
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                  }
                `}
              >
                {isCompleted ? <Check className="w-4 h-4" /> : s.number}
              </div>
              <span
                className={`ml-2 text-sm hidden sm:inline ${
                  isCurrent ? "font-medium" : "text-muted-foreground"
                }`}
              >
                {s.label}
              </span>
              {i < steps.length - 1 && (
                <div
                  className={`w-12 h-0.5 mx-2 ${
                    isCompleted ? "bg-primary" : "bg-muted"
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const renderCurrentStep = () => {
    switch (step) {
      case "select_type":
        return (
          <div className="space-y-6">
            <EnrichmentTypeSelector
              value={enrichmentType}
              onChange={setEnrichmentType}
            />

            {/* API Key Warnings */}
            {missingApiKeys.length > 0 && (
              <div className="p-4 rounded-lg bg-orange-50 border border-orange-200">
                <p className="text-sm text-orange-800 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>
                    {missingApiKeys.join(" and ")} API key(s) not configured.{" "}
                    <Link
                      href="/dashboard/settings"
                      className="underline font-medium"
                    >
                      Configure in Settings
                    </Link>{" "}
                    to use this enrichment type.
                  </span>
                </p>
              </div>
            )}

            <div className="flex justify-end">
              <Button
                onClick={() => goToStep("select_list")}
                disabled={!canProceedToList}
              >
                Continue
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        );

      case "select_list":
        return (
          <div className="space-y-6">
            <ListSelector
              value={selectedListId}
              onChange={handleSelectList}
              enrichmentType={enrichmentType}
            />

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => goToStep("select_type")}>
                <ChevronLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <Button
                onClick={() => goToStep("configure")}
                disabled={!canProceedToConfigure}
              >
                Continue
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        );

      case "configure":
        return (
          <div className="space-y-6">
            <Button
              variant="ghost"
              onClick={() => goToStep("select_list")}
              className="mb-2"
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              Back to list selection
            </Button>

            {enrichmentType === "email" && selectedListId && (
              <EmailEnrichmentFlow
                listId={selectedListId}
                listName={selectedListName}
                onJobCreated={handleJobCreated}
              />
            )}

            {enrichmentType === "phone" && selectedListId && (
              <PhoneEnrichmentFlow
                listId={selectedListId}
                listName={selectedListName}
                onJobCreated={handleJobCreated}
              />
            )}

            {enrichmentType === "first_line" && selectedListId && (
              <CopyGeneratorFlow
                listId={selectedListId}
                listName={selectedListName}
                onJobCreated={handleJobCreated}
              />
            )}
          </div>
        );
    }
  };

  // Combine enrichment jobs and copy generator jobs
  const allJobs = [
    ...(jobsData?.jobs ?? []),
  ];

  return (
    <Page
      title="Enrich"
      subtitle="Get emails, phone numbers, and AI-generated first lines"
    >
      <div className="space-y-6">
        {/* Enrichment Flow Card */}
        <Card>
          <CardHeader className="border-b">
            <CardTitle>Start Enrichment</CardTitle>
            <CardDescription>
              Follow the steps to enrich your leads
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            {renderStepIndicator()}
            {renderCurrentStep()}
          </CardContent>
        </Card>

        {/* Jobs Table */}
        <Card>
          <CardHeader className="border-b">
            <CardTitle>Enrichment Jobs</CardTitle>
            <CardDescription>View and manage your enrichment jobs</CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            {isLoadingJobs ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <EnrichJobsTable
                jobs={allJobs}
                onViewJob={(jobId) => setViewingJobId(jobId)}
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Job Detail Modal */}
      <EnrichJobDetailModal
        jobId={viewingJobId}
        onClose={() => setViewingJobId(null)}
      />
    </Page>
  );
}
