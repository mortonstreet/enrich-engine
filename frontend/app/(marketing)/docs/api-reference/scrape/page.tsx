import { DocsLayout } from "@/components/docs/DocsLayout";
import { EndpointBlock } from "@/components/docs/EndpointBlock";
import Link from "next/link";

export default function ScrapeApiPage() {
  return (
    <DocsLayout
      title="Scrape API"
      description="Bulk scrape LinkedIn profiles from CSV files."
    >
      <section className="space-y-8">
        <div>
          <p className="text-gray-600 mb-4">
            The Scrape API enables bulk LinkedIn profile discovery from CSV uploads.
            Upload a list of companies, names, or domains, and the system will find matching LinkedIn profiles.
          </p>
          <p className="text-gray-600 mb-6">
            For detailed information about CSV formats and scraping workflows, see the{" "}
            <Link href="/docs/guides/scraping-linkedin" className="text-[#E63946] hover:underline">
              LinkedIn Scraping Guide
            </Link>.
          </p>
        </div>

        <EndpointBlock
          method="POST"
          path="/api/scrape/jobs"
          description="Create a new scrape job by uploading a CSV file"
          auth="session"
          parameters={[
            {
              name: "file",
              type: "File (multipart)",
              required: true,
              description: "CSV file with companies, names, or domains",
            },
            {
              name: "name",
              type: "string",
              required: false,
              description: "Custom name for the job",
            },
          ]}
          responseExample={`{
  "job": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Q1 Prospects",
    "status": "pending",
    "inputType": "role",
    "totalItems": 150,
    "completedItems": 0,
    "foundItems": 0,
    "createdAt": "2024-01-15T10:30:00Z"
  },
  "message": "Scrape job created successfully"
}`}
        />

        <EndpointBlock
          method="GET"
          path="/api/scrape/jobs"
          description="List all scrape jobs for the organization"
          auth="session"
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
              description: "Results per page (default: 20)",
            },
            {
              name: "status",
              type: "string",
              required: false,
              description: "Filter by status: pending, processing, paused, completed, failed",
            },
          ]}
          responseExample={`{
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Q1 Prospects",
      "status": "completed",
      "inputType": "role",
      "totalItems": 150,
      "completedItems": 150,
      "foundItems": 127,
      "createdAt": "2024-01-15T10:30:00Z"
    }
  ],
  "total": 25,
  "page": 1,
  "limit": 20,
  "totalPages": 2
}`}
        />

        <EndpointBlock
          method="GET"
          path="/api/scrape/jobs/:jobId"
          description="Get details for a specific scrape job"
          auth="session"
          parameters={[
            {
              name: "jobId",
              type: "string (UUID)",
              required: true,
              description: "The scrape job ID",
            },
          ]}
          responseExample={`{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Q1 Prospects",
  "status": "processing",
  "inputType": "role",
  "totalItems": 150,
  "completedItems": 75,
  "foundItems": 63,
  "createdAt": "2024-01-15T10:30:00Z",
  "items": [
    {
      "id": "item-1",
      "status": "completed",
      "company": "Anthropic",
      "role": "VP of Sales",
      "linkedinUrl": "https://linkedin.com/in/johndoe",
      "firstName": "John",
      "lastName": "Doe"
    }
  ]
}`}
        />

        <EndpointBlock
          method="GET"
          path="/api/scrape/jobs/:jobId/download"
          description="Download scrape results as CSV"
          auth="session"
          parameters={[
            {
              name: "jobId",
              type: "string (UUID)",
              required: true,
              description: "The scrape job ID",
            },
            {
              name: "foundOnly",
              type: "boolean",
              required: false,
              description: "If true, only include items with found LinkedIn URLs",
            },
          ]}
        />

        <EndpointBlock
          method="POST"
          path="/api/scrape/jobs/:jobId/pause"
          description="Pause a running scrape job"
          auth="session"
          parameters={[
            {
              name: "jobId",
              type: "string (UUID)",
              required: true,
              description: "The scrape job ID",
            },
          ]}
        />

        <EndpointBlock
          method="POST"
          path="/api/scrape/jobs/:jobId/resume"
          description="Resume a paused scrape job"
          auth="session"
          parameters={[
            {
              name: "jobId",
              type: "string (UUID)",
              required: true,
              description: "The scrape job ID",
            },
          ]}
        />

        <EndpointBlock
          method="POST"
          path="/api/scrape/jobs/:jobId/sync"
          description="Sync scrape results to a list (creates leads)"
          auth="session"
          parameters={[
            {
              name: "jobId",
              type: "string (UUID)",
              required: true,
              description: "The scrape job ID",
            },
          ]}
          responseExample={`{
  "success": true,
  "listId": "list-123",
  "leadsCount": 127,
  "message": "127 leads synced to list"
}`}
        />

        <div>
          <h2 className="text-xl font-semibold mb-4">Job Statuses</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold">Status</th>
                  <th className="text-left py-3 px-4 font-semibold">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                <tr>
                  <td className="py-3 px-4 font-mono text-sm">pending</td>
                  <td className="py-3 px-4 text-gray-600">Job created, waiting to start</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-mono text-sm">processing</td>
                  <td className="py-3 px-4 text-gray-600">Job is actively scraping</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-mono text-sm">paused</td>
                  <td className="py-3 px-4 text-gray-600">Job paused by user</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-mono text-sm">completed</td>
                  <td className="py-3 px-4 text-gray-600">All items processed</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-mono text-sm">failed</td>
                  <td className="py-3 px-4 text-gray-600">Job failed due to an error</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </DocsLayout>
  );
}
