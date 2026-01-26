"use client";

import { useState } from "react";
import { useListsForEnrichment } from "@/hooks/api/useEnrich";
import { useCopyGeneratorLists } from "@/hooks/api/useCopyGenerator";
import { Loader2, FileText, Check, Search } from "lucide-react";
import { EnrichmentFlowType } from "./EnrichmentTypeSelector";

interface ListSelectorProps {
  value: string | null;
  onChange: (listId: string, listName: string) => void;
  enrichmentType: EnrichmentFlowType;
}

export function ListSelector({ value, onChange, enrichmentType }: ListSelectorProps) {
  const [search, setSearch] = useState("");

  // Use different list sources based on enrichment type
  const { data: enrichListsData, isLoading: isLoadingEnrichLists, error: enrichListsError } =
    useListsForEnrichment();
  const { data: copyGenListsData, isLoading: isLoadingCopyGenLists, error: copyGenListsError } =
    useCopyGeneratorLists();

  const isLoading =
    enrichmentType === "first_line" ? isLoadingCopyGenLists : isLoadingEnrichLists;
  const error = enrichmentType === "first_line" ? copyGenListsError : enrichListsError;

  // Map lists to a common format
  // For email/phone enrichment, show leads with LinkedIn (enrichable) instead of total
  const lists =
    enrichmentType === "first_line"
      ? (copyGenListsData?.lists ?? []).map((l) => ({
          id: l.id,
          name: l.name,
          totalLeads: l.totalLeads,
          enrichableLeads: l.totalLeads, // All leads are enrichable for first line
          needsEnrichment:
            enrichmentType === "first_line" ? l.leadsWithoutFirstLine : 0,
          hasLinkedinColumn: true, // Not relevant for first line
        }))
      : (enrichListsData?.lists ?? []).map((l) => ({
          id: l.id,
          name: l.name,
          totalLeads: l.totalLeads,
          enrichableLeads: l.leadsWithLinkedinCount, // Only leads with LinkedIn profiles
          needsEnrichment:
            enrichmentType === "email"
              ? l.unenrichedEmailCount
              : l.unenrichedPhoneCount,
          hasLinkedinColumn: l.hasLinkedinColumn,
        }));

  const filteredLists = lists.filter((l) =>
    l.name.toLowerCase().includes(search.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Loading lists...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8 text-destructive">
        <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p className="font-medium">Failed to load lists</p>
        <p className="text-sm mt-1">{error.message}</p>
      </div>
    );
  }

  if (lists.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>No lists found. Create a list first to start enriching.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search lists..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2 text-sm rounded-md border border-input bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {/* Lists */}
      <div className="max-h-[300px] overflow-y-auto space-y-2 border rounded-lg p-2">
        {filteredLists.map((list) => {
          const isSelected = value === list.id;
          const hasIssue =
            enrichmentType !== "first_line" && !list.hasLinkedinColumn;

          return (
            <button
              key={list.id}
              type="button"
              onClick={() => onChange(list.id, list.name)}
              disabled={hasIssue}
              className={`
                w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left transition-all
                ${
                  isSelected
                    ? "bg-primary/10 border-2 border-primary"
                    : "bg-muted/50 border-2 border-transparent hover:bg-muted"
                }
                ${hasIssue ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
              `}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={`
                    w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0
                    ${isSelected ? "bg-primary text-primary-foreground" : "bg-background"}
                  `}
                >
                  {isSelected ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <FileText className="w-4 h-4 text-muted-foreground" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="font-medium truncate">{list.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {list.enrichableLeads} leads
                  </p>
                </div>
              </div>

              <div className="text-right flex-shrink-0 ml-4">
                {hasIssue ? (
                  <span className="text-xs text-orange-600">No LinkedIn</span>
                ) : list.needsEnrichment === 0 ? (
                  <span className="text-xs text-green-600">All enriched</span>
                ) : (
                  <span className="text-xs text-muted-foreground">
                    {list.needsEnrichment} to enrich
                  </span>
                )}
              </div>
            </button>
          );
        })}

        {filteredLists.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            No lists match your search.
          </p>
        )}
      </div>
    </div>
  );
}
