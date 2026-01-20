"use client";

import { useState } from "react";
import { RoleConfig, ScrapeWorkflowType } from "@shared/types/src";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/base-input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { ScrapeDropzone } from "@/components/scrape/ScrapeDropzone";
import { RoleConfigBuilder } from "@/components/scrape/RoleConfigBuilder";
import { ArrowLeft, Upload, Loader2, AlertCircle, CheckCircle } from "lucide-react";

interface CompanyCsvFlowProps {
  onBack: () => void;
  onSubmit: (data: {
    file: File;
    name?: string;
    workflowType: ScrapeWorkflowType;
    roleConfigs: RoleConfig[];
  }) => Promise<void>;
  isSubmitting: boolean;
}

export function CompanyCsvFlow({ onBack, onSubmit, isSubmitting }: CompanyCsvFlowProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [jobName, setJobName] = useState("");
  const [roleConfigs, setRoleConfigs] = useState<RoleConfig[]>([
    { roleName: "CEO", count: 1 },
    { roleName: "Founder", count: 2 },
  ]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [rowCount, setRowCount] = useState<number | null>(null);

  const handleFileSelect = async (file: File) => {
    setSelectedFile(file);
    setParseError(null);
    setRowCount(null);

    // Parse CSV to validate and count rows
    try {
      const text = await file.text();
      const lines = text.trim().split("\n");
      if (lines.length < 2) {
        setParseError("CSV must have at least a header row and one data row");
        return;
      }

      const headers = lines[0].toLowerCase().split(",").map((h) => h.trim());
      if (!headers.includes("company")) {
        setParseError("CSV must have a 'company' column");
        return;
      }

      setRowCount(lines.length - 1); // Exclude header
    } catch {
      setParseError("Failed to parse CSV file");
    }
  };

  const handleSubmit = async () => {
    if (!selectedFile) return;
    if (roleConfigs.length === 0) return;
    if (roleConfigs.some((c) => !c.roleName.trim())) return;

    await onSubmit({
      file: selectedFile,
      name: jobName || undefined,
      workflowType: ScrapeWorkflowType.COMPANY_CSV,
      roleConfigs,
    });
  };

  const isValid =
    selectedFile &&
    !parseError &&
    roleConfigs.length > 0 &&
    roleConfigs.every((c) => c.roleName.trim());

  const totalSearches = rowCount
    ? rowCount * roleConfigs.reduce((sum, c) => sum + c.count, 0)
    : 0;

  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={onBack} className="mb-2">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Workflow Selection
      </Button>

      <Card>
        <CardHeader className="border-b">
          <CardTitle>Company CSV Upload</CardTitle>
          <CardDescription>
            Upload a CSV with company names. We'll find people matching your specified roles at each company.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
          {/* Step 1: File Upload */}
          <div className="space-y-2">
            <label className="text-sm font-medium">1. Upload Company List</label>
            <ScrapeDropzone onFileSelect={handleFileSelect} disabled={isSubmitting} />

            {parseError && (
              <div className="flex items-center gap-2 text-sm text-destructive">
                <AlertCircle className="w-4 h-4" />
                {parseError}
              </div>
            )}

            {rowCount && !parseError && (
              <div className="flex items-center gap-2 text-sm text-green-600">
                <CheckCircle className="w-4 h-4" />
                Found {rowCount} companies
              </div>
            )}
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
              placeholder="e.g., Q1 Tech Startups"
              disabled={isSubmitting}
            />
          </div>

          {/* Preview */}
          {isValid && rowCount && (
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
              <h4 className="font-medium text-sm mb-2">Preview</h4>
              <p className="text-sm text-muted-foreground">
                This job will search for{" "}
                <span className="font-medium text-foreground">{totalSearches}</span> people across{" "}
                <span className="font-medium text-foreground">{rowCount}</span> companies.
              </p>
              <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                {roleConfigs.map((config, i) => (
                  <li key={i}>
                    &bull; {config.count} {config.roleName}{config.count > 1 ? "s" : ""} per company
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
                <Upload className="w-4 h-4 mr-2" />
                Start Scraping {totalSearches > 0 ? `(${totalSearches} searches)` : ""}
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
