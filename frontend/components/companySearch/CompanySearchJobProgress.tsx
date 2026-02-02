"use client";

import { Progress } from "@/components/ui/Progress";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { CompanySearchJobStatus, DBCompanySearchJob } from "@shared/types/src";

interface CompanySearchJobProgressProps {
  job: DBCompanySearchJob;
}

const statusLabels: Record<string, string> = {
  pending: "Waiting to start...",
  generating_query: "Generating search query...",
  previewing: "Previewing results...",
  scraping: "Scraping pages...",
  deduplicating: "Deduplicating results...",
  completed: "Completed",
  failed: "Failed",
};

export function CompanySearchJobProgress({ job }: CompanySearchJobProgressProps) {
  const isActive = [
    CompanySearchJobStatus.PENDING,
    CompanySearchJobStatus.SCRAPING,
    CompanySearchJobStatus.DEDUPLICATING,
  ].includes(job.status as CompanySearchJobStatus);

  const isCompleted = job.status === CompanySearchJobStatus.COMPLETED;
  const isFailed = job.status === CompanySearchJobStatus.FAILED;

  const progressValue = job.totalPages > 0
    ? Math.round((job.scrapedPages / job.totalPages) * 100)
    : 0;

  return (
    <div className="bg-card border rounded-xl p-6">
      <div className="flex items-center gap-3 mb-4">
        {isActive && <Loader2 className="w-5 h-5 animate-spin text-primary" />}
        {isCompleted && <CheckCircle2 className="w-5 h-5 text-green-500" />}
        {isFailed && <XCircle className="w-5 h-5 text-destructive" />}
        <div>
          <h3 className="text-base font-semibold">{job.name}</h3>
          <p className="text-sm text-muted-foreground">
            {statusLabels[job.status] || job.status}
          </p>
        </div>
      </div>

      {job.status === CompanySearchJobStatus.SCRAPING && (
        <div className="space-y-2">
          <Progress value={progressValue} className="h-2" />
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Page {job.scrapedPages} of {job.maxPages || job.totalPages}</span>
            <span>{progressValue}%</span>
          </div>
        </div>
      )}

      {isCompleted && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-2">
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <p className="text-lg font-semibold">{job.scrapedPages}</p>
            <p className="text-xs text-muted-foreground">Pages Scraped</p>
          </div>
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <p className="text-lg font-semibold">{job.rawResultCount}</p>
            <p className="text-xs text-muted-foreground">Raw Results</p>
          </div>
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <p className="text-lg font-semibold">{job.dedupedResultCount}</p>
            <p className="text-xs text-muted-foreground">Unique Companies</p>
          </div>
        </div>
      )}

      {isFailed && job.errorMessage && (
        <p className="text-sm text-destructive mt-2">{job.errorMessage}</p>
      )}
    </div>
  );
}
