"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/base-input";
import { ExternalLink, Play, Loader2, ArrowLeft } from "lucide-react";
import { CompanySearchPreviewItem } from "@shared/types/src";

interface ResultsPreviewProps {
  results: CompanySearchPreviewItem[];
  estimatedPages: number;
  searchQuery: string;
  naturalLanguageQuery: string;
  onStartScrape: (params: { maxPages: number; name?: string }) => void;
  onBack: () => void;
  isCreating: boolean;
}

export function ResultsPreview({
  results,
  estimatedPages,
  searchQuery,
  naturalLanguageQuery,
  onStartScrape,
  onBack,
  isCreating,
}: ResultsPreviewProps) {
  const [maxPages, setMaxPages] = useState(10);
  const [jobName, setJobName] = useState("");

  return (
    <div className="space-y-4">
      <div className="bg-card border rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-semibold">Preview Results</h3>
            <p className="text-sm text-muted-foreground">
              Found {results.length} companies on the first page. Estimated {estimatedPages}+ pages available.
            </p>
          </div>
        </div>

        {results.length > 0 ? (
          <div className="border rounded-lg overflow-hidden mb-4">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[400px]">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left text-sm font-medium text-muted-foreground px-4 py-2">#</th>
                    <th className="text-left text-sm font-medium text-muted-foreground px-4 py-2">Company</th>
                    <th className="text-left text-sm font-medium text-muted-foreground px-4 py-2 hidden sm:table-cell">Snippet</th>
                    <th className="text-right text-sm font-medium text-muted-foreground px-4 py-2">Link</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {results.map((result, idx) => (
                    <tr key={idx} className="hover:bg-muted/30">
                      <td className="px-4 py-2 text-sm text-muted-foreground">{result.position}</td>
                      <td className="px-4 py-2 text-sm font-medium">{result.companyName}</td>
                      <td className="px-4 py-2 text-sm text-muted-foreground hidden sm:table-cell max-w-xs truncate">
                        {result.snippet}
                      </td>
                      <td className="px-4 py-2 text-right">
                        {result.linkedinUrl && (
                          <a
                            href={result.linkedinUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline inline-flex items-center gap-1 text-sm"
                          >
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 space-y-3">
            <p className="text-muted-foreground">
              No LinkedIn company results found. Try adjusting the query.
            </p>
            <Button variant="outline" onClick={onBack}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Edit Query
            </Button>
          </div>
        )}
      </div>

      {results.length > 0 && (
        <div className="bg-card border rounded-xl p-6">
          <h3 className="text-base font-semibold mb-4">Start Full Scrape</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-1.5 block">
                Job Name (optional)
              </label>
              <Input
                value={jobName}
                onChange={(e) => setJobName(e.target.value)}
                placeholder="e.g. PE Firms - Industrials"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-1.5 block">
                Max Pages (~100 results per page)
              </label>
              <Input
                type="number"
                min={1}
                max={20}
                value={maxPages}
                onChange={(e) => setMaxPages(Math.min(20, Math.max(1, parseInt(e.target.value) || 1)))}
              />
            </div>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={onBack}>
              Back
            </Button>
            <Button
              onClick={() => onStartScrape({ maxPages, name: jobName || undefined })}
              disabled={isCreating}
            >
              {isCreating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating job...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  Start Full Scrape
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
