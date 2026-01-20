"use client";

import { useState } from "react";
import { RoleConfig, ScrapeWorkflowType } from "@shared/types/src";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/base-input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { RoleConfigBuilder } from "@/components/scrape/RoleConfigBuilder";
import { ArrowLeft, Search, Loader2, LinkIcon } from "lucide-react";

interface SingleUrlFlowProps {
  onBack: () => void;
  onSubmit: (data: {
    sourceUrl: string;
    name?: string;
    workflowType: ScrapeWorkflowType;
    roleConfigs: RoleConfig[];
  }) => Promise<void>;
  isSubmitting: boolean;
}

export function SingleUrlFlow({ onBack, onSubmit, isSubmitting }: SingleUrlFlowProps) {
  const [sourceUrl, setSourceUrl] = useState("");
  const [jobName, setJobName] = useState("");
  const [roleConfigs, setRoleConfigs] = useState<RoleConfig[]>([
    { roleName: "CEO", count: 1 },
    { roleName: "CTO", count: 1 },
  ]);

  const handleSubmit = async () => {
    if (!sourceUrl.trim()) return;
    if (roleConfigs.length === 0) return;
    if (roleConfigs.some((c) => !c.roleName.trim())) return;

    await onSubmit({
      sourceUrl: sourceUrl.trim(),
      name: jobName || undefined,
      workflowType: ScrapeWorkflowType.SINGLE_URL,
      roleConfigs,
    });
  };

  const isValidUrl = (url: string) => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const isValid =
    sourceUrl.trim() &&
    isValidUrl(sourceUrl.trim()) &&
    roleConfigs.length > 0 &&
    roleConfigs.every((c) => c.roleName.trim());

  const totalSearches = roleConfigs.reduce((sum, c) => sum + c.count, 0);

  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={onBack} className="mb-2">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Workflow Selection
      </Button>

      <Card>
        <CardHeader className="border-b">
          <CardTitle>Single URL Scrape</CardTitle>
          <CardDescription>
            Enter a company's website or LinkedIn page URL. We'll find people matching your specified roles.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
          {/* Step 1: URL Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium">1. Enter Company URL</label>
            <div className="relative">
              <LinkIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={sourceUrl}
                onChange={(e) => setSourceUrl(e.target.value)}
                placeholder="https://company.com or https://linkedin.com/company/..."
                className="pl-10"
                disabled={isSubmitting}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Paste a company website URL or LinkedIn company page
            </p>
          </div>

          {/* Step 2: Role Configuration */}
          <div className="space-y-2">
            <label className="text-sm font-medium">2. Configure Roles to Find</label>
            <RoleConfigBuilder roleConfigs={roleConfigs} onChange={setRoleConfigs} />
          </div>

          {/* Step 3: Job Name (optional) */}
          <div className="space-y-2">
            <label className="text-sm font-medium">3. Job Name (optional)</label>
            <Input
              value={jobName}
              onChange={(e) => setJobName(e.target.value)}
              placeholder="e.g., Acme Corp Leadership"
              disabled={isSubmitting}
            />
          </div>

          {/* Preview */}
          {isValid && (
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
              <h4 className="font-medium text-sm mb-2">Preview</h4>
              <p className="text-sm text-muted-foreground">
                This job will search for{" "}
                <span className="font-medium text-foreground">{totalSearches}</span> people at this company.
              </p>
              <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                {roleConfigs.map((config, i) => (
                  <li key={i}>
                    &bull; {config.count} {config.roleName}{config.count > 1 ? "s" : ""}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Submit Button */}
          <Button
            onClick={handleSubmit}
            disabled={!isValid || isSubmitting}
            className="w-full"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating Job...
              </>
            ) : (
              <>
                <Search className="w-4 h-4 mr-2" />
                Start Scraping {totalSearches > 0 ? `(${totalSearches} searches)` : ""}
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
