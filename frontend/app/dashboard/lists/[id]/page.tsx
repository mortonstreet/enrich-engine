"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Page } from "@/components/dashboard/Page";
import { useListDetail, useToggleFavorite, downloadListCsv } from "@/hooks/api/useLists";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/base-input";
import {
  ArrowLeft,
  Download,
  Star,
  Loader2,
  Search,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { LeadsTable } from "@/components/lists/LeadsTable";
import { ListImportStatus } from "@shared/types/src";

const statusConfig: Record<string, { label: string; className: string }> = {
  pending: { label: "Pending", className: "bg-yellow-100 text-yellow-800" },
  processing: { label: "Processing", className: "bg-blue-100 text-blue-800" },
  completed: { label: "Completed", className: "bg-green-100 text-green-800" },
  failed: { label: "Failed", className: "bg-red-100 text-red-800" },
};

export default function ListDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");

  const { data, isLoading, error } = useListDetail(id, {
    page,
    limit: 20,
    search: search || undefined,
  });

  const toggleFavorite = useToggleFavorite();

  const handleBack = () => {
    router.push("/dashboard/lists");
  };

  const handleExport = () => {
    downloadListCsv(id);
  };

  const handleFavoriteClick = () => {
    if (!data) return;
    toggleFavorite.mutate({
      listId: id,
      isFavorite: data.list.isFavorite ?? false,
    });
  };

  if (isLoading) {
    return (
      <Page title="Loading..." subtitle="">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </Page>
    );
  }

  if (error || !data) {
    return (
      <Page title="Error" subtitle="Failed to load list">
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            {error?.message || "List not found"}
          </p>
          <Button variant="outline" onClick={handleBack} className="mt-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Lists
          </Button>
        </div>
      </Page>
    );
  }

  const { list, leads, pagination } = data;
  const status = statusConfig[list.importStatus] ?? statusConfig.completed;

  return (
    <div className="mx-auto w-full max-w-7xl py-2 sm:py-4">
      {/* Header */}
      <header className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={handleBack}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">
                {list.name}
              </h1>
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${status.className}`}
              >
                {status.label}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleFavoriteClick}
              disabled={toggleFavorite.isPending}
            >
              <Star
                className={`w-4 h-4 ${
                  list.isFavorite
                    ? "fill-yellow-400 text-yellow-400"
                    : "text-muted-foreground"
                }`}
              />
            </Button>
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
        </div>
        {list.description && (
          <p className="text-sm text-muted-foreground mb-2">{list.description}</p>
        )}
        <p className="text-sm text-muted-foreground">
          {list.leadCount} leads
          {list.source === "scraped" && " • Scraped"}
          {list.source === "uploaded" && " • Uploaded"}
        </p>
      </header>

      {/* Search */}
      <div className="flex items-center gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search leads..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-9"
          />
        </div>
      </div>

      {/* Leads Table */}
      <LeadsTable leads={leads} listId={id} />

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between mt-6">
          <p className="text-sm text-muted-foreground">
            Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
            {Math.min(pagination.page * pagination.limit, pagination.total)} of{" "}
            {pagination.total} leads
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={pagination.page === 1}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm">
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
              disabled={pagination.page === pagination.totalPages}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
