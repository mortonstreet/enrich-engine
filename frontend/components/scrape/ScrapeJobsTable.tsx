"use client";

import { useState, useEffect, useRef } from "react";
import { DBScrapeJob, ScrapeJobStatus } from "@shared/types/src";
import { CheckCircle, Clock, AlertCircle, Loader2, Download, Trash2, ExternalLink, Pause, Play, Pencil, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/base-input";
import { downloadScrapeResults, useDeleteScrapeJob, usePauseScrapeJob, useResumeScrapeJob, useRenameScrapeJob } from "@/hooks/api/useScrape";
import { toast } from "sonner";
import Link from "next/link";

interface ScrapeJobsTableProps {
  jobs: DBScrapeJob[];
  onJobSelect?: (jobId: string) => void;
}

export function ScrapeJobsTable({ jobs, onJobSelect }: ScrapeJobsTableProps) {
  const [renamingJobId, setRenamingJobId] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState<string | null>(null);
  const tableRef = useRef<HTMLDivElement>(null);

  const deleteMutation = useDeleteScrapeJob();
  const pauseMutation = usePauseScrapeJob();
  const resumeMutation = useResumeScrapeJob();
  const renameMutation = useRenameScrapeJob();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (tableRef.current && !tableRef.current.contains(event.target as Node)) {
        setDropdownOpen(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleDelete = async (jobId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Are you sure you want to delete this job?")) {
      try {
        await deleteMutation.mutateAsync(jobId);
        toast.success("Job deleted successfully");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to delete job");
      }
    }
  };

  const handleDownload = (jobId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    downloadScrapeResults(jobId, true);
  };

  const handlePause = async (jobId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await pauseMutation.mutateAsync(jobId);
      toast.success("Scrape job paused");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to pause job");
    }
  };

  const handleResume = async (jobId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await resumeMutation.mutateAsync(jobId);
      toast.success("Scrape job resumed");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to resume job");
    }
  };

  const handleStartRename = (job: DBScrapeJob, e: React.MouseEvent) => {
    e.stopPropagation();
    setRenamingJobId(job.id);
    setNewName(job.name);
    setDropdownOpen(null);
  };

  const handleRename = async (jobId: string, e?: React.FormEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    if (!newName.trim()) {
      toast.error("Name cannot be empty");
      return;
    }
    try {
      await renameMutation.mutateAsync({ jobId, name: newName.trim() });
      toast.success("Campaign renamed");
      setRenamingJobId(null);
      setNewName("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to rename campaign");
    }
  };

  const handleCancelRename = (e: React.MouseEvent) => {
    e.stopPropagation();
    setRenamingJobId(null);
    setNewName("");
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case ScrapeJobStatus.COMPLETED:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <CheckCircle className="w-3.5 h-3.5" />
            Completed
          </span>
        );
      case ScrapeJobStatus.FAILED:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <AlertCircle className="w-3.5 h-3.5" />
            Failed
          </span>
        );
      case ScrapeJobStatus.PROCESSING:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            Processing
          </span>
        );
      case ScrapeJobStatus.PENDING:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            <Clock className="w-3.5 h-3.5" />
            Pending
          </span>
        );
      case ScrapeJobStatus.PAUSED:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
            <Pause className="w-3.5 h-3.5" />
            Paused
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            {status}
          </span>
        );
    }
  };

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (jobs.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No scrape jobs yet. Upload a CSV to get started.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto" ref={tableRef}>
      <table className="w-full">
        <thead>
          <tr className="border-b">
            <th className="text-left py-3 px-4 font-medium text-sm text-muted-foreground">Name</th>
            <th className="text-left py-3 px-4 font-medium text-sm text-muted-foreground">Status</th>
            <th className="text-left py-3 px-4 font-medium text-sm text-muted-foreground">Progress</th>
            <th className="text-left py-3 px-4 font-medium text-sm text-muted-foreground">Success</th>
            <th className="text-left py-3 px-4 font-medium text-sm text-muted-foreground">Hit Rate</th>
            <th className="text-left py-3 px-4 font-medium text-sm text-muted-foreground">Errors</th>
            <th className="text-left py-3 px-4 font-medium text-sm text-muted-foreground">Created</th>
            <th className="text-right py-3 px-4 font-medium text-sm text-muted-foreground">Actions</th>
          </tr>
        </thead>
        <tbody>
          {jobs.map((job) => (
            <tr
              key={job.id}
              className="border-b hover:bg-muted/50 cursor-pointer"
              onClick={() => onJobSelect?.(job.id)}
            >
              <td className="py-3 px-4">
                {renamingJobId === job.id ? (
                  <form
                    onSubmit={(e) => handleRename(job.id, e)}
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center gap-2"
                  >
                    <Input
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      className="h-8 w-48"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === "Escape") {
                          handleCancelRename(e as unknown as React.MouseEvent);
                        }
                      }}
                    />
                    <Button
                      type="submit"
                      size="sm"
                      disabled={renameMutation.isPending}
                      className="h-8"
                    >
                      {renameMutation.isPending ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        "Save"
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleCancelRename}
                      className="h-8"
                    >
                      Cancel
                    </Button>
                  </form>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{job.name}</span>
                    {job.resultListId && (
                      <Link
                        href={`/dashboard/lists/${job.resultListId}`}
                        onClick={(e) => e.stopPropagation()}
                        className="text-primary hover:underline"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Link>
                    )}
                  </div>
                )}
              </td>
              <td className="py-3 px-4">{getStatusBadge(job.status)}</td>
              <td className="py-3 px-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm">
                    {job.processedRows}/{job.totalRows}
                  </span>
                  {job.status === ScrapeJobStatus.PROCESSING && (
                    <div className="w-20 h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all"
                        style={{
                          width: `${(job.processedRows / job.totalRows) * 100}%`,
                        }}
                      />
                    </div>
                  )}
                </div>
              </td>
              <td className="py-3 px-4">
                <span className="text-green-600 font-medium">{job.successCount}</span>
              </td>
              <td className="py-3 px-4">
                {job.totalRows > 0 ? (
                  <span className={`font-medium ${
                    Math.round((job.successCount / job.totalRows) * 100) > 70
                      ? "text-green-600"
                      : Math.round((job.successCount / job.totalRows) * 100) >= 40
                        ? "text-yellow-600"
                        : "text-red-600"
                  }`}>
                    {Math.round((job.successCount / job.totalRows) * 100)}%
                  </span>
                ) : (
                  <span className="text-muted-foreground">-</span>
                )}
              </td>
              <td className="py-3 px-4">
                <span className="text-red-600 font-medium">{job.errorCount}</span>
              </td>
              <td className="py-3 px-4 text-sm text-muted-foreground">
                {formatDate(job.createdAt)}
              </td>
              <td className="py-3 px-4">
                <div className="flex items-center justify-end gap-2">
                  {(job.status === ScrapeJobStatus.PROCESSING || job.status === ScrapeJobStatus.PENDING) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => handlePause(job.id, e)}
                      disabled={pauseMutation.isPending}
                      title="Pause"
                    >
                      <Pause className="w-4 h-4" />
                    </Button>
                  )}
                  {job.status === ScrapeJobStatus.PAUSED && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => handleResume(job.id, e)}
                      disabled={resumeMutation.isPending}
                      title="Resume"
                    >
                      <Play className="w-4 h-4" />
                    </Button>
                  )}
                  {(job.status === ScrapeJobStatus.COMPLETED || job.status === ScrapeJobStatus.PAUSED) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => handleDownload(job.id, e)}
                      title="Download"
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                  )}
                  {/* Dropdown menu for more actions */}
                  <div className="relative">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDropdownOpen(dropdownOpen === job.id ? null : job.id);
                      }}
                      title="More actions"
                    >
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                    {dropdownOpen === job.id && (
                      <div
                        className="absolute right-0 top-full mt-1 w-40 rounded-md border bg-popover shadow-lg z-50"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="py-1">
                          <button
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition-colors"
                            onClick={(e) => handleStartRename(job, e)}
                          >
                            <Pencil className="w-4 h-4" />
                            Rename
                          </button>
                          {job.status !== ScrapeJobStatus.PROCESSING && (
                            <button
                              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-muted transition-colors"
                              onClick={(e) => {
                                setDropdownOpen(null);
                                handleDelete(job.id, e);
                              }}
                              disabled={deleteMutation.isPending}
                            >
                              <Trash2 className="w-4 h-4" />
                              Delete
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
