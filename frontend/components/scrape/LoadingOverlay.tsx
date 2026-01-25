"use client";

import { Loader2, Users, X } from "lucide-react";

interface LoadingOverlayProps {
  isVisible: boolean;
  totalItems: number;
  processedItems: number;
  foundCount: number;
  jobName?: string;
  onClose?: () => void;
}

export function LoadingOverlay({
  isVisible,
  totalItems,
  processedItems,
  foundCount,
  jobName,
  onClose,
}: LoadingOverlayProps) {
  if (!isVisible) return null;

  const progress = totalItems > 0 ? (processedItems / totalItems) * 100 : 0;

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* Content */}
      <div className="bg-card border rounded-xl shadow-2xl p-6 w-80">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-1 rounded-md hover:bg-muted transition-colors"
          aria-label="Close"
        >
          <X className="w-4 h-4 text-muted-foreground" />
        </button>

        <div className="text-center space-y-4">
          {/* Animated loader */}
          <div className="relative mx-auto w-16 h-16">
            <div className="absolute inset-0 rounded-full border-4 border-muted" />
            <svg className="absolute inset-0 w-16 h-16 -rotate-90" viewBox="0 0 100 100">
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
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          </div>

          {/* Job name */}
          {jobName && (
            <p className="text-xs font-medium text-muted-foreground">{jobName}</p>
          )}

          {/* Progress text */}
          <div>
            <h3 className="text-sm font-semibold">Finding LinkedIn Profiles</h3>
            <p className="text-xs text-muted-foreground mt-1">
              {processedItems} of {totalItems} processed
            </p>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-primary h-full transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Live counter */}
          <div className="flex items-center justify-center gap-2 py-2 bg-green-50 dark:bg-green-950/30 rounded-lg">
            <Users className="w-4 h-4 text-green-600" />
            <div className="text-left">
              <p className="text-lg font-bold text-green-600 tabular-nums">
                {foundCount}
              </p>
              <p className="text-xs text-green-700 dark:text-green-500">
                leads discovered
              </p>
            </div>
          </div>

          {/* Tip */}
          <p className="text-xs text-muted-foreground">
            Job processing in background.
          </p>
        </div>
      </div>
    </div>
  );
}
