"use client";

import { useState } from "react";
import { Page } from "@/components/dashboard/Page";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useEnrichmentHistory } from "@/hooks/api/useEnrichment";
import { EnrichmentStatus } from "@shared/types/src";
import {
  Check,
  X,
  AlertCircle,
  Clock,
  ChevronLeft,
  ChevronRight,
  Mail,
  Phone,
  ExternalLink,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const statusConfig = {
  [EnrichmentStatus.COMPLETED]: {
    label: "Completed",
    icon: Check,
    className: "bg-green-100 text-green-800",
  },
  [EnrichmentStatus.NOT_FOUND]: {
    label: "Not Found",
    icon: X,
    className: "bg-yellow-100 text-yellow-800",
  },
  [EnrichmentStatus.ERROR]: {
    label: "Error",
    icon: AlertCircle,
    className: "bg-red-100 text-red-800",
  },
  [EnrichmentStatus.PENDING]: {
    label: "Pending",
    icon: Clock,
    className: "bg-blue-100 text-blue-800",
  },
};

export default function HistoryPage() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
  const limit = 20;

  const { data, isLoading } = useEnrichmentHistory({ page, limit, status: statusFilter });

  return (
    <Page
      title="Enrichment History"
      subtitle="View all your past enrichment requests"
    >
      <Card>
        <CardHeader className="border-b">
          <div className="flex items-center justify-between">
            <CardTitle>Recent Enrichments</CardTitle>
            <div className="flex gap-2">
              <select
                value={statusFilter || ""}
                onChange={(e) => {
                  setStatusFilter(e.target.value || undefined);
                  setPage(1);
                }}
                className="px-3 py-1.5 text-sm border border-border rounded-md bg-background"
              >
                <option value="">All Status</option>
                <option value="completed">Completed</option>
                <option value="not_found">Not Found</option>
                <option value="error">Error</option>
                <option value="pending">Pending</option>
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : data && data.data.length > 0 ? (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Name</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Contact</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Company</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Date</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">LinkedIn</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {data.data.map((enrichment) => {
                      const status =
                        statusConfig[enrichment.status as EnrichmentStatus] ||
                        statusConfig[EnrichmentStatus.PENDING];
                      const StatusIcon = status.icon;

                      return (
                        <tr key={enrichment.id} className="hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${status.className}`}
                            >
                              <StatusIcon className="w-3 h-3" />
                              {status.label}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {enrichment.firstName || enrichment.lastName ? (
                              <div>
                                <p className="font-medium">
                                  {[enrichment.firstName, enrichment.lastName]
                                    .filter(Boolean)
                                    .join(" ")}
                                </p>
                                {enrichment.title && (
                                  <p className="text-xs text-muted-foreground">{enrichment.title}</p>
                                )}
                              </div>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="space-y-1">
                              {enrichment.email && (
                                <div className="flex items-center gap-1.5 text-xs">
                                  <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                                  <a
                                    href={`mailto:${enrichment.email}`}
                                    className="text-primary hover:underline"
                                  >
                                    {enrichment.email}
                                  </a>
                                </div>
                              )}
                              {enrichment.mobile && (
                                <div className="flex items-center gap-1.5 text-xs">
                                  <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                                  <span>{enrichment.mobile}</span>
                                </div>
                              )}
                              {!enrichment.email && !enrichment.mobile && (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            {enrichment.companyName || enrichment.companyDomain ? (
                              <div>
                                <p>{enrichment.companyName || enrichment.companyDomain}</p>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground text-xs">
                            {formatDistanceToNow(new Date(enrichment.createdAt), { addSuffix: true })}
                          </td>
                          <td className="px-4 py-3">
                            <a
                              href={enrichment.linkedinUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-primary hover:underline text-xs"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              View
                            </a>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {data.pagination.totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-border">
                  <p className="text-sm text-muted-foreground">
                    Showing {(page - 1) * limit + 1} to{" "}
                    {Math.min(page * limit, data.pagination.total)} of {data.pagination.total}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={!data.pagination.hasPrevPage}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => p + 1)}
                      disabled={!data.pagination.hasNextPage}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-16 h-16 rounded-xl bg-muted flex items-center justify-center mb-4">
                <Clock className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="font-semibold mb-2">No Enrichments Yet</h3>
              <p className="text-sm text-muted-foreground max-w-xs">
                Your enrichment history will appear here once you start enriching LinkedIn profiles
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </Page>
  );
}
