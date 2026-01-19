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
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
      <div className="bg-background border rounded-lg shadow-lg px-4 py-3 flex items-center gap-4">
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

        <div className="flex items-center gap-2">
          <Button
            variant="default"
            size="sm"
            onClick={onEnrich}
            className="gap-2"
          >
            <Sparkles className="w-4 h-4" />
            Enrich
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={onExport}
            className="gap-2"
          >
            <Download className="w-4 h-4" />
            Export
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={onDelete}
            className="gap-2 text-destructive hover:text-destructive"
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </Button>
        </div>
      </div>
    </div>
  );
}
