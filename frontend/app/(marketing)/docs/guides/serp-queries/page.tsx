import { DocsLayout } from "@/components/docs/DocsLayout";
import { CodeBlock } from "@/components/docs/CodeBlock";

export default function SerpQueriesPage() {
  return (
    <DocsLayout
      title="SERP Query Construction"
      description="How Enrich Engine builds search queries for LinkedIn discovery."
    >
      <section className="space-y-8">
        <div>
          <p className="text-gray-600 mb-6">
            Understanding how search queries are constructed can help you optimize
            your CSV inputs for better match rates. This guide explains the query
            patterns used by Enrich Engine.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-4">Query Patterns</h2>

          <h3 className="text-lg font-semibold mt-6 mb-3">Role + Company Search</h3>
          <p className="text-gray-600 mb-3">
            The most common pattern for finding people by title at a company:
          </p>
          <CodeBlock
            code={`site:linkedin.com/in/ "VP of Sales" "Anthropic"`}
            language="text"
          />
          <p className="text-gray-600 mt-3 text-sm">
            This searches for LinkedIn profile pages containing both the role and company name.
          </p>

          <h3 className="text-lg font-semibold mt-6 mb-3">Name + Company Search</h3>
          <p className="text-gray-600 mb-3">
            For finding specific people by name:
          </p>
          <CodeBlock
            code={`site:linkedin.com/in/ "John Smith" "Anthropic"`}
            language="text"
          />
          <p className="text-gray-600 mt-3 text-sm">
            Adding company context significantly improves accuracy for common names.
          </p>

          <h3 className="text-lg font-semibold mt-6 mb-3">Name Only Search</h3>
          <p className="text-gray-600 mb-3">
            Without company context:
          </p>
          <CodeBlock
            code={`site:linkedin.com/in/ "John Smith"`}
            language="text"
          />
          <p className="text-gray-600 mt-3 text-sm">
            Less accurate for common names. Works well for unique or distinctive names.
          </p>

          <h3 className="text-lg font-semibold mt-6 mb-3">Company Domain Search</h3>
          <p className="text-gray-600 mb-3">
            To find a company&apos;s official website from their name:
          </p>
          <CodeBlock
            code={`site:www. "Anthropic"`}
            language="text"
          />
          <p className="text-gray-600 mt-3 text-sm">
            Used internally to resolve company names to domains when needed.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-4">Result Parsing</h2>

          <h3 className="text-lg font-semibold mt-6 mb-3">LinkedIn URL Extraction</h3>
          <p className="text-gray-600 mb-3">
            The system looks for URLs matching this pattern:
          </p>
          <CodeBlock
            code={`https://linkedin.com/in/[username]
https://www.linkedin.com/in/[username]`}
            language="text"
          />

          <h3 className="text-lg font-semibold mt-6 mb-3">Name Parsing from Titles</h3>
          <p className="text-gray-600 mb-3">
            LinkedIn search results have titles in this format:
          </p>
          <CodeBlock
            code={`John Smith - VP of Sales at Anthropic | LinkedIn`}
            language="text"
          />
          <p className="text-gray-600 mt-3 mb-3">
            The parser extracts names by:
          </p>
          <ol className="list-decimal list-inside text-gray-600 space-y-2 ml-4">
            <li>Removing &quot;| LinkedIn&quot; or &quot;- LinkedIn&quot; suffix</li>
            <li>Taking text before the first &quot; - &quot; separator</li>
            <li>Handling comma-separated credentials (e.g., &quot;John Smith, MBA&quot;)</li>
            <li>Filtering out common titles (Dr, Mr, Mrs, PhD, etc.)</li>
            <li>Taking first word as first name, last word as last name</li>
          </ol>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-4">Skipped Domains</h2>
          <p className="text-gray-600 mb-4">
            When searching for company websites, these domains are automatically skipped:
          </p>
          <CodeBlock
            code={`linkedin.com
facebook.com
twitter.com
x.com
instagram.com
youtube.com
wikipedia.org
crunchbase.com
glassdoor.com
indeed.com
bloomberg.com
forbes.com
reuters.com
zoominfo.com
apollo.io
pitchbook.com
g2.com
yelp.com
bbb.org`}
            language="text"
          />
          <p className="text-gray-600 mt-3 text-sm">
            This ensures we find official company websites, not profiles on aggregator sites.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-4">Optimization Tips</h2>

          <div className="space-y-4">
            <div className="p-4 rounded-lg border border-gray-200">
              <h3 className="font-semibold mb-2">Exact Match Quotes</h3>
              <p className="text-gray-600 text-sm">
                All search terms are wrapped in quotes for exact matching.
                &quot;VP of Sales&quot; matches the exact phrase, not pages with &quot;VP&quot; and &quot;Sales&quot; separately.
              </p>
            </div>

            <div className="p-4 rounded-lg border border-gray-200">
              <h3 className="font-semibold mb-2">Site Restriction</h3>
              <p className="text-gray-600 text-sm">
                <code className="bg-gray-100 px-1 rounded">site:linkedin.com/in/</code> restricts results
                to LinkedIn profile pages only, excluding company pages and other LinkedIn content.
              </p>
            </div>

            <div className="p-4 rounded-lg border border-gray-200">
              <h3 className="font-semibold mb-2">Result Ordering</h3>
              <p className="text-gray-600 text-sm">
                Google ranks results by relevance. The first LinkedIn profile URL in results
                is typically the best match. For multi-person searches, subsequent results
                are used for additional matches.
              </p>
            </div>

            <div className="p-4 rounded-lg border border-gray-200">
              <h3 className="font-semibold mb-2">Deduplication</h3>
              <p className="text-gray-600 text-sm">
                When scraping multiple rows with the same company/role, previously found
                URLs are excluded to ensure unique results. This is handled via a
                <code className="bg-gray-100 px-1 rounded">roleInstanceIndex</code> that tracks
                which result to use.
              </p>
            </div>
          </div>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-4">Common Issues</h2>

          <div className="space-y-4">
            <div className="p-4 rounded-lg border border-red-200 bg-red-50">
              <h3 className="font-semibold text-red-800 mb-2">No Results Found</h3>
              <ul className="list-disc list-inside text-red-700 text-sm space-y-1">
                <li>Person may not have a LinkedIn profile</li>
                <li>Profile has privacy settings preventing indexing</li>
                <li>Company name doesn&apos;t match LinkedIn company page</li>
                <li>Job title is too generic or doesn&apos;t exist at the company</li>
              </ul>
            </div>

            <div className="p-4 rounded-lg border border-amber-200 bg-amber-50">
              <h3 className="font-semibold text-amber-800 mb-2">Wrong Person Found</h3>
              <ul className="list-disc list-inside text-amber-700 text-sm space-y-1">
                <li>Common name without company context</li>
                <li>Person with similar name at same company</li>
                <li>Company name is ambiguous (subsidiaries, similar names)</li>
              </ul>
            </div>

            <div className="p-4 rounded-lg border border-blue-200 bg-blue-50">
              <h3 className="font-semibold text-blue-800 mb-2">Improving Match Rate</h3>
              <ul className="list-disc list-inside text-blue-700 text-sm space-y-1">
                <li>Use official company names as shown on LinkedIn</li>
                <li>Add company context for name searches</li>
                <li>Use specific job titles, not generic terms</li>
                <li>For very common names, consider adding middle initial</li>
              </ul>
            </div>
          </div>
        </div>
      </section>
    </DocsLayout>
  );
}
