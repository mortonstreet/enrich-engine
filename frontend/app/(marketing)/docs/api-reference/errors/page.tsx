import { DocsLayout } from "@/components/docs/DocsLayout";
import { CodeBlock } from "@/components/docs/CodeBlock";

export default function ErrorsPage() {
  return (
    <DocsLayout
      title="Error Handling"
      description="Error codes and troubleshooting guide."
    >
      <section className="space-y-8">
        <div>
          <h2 className="text-xl font-semibold mb-4">Error Response Format</h2>
          <p className="text-gray-600 mb-4">
            All API errors return a consistent JSON format:
          </p>
          <CodeBlock
            code={`{
  "error": "Human-readable error message",
  "code": "ERROR_CODE",
  "details": {
    // Additional context (optional)
  }
}`}
            language="json"
          />
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-4">HTTP Status Codes</h2>
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
                  <td className="py-3 px-4 font-mono">200</td>
                  <td className="py-3 px-4 text-gray-600">Success</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-mono">400</td>
                  <td className="py-3 px-4 text-gray-600">Bad Request - Invalid parameters or missing required fields</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-mono">401</td>
                  <td className="py-3 px-4 text-gray-600">Unauthorized - Missing or invalid authentication</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-mono">403</td>
                  <td className="py-3 px-4 text-gray-600">Forbidden - Insufficient permissions or scope</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-mono">404</td>
                  <td className="py-3 px-4 text-gray-600">Not Found - Resource does not exist</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-mono">429</td>
                  <td className="py-3 px-4 text-gray-600">Too Many Requests - Rate limit exceeded</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-mono">500</td>
                  <td className="py-3 px-4 text-gray-600">Internal Server Error - Something went wrong on our end</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-4">Common Error Codes</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold">Code</th>
                  <th className="text-left py-3 px-4 font-semibold">Description</th>
                  <th className="text-left py-3 px-4 font-semibold">Resolution</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                <tr>
                  <td className="py-3 px-4 font-mono text-sm">INVALID_API_KEY</td>
                  <td className="py-3 px-4 text-gray-600">API key is invalid or expired</td>
                  <td className="py-3 px-4 text-gray-600">Check key in Settings &gt; API Keys</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-mono text-sm">INSUFFICIENT_SCOPE</td>
                  <td className="py-3 px-4 text-gray-600">API key lacks required scope</td>
                  <td className="py-3 px-4 text-gray-600">Create new key with needed scopes</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-mono text-sm">NO_ACTIVE_ORGANIZATION</td>
                  <td className="py-3 px-4 text-gray-600">No organization selected</td>
                  <td className="py-3 px-4 text-gray-600">Select an organization in dashboard</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-mono text-sm">INSUFFICIENT_CREDITS</td>
                  <td className="py-3 px-4 text-gray-600">Not enough credits for operation</td>
                  <td className="py-3 px-4 text-gray-600">Purchase more credits</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-mono text-sm">RATE_LIMIT_EXCEEDED</td>
                  <td className="py-3 px-4 text-gray-600">Too many requests</td>
                  <td className="py-3 px-4 text-gray-600">Wait and retry with backoff</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-mono text-sm">INVALID_CSV_FORMAT</td>
                  <td className="py-3 px-4 text-gray-600">CSV file has invalid columns</td>
                  <td className="py-3 px-4 text-gray-600">Check required columns for workflow</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-mono text-sm">RESOURCE_NOT_FOUND</td>
                  <td className="py-3 px-4 text-gray-600">Requested item doesn&apos;t exist</td>
                  <td className="py-3 px-4 text-gray-600">Verify ID is correct</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-4">Verification Error Codes</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold">Code</th>
                  <th className="text-left py-3 px-4 font-semibold">Description</th>
                  <th className="text-left py-3 px-4 font-semibold">Resolution</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                <tr>
                  <td className="py-3 px-4 font-mono text-sm">JOB_NOT_FOUND</td>
                  <td className="py-3 px-4 text-gray-600">Verification job doesn&apos;t exist</td>
                  <td className="py-3 px-4 text-gray-600">Check the job ID is correct</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-mono text-sm">INVALID_JOB_STAGE</td>
                  <td className="py-3 px-4 text-gray-600">Job is not in the expected stage</td>
                  <td className="py-3 px-4 text-gray-600">Wait for job to reach awaiting_decision stage</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-mono text-sm">NO_EMAILS_TO_VERIFY</td>
                  <td className="py-3 px-4 text-gray-600">List has no leads with email addresses</td>
                  <td className="py-3 px-4 text-gray-600">Enrich leads with emails first</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-4">Rate Limiting</h2>
          <p className="text-gray-600 mb-4">
            API requests are rate limited to ensure fair usage. Rate limit information
            is included in response headers:
          </p>
          <CodeBlock
            code={`X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1706054400`}
            language="text"
          />
          <p className="text-gray-600 mt-4">
            When you exceed the rate limit, you&apos;ll receive a 429 response. Implement
            exponential backoff in your client to handle this gracefully.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-4">Troubleshooting</h2>
          <div className="space-y-4">
            <div className="p-4 rounded-lg border border-gray-200">
              <h3 className="font-semibold mb-2">Getting 401 Unauthorized?</h3>
              <ul className="list-disc list-inside text-gray-600 text-sm space-y-1">
                <li>For session auth: Ensure <code className="bg-gray-100 px-1 rounded">credentials: &apos;include&apos;</code> is set</li>
                <li>For API key: Verify the key is active and not expired</li>
                <li>Check that the X-API-Key header is correctly formatted</li>
              </ul>
            </div>
            <div className="p-4 rounded-lg border border-gray-200">
              <h3 className="font-semibold mb-2">CSV upload failing?</h3>
              <ul className="list-disc list-inside text-gray-600 text-sm space-y-1">
                <li>Ensure file is valid CSV format (UTF-8 encoded)</li>
                <li>Check required columns for your workflow type</li>
                <li>File size must be under 10MB</li>
              </ul>
            </div>
            <div className="p-4 rounded-lg border border-gray-200">
              <h3 className="font-semibold mb-2">Low match rates on scraping?</h3>
              <ul className="list-disc list-inside text-gray-600 text-sm space-y-1">
                <li>Use accurate company names (official names work better)</li>
                <li>Specific job titles yield higher precision</li>
                <li>Names with unique spelling have higher match rates</li>
              </ul>
            </div>
          </div>
        </div>
      </section>
    </DocsLayout>
  );
}
