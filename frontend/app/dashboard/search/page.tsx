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
  Mail,
  Phone,
} from "lucide-react";

type SearchResult = {
  id: string;
  name: string;
  title: string;
  company: string;
  location: string;
  linkedinUrl?: string;
  email?: string;
  phone?: string;
};

// Mock search results for demonstration
const mockResults: SearchResult[] = [
  {
    id: "1",
    name: "Sarah Chen",
    title: "VP of Sales",
    company: "Scale AI",
    location: "San Francisco, CA",
    linkedinUrl: "linkedin.com/in/sarahchen",
    email: "sarah@scale.ai",
  },
  {
    id: "2",
    name: "Mike Rodriguez",
    title: "Head of Sales",
    company: "Notion",
    location: "San Francisco, CA",
    linkedinUrl: "linkedin.com/in/mikerodriguez",
  },
  {
    id: "3",
    name: "Jennifer Kim",
    title: "VP Revenue",
    company: "Figma",
    location: "San Francisco, CA",
    linkedinUrl: "linkedin.com/in/jenniferkim",
    email: "jen@figma.com",
    phone: "+1 (415) 555-0123",
  },
  {
    id: "4",
    name: "David Park",
    title: "Sales Director",
    company: "Linear",
    location: "San Francisco, CA",
    linkedinUrl: "linkedin.com/in/davidpark",
  },
  {
    id: "5",
    name: "Emily Zhang",
    title: "VP of Sales",
    company: "Anthropic",
    location: "San Francisco, CA",
    linkedinUrl: "linkedin.com/in/emilyzhang",
    email: "emily@anthropic.com",
  },
];

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [role, setRole] = useState("");
  const [company, setCompany] = useState("");
  const [location, setLocation] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async () => {
    if (!query && !role && !company && !location) return;

    setIsSearching(true);
    setHasSearched(true);

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500));

    setResults(mockResults);
    setIsSearching(false);
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
      {/* Search Form */}
      <div className="bg-card border rounded-xl p-6 mb-6">
        {/* Main search bar */}
        <div className="relative mb-4">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
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
            <label className="text-sm font-medium text-muted-foreground mb-1.5 block">
              <Briefcase className="w-4 h-4 inline mr-1.5" />
              Role / Title
            </label>
            <Input
              placeholder="e.g. VP of Sales, CTO, Engineer"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              onKeyDown={handleKeyDown}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-1.5 block">
              <Building2 className="w-4 h-4 inline mr-1.5" />
              Company
            </label>
            <Input
              placeholder="e.g. Stripe, Notion, Scale AI"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              onKeyDown={handleKeyDown}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-1.5 block">
              <MapPin className="w-4 h-4 inline mr-1.5" />
              Location
            </label>
            <Input
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
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Searching...
            </>
          ) : (
            <>
              <Search className="w-4 h-4 mr-2" />
              Search People
            </>
          )}
        </Button>
      </div>

      {/* Results */}
      {isSearching ? (
        <div className="flex flex-col items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Searching for people...</p>
        </div>
      ) : results.length > 0 ? (
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-muted-foreground">
              Found {results.length} results
            </p>
            <Button variant="outline" size="sm">
              <Plus className="w-4 h-4 mr-1.5" />
              Add all to list
            </Button>
          </div>

          <div className="border rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
            <table className="w-full min-w-[600px]">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left text-sm font-medium text-muted-foreground px-4 py-3">
                    Name
                  </th>
                  <th className="text-left text-sm font-medium text-muted-foreground px-4 py-3 hidden sm:table-cell">
                    Title
                  </th>
                  <th className="text-left text-sm font-medium text-muted-foreground px-4 py-3">
                    Company
                  </th>
                  <th className="text-left text-sm font-medium text-muted-foreground px-4 py-3 hidden md:table-cell">
                    Location
                  </th>
                  <th className="text-left text-sm font-medium text-muted-foreground px-4 py-3 hidden lg:table-cell">
                    Contact
                  </th>
                  <th className="text-right text-sm font-medium text-muted-foreground px-4 py-3">
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
                              href={`https://${result.linkedinUrl}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                            >
                              LinkedIn
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                          {/* Show title on mobile under name */}
                          <p className="text-xs text-muted-foreground sm:hidden">{result.title}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm hidden sm:table-cell">{result.title}</td>
                    <td className="px-4 py-3 text-sm">{result.company}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground hidden md:table-cell">
                      {result.location}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <div className="flex items-center gap-2">
                        {result.email && (
                          <span className="inline-flex items-center gap-1 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                            <Mail className="w-3 h-3" />
                            Email
                          </span>
                        )}
                        {result.phone && (
                          <span className="inline-flex items-center gap-1 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                            <Phone className="w-3 h-3" />
                            Phone
                          </span>
                        )}
                        {!result.email && !result.phone && (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button variant="outline" size="sm" className="whitespace-nowrap">
                        <Plus className="w-4 h-4 sm:mr-1" />
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
            <Users className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="font-semibold mb-2">No results found</h3>
          <p className="text-sm text-muted-foreground max-w-xs">
            Try adjusting your search criteria or using different keywords.
          </p>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-center border rounded-xl bg-muted/20">
          <div className="w-16 h-16 rounded-xl bg-muted flex items-center justify-center mb-4">
            <Search className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="font-semibold mb-2">Search for people</h3>
          <p className="text-sm text-muted-foreground max-w-sm">
            Enter a search query or use the filters above to find leads by role,
            company, or location.
          </p>
        </div>
      )}
    </Page>
  );
}
