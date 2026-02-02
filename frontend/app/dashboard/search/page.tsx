"use client";

import { useState } from "react";
import { Page } from "@/components/dashboard/Page";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/base-input";
import {
  Search,
  Loader2,
  Building2,
  MapPin,
  Briefcase,
  Users,
  Plus,
  ExternalLink,
  AlertCircle,
} from "lucide-react";
import { useSearchPeople } from "@/hooks/api/useSearch";
import { SearchResultPerson } from "@shared/types/src";
import { SmartCompanySearch } from "@/components/companySearch/SmartCompanySearch";

type SearchResult = {
  id: string;
  name: string;
  title: string;
  company: string;
  linkedinUrl?: string;
};

type TabType = "people" | "company";

/**
 * Converts API search result to display format
 */
function toDisplayResult(result: SearchResultPerson, index: number): SearchResult {
  const fullName = [result.firstName, result.lastName].filter(Boolean).join(" ") || "Unknown";
  return {
    id: `${index}-${result.linkedinUrl}`,
    name: fullName,
    title: result.title,
    company: result.company || "",
    linkedinUrl: result.linkedinUrl,
  };
}

export default function SearchPage() {
  const [activeTab, setActiveTab] = useState<TabType>("people");
  const [query, setQuery] = useState("");
  const [role, setRole] = useState("");
  const [company, setCompany] = useState("");
  const [location, setLocation] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchMutation = useSearchPeople();
  const isSearching = searchMutation.isPending;

  const handleSearch = async () => {
    if (!query && !role && !company && !location) return;

    setHasSearched(true);
    setError(null);

    try {
      const response = await searchMutation.mutateAsync({
        query: query || undefined,
        role: role || undefined,
        company: company || undefined,
        location: location || undefined,
      });

      setResults(response.results.map(toDisplayResult));
    } catch (err) {
      console.error("Search failed:", err);
      setResults([]);
      setError(
        err instanceof Error
          ? err.message
          : "An error occurred while searching. Please try again."
      );
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  return (
    <Page
      title="Search"
      subtitle="Find leads by role, company, or location"
    >
      {/* Tab Navigation */}
      <div className="flex gap-1 p-1 bg-muted/50 rounded-lg w-fit mb-6">
        <button
          onClick={() => setActiveTab("people")}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            activeTab === "people"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Users className="w-4 h-4 inline mr-1.5" />
          People Search
        </button>
        <button
          onClick={() => setActiveTab("company")}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            activeTab === "company"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Building2 className="w-4 h-4 inline mr-1.5" />
          Smart Company Search
        </button>
      </div>

      {/* People Search Tab */}
      {activeTab === "people" && (
        <>
          {/* Search Form */}
          <div className="bg-card border rounded-xl p-6 mb-6">
            {/* Main search bar */}
            <div className="relative mb-4">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" aria-hidden="true" />
              <Input
                id="search-query"
                aria-label="Search query"
                placeholder="VP of Sales at series B startups in San Francisco..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                className="pl-12 h-12 text-base"
              />
            </div>

            {/* Advanced filters */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 mb-4">
              <div>
                <label htmlFor="filter-role" className="text-sm font-medium text-muted-foreground mb-1.5 block">
                  <Briefcase className="w-4 h-4 inline mr-1.5" aria-hidden="true" />
                  Role / Title
                </label>
                <Input
                  id="filter-role"
                  placeholder="e.g. VP of Sales, CTO, Engineer"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  onKeyDown={handleKeyDown}
                />
              </div>
              <div>
                <label htmlFor="filter-company" className="text-sm font-medium text-muted-foreground mb-1.5 block">
                  <Building2 className="w-4 h-4 inline mr-1.5" aria-hidden="true" />
                  Company
                </label>
                <Input
                  id="filter-company"
                  placeholder="e.g. Stripe, Notion, Scale AI"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  onKeyDown={handleKeyDown}
                />
              </div>
              <div>
                <label htmlFor="filter-location" className="text-sm font-medium text-muted-foreground mb-1.5 block">
                  <MapPin className="w-4 h-4 inline mr-1.5" aria-hidden="true" />
                  Location
                </label>
                <Input
                  id="filter-location"
                  placeholder="e.g. San Francisco, New York"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  onKeyDown={handleKeyDown}
                />
              </div>
            </div>

            <Button
              onClick={handleSearch}
              disabled={isSearching || (!query && !role && !company && !location)}
              className="w-full md:w-auto"
            >
              {isSearching ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden="true" />
                  Searching...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4 mr-2" aria-hidden="true" />
                  Search People
                </>
              )}
            </Button>
          </div>

          {/* Results */}
          {error ? (
            <div className="flex flex-col items-center justify-center py-16 text-center border border-destructive/50 rounded-xl bg-destructive/5" role="alert">
              <div className="w-16 h-16 rounded-xl bg-destructive/10 flex items-center justify-center mb-4">
                <AlertCircle className="w-8 h-8 text-destructive" aria-hidden="true" />
              </div>
              <h3 className="font-semibold mb-2 text-destructive">Search failed</h3>
              <p className="text-sm text-muted-foreground max-w-sm mb-4">
                {error}
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setError(null);
                  handleSearch();
                }}
              >
                Try again
              </Button>
            </div>
          ) : isSearching ? (
            <div className="flex flex-col items-center justify-center py-16" role="status" aria-live="polite" aria-atomic="true">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground mb-4" aria-hidden="true" />
              <p className="text-muted-foreground">Searching for people...</p>
            </div>
          ) : results.length > 0 ? (
            <div>
              <div className="flex items-center justify-between mb-4" role="status" aria-live="polite" aria-atomic="true">
                <p className="text-sm text-muted-foreground">
                  Found {results.length} results
                </p>
                <Button variant="outline" size="sm" aria-label="Add all results to list">
                  <Plus className="w-4 h-4 mr-1.5" aria-hidden="true" />
                  Add all to list
                </Button>
              </div>

              <div className="border rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                <table className="w-full min-w-[500px]">
                  <caption className="sr-only">Search results</caption>
                  <thead className="bg-muted/50">
                    <tr>
                      <th scope="col" className="text-left text-sm font-medium text-muted-foreground px-4 py-3">
                        Name
                      </th>
                      <th scope="col" className="text-left text-sm font-medium text-muted-foreground px-4 py-3 hidden sm:table-cell">
                        Title
                      </th>
                      <th scope="col" className="text-left text-sm font-medium text-muted-foreground px-4 py-3">
                        Company
                      </th>
                      <th scope="col" className="text-right text-sm font-medium text-muted-foreground px-4 py-3">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {results.map((result) => (
                      <tr key={result.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium text-sm flex-shrink-0">
                              {result.name.charAt(0)}
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-sm truncate">{result.name}</p>
                              {result.linkedinUrl && (
                                <a
                                  href={result.linkedinUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                                >
                                  LinkedIn
                                  <ExternalLink className="w-3 h-3" aria-hidden="true" />
                                </a>
                              )}
                              {/* Show title on mobile under name */}
                              <p className="text-xs text-muted-foreground sm:hidden">{result.title}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm hidden sm:table-cell">{result.title}</td>
                        <td className="px-4 py-3 text-sm">{result.company}</td>
                        <td className="px-4 py-3 text-right">
                          <Button variant="outline" size="sm" className="whitespace-nowrap" aria-label={`Add ${result.name} to list`}>
                            <Plus className="w-4 h-4 sm:mr-1" aria-hidden="true" />
                            <span className="hidden sm:inline">Add to list</span>
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              </div>
            </div>
          ) : hasSearched ? (
            <div className="flex flex-col items-center justify-center py-16 text-center border rounded-xl">
              <div className="w-16 h-16 rounded-xl bg-muted flex items-center justify-center mb-4">
                <Users className="w-8 h-8 text-muted-foreground" aria-hidden="true" />
              </div>
              <h3 className="font-semibold mb-2">No results found</h3>
              <p className="text-sm text-muted-foreground max-w-xs">
                Try adjusting your search criteria or using different keywords.
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center border rounded-xl bg-muted/20">
              <div className="w-16 h-16 rounded-xl bg-muted flex items-center justify-center mb-4">
                <Search className="w-8 h-8 text-muted-foreground" aria-hidden="true" />
              </div>
              <h3 className="font-semibold mb-2">Search for people</h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                Enter a search query or use the filters above to find leads by role,
                company, or location.
              </p>
            </div>
          )}
        </>
      )}

      {/* Smart Company Search Tab */}
      {activeTab === "company" && (
        <SmartCompanySearch />
      )}
    </Page>
  );
}
