import { DocsLayout } from "@/components/docs/DocsLayout";
import { EndpointBlock } from "@/components/docs/EndpointBlock";

export default function SearchApiPage() {
  return (
    <DocsLayout
      title="Search API"
      description="Search for people by role, company, or free-text query."
    >
      <section className="space-y-8">
        <div>
          <p className="text-gray-600 mb-6">
            The Search API allows you to find LinkedIn profiles using various search criteria.
            Results are sourced from Google search results via the Serper API.
          </p>
        </div>

        <EndpointBlock
          method="POST"
          path="/api/search/people"
          description="Search for people matching the given criteria"
          auth="session"
          parameters={[
            {
              name: "query",
              type: "string",
              required: false,
              description: "Free-text search query (e.g., 'VP of Sales at startups')",
            },
            {
              name: "role",
              type: "string",
              required: false,
              description: "Job title or role to search for",
            },
            {
              name: "company",
              type: "string",
              required: false,
              description: "Company name to filter by",
            },
            {
              name: "location",
              type: "string",
              required: false,
              description: "Location filter (note: limited support)",
            },
            {
              name: "page",
              type: "number",
              required: false,
              description: "Page number (default: 1)",
            },
            {
              name: "limit",
              type: "number",
              required: false,
              description: "Results per page (default: 20, max: 50)",
            },
          ]}
          requestExample={`{
  "role": "VP of Sales",
  "company": "Anthropic",
  "page": 1,
  "limit": 20
}`}
          responseExample={`{
  "results": [
    {
      "linkedinUrl": "https://linkedin.com/in/johndoe",
      "firstName": "John",
      "lastName": "Doe",
      "title": "John Doe - VP of Sales at Anthropic | LinkedIn",
      "company": "Anthropic"
    },
    {
      "linkedinUrl": "https://linkedin.com/in/janesmith",
      "firstName": "Jane",
      "lastName": "Smith",
      "title": "Jane Smith - Head of Sales at Anthropic | LinkedIn",
      "company": "Anthropic"
    }
  ],
  "total": 5,
  "page": 1,
  "limit": 20,
  "hasMore": false
}`}
        />

        <div>
          <h2 className="text-xl font-semibold mb-4">Search Tips</h2>
          <ul className="list-disc list-inside text-gray-600 space-y-2">
            <li>Provide both <code className="bg-gray-100 px-1 rounded">role</code> and <code className="bg-gray-100 px-1 rounded">company</code> for best results</li>
            <li>Use specific job titles rather than generic terms</li>
            <li>The free-text <code className="bg-gray-100 px-1 rounded">query</code> field supports patterns like &quot;CEO at Stripe&quot;</li>
            <li>Results are limited to LinkedIn profiles found in search results</li>
          </ul>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-4">Response Fields</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold">Field</th>
                  <th className="text-left py-3 px-4 font-semibold">Type</th>
                  <th className="text-left py-3 px-4 font-semibold">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                <tr>
                  <td className="py-3 px-4 font-mono text-sm">linkedinUrl</td>
                  <td className="py-3 px-4 text-gray-600">string</td>
                  <td className="py-3 px-4 text-gray-600">Full LinkedIn profile URL</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-mono text-sm">firstName</td>
                  <td className="py-3 px-4 text-gray-600">string | null</td>
                  <td className="py-3 px-4 text-gray-600">Parsed first name from title</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-mono text-sm">lastName</td>
                  <td className="py-3 px-4 text-gray-600">string | null</td>
                  <td className="py-3 px-4 text-gray-600">Parsed last name from title</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-mono text-sm">title</td>
                  <td className="py-3 px-4 text-gray-600">string</td>
                  <td className="py-3 px-4 text-gray-600">Full search result title</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-mono text-sm">company</td>
                  <td className="py-3 px-4 text-gray-600">string | undefined</td>
                  <td className="py-3 px-4 text-gray-600">Extracted company name</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </DocsLayout>
  );
}
