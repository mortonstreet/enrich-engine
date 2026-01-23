"use client";

import { useState } from "react";
import { Page } from "@/components/dashboard/Page";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { CSVDropzone } from "@/components/enrichment/CSVDropzone";
import { BulkResultsTable } from "@/components/enrichment/BulkResultsTable";
import { useCreateBulkJob, useBulkJobStatus, downloadBulkJobCsv } from "@/hooks/api/useEnrichment";
import { toast } from "sonner";
import { Upload, Loader2, Download, CheckCircle, Clock, AlertCircle } from "lucide-react";
import { BulkJobStatus } from "@shared/types/src";

export default function BulkEnrichmentPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);

  const createJobMutation = useCreateBulkJob();
  const { data: jobStatus, isLoading: isLoadingStatus } = useBulkJobStatus(activeJobId ?? undefined, {
    polling: activeJobId !== null,
  });

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error("Please select a file");
      return;
    }

    try {
      const result = await createJobMutation.mutateAsync({
        file: selectedFile,
        enrichMobile: true,
      });
      setActiveJobId(result.job.id);
      toast.success("Bulk job created! Processing started.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create bulk job");
    }
  };

  const handleDownload = () => {
    if (activeJobId) {
      downloadBulkJobCsv(activeJobId);
    }
  };

  const isJobComplete = jobStatus?.job.status === BulkJobStatus.COMPLETED || jobStatus?.job.status === BulkJobStatus.FAILED;
  const isProcessing = jobStatus?.job.status === BulkJobStatus.PROCESSING || jobStatus?.job.status === BulkJobStatus.PENDING;

  return (
    <Page
      title="Bulk Enrichment"
      subtitle="Upload a CSV file to enrich multiple LinkedIn profiles at once"
    >
      <div className="space-y-6">
        {!activeJobId && (
          <Card>
            <CardHeader className="border-b">
              <CardTitle>Upload CSV</CardTitle>
              <CardDescription>
                Accepts two CSV formats: (1) LinkedIn URLs with a &quot;linkedin&quot; or &quot;url&quot; column, or (2) Company/role lookup with &quot;company&quot;/&quot;domain&quot; + &quot;role&quot;/&quot;role1&quot;/&quot;role2&quot; columns
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <CSVDropzone
                onFileSelect={handleFileSelect}
                disabled={createJobMutation.isPending}
              />

              <Button
                onClick={handleUpload}
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
                    Start Enrichment
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {activeJobId && (
          <>
            <Card>
              <CardHeader className="border-b">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Job Status</CardTitle>
                    <CardDescription>
                      {jobStatus?.job.originalFileName || "Processing..."}
                    </CardDescription>
                  </div>
                  {jobStatus && (
                    <div className="flex items-center gap-2">
                      {jobStatus.job.status === BulkJobStatus.COMPLETED && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          <CheckCircle className="w-3.5 h-3.5" />
                          Completed
                        </span>
                      )}
                      {jobStatus.job.status === BulkJobStatus.FAILED && (
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
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                {isLoadingStatus && !jobStatus ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                ) : jobStatus ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-4 gap-4">
                      <div className="p-4 rounded-lg bg-muted/50">
                        <p className="text-sm text-muted-foreground">Total</p>
                        <p className="text-2xl font-semibold">{jobStatus.job.totalRecords}</p>
                      </div>
                      <div className="p-4 rounded-lg bg-muted/50">
                        <p className="text-sm text-muted-foreground">Processed</p>
                        <p className="text-2xl font-semibold">{jobStatus.job.processedRecords}</p>
                      </div>
                      <div className="p-4 rounded-lg bg-green-50">
                        <p className="text-sm text-green-700">Matched</p>
                        <p className="text-2xl font-semibold text-green-700">{jobStatus.job.matchedRecords}</p>
                      </div>
                      <div className="p-4 rounded-lg bg-red-50">
                        <p className="text-sm text-red-700">Failed</p>
                        <p className="text-2xl font-semibold text-red-700">{jobStatus.job.failedRecords}</p>
                      </div>
                    </div>

                    {isProcessing && (
                      <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-primary h-full transition-all duration-300"
                          style={{
                            width: `${(jobStatus.job.processedRecords / jobStatus.job.totalRecords) * 100}%`,
                          }}
                        />
                      </div>
                    )}

                    <div className="flex gap-2">
                      {isJobComplete && (
                        <Button onClick={handleDownload}>
                          <Download className="w-4 h-4 mr-2" />
                          Download Results
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        onClick={() => {
                          setActiveJobId(null);
                          setSelectedFile(null);
                        }}
                      >
                        Start New Job
                      </Button>
                    </div>
                  </div>
                ) : null}
              </CardContent>
            </Card>

            {jobStatus && jobStatus.items.length > 0 && (
              <Card>
                <CardHeader className="border-b">
                  <CardTitle>Results</CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <BulkResultsTable items={jobStatus.items} />
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </Page>
  );
}
