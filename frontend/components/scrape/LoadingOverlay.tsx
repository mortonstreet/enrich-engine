"use client";

import { Loader2, Users } from "lucide-react";

interface LoadingOverlayProps {
  isVisible: boolean;
  totalItems: number;
  processedItems: number;
  foundCount: number;
  jobName?: string;
}

export function LoadingOverlay({
  isVisible,
  totalItems,
  processedItems,
  foundCount,
  jobName,
}: LoadingOverlayProps) {
  if (!isVisible) return null;

  const progress = totalItems > 0 ? (processedItems / totalItems) * 100 : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Blurred/fuzzy backdrop */}
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" />

      {/* Content */}
      <div className="relative z-10 bg-card border rounded-xl shadow-2xl p-8 max-w-md w-full mx-4">
        <div className="text-center space-y-6">
          {/* Animated loader */}
          <div className="relative mx-auto w-24 h-24">
            <div className="absolute inset-0 rounded-full border-4 border-muted" />
            <svg className="absolute inset-0 w-24 h-24 -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="46"
                fill="none"
                stroke="currentColor"
                strokeWidth="8"
                strokeLinecap="round"
                className="text-primary transition-all duration-300"
                style={{
                  strokeDasharray: `${progress * 2.89} 289`,
                }}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="w-10 h-10 animate-spin text-primary" />
            </div>
          </div>

          {/* Job name */}
          {jobName && (
            <p className="text-sm font-medium text-muted-foreground">{jobName}</p>
          )}

          {/* Progress text */}
          <div>
            <h3 className="text-lg font-semibold">Finding LinkedIn Profiles</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {processedItems} of {totalItems} processed
            </p>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
            <div
              className="bg-primary h-full transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Live counter */}
          <div className="flex items-center justify-center gap-3 py-4 bg-green-50 dark:bg-green-950/30 rounded-lg">
            <Users className="w-6 h-6 text-green-600" />
            <div className="text-left">
              <p className="text-2xl font-bold text-green-600 tabular-nums">
                {foundCount}
              </p>
              <p className="text-xs text-green-700 dark:text-green-500">
                leads discovered
              </p>
            </div>
          </div>

          {/* Tip */}
          <p className="text-xs text-muted-foreground">
            You can navigate away. The job will continue processing in the background.
          </p>
        </div>
      </div>
    </div>
  );
}
