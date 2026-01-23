import { DocsLayout } from "@/components/docs/DocsLayout";
import { EndpointBlock } from "@/components/docs/EndpointBlock";
import { CodeBlock } from "@/components/docs/CodeBlock";
import Link from "next/link";

export default function ExternalApiPage() {
  return (
    <DocsLayout
      title="External API"
      description="API access for external integrations like GTM Dialer."
    >
      <section className="space-y-8">
        <div>
          <p className="text-gray-600 mb-4">
            The External API allows third-party tools and custom integrations to access
            your Enrich Engine data. Unlike session-based endpoints, external API endpoints
            use API key authentication.
          </p>
          <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 mb-6">
            <p className="text-amber-800 text-sm">
              <strong>Note:</strong> External API access requires an API key with appropriate scopes.
              See <Link href="/docs/external-api/api-keys" className="underline">API Key Management</Link> for setup instructions.
            </p>
          </div>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-4">Authentication</h2>
          <p className="text-gray-600 mb-4">
            Include your API key in the <code className="bg-gray-100 px-1 rounded">X-API-Key</code> header:
          </p>
          <CodeBlock
            code={`curl -X GET "https://api.enrichengine.io/api/external/lists" \\
  -H "X-API-Key: ee_live_xxxxxxxxxxxxx"`}
            language="bash"
          />
        </div>

        <EndpointBlock
          method="GET"
          path="/api/external/lists"
          description="List all accessible lists for the API key's organization"
          auth="api-key"
          parameters={[
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
              description: "Results per page (default: 50)",
            },
          ]}
          requestExample={`GET /api/external/lists?page=1&limit=50
X-API-Key: ee_live_xxxxxxxxxxxxx`}
          responseExample={`{
  "data": [
    {
      "id": "list-123",
      "name": "Q1 Sales Prospects",
      "leadCount": 500,
      "createdAt": "2024-01-15T10:30:00Z",
      "updatedAt": "2024-01-20T14:45:00Z"
    },
    {
      "id": "list-456",
      "name": "Engineering Leaders",
      "leadCount": 150,
      "createdAt": "2024-01-18T09:00:00Z",
      "updatedAt": "2024-01-22T11:30:00Z"
    }
  ],
  "total": 15,
  "page": 1,
  "limit": 50,
  "totalPages": 1
}`}
        />

        <EndpointBlock
          method="GET"
          path="/api/external/lists/:listId"
          description="Get a specific list with its leads"
          auth="api-key"
          parameters={[
            {
              name: "listId",
              type: "string",
              required: true,
              description: "The list ID",
            },
            {
              name: "page",
              type: "number",
              required: false,
              description: "Page number for leads (default: 1)",
            },
            {
              name: "limit",
              type: "number",
              required: false,
              description: "Leads per page (default: 100)",
            },
          ]}
          requestExample={`GET /api/external/lists/list-123?page=1&limit=100
X-API-Key: ee_live_xxxxxxxxxxxxx`}
          responseExample={`{
  "id": "list-123",
  "name": "Q1 Sales Prospects",
  "leads": [
    {
      "id": "lead-1",
      "linkedinUrl": "https://linkedin.com/in/johndoe",
      "firstName": "John",
      "lastName": "Doe",
      "title": "VP of Sales",
      "company": "Anthropic",
      "workEmail": "john@anthropic.com",
      "personalEmail": "john.doe@gmail.com",
      "phone": "+1 (415) 555-0123"
    },
    {
      "id": "lead-2",
      "linkedinUrl": "https://linkedin.com/in/janesmith",
      "firstName": "Jane",
      "lastName": "Smith",
      "title": "Head of Sales",
      "company": "Stripe",
      "workEmail": "jane@stripe.com"
    }
  ],
  "total": 500,
  "page": 1,
  "limit": 100,
  "totalPages": 5
}`}
        />

        <div>
          <h2 className="text-xl font-semibold mb-4">GTM Dialer Integration</h2>
          <p className="text-gray-600 mb-4">
            To integrate with GTM Dialer or similar calling tools:
          </p>
          <ol className="list-decimal list-inside text-gray-600 space-y-3 mb-6">
            <li>
              <strong>Create an API key</strong> in Settings &gt; API Keys with <code className="bg-gray-100 px-1 rounded">lists:read</code> and <code className="bg-gray-100 px-1 rounded">leads:read</code> scopes
            </li>
            <li>
              <strong>Configure the webhook URL</strong> in your dialer: <code className="bg-gray-100 px-1 rounded">https://api.enrichengine.io/api/external/lists</code>
            </li>
            <li>
              <strong>Add the API key</strong> as a header: <code className="bg-gray-100 px-1 rounded">X-API-Key: your_key</code>
            </li>
            <li>
              <strong>Select a list</strong> from the available lists endpoint
            </li>
            <li>
              <strong>Fetch leads</strong> with pagination for the calling queue
            </li>
          </ol>
          <CodeBlock
            code={`// Example: Fetch leads for dialer queue
const API_KEY = 'ee_live_xxxxxxxxxxxxx';
const LIST_ID = 'list-123';

async function fetchLeadsForDialer(page = 1) {
  const response = await fetch(
    \`https://api.enrichengine.io/api/external/lists/\${LIST_ID}?page=\${page}&limit=100\`,
    {
      headers: {
        'X-API-Key': API_KEY
      }
    }
  );

  const data = await response.json();

  // Filter leads with phone numbers
  const dialableLeads = data.leads.filter(lead => lead.phone);

  return {
    leads: dialableLeads,
    hasMore: page < data.totalPages,
    nextPage: page + 1
  };
}`}
            language="javascript"
            title="GTM Dialer Integration Example"
          />
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-4">Required Scopes</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold">Endpoint</th>
                  <th className="text-left py-3 px-4 font-semibold">Required Scopes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                <tr>
                  <td className="py-3 px-4 font-mono text-sm">GET /api/external/lists</td>
                  <td className="py-3 px-4 text-gray-600">lists:read</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-mono text-sm">GET /api/external/lists/:id</td>
                  <td className="py-3 px-4 text-gray-600">lists:read, leads:read</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </DocsLayout>
  );
}
