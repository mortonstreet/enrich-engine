"use client";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Loader2, ChevronRight, Building2 } from "lucide-react";
import { useCompanySearchJobs } from "@/hooks/api/useCompanySearch";
import { CompanySearchJobStatus, DBCompanySearchJob } from "@shared/types/src";

interface CompanySearchJobListProps {
  onSelectJob: (jobId: string) => void;
}

const statusVariants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "secondary",
  generating_query: "secondary",
  previewing: "secondary",
  scraping: "default",
  deduplicating: "default",
  completed: "outline",
  failed: "destructive",
};

const statusLabels: Record<string, string> = {
  pending: "Pending",
  generating_query: "Generating",
  previewing: "Previewing",
  scraping: "Scraping",
  deduplicating: "Deduplicating",
  completed: "Completed",
  failed: "Failed",
};

export function CompanySearchJobList({ onSelectJob }: CompanySearchJobListProps) {
  const { data, isLoading } = useCompanySearchJobs();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const jobs = data?.data || [];

  if (jobs.length === 0) {
    return null;
  }

  return (
    <div className="bg-card border rounded-xl">
      <div className="px-6 py-4 border-b">
        <h3 className="text-base font-semibold">Recent Company Searches</h3>
      </div>
      <div className="divide-y">
        {jobs.map((job: DBCompanySearchJob) => (
          <button
            key={job.id}
            onClick={() => onSelectJob(job.id)}
            className="w-full flex items-center gap-4 px-6 py-3 hover:bg-muted/30 transition-colors text-left"
          >
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Building2 className="w-4 h-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{job.name}</p>
              <p className="text-xs text-muted-foreground truncate">
                {job.naturalLanguageQuery}
              </p>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              {job.dedupedResultCount > 0 && (
                <span className="text-xs text-muted-foreground">
                  {job.dedupedResultCount} companies
                </span>
              )}
              <Badge variant={statusVariants[job.status] || "secondary"}>
                {statusLabels[job.status] || job.status}
              </Badge>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
