import { DocsLayout } from "@/components/docs/DocsLayout";
import { CodeBlock } from "@/components/docs/CodeBlock";
import Link from "next/link";

export default function EmailVerificationGuidePage() {
  return (
    <DocsLayout
      title="Email Verification Guide"
      description="Learn how to verify email addresses efficiently and cost-effectively."
    >
      <section className="space-y-8">
        <div>
          <p className="text-gray-600 mb-6">
            Email verification helps you maintain list hygiene and improve deliverability.
            Enrich Engine offers a hybrid verification system that balances speed, accuracy, and cost.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-4">Understanding Verification Methods</h2>

          <div className="space-y-6">
            <div className="p-4 rounded-lg border border-gray-200">
              <h3 className="font-semibold mb-2">SMTP Verification (Free)</h3>
              <p className="text-gray-600 text-sm mb-3">
                Direct communication with email servers to check if an address exists.
              </p>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-green-600">Pros:</span>
                  <ul className="list-disc list-inside text-gray-600 mt-1">
                    <li>Completely free</li>
                    <li>Fast (1000+ emails in minutes)</li>
                    <li>No external dependencies</li>
                  </ul>
                </div>
                <div>
                  <span className="font-medium text-red-600">Cons:</span>
                  <ul className="list-disc list-inside text-gray-600 mt-1">
                    <li>~85% accuracy</li>
                    <li>Can&apos;t verify catch-all domains</li>
                    <li>Some servers block checks</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-lg border border-gray-200">
              <h3 className="font-semibold mb-2">API Verification (MillionVerifier)</h3>
              <p className="text-gray-600 text-sm mb-3">
                Third-party service with advanced verification techniques.
              </p>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-green-600">Pros:</span>
                  <ul className="list-disc list-inside text-gray-600 mt-1">
                    <li>~99% accuracy</li>
                    <li>Handles catch-all domains</li>
                    <li>Bypasses server blocks</li>
                  </ul>
                </div>
                <div>
                  <span className="font-medium text-red-600">Cons:</span>
                  <ul className="list-disc list-inside text-gray-600 mt-1">
                    <li>$0.0005 per email</li>
                    <li>Slower processing</li>
                    <li>External API dependency</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-4">Recommended Workflow</h2>
          <p className="text-gray-600 mb-4">
            For most use cases, we recommend the <strong>SMTP + API Fallback</strong> method:
          </p>

          <div className="space-y-4">
            <div className="flex gap-4 items-start">
              <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm flex-shrink-0">
                1
              </div>
              <div>
                <h4 className="font-semibold">Start SMTP Verification</h4>
                <p className="text-gray-600 text-sm">
                  Create a verification job with <code className="bg-gray-100 px-1 rounded">smtp_api_fallback</code> method.
                  This runs free SMTP checks on all emails.
                </p>
              </div>
            </div>

            <div className="flex gap-4 items-start">
              <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm flex-shrink-0">
                2
              </div>
              <div>
                <h4 className="font-semibold">Review Results</h4>
                <p className="text-gray-600 text-sm">
                  When SMTP completes, check your coverage percentage. Typically you&apos;ll see 60-85% definitive results
                  (valid or invalid), with the rest as catch-all or unknown.
                </p>
              </div>
            </div>

            <div className="flex gap-4 items-start">
              <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm flex-shrink-0">
                3
              </div>
              <div>
                <h4 className="font-semibold">Decide on Gaps</h4>
                <p className="text-gray-600 text-sm">
                  Choose whether to accept current results (free) or fill gaps using the paid API.
                  The cost estimate endpoint shows exactly what each option will cost.
                </p>
              </div>
            </div>

            <div className="flex gap-4 items-start">
              <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm flex-shrink-0">
                4
              </div>
              <div>
                <h4 className="font-semibold">Export Clean List</h4>
                <p className="text-gray-600 text-sm">
                  Download your list with verification status for each email. Filter by valid
                  emails only for outreach campaigns.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-4">Cost Optimization Tips</h2>
          <ul className="list-disc list-inside text-gray-600 space-y-2">
            <li>
              <strong>Start with SMTP</strong> - Always run free SMTP first to identify obvious invalids
            </li>
            <li>
              <strong>Fill unknowns only</strong> - Usually the best value; catch-alls often work fine
            </li>
            <li>
              <strong>Batch your lists</strong> - Verify in batches to control costs
            </li>
            <li>
              <strong>Check coverage first</strong> - If SMTP gives 80%+ coverage, you may not need API
            </li>
          </ul>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-4">Understanding Results</h2>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold">Status</th>
                  <th className="text-left py-3 px-4 font-semibold">Meaning</th>
                  <th className="text-left py-3 px-4 font-semibold">Recommendation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                <tr>
                  <td className="py-3 px-4">
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                      Valid
                    </span>
                  </td>
                  <td className="py-3 px-4 text-gray-600">Mailbox exists and accepts mail</td>
                  <td className="py-3 px-4 text-gray-600">Safe to email</td>
                </tr>
                <tr>
                  <td className="py-3 px-4">
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
                      Invalid
                    </span>
                  </td>
                  <td className="py-3 px-4 text-gray-600">Mailbox doesn&apos;t exist or domain invalid</td>
                  <td className="py-3 px-4 text-gray-600">Remove from list</td>
                </tr>
                <tr>
                  <td className="py-3 px-4">
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
                      Catch-All
                    </span>
                  </td>
                  <td className="py-3 px-4 text-gray-600">Domain accepts all emails</td>
                  <td className="py-3 px-4 text-gray-600">Likely valid, but verify with API if important</td>
                </tr>
                <tr>
                  <td className="py-3 px-4">
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                      Unknown
                    </span>
                  </td>
                  <td className="py-3 px-4 text-gray-600">Verification failed (timeout, blocked)</td>
                  <td className="py-3 px-4 text-gray-600">Verify with API for certainty</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-4">Example Integration</h2>
          <CodeBlock
            code={`// 1. Create verification job
const job = await fetch('/api/verification/jobs', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({
    listId: 'list_abc123',
    verificationMethod: 'smtp_api_fallback'
  })
}).then(r => r.json());

// 2. Poll for progress
const pollProgress = async () => {
  const progress = await fetch(\`/api/verification/jobs/\${job.id}/progress\`, {
    credentials: 'include'
  }).then(r => r.json());

  if (progress.job.verificationStage === 'awaiting_decision') {
    // SMTP complete, show decision UI
    return progress;
  }

  // Still processing, poll again
  setTimeout(pollProgress, 2000);
};

// 3. Get cost estimate
const estimate = await fetch(\`/api/verification/jobs/\${job.id}/estimate\`, {
  credentials: 'include'
}).then(r => r.json());

console.log(\`Fill all gaps: $\${estimate.fillAllGapsCost}\`);

// 4. Submit decision
await fetch(\`/api/verification/jobs/\${job.id}/decision\`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({
    decision: 'fill_unknowns_only'
  })
});`}
            language="javascript"
          />
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-4">Next Steps</h2>
          <ul className="list-disc list-inside text-gray-600 space-y-2">
            <li>
              <Link href="/docs/api-reference/verification" className="text-[#E63946] hover:underline">
                API Reference
              </Link>
              {" - "}Full endpoint documentation
            </li>
            <li>
              <Link href="/docs/guides/bulk-enrichment" className="text-[#E63946] hover:underline">
                Bulk Enrichment
              </Link>
              {" - "}Enrich emails before verification
            </li>
          </ul>
        </div>
      </section>
    </DocsLayout>
  );
}
