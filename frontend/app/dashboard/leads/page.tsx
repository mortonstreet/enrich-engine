"use client";

import { useState } from "react";
import { Page } from "@/components/dashboard/Page";
import { AllLeadsTable } from "@/components/leads/AllLeadsTable";
import { LeadsBulkActionBar } from "@/components/leads/LeadsBulkActionBar";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/base-input";
import { useAllLeads } from "@/hooks/api/useLists";
import { useLeadSelection } from "@/hooks/useLeadSelection";
import { Loader2, Search, ChevronLeft, ChevronRight, Users, Filter, X } from "lucide-react";

type FilterValue = "all" | "yes" | "no";

export default function LeadsPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [hasEmailFilter, setHasEmailFilter] = useState<FilterValue>("all");
  const [hasPhoneFilter, setHasPhoneFilter] = useState<FilterValue>("all");
  const [hasLinkedinFilter, setHasLinkedinFilter] = useState<FilterValue>("all");
  const limit = 25;

  const selection = useLeadSelection();
  const { data, isLoading, refetch } = useAllLeads({
    search: search || undefined,
    page,
    limit,
    hasEmail: hasEmailFilter === "all" ? undefined : hasEmailFilter === "yes",
    hasPhone: hasPhoneFilter === "all" ? undefined : hasPhoneFilter === "yes",
    hasLinkedinUrl: hasLinkedinFilter === "all" ? undefined : hasLinkedinFilter === "yes",
  });

  const hasActiveFilters = hasEmailFilter !== "all" || hasPhoneFilter !== "all" || hasLinkedinFilter !== "all";

  const clearFilters = () => {
    setHasEmailFilter("all");
    setHasPhoneFilter("all");
    setHasLinkedinFilter("all");
    setPage(1);
  };

  const handleSearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  return (
    <Page title="Leads" subtitle="View and manage all your leads across all lists">
      {/* Search Bar */}
      <div className="flex items-center gap-4 mb-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search leads by name, email, company..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="text-sm text-muted-foreground">
          {data?.pagination?.total ?? 0} total leads
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium">Filters:</span>
        </div>

        <select
          value={hasEmailFilter}
          onChange={(e) => {
            setHasEmailFilter(e.target.value as FilterValue);
            setPage(1);
          }}
          className="text-sm border rounded-md px-3 py-1.5 bg-background"
        >
          <option value="all">Email: All</option>
          <option value="yes">Has Email</option>
          <option value="no">No Email</option>
        </select>

        <select
          value={hasPhoneFilter}
          onChange={(e) => {
            setHasPhoneFilter(e.target.value as FilterValue);
            setPage(1);
          }}
          className="text-sm border rounded-md px-3 py-1.5 bg-background"
        >
          <option value="all">Phone: All</option>
          <option value="yes">Has Phone</option>
          <option value="no">No Phone</option>
        </select>

        <select
          value={hasLinkedinFilter}
          onChange={(e) => {
            setHasLinkedinFilter(e.target.value as FilterValue);
            setPage(1);
          }}
          className="text-sm border rounded-md px-3 py-1.5 bg-background"
        >
          <option value="all">LinkedIn: All</option>
          <option value="yes">Has LinkedIn</option>
          <option value="no">No LinkedIn</option>
        </select>

        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="h-8 px-2 text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4 mr-1" />
            Clear
          </Button>
        )}
      </div>

      {/* Bulk Action Bar */}
      <div className="mb-4">
        <LeadsBulkActionBar
          selectedCount={selection.selectedCount}
          selectedIds={selection.selectedArray}
          onClear={selection.clearSelection}
          onSuccess={() => {
            refetch();
          }}
        />
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : data?.data?.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center border rounded-lg">
          <div className="w-16 h-16 rounded-xl bg-muted flex items-center justify-center mb-4">
            <Users className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="font-semibold mb-2">No leads found</h3>
          <p className="text-sm text-muted-foreground max-w-xs mb-4">
            {search
              ? "Try adjusting your search terms"
              : "Create a scrape job to generate leads, or upload a CSV to a list."}
          </p>
          {!search && (
            <Button asChild>
              <a href="/dashboard/scrape">Create Scrape Job</a>
            </Button>
          )}
        </div>
      ) : (
        <AllLeadsTable
          leads={data?.data ?? []}
          selectedIds={selection.selectedIds}
          onToggleSelection={selection.toggleSelection}
          onToggleAllOnPage={selection.toggleAllOnPage}
          isAllOnPageSelected={selection.isAllOnPageSelected}
          isSomeOnPageSelected={selection.isSomeOnPageSelected}
        />
      )}

      {/* Pagination */}
      {data?.pagination && data.pagination.totalPages > 1 && (
        <div className="flex items-center justify-between mt-6">
          <div className="text-sm text-muted-foreground">
            Showing {(page - 1) * limit + 1} -{" "}
            {Math.min(page * limit, data.pagination.total)} of{" "}
            {data.pagination.total} leads
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={!data.pagination.hasPrevPage}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!data.pagination.hasNextPage}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </Page>
  );
}
