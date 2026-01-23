"use client";

import { DBBulkEnrichmentItem, BulkItemStatus } from "@shared/types/src";
import { Check, X, AlertCircle, Clock, ExternalLink, Search } from "lucide-react";

interface BulkResultsTableProps {
  items: DBBulkEnrichmentItem[];
}

const statusConfig = {
  [BulkItemStatus.MATCHED]: {
    label: "Matched",
    icon: Check,
    className: "text-green-600",
  },
  [BulkItemStatus.NOT_MATCHED]: {
    label: "Not Found",
    icon: X,
    className: "text-yellow-600",
  },
  [BulkItemStatus.ERROR]: {
    label: "Error",
    icon: AlertCircle,
    className: "text-red-600",
  },
  [BulkItemStatus.PENDING]: {
    label: "Pending",
    icon: Clock,
    className: "text-muted-foreground",
  },
  [BulkItemStatus.SEARCHING]: {
    label: "Searching",
    icon: Search,
    className: "text-blue-600",
  },
};

export function BulkResultsTable({ items }: BulkResultsTableProps) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50">
          <tr>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Identifier</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Name</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Email</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Mobile</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Company</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">LinkedIn</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {items.map((item) => {
            const status = statusConfig[item.status as BulkItemStatus] || statusConfig[BulkItemStatus.PENDING];
            const StatusIcon = status.icon;

            return (
              <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center gap-1.5 ${status.className}`}>
                    <StatusIcon className="w-4 h-4" />
                    <span className="text-xs">{status.label}</span>
                  </span>
                </td>
                <td className="px-4 py-3 font-medium">{item.identifier}</td>
                <td className="px-4 py-3">
                  {item.firstName || item.lastName
                    ? [item.firstName, item.lastName].filter(Boolean).join(" ")
                    : "-"}
                </td>
                <td className="px-4 py-3">
                  {item.email ? (
                    <a
                      href={`mailto:${item.email}`}
                      className="text-primary hover:underline"
                    >
                      {item.email}
                    </a>
                  ) : (
                    "-"
                  )}
                </td>
                <td className="px-4 py-3">{item.mobile || "-"}</td>
                <td className="px-4 py-3">
                  <div>
                    <p>{item.companyName || "-"}</p>
                    {item.title && (
                      <p className="text-xs text-muted-foreground">{item.title}</p>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  {item.linkedinUrl ? (
                    <a
                      href={item.linkedinUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-primary hover:underline"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  ) : (
                    "-"
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {items.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          No items to display
        </div>
      )}
    </div>
  );
}
