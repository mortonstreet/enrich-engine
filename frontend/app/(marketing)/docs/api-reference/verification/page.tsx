import { DocsLayout } from "@/components/docs/DocsLayout";
import { EndpointBlock } from "@/components/docs/EndpointBlock";
import { CodeBlock } from "@/components/docs/CodeBlock";

export default function VerificationApiPage() {
  return (
    <DocsLayout
      title="Verification API"
      description="Verify email addresses using SMTP checks and optional API fallback."
    >
      <section className="space-y-8">
        <div>
          <p className="text-gray-600 mb-6">
            The Verification API allows you to validate email addresses in your lead lists.
            Choose between fast free SMTP verification or hybrid verification with paid API fallback
            for higher accuracy.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-4">Verification Methods</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold">Method</th>
                  <th className="text-left py-3 px-4 font-semibold">Description</th>
                  <th className="text-left py-3 px-4 font-semibold">Cost</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                <tr>
                  <td className="py-3 px-4 font-mono text-sm">smtp_only</td>
                  <td className="py-3 px-4 text-gray-600">Direct SMTP verification (~85% accuracy)</td>
                  <td className="py-3 px-4 text-gray-600">Free</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-mono text-sm">smtp_api_fallback</td>
                  <td className="py-3 px-4 text-gray-600">SMTP first, then choose to fill gaps with API</td>
                  <td className="py-3 px-4 text-gray-600">Free + Optional</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-mono text-sm">api_only</td>
                  <td className="py-3 px-4 text-gray-600">MillionVerifier API for all emails (~99% accuracy)</td>
                  <td className="py-3 px-4 text-gray-600">$0.0005/email</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <EndpointBlock
          method="POST"
          path="/api/verification/jobs"
          description="Create a new email verification job"
          auth="session"
          parameters={[
            {
              name: "listId",
              type: "string",
              required: true,
              description: "ID of the list containing leads to verify",
            },
            {
              name: "verificationMethod",
              type: "string",
              required: true,
              description: "One of: smtp_only, smtp_api_fallback, api_only",
            },
          ]}
          requestExample={`{
  "listId": "list_abc123",
  "verificationMethod": "smtp_api_fallback"
}`}
          responseExample={`{
  "id": "job_xyz789",
  "listId": "list_abc123",
  "listName": "Q1 Prospects",
  "verificationStage": "smtp_verifying",
  "verificationMethod": "smtp_api_fallback",
  "totalEmails": 150,
  "processedEmails": 0,
  "smtpValidCount": 0,
  "smtpInvalidCount": 0,
  "smtpCatchAllCount": 0,
  "smtpUnknownCount": 0,
  "coveragePercentage": 0,
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-15T10:30:00Z"
}`}
        />

        <EndpointBlock
          method="GET"
          path="/api/verification/jobs/:jobId"
          description="Get verification job details"
          auth="session"
          parameters={[
            {
              name: "jobId",
              type: "string",
              required: true,
              description: "The verification job ID (URL parameter)",
            },
          ]}
          responseExample={`{
  "id": "job_xyz789",
  "listId": "list_abc123",
  "listName": "Q1 Prospects",
  "verificationStage": "awaiting_decision",
  "verificationMethod": "smtp_api_fallback",
  "totalEmails": 150,
  "processedEmails": 150,
  "smtpValidCount": 98,
  "smtpInvalidCount": 12,
  "smtpCatchAllCount": 25,
  "smtpUnknownCount": 15,
  "smtpCompletedAt": "2024-01-15T10:35:00Z",
  "coveragePercentage": 73.3,
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-15T10:35:00Z"
}`}
        />

        <EndpointBlock
          method="GET"
          path="/api/verification/jobs/:jobId/progress"
          description="Get detailed verification progress with domain statistics"
          auth="session"
          parameters={[
            {
              name: "jobId",
              type: "string",
              required: true,
              description: "The verification job ID (URL parameter)",
            },
          ]}
          responseExample={`{
  "job": {
    "id": "job_xyz789",
    "verificationStage": "smtp_verifying",
    "processedEmails": 75,
    "totalEmails": 150,
    "coveragePercentage": 50.0
  },
  "domainStats": [
    {
      "domain": "acme.com",
      "totalEmails": 12,
      "validCount": 8,
      "invalidCount": 2,
      "catchAllCount": 2,
      "unknownCount": 0,
      "isCatchAll": null
    }
  ]
}`}
        />

        <EndpointBlock
          method="GET"
          path="/api/verification/jobs/:jobId/estimate"
          description="Get cost estimate for filling verification gaps with API"
          auth="session"
          parameters={[
            {
              name: "jobId",
              type: "string",
              required: true,
              description: "The verification job ID (URL parameter)",
            },
          ]}
          responseExample={`{
  "jobId": "job_xyz789",
  "unknownCount": 15,
  "catchAllCount": 25,
  "totalGapCount": 40,
  "costPerEmail": 0.0005,
  "fillUnknownsCost": 0.01,
  "fillCatchAllCost": 0.01,
  "fillAllGapsCost": 0.02,
  "currentCoveragePercentage": 73.3,
  "projectedCoveragePercentage": 100.0
}`}
        />

        <EndpointBlock
          method="POST"
          path="/api/verification/jobs/:jobId/decision"
          description="Submit user decision for handling verification gaps"
          auth="session"
          parameters={[
            {
              name: "jobId",
              type: "string",
              required: true,
              description: "The verification job ID (URL parameter)",
            },
            {
              name: "decision",
              type: "string",
              required: true,
              description: "One of: accept_current, fill_unknowns_only, fill_catchall_only, fill_all_gaps",
            },
          ]}
          requestExample={`{
  "decision": "fill_unknowns_only"
}`}
          responseExample={`{
  "id": "job_xyz789",
  "verificationStage": "api_verifying",
  "userDecision": "fill_unknowns_only",
  "decisionMadeAt": "2024-01-15T10:40:00Z"
}`}
        />

        <div>
          <h2 className="text-xl font-semibold mb-4">Verification Stages</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold">Stage</th>
                  <th className="text-left py-3 px-4 font-semibold">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                <tr>
                  <td className="py-3 px-4 font-mono text-sm">pending</td>
                  <td className="py-3 px-4 text-gray-600">Job created, waiting to start</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-mono text-sm">smtp_verifying</td>
                  <td className="py-3 px-4 text-gray-600">SMTP verification in progress</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-mono text-sm">awaiting_decision</td>
                  <td className="py-3 px-4 text-gray-600">SMTP complete, waiting for user decision on gaps</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-mono text-sm">api_verifying</td>
                  <td className="py-3 px-4 text-gray-600">API verification in progress for gaps</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-mono text-sm">completed</td>
                  <td className="py-3 px-4 text-gray-600">All verification complete</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-4">User Decision Options</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold">Decision</th>
                  <th className="text-left py-3 px-4 font-semibold">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                <tr>
                  <td className="py-3 px-4 font-mono text-sm">accept_current</td>
                  <td className="py-3 px-4 text-gray-600">Keep SMTP results as-is (free)</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-mono text-sm">fill_unknowns_only</td>
                  <td className="py-3 px-4 text-gray-600">Use API for emails SMTP couldn&apos;t verify</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-mono text-sm">fill_catchall_only</td>
                  <td className="py-3 px-4 text-gray-600">Use API for catch-all domain emails</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-mono text-sm">fill_all_gaps</td>
                  <td className="py-3 px-4 text-gray-600">Use API for all unknowns and catch-alls</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-4">Verification Result Types</h2>
          <ul className="list-disc list-inside text-gray-600 space-y-2">
            <li><strong>Valid</strong> - Email is deliverable and exists</li>
            <li><strong>Invalid</strong> - Email will bounce (mailbox doesn&apos;t exist)</li>
            <li><strong>Catch-All</strong> - Domain accepts all emails (can&apos;t confirm mailbox)</li>
            <li><strong>Unknown</strong> - Verification couldn&apos;t be completed (timeout, blocked, etc.)</li>
          </ul>
        </div>
      </section>
    </DocsLayout>
  );
}
