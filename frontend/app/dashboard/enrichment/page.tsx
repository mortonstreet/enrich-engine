"use client";

import { useState } from "react";
import { Page } from "@/components/dashboard/Page";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/base-input";
import { EnrichmentResultCard } from "@/components/enrichment/EnrichmentResultCard";
import { useEnrichPerson } from "@/hooks/api/useEnrichment";
import { toast } from "sonner";
import { Search, Loader2 } from "lucide-react";
import { DBEnrichment } from "@shared/types/src";

export default function EnrichmentPage() {
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [result, setResult] = useState<DBEnrichment | null>(null);
  const enrichMutation = useEnrichPerson();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!linkedinUrl.trim()) {
      toast.error("Please enter a LinkedIn URL");
      return;
    }

    if (!linkedinUrl.includes("linkedin.com")) {
      toast.error("Please enter a valid LinkedIn URL");
      return;
    }

    try {
      const enrichment = await enrichMutation.mutateAsync({
        linkedinUrl: linkedinUrl.trim(),
        enrichMobile: true,
      });
      setResult(enrichment);
      toast.success("Enrichment complete!");
    } catch {
      toast.error("Failed to enrich profile");
    }
  };

  return (
    <Page
      title="Enrich Contact"
      subtitle="Find email and phone from a LinkedIn profile"
    >
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="border-b">
            <CardTitle>LinkedIn Profile</CardTitle>
            <CardDescription>
              Enter a LinkedIn profile URL to find contact information
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="linkedin-url" className="text-sm font-medium">
                  LinkedIn URL
                </label>
                <Input
                  id="linkedin-url"
                  type="url"
                  placeholder="https://linkedin.com/in/johndoe"
                  value={linkedinUrl}
                  onChange={(e) => setLinkedinUrl(e.target.value)}
                  disabled={enrichMutation.isPending}
                />
                <p className="text-xs text-muted-foreground">
                  Example: https://linkedin.com/in/username
                </p>
              </div>

              <Button
                type="submit"
                disabled={enrichMutation.isPending || !linkedinUrl.trim()}
                className="w-full"
              >
                {enrichMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Enriching...
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4 mr-2" />
                    Enrich Profile
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div>
          {result ? (
            <EnrichmentResultCard enrichment={result} />
          ) : (
            <Card className="h-full">
              <CardContent className="flex flex-col items-center justify-center h-full min-h-[300px] text-center">
                <div className="w-16 h-16 rounded-xl bg-muted flex items-center justify-center mb-4">
                  <Search className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="font-semibold mb-2">No Result Yet</h3>
                <p className="text-sm text-muted-foreground max-w-xs">
                  Enter a LinkedIn URL and click Enrich to find contact information
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </Page>
  );
}
