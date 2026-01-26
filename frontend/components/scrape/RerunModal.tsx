"use client";

import { useState } from "react";
import { RoleConfig, ScrapeJobDetailResponse } from "@shared/types/src";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/base-input";
import { RoleConfigBuilder } from "@/components/scrape/RoleConfigBuilder";
import { useCreateRerunJob } from "@/hooks/api/useScrape";
import { toast } from "sonner";
import { Loader2, RefreshCw, AlertCircle } from "lucide-react";

interface RerunModalProps {
  isOpen: boolean;
  onClose: () => void;
  job: ScrapeJobDetailResponse;
  onSuccess?: (newJobId: string) => void;
}

export function RerunModal({ isOpen, onClose, job, onSuccess }: RerunModalProps) {
  const [name, setName] = useState(`${job.name} - Re-run`);
  const [roleConfigs, setRoleConfigs] = useState<RoleConfig[]>([
    { roleName: "", count: 1 },
  ]);

  const createRerunMutation = useCreateRerunJob();

  const handleSubmit = async () => {
    // Validate role configs
    const validRoles = roleConfigs.filter((r) => r.roleName.trim() !== "");
    if (validRoles.length === 0) {
      toast.error("Please add at least one role");
      return;
    }

    try {
      const result = await createRerunMutation.mutateAsync({
        sourceJobId: job.id,
        name: name.trim() || undefined,
        roleConfigs: validRoles,
      });

      toast.success(result.message);
      onClose();
      onSuccess?.(result.job.id);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create re-run job");
    }
  };

  const notFoundCount = job.errorCount;

  // Estimate unique companies (rough approximation)
  const uniqueCompanies = new Set(
    job.items
      ?.filter((item) => item.status === "no_result" || item.status === "failed")
      .map((item) => (item.inputData as Record<string, string>).company)
      .filter(Boolean)
  ).size;

  const estimatedItems = uniqueCompanies * roleConfigs.reduce((sum, r) => sum + r.count, 0);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="w-5 h-5" />
            Re-Run Not Found Items
          </DialogTitle>
          <DialogDescription>
            Try different roles to find profiles for companies that didn't have matches.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Info banner */}
          <div className="flex items-start gap-3 p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-amber-800 dark:text-amber-200">
                {notFoundCount} items not found
              </p>
              <p className="text-amber-700 dark:text-amber-300">
                from approximately {uniqueCompanies} unique companies
              </p>
            </div>
          </div>

          {/* Job name */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Job Name</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter a name for the re-run job"
            />
          </div>

          {/* Role config builder */}
          <RoleConfigBuilder
            roleConfigs={roleConfigs}
            onChange={setRoleConfigs}
            maxRoles={10}
            maxCountPerRole={5}
          />

          {/* Estimate */}
          {roleConfigs.some((r) => r.roleName.trim()) && (
            <div className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">
              This will create approximately <span className="font-medium">{estimatedItems}</span> new search items
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={createRerunMutation.isPending || roleConfigs.every((r) => !r.roleName.trim())}
          >
            {createRerunMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                Start Re-Run
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
