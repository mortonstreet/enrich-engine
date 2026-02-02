"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { ArrowLeft } from "lucide-react";
import { NaturalLanguageInput } from "./NaturalLanguageInput";
import { QueryPreview } from "./QueryPreview";
import { ResultsPreview } from "./ResultsPreview";
import { CompanySearchJobProgress } from "./CompanySearchJobProgress";
import { CompanySearchResults } from "./CompanySearchResults";
import { CompanySearchJobList } from "./CompanySearchJobList";
import {
  useGenerateSearchQuery,
  usePreviewCompanySearch,
  useCreateCompanySearchJob,
  useCompanySearchJob,
} from "@/hooks/api/useCompanySearch";
import {
  CompanySearchJobStatus,
  CompanySearchPreviewItem,
} from "@shared/types/src";

type Step = "input" | "query" | "preview" | "job" | "viewing";

export function SmartCompanySearch() {
  const [step, setStep] = useState<Step>("input");
  const [naturalLanguageQuery, setNaturalLanguageQuery] = useState("");
  const [generatedQuery, setGeneratedQuery] = useState("");
  const [explanation, setExplanation] = useState("");
  const [previewResults, setPreviewResults] = useState<CompanySearchPreviewItem[]>([]);
  const [estimatedPages, setEstimatedPages] = useState(0);
  const [activeJobId, setActiveJobId] = useState<string | undefined>();

  const generateQuery = useGenerateSearchQuery();
  const previewSearch = usePreviewCompanySearch();
  const createJob = useCreateCompanySearchJob();
  const { data: jobData } = useCompanySearchJob(activeJobId);

  const handleGenerate = async (query: string) => {
    setNaturalLanguageQuery(query);
    const result = await generateQuery.mutateAsync({ naturalLanguageQuery: query });
    setGeneratedQuery(result.query);
    setExplanation(result.explanation);
    setStep("query");
  };

  const handlePreview = async (query: string) => {
    setGeneratedQuery(query);
    const result = await previewSearch.mutateAsync({ searchQuery: query });
    setPreviewResults(result.results);
    setEstimatedPages(result.estimatedPages);
    setStep("preview");
  };

  const handleStartScrape = async (params: { maxPages: number; name?: string }) => {
    const result = await createJob.mutateAsync({
      naturalLanguageQuery,
      searchQuery: generatedQuery,
      maxPages: params.maxPages,
      name: params.name,
    });
    setActiveJobId(result.job.id);
    setStep("job");
  };

  const handleSelectJob = (jobId: string) => {
    setActiveJobId(jobId);
    setStep("viewing");
  };

  const handleReset = () => {
    setStep("input");
    setNaturalLanguageQuery("");
    setGeneratedQuery("");
    setExplanation("");
    setPreviewResults([]);
    setEstimatedPages(0);
    setActiveJobId(undefined);
  };

  // Determine if active job is complete or still processing
  const isJobComplete = jobData?.status === CompanySearchJobStatus.COMPLETED;
  const isJobFailed = jobData?.status === CompanySearchJobStatus.FAILED;

  return (
    <div className="space-y-6">
      {/* Back button when in a sub-step */}
      {(step === "job" || step === "viewing") && (
        <Button variant="ghost" size="sm" onClick={handleReset}>
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          New Search
        </Button>
      )}

      {/* Step 1: Natural Language Input */}
      {step === "input" && (
        <>
          <NaturalLanguageInput
            onGenerate={handleGenerate}
            isGenerating={generateQuery.isPending}
          />
          <CompanySearchJobList onSelectJob={handleSelectJob} />
        </>
      )}

      {/* Step 2: Query Preview & Edit */}
      {step === "query" && (
        <QueryPreview
          query={generatedQuery}
          explanation={explanation}
          onPreview={handlePreview}
          onBack={() => setStep("input")}
          isPreviewing={previewSearch.isPending}
        />
      )}

      {/* Step 3: Results Preview */}
      {step === "preview" && (
        <ResultsPreview
          results={previewResults}
          estimatedPages={estimatedPages}
          searchQuery={generatedQuery}
          naturalLanguageQuery={naturalLanguageQuery}
          onStartScrape={handleStartScrape}
          onBack={() => setStep("query")}
          isCreating={createJob.isPending}
        />
      )}

      {/* Step 4: Job Progress / Results */}
      {(step === "job" || step === "viewing") && jobData && (
        <>
          <CompanySearchJobProgress job={jobData} />
          {(isJobComplete || isJobFailed) && jobData.items && (
            <CompanySearchResults job={jobData} items={jobData.items} />
          )}
        </>
      )}
    </div>
  );
}
