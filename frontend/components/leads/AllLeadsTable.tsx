"use client";

import Link from "next/link";
import { LeadWithListResponse } from "@shared/types/src";
import { Checkbox } from "@/components/ui/checkbox";
import { ExternalLink, Users } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface AllLeadsTableProps {
  leads: LeadWithListResponse[];
  selectedIds: Set<string>;
  onToggleSelection: (id: string) => void;
  onToggleAllOnPage: (ids: string[]) => void;
  isAllOnPageSelected: (ids: string[]) => boolean;
  isSomeOnPageSelected: (ids: string[]) => boolean;
}

export function AllLeadsTable({
  leads,
  selectedIds,
  onToggleSelection,
  onToggleAllOnPage,
  isAllOnPageSelected,
  isSomeOnPageSelected,
}: AllLeadsTableProps) {
  const leadIds = leads.map((l) => l.id);
  const allSelected = isAllOnPageSelected(leadIds);
  const someSelected = isSomeOnPageSelected(leadIds);

  const formatRelativeDate = (date: string) => {
    try {
      return formatDistanceToNow(new Date(date), { addSuffix: true });
    } catch {
      return new Date(date).toLocaleDateString();
    }
  };

  if (leads.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center border rounded-lg">
        <div className="w-16 h-16 rounded-xl bg-muted flex items-center justify-center mb-4">
          <Users className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="font-semibold mb-2">No leads yet</h3>
        <p className="text-sm text-muted-foreground max-w-xs">
          Create a scrape job to generate leads, or upload a CSV to a list.
        </p>
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-muted/50 border-b">
            <tr>
              <th className="w-12 px-4 py-3">
                <Checkbox
                  checked={allSelected ? true : someSelected ? "indeterminate" : false}
                  onCheckedChange={() => onToggleAllOnPage(leadIds)}
                />
              </th>
              <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">
                Name
              </th>
              <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">
                Company
              </th>
              <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3 hidden md:table-cell">
                Email
              </th>
              <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3 hidden lg:table-cell">
                List
              </th>
              <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3 hidden xl:table-cell">
                Created
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {leads.map((lead) => {
              const fullName =
                lead.firstName || lead.lastName
                  ? `${lead.firstName || ""} ${lead.lastName || ""}`.trim()
                  : "-";
              const isSelected = selectedIds.has(lead.id);

              return (
                <tr
                  key={lead.id}
                  className={`hover:bg-muted/50 transition-colors ${isSelected ? "bg-muted/30" : ""}`}
                >
                  <td className="px-4 py-3">
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => onToggleSelection(lead.id)}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{fullName}</span>
                      {lead.linkedinUrl && (
                        <a
                          href={lead.linkedinUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-muted-foreground hover:text-foreground"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                    {lead.role && (
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {lead.role}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-muted-foreground">
                      {lead.company || "-"}
                    </span>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className="text-sm text-muted-foreground">
                      {lead.email || "-"}
                    </span>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <Link
                      href={`/dashboard/lists/${lead.listId}`}
                      className="text-sm text-primary hover:underline"
                    >
                      {lead.listName}
                    </Link>
                  </td>
                  <td className="px-4 py-3 hidden xl:table-cell">
                    <span className="text-sm text-muted-foreground">
                      {formatRelativeDate(lead.createdAt)}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
