"use client";

import { useListSelection } from "@/contexts/ListSelectionContext";
import { Button } from "@/components/ui/Button";
import { X, Sparkles, Download, Trash2 } from "lucide-react";

interface SelectionActionBarProps {
  onEnrich: () => void;
  onExport: () => void;
  onDelete: () => void;
}

export function SelectionActionBar({ onEnrich, onExport, onDelete }: SelectionActionBarProps) {
  const { selectedListIds, clearSelection } = useListSelection();
  const count = selectedListIds.size;

  if (count === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-24 md:bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 w-full md:w-auto max-w-[calc(100%-2rem)] md:max-w-none">
      <div className="bg-background border rounded-lg shadow-lg px-3 md:px-4 py-3 flex flex-wrap md:flex-nowrap items-center justify-center gap-2 md:gap-4">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">
            {count} list{count !== 1 ? "s" : ""} selected
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={clearSelection}
            aria-label="Clear selection"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="h-6 w-px bg-border" />

        <div className="flex items-center gap-1.5 sm:gap-2">
          <Button
            variant="default"
            size="sm"
            onClick={onEnrich}
            className="gap-1.5 sm:gap-2 px-2.5 sm:px-3"
            aria-label="Enrich selected lists"
          >
            <Sparkles className="w-4 h-4" />
            <span className="hidden sm:inline">Enrich</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={onExport}
            className="gap-1.5 sm:gap-2 px-2.5 sm:px-3"
            aria-label="Export selected lists"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Export</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={onDelete}
            className="gap-1.5 sm:gap-2 px-2.5 sm:px-3 text-destructive hover:text-destructive"
            aria-label="Delete selected lists"
          >
            <Trash2 className="w-4 h-4" />
            <span className="hidden sm:inline">Delete</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
