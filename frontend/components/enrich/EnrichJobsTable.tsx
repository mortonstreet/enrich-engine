"use client";

import { ListEnrichmentJobResponse, ListEnrichmentJobStatusEnum } from "@shared/types/src";
import { Button } from "@/components/ui/Button";
import { Download, Trash2, Loader2, CheckCircle, Clock, AlertCircle, XCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { downloadEnrichmentResults, useDeleteEnrichmentJob } from "@/hooks/api/useEnrich";
import { toast } from "sonner";

interface EnrichJobsTableProps {
  jobs: ListEnrichmentJobResponse[];
  onViewJob?: (jobId: string) => void;
}

const statusConfig: Record<ListEnrichmentJobStatusEnum, { icon: typeof Clock; className: string; label: string; animate?: boolean }> = {
  [ListEnrichmentJobStatusEnum.PENDING]: {
    icon: Clock,
    className: "bg-yellow-100 text-yellow-800",
    label: "Pending",
  },
  [ListEnrichmentJobStatusEnum.PROCESSING]: {
    icon: Loader2,
    className: "bg-blue-100 text-blue-800",
    label: "Processing",
    animate: true,
  },
  [ListEnrichmentJobStatusEnum.COMPLETED]: {
    icon: CheckCircle,
    className: "bg-green-100 text-green-800",
    label: "Completed",
  },
  [ListEnrichmentJobStatusEnum.FAILED]: {
    icon: XCircle,
    className: "bg-red-100 text-red-800",
    label: "Failed",
  },
};

export function EnrichJobsTable({ jobs, onViewJob }: EnrichJobsTableProps) {
  const deleteJobMutation = useDeleteEnrichmentJob();

  const handleDownload = (jobId: string) => {
    downloadEnrichmentResults(jobId);
  };

  const handleDelete = async (jobId: string) => {
    try {
      await deleteJobMutation.mutateAsync(jobId);
      toast.success("Job deleted");
    } catch (error) {
      toast.error("Failed to delete job");
    }
  };

  if (jobs.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No enrichment jobs yet. Start by selecting a list above.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b">
            <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">List</th>
            <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Type</th>
            <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Status</th>
            <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Progress</th>
            <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Created</th>
            <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Actions</th>
          </tr>
        </thead>
        <tbody>
          {jobs.map((job) => {
            const status = statusConfig[job.status as ListEnrichmentJobStatusEnum] || statusConfig.pending;
            const StatusIcon = status.icon;
            const progress = job.totalRows > 0
              ? Math.round((job.processedRows / job.totalRows) * 100)
              : 0;

            return (
              <tr
                key={job.id}
                className="border-b hover:bg-muted/50 cursor-pointer"
                onClick={() => onViewJob?.(job.id)}
              >
                <td className="py-3 px-4">
                  <span className="font-medium">{job.listName}</span>
                </td>
                <td className="py-3 px-4">
                  <span className="capitalize">{job.enrichmentType}</span>
                </td>
                <td className="py-3 px-4">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${status.className}`}>
                    <StatusIcon className={`w-3.5 h-3.5 ${status.animate ? 'animate-spin' : ''}`} />
                    {status.label}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    <div className="w-24 bg-muted rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-primary h-full transition-all duration-300"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {job.processedRows}/{job.totalRows}
                    </span>
                  </div>
                </td>
                <td className="py-3 px-4 text-sm text-muted-foreground">
                  {formatDistanceToNow(new Date(job.createdAt), { addSuffix: true })}
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                    {job.status === ListEnrichmentJobStatusEnum.COMPLETED && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDownload(job.id)}
                        title="Download results"
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(job.id)}
                      disabled={deleteJobMutation.isPending}
                      title="Delete job"
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
