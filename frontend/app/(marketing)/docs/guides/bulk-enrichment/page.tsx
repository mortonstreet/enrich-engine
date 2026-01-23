import { DocsLayout } from "@/components/docs/DocsLayout";
import { CodeBlock } from "@/components/docs/CodeBlock";
import Link from "next/link";

export default function BulkEnrichmentPage() {
  return (
    <DocsLayout
      title="Bulk Enrichment Guide"
      description="Best practices for enriching large lists of leads."
    >
      <section className="space-y-8">
        <div>
          <p className="text-gray-600 mb-6">
            Bulk enrichment allows you to add emails, phone numbers, and other data
            to hundreds or thousands of leads at once. This guide covers best practices
            for maximizing data quality and minimizing costs.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-4">Workflow Overview</h2>
          <ol className="list-decimal list-inside text-gray-600 space-y-3">
            <li>
              <strong>Prepare your list:</strong> Ensure leads have LinkedIn URLs
              (the primary identifier for enrichment)
            </li>
            <li>
              <strong>Choose enrichment fields:</strong> Select which data you need
              (work email, personal email, phone)
            </li>
            <li>
              <strong>Start the job:</strong> Create a bulk enrichment job via API or dashboard
            </li>
            <li>
              <strong>Monitor progress:</strong> Track completion and success rates
            </li>
            <li>
              <strong>Review results:</strong> Check enriched data and handle failures
            </li>
          </ol>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-4">Starting a Bulk Job</h2>

          <h3 className="text-lg font-semibold mt-6 mb-3">Via Dashboard</h3>
          <ol className="list-decimal list-inside text-gray-600 space-y-2">
            <li>Navigate to your list in the Lists section</li>
            <li>Click &quot;Enrich&quot; button</li>
            <li>Select the fields you want to enrich</li>
            <li>Review the credit estimate</li>
            <li>Click &quot;Start Enrichment&quot;</li>
          </ol>

          <h3 className="text-lg font-semibold mt-6 mb-3">Via API</h3>
          <CodeBlock
            code={`POST /api/enrichment/bulk
Content-Type: application/json

{
  "listId": "list-123",
  "fields": ["workEmail", "phone"]
}`}
            language="json"
          />
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-4">Credit Usage</h2>
          <p className="text-gray-600 mb-4">
            Credits are only charged when data is found:
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold">Data Type</th>
                  <th className="text-left py-3 px-4 font-semibold">Credits</th>
                  <th className="text-left py-3 px-4 font-semibold">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                <tr>
                  <td className="py-3 px-4">Work Email</td>
                  <td className="py-3 px-4 font-mono">1</td>
                  <td className="py-3 px-4 text-gray-600">Per verified email</td>
                </tr>
                <tr>
                  <td className="py-3 px-4">Personal Email</td>
                  <td className="py-3 px-4 font-mono">1</td>
                  <td className="py-3 px-4 text-gray-600">Per verified email</td>
                </tr>
                <tr>
                  <td className="py-3 px-4">Phone Number</td>
                  <td className="py-3 px-4 font-mono">2</td>
                  <td className="py-3 px-4 text-gray-600">Direct dials cost more</td>
                </tr>
                <tr>
                  <td className="py-3 px-4">No data found</td>
                  <td className="py-3 px-4 font-mono">0</td>
                  <td className="py-3 px-4 text-gray-600">No charge for misses</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="p-4 rounded-lg bg-green-50 border border-green-200 mt-4">
            <p className="text-green-800 text-sm">
              <strong>Tip:</strong> You only pay for successful enrichments. If no email
              is found for a lead, you&apos;re not charged for that attempt.
            </p>
          </div>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-4">Data Sources</h2>
          <p className="text-gray-600 mb-4">
            Enrich Engine aggregates data from multiple providers. You can configure
            which providers to use in Settings &gt; Enrichment Providers.
          </p>
          <div className="space-y-3">
            <div className="p-4 rounded-lg border border-gray-200">
              <h3 className="font-semibold mb-1">Apollo</h3>
              <p className="text-gray-600 text-sm">Business emails and phone numbers. Good coverage for B2B contacts.</p>
            </div>
            <div className="p-4 rounded-lg border border-gray-200">
              <h3 className="font-semibold mb-1">Hunter</h3>
              <p className="text-gray-600 text-sm">Email discovery and verification. Strong for company email patterns.</p>
            </div>
            <div className="p-4 rounded-lg border border-gray-200">
              <h3 className="font-semibold mb-1">Clearbit</h3>
              <p className="text-gray-600 text-sm">Company and person enrichment. Good for firmographic data.</p>
            </div>
          </div>
          <p className="text-gray-600 mt-4 text-sm">
            The system automatically queries multiple providers and returns the best match.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-4">Best Practices</h2>

          <div className="space-y-4">
            <div className="p-4 rounded-lg border border-green-200 bg-green-50">
              <h3 className="font-semibold text-green-800 mb-2">Start with LinkedIn URLs</h3>
              <p className="text-green-700 text-sm">
                Enrichment is most accurate when leads have valid LinkedIn profile URLs.
                Use the scrape feature first to find profiles, then enrich.
              </p>
            </div>

            <div className="p-4 rounded-lg border border-green-200 bg-green-50">
              <h3 className="font-semibold text-green-800 mb-2">Enrich Recent Data</h3>
              <p className="text-green-700 text-sm">
                Contact information changes frequently. Enrich leads shortly before
                you plan to reach out for best results.
              </p>
            </div>

            <div className="p-4 rounded-lg border border-green-200 bg-green-50">
              <h3 className="font-semibold text-green-800 mb-2">Batch Similar Leads</h3>
              <p className="text-green-700 text-sm">
                Group leads by similar characteristics (industry, company size) for
                more consistent enrichment rates.
              </p>
            </div>

            <div className="p-4 rounded-lg border border-amber-200 bg-amber-50">
              <h3 className="font-semibold text-amber-800 mb-2">Review Before Large Jobs</h3>
              <p className="text-amber-700 text-sm">
                For lists over 1000 leads, test with a small batch first to check
                data quality and match rates.
              </p>
            </div>
          </div>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-4">Monitoring Jobs</h2>
          <p className="text-gray-600 mb-4">
            Track bulk job progress via API:
          </p>
          <CodeBlock
            code={`GET /api/enrichment/bulk/job-123

{
  "jobId": "job-123",
  "status": "processing",
  "totalLeads": 500,
  "processedLeads": 250,
  "successCount": 230,
  "failedCount": 20,
  "creditsUsed": 245
}`}
            language="json"
          />
          <p className="text-gray-600 mt-4">
            Job statuses:
          </p>
          <ul className="list-disc list-inside text-gray-600 mt-2 space-y-1">
            <li><code className="bg-gray-100 px-1 rounded">pending</code> - Job queued, not started</li>
            <li><code className="bg-gray-100 px-1 rounded">processing</code> - Actively enriching</li>
            <li><code className="bg-gray-100 px-1 rounded">completed</code> - All leads processed</li>
            <li><code className="bg-gray-100 px-1 rounded">failed</code> - Job failed with error</li>
          </ul>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-4">Handling Failures</h2>
          <p className="text-gray-600 mb-4">
            Some leads may not enrich successfully. Common reasons:
          </p>
          <ul className="list-disc list-inside text-gray-600 space-y-2">
            <li>Invalid or non-existent LinkedIn URL</li>
            <li>Person no longer at the company (stale data)</li>
            <li>Private profile or restricted visibility</li>
            <li>Small company with limited data coverage</li>
            <li>Person not in any data provider&apos;s database</li>
          </ul>
          <p className="text-gray-600 mt-4">
            Failed enrichments don&apos;t consume credits. You can try enriching failed
            leads again later as data providers update their databases.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-4">Related Resources</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <Link
              href="/docs/api-reference/enrich"
              className="p-4 rounded-lg border border-gray-200 hover:border-[#E63946]/30 hover:shadow-md transition-all"
            >
              <h3 className="font-semibold mb-1">Enrich API Reference</h3>
              <p className="text-sm text-gray-600">Complete API documentation</p>
            </Link>
            <Link
              href="/docs/guides/scraping-linkedin"
              className="p-4 rounded-lg border border-gray-200 hover:border-[#E63946]/30 hover:shadow-md transition-all"
            >
              <h3 className="font-semibold mb-1">LinkedIn Scraping</h3>
              <p className="text-sm text-gray-600">Find LinkedIn profiles first</p>
            </Link>
          </div>
        </div>
      </section>
    </DocsLayout>
  );
}
