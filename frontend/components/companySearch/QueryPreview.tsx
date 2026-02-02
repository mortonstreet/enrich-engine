"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/base-input";
import { Loader2, Search, Pencil, Check } from "lucide-react";

interface QueryPreviewProps {
  query: string;
  explanation: string;
  onPreview: (query: string) => void;
  onBack: () => void;
  isPreviewing: boolean;
}

export function QueryPreview({ query, explanation, onPreview, onBack, isPreviewing }: QueryPreviewProps) {
  const [editedQuery, setEditedQuery] = useState(query);
  const [isEditing, setIsEditing] = useState(false);

  return (
    <div className="bg-card border rounded-xl p-6">
      <h3 className="text-base font-semibold mb-1">Generated Search Query</h3>
      <p className="text-sm text-muted-foreground mb-4">{explanation}</p>

      <div className="mb-4">
        {isEditing ? (
          <div className="flex gap-2">
            <Input
              value={editedQuery}
              onChange={(e) => setEditedQuery(e.target.value)}
              className="flex-1 font-mono text-sm"
            />
            <Button variant="outline" size="sm" onClick={() => setIsEditing(false)}>
              <Check className="w-4 h-4" />
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2 bg-muted/50 rounded-lg px-4 py-3">
            <code className="text-sm flex-1 break-all">{editedQuery}</code>
            <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)}>
              <Pencil className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>

      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button
          onClick={() => onPreview(editedQuery)}
          disabled={isPreviewing || !editedQuery.trim()}
        >
          {isPreviewing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Loading preview...
            </>
          ) : (
            <>
              <Search className="w-4 h-4 mr-2" />
              Preview Results
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
