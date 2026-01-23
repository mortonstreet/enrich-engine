import { DocsLayout } from "@/components/docs/DocsLayout";
import { CodeBlock } from "@/components/docs/CodeBlock";
import Link from "next/link";

export default function GettingStartedPage() {
  return (
    <DocsLayout
      title="Getting Started"
      description="Set up your account and make your first API call in minutes."
    >
      <section className="space-y-8">
        {/* Step 1 */}
        <div className="p-6 rounded-xl border border-gray-200 bg-gray-50">
          <h2 className="text-xl font-semibold mb-3">1. Create an Account</h2>
          <p className="text-gray-600 mb-4">
            Sign up for a free Enrich Engine account to get started. You&apos;ll receive
            free credits to test the API.
          </p>
          <Link
            href="/signup"
            className="inline-block bg-[#E63946] text-white px-4 py-2 rounded-lg font-medium hover:bg-[#d32f3d] transition-colors"
          >
            Create free account
          </Link>
        </div>

        {/* Step 2 */}
        <div className="p-6 rounded-xl border border-gray-200 bg-gray-50">
          <h2 className="text-xl font-semibold mb-3">2. Authentication</h2>
          <p className="text-gray-600 mb-4">
            Enrich Engine uses two authentication methods:
          </p>
          <ul className="list-disc list-inside text-gray-600 mb-4 space-y-2">
            <li>
              <strong>Session-based auth</strong> - For the dashboard and web app.
              Cookies are automatically managed.
            </li>
            <li>
              <strong>API Key auth</strong> - For external integrations. Create an API
              key in Settings &gt; API Keys.
            </li>
          </ul>
          <p className="text-gray-600 mb-4">
            For external API access, include your API key in the request header:
          </p>
          <CodeBlock
            code={`curl -X GET "https://api.enrichengine.io/api/external/lists" \\
  -H "X-API-Key: ee_live_your_api_key"`}
            language="bash"
          />
        </div>

        {/* Step 3 */}
        <div className="p-6 rounded-xl border border-gray-200 bg-gray-50">
          <h2 className="text-xl font-semibold mb-3">3. Make Your First Request</h2>
          <p className="text-gray-600 mb-4">
            Search for people by role and company using the Search API:
          </p>
          <CodeBlock
            code={`curl -X POST "https://api.enrichengine.io/api/search/people" \\
  -H "Content-Type: application/json" \\
  -H "Cookie: your_session_cookie" \\
  -d '{
    "role": "VP of Sales",
    "company": "Anthropic"
  }'`}
            language="bash"
            title="Search Request"
          />
          <p className="text-gray-600 mt-4 mb-4">
            Response:
          </p>
          <CodeBlock
            code={`{
  "results": [
    {
      "linkedinUrl": "https://linkedin.com/in/johndoe",
      "firstName": "John",
      "lastName": "Doe",
      "title": "John Doe - VP of Sales at Anthropic | LinkedIn",
      "company": "Anthropic"
    }
  ],
  "total": 5,
  "page": 1,
  "limit": 20,
  "hasMore": false
}`}
            language="json"
            title="Response"
          />
        </div>

        {/* Next Steps */}
        <div className="p-6 rounded-xl border border-gray-200 bg-white">
          <h2 className="text-xl font-semibold mb-4">Next Steps</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <Link
              href="/docs/api-reference/search"
              className="p-4 rounded-lg border border-gray-200 hover:border-[#E63946]/30 hover:shadow-md transition-all"
            >
              <h3 className="font-semibold mb-1">Search API</h3>
              <p className="text-sm text-gray-600">Learn how to search for people by role, company, or keywords.</p>
            </Link>
            <Link
              href="/docs/api-reference/scrape"
              className="p-4 rounded-lg border border-gray-200 hover:border-[#E63946]/30 hover:shadow-md transition-all"
            >
              <h3 className="font-semibold mb-1">Scraping</h3>
              <p className="text-sm text-gray-600">Bulk scrape LinkedIn profiles from CSV files.</p>
            </Link>
            <Link
              href="/docs/api-reference/enrich"
              className="p-4 rounded-lg border border-gray-200 hover:border-[#E63946]/30 hover:shadow-md transition-all"
            >
              <h3 className="font-semibold mb-1">Enrichment</h3>
              <p className="text-sm text-gray-600">Enrich profiles with emails, phones, and more.</p>
            </Link>
            <Link
              href="/docs/external-api"
              className="p-4 rounded-lg border border-gray-200 hover:border-[#E63946]/30 hover:shadow-md transition-all"
            >
              <h3 className="font-semibold mb-1">External API</h3>
              <p className="text-sm text-gray-600">Integrate with external tools like GTM Dialer.</p>
            </Link>
          </div>
        </div>
      </section>
    </DocsLayout>
  );
}
