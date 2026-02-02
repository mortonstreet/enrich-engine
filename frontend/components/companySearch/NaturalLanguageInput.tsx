"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Loader2, Sparkles } from "lucide-react";

interface NaturalLanguageInputProps {
  onGenerate: (query: string) => void;
  isGenerating: boolean;
}

export function NaturalLanguageInput({ onGenerate, isGenerating }: NaturalLanguageInputProps) {
  const [query, setQuery] = useState("");

  const handleSubmit = () => {
    if (!query.trim()) return;
    onGenerate(query.trim());
  };

  return (
    <div className="bg-card border rounded-xl p-6">
      <h3 className="text-base font-semibold mb-1">Describe the companies you're looking for</h3>
      <p className="text-sm text-muted-foreground mb-4">
        Use natural language to describe your ideal companies. AI will generate an optimized search query.
      </p>
      <textarea
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder='e.g. "Find PE firms that invest in industrials between lower middle market and mega funds"'
        rows={3}
        className="w-full rounded-lg border border-input bg-background px-4 py-3 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none mb-4"
      />
      <Button
        onClick={handleSubmit}
        disabled={isGenerating || !query.trim()}
      >
        {isGenerating ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Generating query...
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4 mr-2" />
            Generate Search Query
          </>
        )}
      </Button>
    </div>
  );
}
