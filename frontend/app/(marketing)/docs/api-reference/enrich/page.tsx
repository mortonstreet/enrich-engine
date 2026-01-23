import { DocsLayout } from "@/components/docs/DocsLayout";
import { EndpointBlock } from "@/components/docs/EndpointBlock";
import Link from "next/link";

export default function EnrichApiPage() {
  return (
    <DocsLayout
      title="Enrich API"
      description="Enrich profiles with emails, phone numbers, and more."
    >
      <section className="space-y-8">
        <div>
          <p className="text-gray-600 mb-4">
            The Enrich API allows you to enrich LinkedIn profiles with additional data
            such as work emails, personal emails, and phone numbers. You can enrich
            single profiles or process bulk jobs.
          </p>
          <p className="text-gray-600 mb-6">
            For bulk enrichment best practices, see the{" "}
            <Link href="/docs/guides/bulk-enrichment" className="text-[#E63946] hover:underline">
              Bulk Enrichment Guide
            </Link>.
          </p>
        </div>

        <EndpointBlock
          method="POST"
          path="/api/enrichment/enrich"
          description="Enrich a single LinkedIn profile"
          auth="session"
          parameters={[
            {
              name: "linkedinUrl",
              type: "string",
              required: true,
              description: "LinkedIn profile URL to enrich",
            },
          ]}
          requestExample={`{
  "linkedinUrl": "https://linkedin.com/in/johndoe"
}`}
          responseExample={`{
  "success": true,
  "profile": {
    "linkedinUrl": "https://linkedin.com/in/johndoe",
    "firstName": "John",
    "lastName": "Doe",
    "title": "VP of Sales",
    "company": "Anthropic",
    "workEmail": "john.doe@anthropic.com",
    "personalEmail": "john.doe@gmail.com",
    "phone": "+1 (415) 555-0123"
  },
  "creditsUsed": 1
}`}
        />

        <EndpointBlock
          method="POST"
          path="/api/enrichment/bulk"
          description="Create a bulk enrichment job"
          auth="session"
          parameters={[
            {
              name: "listId",
              type: "string",
              required: true,
              description: "List ID containing leads to enrich",
            },
            {
              name: "fields",
              type: "string[]",
              required: false,
              description: "Fields to enrich: workEmail, personalEmail, phone",
            },
          ]}
          requestExample={`{
  "listId": "list-123",
  "fields": ["workEmail", "phone"]
}`}
          responseExample={`{
  "jobId": "bulk-job-456",
  "status": "pending",
  "totalLeads": 500,
  "estimatedCredits": 500
}`}
        />

        <EndpointBlock
          method="GET"
          path="/api/enrichment/bulk/:jobId"
          description="Get status of a bulk enrichment job"
          auth="session"
          parameters={[
            {
              name: "jobId",
              type: "string",
              required: true,
              description: "Bulk job ID",
            },
          ]}
          responseExample={`{
  "jobId": "bulk-job-456",
  "status": "processing",
  "totalLeads": 500,
  "processedLeads": 250,
  "successCount": 230,
  "failedCount": 20,
  "creditsUsed": 230
}`}
        />

        <div>
          <h2 className="text-xl font-semibold mb-4">Credit Usage</h2>
          <p className="text-gray-600 mb-4">
            Enrichment uses credits based on the data found:
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold">Data Type</th>
                  <th className="text-left py-3 px-4 font-semibold">Credits</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                <tr>
                  <td className="py-3 px-4">Work Email</td>
                  <td className="py-3 px-4 text-gray-600">1 credit per verified email</td>
                </tr>
                <tr>
                  <td className="py-3 px-4">Personal Email</td>
                  <td className="py-3 px-4 text-gray-600">1 credit per verified email</td>
                </tr>
                <tr>
                  <td className="py-3 px-4">Phone Number</td>
                  <td className="py-3 px-4 text-gray-600">2 credits per verified phone</td>
                </tr>
                <tr>
                  <td className="py-3 px-4">No data found</td>
                  <td className="py-3 px-4 text-gray-600">0 credits (no charge)</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-4">Data Sources</h2>
          <p className="text-gray-600 mb-4">
            Enrich Engine aggregates data from multiple providers to maximize coverage.
            You can configure which providers to use in Settings &gt; Enrichment Providers.
          </p>
          <ul className="list-disc list-inside text-gray-600 space-y-2">
            <li>Apollo - Business emails and phone numbers</li>
            <li>Hunter - Email verification and discovery</li>
            <li>Clearbit - Company and person enrichment</li>
            <li>And more...</li>
          </ul>
        </div>
      </section>
    </DocsLayout>
  );
}
