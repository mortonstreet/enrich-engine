"use client";

import { useState } from "react";
import { Page } from "@/components/dashboard/Page";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/base-input";
import { ScrapeDropzone } from "@/components/scrape/ScrapeDropzone";
import { ScrapeJobsTable } from "@/components/scrape/ScrapeJobsTable";
import { WorkflowTypeSelector } from "@/components/scrape/WorkflowTypeSelector";
import { CompanyCsvFlow } from "@/components/scrape/CompanyCsvFlow";
import { DomainCsvFlow } from "@/components/scrape/DomainCsvFlow";
import { SingleUrlFlow } from "@/components/scrape/SingleUrlFlow";
import { LoadingOverlay } from "@/components/scrape/LoadingOverlay";
import { RerunModal } from "@/components/scrape/RerunModal";
import { RoleAnalyticsCard } from "@/components/scrape/RoleAnalyticsCard";
import { useCreateScrapeJob, useScrapeJobs, useScrapeJob, useSyncScrapeJob, useRoleAnalytics, downloadScrapeResults } from "@/hooks/api/useScrape";
import { useScrapeProgress } from "@/hooks/useScrapeProgress";
import { toast } from "sonner";
import { Upload, Loader2, Download, CheckCircle, Clock, AlertCircle, ArrowLeft, ChevronLeft, ChevronRight, ListPlus, Pause, Play, Filter, RefreshCw } from "lucide-react";
import { ScrapeJobStatus, ScrapeWorkflowType, RoleConfig } from "@shared/types/src";

const ITEMS_PER_PAGE = 25;
const JOBS_PER_PAGE = 10;

type ViewMode = "select_workflow" | "workflow_flow" | "job_detail";
type ResultFilter = "all" | "found" | "not_found";

export default function ScrapePage() {
  // Workflow state
  const [viewMode, setViewMode] = useState<ViewMode>("select_workflow");
  const [selectedWorkflow, setSelectedWorkflow] = useState<ScrapeWorkflowType | null>(null);

  // Legacy flow state (for NAME_CSV)
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [jobName, setJobName] = useState("");

  // Active job state
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [resultsPage, setResultsPage] = useState(1);
  const [resultFilter, setResultFilter] = useState<ResultFilter>("all");
  const [roleFilter, setRoleFilter] = useState<string | null>(null);
  const [jobsPage, setJobsPage] = useState(1);
  const [showOverlay, setShowOverlay] = useState(false);
  const [showRerunModal, setShowRerunModal] = useState(false);

  const createJobMutation = useCreateScrapeJob();
  const syncJobMutation = useSyncScrapeJob();

  // Subscribe to real-time scrape progress updates via WebSocket
  useScrapeProgress();

  const { data: jobsData, isLoading: isLoadingJobs } = useScrapeJobs({
    page: jobsPage,
    limit: JOBS_PER_PAGE,
  });
  const { data: activeJob } = useScrapeJob(activeJobId ?? undefined, {
    polling: activeJobId !== null,
    pollingInterval: 15000, // 15s fallback polling (WebSocket provides real-time updates)
  });
  const { data: roleAnalytics } = useRoleAnalytics(
    activeJob?.inputType === "role" ? activeJobId ?? undefined : undefined
  );

  // Handle workflow selection
  const handleWorkflowSelect = (type: ScrapeWorkflowType) => {
    setSelectedWorkflow(type);
    if (type === ScrapeWorkflowType.NAME_CSV) {
      // Legacy flow - keep existing upload behavior
      setViewMode("select_workflow");
    } else {
      setViewMode("workflow_flow");
    }
  };

  // Handle legacy file upload (NAME_CSV)
  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    setSelectedWorkflow(ScrapeWorkflowType.NAME_CSV);
  };

  const handleLegacyUpload = async () => {
    if (!selectedFile) {
      toast.error("Please select a file");
      return;
    }

    try {
      const result = await createJobMutation.mutateAsync({
        file: selectedFile,
        name: jobName || undefined,
      });
      setActiveJobId(result.job.id);
      setViewMode("job_detail");
      setResultsPage(1);
      setSelectedFile(null);
      setJobName("");
      setShowOverlay(true);
      toast.success("Scrape job created! Processing started.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create scrape job");
    }
  };

  // Handle new workflow submission (Company, Domain, URL)
  const handleWorkflowSubmit = async (data: {
    file?: File;
    sourceUrl?: string;
    name?: string;
    workflowType: ScrapeWorkflowType;
    roleConfigs?: RoleConfig[];
  }) => {
    try {
      if (data.file) {
        const result = await createJobMutation.mutateAsync({
          file: data.file,
          name: data.name,
          roleConfigs: data.roleConfigs,
        });
        setActiveJobId(result.job.id);
        setViewMode("job_detail");
        setResultsPage(1);
        setShowOverlay(true);
        toast.success("Scrape job created! Processing started.");
      } else {
        toast.error("File upload required for this workflow");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create scrape job");
    }
  };

  const handleDownload = (foundOnly?: boolean) => {
    if (activeJobId) {
      downloadScrapeResults(activeJobId, foundOnly);
    }
  };

  const handleSyncToList = async () => {
    if (!activeJobId) return;

    try {
      const result = await syncJobMutation.mutateAsync(activeJobId);
      toast.success(result.message);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to sync to list");
    }
  };

  const handleBackToWorkflows = () => {
    setViewMode("select_workflow");
    setSelectedWorkflow(null);
  };

  const handleJobSelect = (id: string) => {
    setActiveJobId(id);
    setViewMode("job_detail");
    setResultsPage(1);
    setResultFilter("all");
    setRoleFilter(null);
  };

  const handleBackToJobs = () => {
    setActiveJobId(null);
    setViewMode("select_workflow");
    setShowOverlay(false);
  };

  const isJobComplete = activeJob?.status === ScrapeJobStatus.COMPLETED || activeJob?.status === ScrapeJobStatus.FAILED;
  const isProcessing = activeJob?.status === ScrapeJobStatus.PROCESSING || activeJob?.status === ScrapeJobStatus.PENDING;
  const isPaused = activeJob?.status === ScrapeJobStatus.PAUSED;

  // Auto-hide overlay when job completes
  if (showOverlay && isJobComplete) {
    setShowOverlay(false);
  }

  // Filter items based on result filter and role filter
  const filteredItems = activeJob?.items?.filter((item) => {
    // Result filter
    if (resultFilter === "found" && !(item.status === "completed" && item.linkedinUrl)) return false;
    if (resultFilter === "not_found" && !(item.status === "no_result" || item.status === "failed" || (item.status === "completed" && !item.linkedinUrl))) return false;

    // Role filter
    if (roleFilter) {
      const inputData = item.inputData as Record<string, string>;
      if (inputData.role !== roleFilter) return false;
    }

    return true;
  }) || [];

  return (
    <Page
      title="Scrape"
      subtitle="Find LinkedIn profiles from names, companies, or domains"
    >
      {/* Loading Overlay */}
      <LoadingOverlay
        isVisible={showOverlay && isProcessing}
        totalItems={activeJob?.totalRows || 0}
        processedItems={activeJob?.processedRows || 0}
        foundCount={activeJob?.successCount || 0}
        jobName={activeJob?.name}
        onClose={() => setShowOverlay(false)}
      />

      <div className="space-y-6">
        {/* Workflow Selection View */}
        {viewMode === "select_workflow" && !activeJobId && (
          <>
            <Card>
              <CardHeader className="border-b">
                <CardTitle>Start a New Scrape</CardTitle>
                <CardDescription>
                  Choose how you want to find LinkedIn profiles
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <WorkflowTypeSelector
                  selectedType={selectedWorkflow}
                  onSelect={handleWorkflowSelect}
                />
              </CardContent>
            </Card>

            {/* Legacy CSV Upload for Name-based */}
            {selectedWorkflow === ScrapeWorkflowType.NAME_CSV && (
              <Card>
                <CardHeader className="border-b">
                  <CardTitle>Upload Name CSV</CardTitle>
                  <CardDescription>
                    Upload a CSV with first_name, last_name, and optionally company columns
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-4 space-y-4">
                  <ScrapeDropzone
                    onFileSelect={handleFileSelect}
                    disabled={createJobMutation.isPending}
                  />

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Job Name (optional)</label>
                    <Input
                      value={jobName}
                      onChange={(e) => setJobName(e.target.value)}
                      placeholder="e.g., Q1 Tech Leads"
                      disabled={createJobMutation.isPending}
                    />
                  </div>

                  <Button
                    onClick={handleLegacyUpload}
                    disabled={!selectedFile || createJobMutation.isPending}
                    className="w-full"
                  >
                    {createJobMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Creating Job...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-2" />
                        Start Scraping
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Recent Jobs */}
            <Card>
              <CardHeader className="border-b">
                <div className="flex items-center justify-between">
                  <CardTitle>Recent Jobs</CardTitle>
                  {jobsData?.pagination && (
                    <span className="text-sm text-muted-foreground">
                      {jobsData.pagination.total} total jobs
                    </span>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                {isLoadingJobs ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <>
                    <ScrapeJobsTable
                      jobs={jobsData?.data || []}
                      onJobSelect={handleJobSelect}
                    />
                    {jobsData?.pagination && jobsData.pagination.totalPages > 1 && (
                      <div className="flex items-center justify-between mt-4 pt-4 border-t">
                        <p className="text-sm text-muted-foreground">
                          Page {jobsPage} of {jobsData.pagination.totalPages}
                        </p>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setJobsPage((p) => Math.max(1, p - 1))}
                            disabled={!jobsData.pagination.hasPrevPage}
                          >
                            <ChevronLeft className="w-4 h-4" />
                            Previous
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setJobsPage((p) => p + 1)}
                            disabled={!jobsData.pagination.hasNextPage}
                          >
                            Next
                            <ChevronRight className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </>
        )}

        {/* Workflow Flow View */}
        {viewMode === "workflow_flow" && selectedWorkflow && (
          <>
            {selectedWorkflow === ScrapeWorkflowType.COMPANY_CSV && (
              <CompanyCsvFlow
                onBack={handleBackToWorkflows}
                onSubmit={handleWorkflowSubmit}
                isSubmitting={createJobMutation.isPending}
              />
            )}
            {selectedWorkflow === ScrapeWorkflowType.DOMAIN_CSV && (
              <DomainCsvFlow
                onBack={handleBackToWorkflows}
                onSubmit={handleWorkflowSubmit}
                isSubmitting={createJobMutation.isPending}
              />
            )}
            {selectedWorkflow === ScrapeWorkflowType.SINGLE_URL && (
              <SingleUrlFlow
                onBack={handleBackToWorkflows}
                onSubmit={handleWorkflowSubmit}
                isSubmitting={createJobMutation.isPending}
              />
            )}
          </>
        )}

        {/* Job Detail View */}
        {viewMode === "job_detail" && activeJobId && activeJob && (
          <>
            <Button
              variant="ghost"
              onClick={handleBackToJobs}
              className="mb-2"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Jobs
            </Button>

            <Card>
              <CardHeader className="border-b">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>{activeJob.name}</CardTitle>
                    <CardDescription>
                      {activeJob.inputType === "name" ? "Name-based search" : "Role-based search"}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    {activeJob.status === ScrapeJobStatus.COMPLETED && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        <CheckCircle className="w-3.5 h-3.5" />
                        Completed
                      </span>
                    )}
                    {activeJob.status === ScrapeJobStatus.FAILED && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        <AlertCircle className="w-3.5 h-3.5" />
                        Failed
                      </span>
                    )}
                    {isProcessing && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        <Clock className="w-3.5 h-3.5 animate-pulse" />
                        Processing
                      </span>
                    )}
                    {isPaused && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        <Pause className="w-3.5 h-3.5" />
                        Paused
                      </span>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="space-y-4">
                  <div className="grid grid-cols-5 gap-4">
                    <div className="p-4 rounded-lg bg-muted/50">
                      <p className="text-sm text-muted-foreground">Total</p>
                      <p className="text-2xl font-semibold">{activeJob.totalRows}</p>
                    </div>
                    <div className="p-4 rounded-lg bg-muted/50">
                      <p className="text-sm text-muted-foreground">Processed</p>
                      <p className="text-2xl font-semibold">{activeJob.processedRows}</p>
                    </div>
                    <div className="p-4 rounded-lg bg-green-50">
                      <p className="text-sm text-green-700">Found</p>
                      <p className="text-2xl font-semibold text-green-700">{activeJob.successCount}</p>
                    </div>
                    <div className="p-4 rounded-lg bg-red-50">
                      <p className="text-sm text-red-700">Not Found</p>
                      <p className="text-2xl font-semibold text-red-700">{activeJob.errorCount}</p>
                    </div>
                    <div className="p-4 rounded-lg bg-primary/10">
                      <p className="text-sm text-primary">Hit Rate</p>
                      <p className="text-2xl font-semibold text-primary">
                        {activeJob.totalRows > 0
                          ? `${Math.round((activeJob.successCount / activeJob.totalRows) * 100)}%`
                          : '-'}
                      </p>
                    </div>
                  </div>

                  {isProcessing && (
                    <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-primary h-full transition-all duration-300"
                        style={{
                          width: `${(activeJob.processedRows / activeJob.totalRows) * 100}%`,
                        }}
                      />
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2">
                    {isJobComplete && (
                      <>
                        <Button onClick={() => handleDownload(false)}>
                          <Download className="w-4 h-4 mr-2" />
                          Download All
                        </Button>
                        {activeJob.successCount > 0 && (
                          <Button variant="outline" onClick={() => handleDownload(true)}>
                            <Download className="w-4 h-4 mr-2" />
                            Download Found Only
                          </Button>
                        )}
                      </>
                    )}
                    {activeJob.successCount > 0 && !activeJob.resultListId && (
                      <Button
                        variant="outline"
                        onClick={handleSyncToList}
                        disabled={syncJobMutation.isPending}
                      >
                        {syncJobMutation.isPending ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <ListPlus className="w-4 h-4 mr-2" />
                        )}
                        Sync to List
                      </Button>
                    )}
                    {activeJob.resultListId && (
                      <Button variant="outline" asChild>
                        <a href={`/dashboard/lists/${activeJob.resultListId}`}>
                          View in Lists
                        </a>
                      </Button>
                    )}
                    {isJobComplete && activeJob.errorCount > 0 && (
                      <Button
                        variant="outline"
                        onClick={() => setShowRerunModal(true)}
                      >
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Re-Run Not Found
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Role Analytics Card - only for role-based jobs */}
            {roleAnalytics && roleAnalytics.analytics.length > 0 && (
              <RoleAnalyticsCard
                analytics={roleAnalytics}
                selectedRole={roleFilter}
                onRoleSelect={(role) => {
                  setRoleFilter(role);
                  setResultsPage(1);
                }}
              />
            )}

            {activeJob.items && activeJob.items.length > 0 && (() => {
              const totalItems = filteredItems.length;
              const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
              const startIndex = (resultsPage - 1) * ITEMS_PER_PAGE;
              const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, totalItems);
              const paginatedItems = filteredItems.slice(startIndex, endIndex);

              return (
                <Card>
                  <CardHeader className="border-b">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>Results Preview</CardTitle>
                        <CardDescription>
                          Showing {totalItems > 0 ? startIndex + 1 : 0} to {endIndex} of {totalItems} results
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-4">
                        {/* Result Filter Tabs */}
                        <div className="flex items-center border rounded-lg overflow-hidden">
                          <button
                            onClick={() => { setResultFilter("all"); setResultsPage(1); }}
                            className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                              resultFilter === "all" ? "bg-primary text-primary-foreground" : "bg-background hover:bg-muted"
                            }`}
                          >
                            All ({activeJob.items.length})
                          </button>
                          <button
                            onClick={() => { setResultFilter("found"); setResultsPage(1); }}
                            className={`px-3 py-1.5 text-sm font-medium transition-colors border-l ${
                              resultFilter === "found" ? "bg-green-600 text-white" : "bg-background hover:bg-muted"
                            }`}
                          >
                            Found ({activeJob.successCount})
                          </button>
                          <button
                            onClick={() => { setResultFilter("not_found"); setResultsPage(1); }}
                            className={`px-3 py-1.5 text-sm font-medium transition-colors border-l ${
                              resultFilter === "not_found" ? "bg-red-600 text-white" : "bg-background hover:bg-muted"
                            }`}
                          >
                            Not Found ({activeJob.errorCount})
                          </button>
                        </div>

                        {totalPages > 1 && (
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">
                              Page {resultsPage} of {totalPages}
                            </span>
                            <div className="flex gap-1">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setResultsPage((p) => Math.max(1, p - 1))}
                                disabled={resultsPage <= 1}
                              >
                                <ChevronLeft className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setResultsPage((p) => Math.min(totalPages, p + 1))}
                                disabled={resultsPage >= totalPages}
                              >
                                <ChevronRight className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                      <table className="w-full text-sm">
                        <thead className="sticky top-0 bg-background">
                          <tr className="border-b">
                            <th className="text-left py-2 px-3 font-medium text-muted-foreground">#</th>
                            <th className="text-left py-2 px-3 font-medium text-muted-foreground">Input</th>
                            <th className="text-left py-2 px-3 font-medium text-muted-foreground">LinkedIn URL</th>
                            <th className="text-left py-2 px-3 font-medium text-muted-foreground">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {paginatedItems.map((item, index) => {
                            const inputData = item.inputData as Record<string, string>;
                            const inputDisplay = activeJob.inputType === "name"
                              ? `${inputData.first_name || ""} ${inputData.last_name || ""} ${inputData.company ? `@ ${inputData.company}` : ""}`
                              : `${inputData.role || ""} @ ${inputData.company || ""}`;

                            return (
                              <tr key={item.id} className="border-b">
                                <td className="py-2 px-3 text-muted-foreground">{startIndex + index + 1}</td>
                                <td className="py-2 px-3">{inputDisplay}</td>
                                <td className="py-2 px-3">
                                  {item.linkedinUrl ? (
                                    <a
                                      href={item.linkedinUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-primary hover:underline"
                                    >
                                      {item.linkedinUrl.replace("https://www.linkedin.com/in/", "").replace("/", "")}
                                    </a>
                                  ) : (
                                    <span className="text-muted-foreground">-</span>
                                  )}
                                </td>
                                <td className="py-2 px-3">
                                  {item.status === "completed" && (
                                    <span className="text-green-600">Found</span>
                                  )}
                                  {item.status === "no_result" && (
                                    <span className="text-yellow-600">Not Found</span>
                                  )}
                                  {item.status === "failed" && (
                                    <span className="text-red-600">Error</span>
                                  )}
                                  {(item.status === "pending" || item.status === "processing") && (
                                    <span className="text-blue-600">Pending</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              );
            })()}
          </>
        )}
      </div>

      {/* Re-run Modal */}
      {activeJob && (
        <RerunModal
          isOpen={showRerunModal}
          onClose={() => setShowRerunModal(false)}
          job={activeJob}
          onSuccess={(newJobId) => {
            setActiveJobId(newJobId);
            setShowOverlay(true);
            setResultsPage(1);
            setResultFilter("all");
          }}
        />
      )}
    </Page>
  );
}
