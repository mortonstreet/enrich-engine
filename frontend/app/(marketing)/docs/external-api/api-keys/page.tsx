import { DocsLayout } from "@/components/docs/DocsLayout";
import { CodeBlock } from "@/components/docs/CodeBlock";

export default function ApiKeysPage() {
  return (
    <DocsLayout
      title="API Key Management"
      description="Create and manage API keys for external integrations."
    >
      <section className="space-y-8">
        <div>
          <p className="text-gray-600 mb-6">
            API keys provide secure access to the External API for third-party tools
            and custom integrations. Each key can have specific scopes to limit access.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-4">Creating an API Key</h2>
          <ol className="list-decimal list-inside text-gray-600 space-y-3">
            <li>Navigate to <strong>Settings &gt; API Keys</strong> in the dashboard</li>
            <li>Click <strong>Create API Key</strong></li>
            <li>Enter a descriptive name (e.g., &quot;GTM Dialer Production&quot;)</li>
            <li>Select the required scopes for your integration</li>
            <li>Optionally set an expiration date</li>
            <li>Click <strong>Create</strong></li>
            <li>
              <strong>Important:</strong> Copy the key immediately. The full key is only shown once.
            </li>
          </ol>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-4">Key Format</h2>
          <p className="text-gray-600 mb-4">
            API keys follow this format:
          </p>
          <CodeBlock
            code={`ee_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`}
            language="text"
          />
          <ul className="list-disc list-inside text-gray-600 mt-4 space-y-2">
            <li><code className="bg-gray-100 px-1 rounded">ee_</code> - Enrich Engine prefix</li>
            <li><code className="bg-gray-100 px-1 rounded">live_</code> - Environment indicator</li>
            <li><code className="bg-gray-100 px-1 rounded">xxx...</code> - Unique key identifier</li>
          </ul>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-4">Available Scopes</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold">Scope</th>
                  <th className="text-left py-3 px-4 font-semibold">Permissions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                <tr>
                  <td className="py-3 px-4 font-mono text-sm">lists:read</td>
                  <td className="py-3 px-4 text-gray-600">
                    View lists, list metadata, and list counts
                  </td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-mono text-sm">lists:write</td>
                  <td className="py-3 px-4 text-gray-600">
                    Create, update, and delete lists
                  </td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-mono text-sm">leads:read</td>
                  <td className="py-3 px-4 text-gray-600">
                    View lead details including contact information
                  </td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-mono text-sm">leads:write</td>
                  <td className="py-3 px-4 text-gray-600">
                    Create, update, and delete leads
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-4">Security Best Practices</h2>
          <div className="space-y-4">
            <div className="p-4 rounded-lg border border-gray-200">
              <h3 className="font-semibold mb-2">Never expose keys in client-side code</h3>
              <p className="text-gray-600 text-sm">
                API keys should only be used in server-side code or secure backends.
                Never include them in JavaScript bundles, mobile apps, or public repositories.
              </p>
            </div>
            <div className="p-4 rounded-lg border border-gray-200">
              <h3 className="font-semibold mb-2">Use environment variables</h3>
              <p className="text-gray-600 text-sm">
                Store API keys in environment variables, not in code:
              </p>
              <CodeBlock
                code={`# .env file
ENRICH_API_KEY=ee_live_xxxxxxxxxxxxx

# Access in code
const apiKey = process.env.ENRICH_API_KEY;`}
                language="bash"
              />
            </div>
            <div className="p-4 rounded-lg border border-gray-200">
              <h3 className="font-semibold mb-2">Principle of least privilege</h3>
              <p className="text-gray-600 text-sm">
                Only grant the scopes your integration actually needs. If you only need
                to read lists for a dialer, don&apos;t include write scopes.
              </p>
            </div>
            <div className="p-4 rounded-lg border border-gray-200">
              <h3 className="font-semibold mb-2">Rotate keys regularly</h3>
              <p className="text-gray-600 text-sm">
                Create new keys periodically and revoke old ones. Set expiration dates
                for keys that don&apos;t need indefinite access.
              </p>
            </div>
            <div className="p-4 rounded-lg border border-gray-200">
              <h3 className="font-semibold mb-2">Use separate keys per integration</h3>
              <p className="text-gray-600 text-sm">
                Create a unique key for each integration. This allows you to revoke
                access to one integration without affecting others.
              </p>
            </div>
          </div>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-4">Managing Keys</h2>
          <p className="text-gray-600 mb-4">
            In the API Keys section of Settings, you can:
          </p>
          <ul className="list-disc list-inside text-gray-600 space-y-2">
            <li><strong>View all keys</strong> - See key names, prefixes, scopes, and last used timestamps</li>
            <li><strong>Revoke keys</strong> - Immediately disable a key (cannot be undone)</li>
            <li><strong>Rename keys</strong> - Update the display name for organization</li>
          </ul>
          <p className="text-gray-600 mt-4">
            <strong>Note:</strong> You cannot view the full key after creation, only the prefix
            (e.g., <code className="bg-gray-100 px-1 rounded">ee_live_abc...</code>). If you lose a key, create a new one.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-4">Troubleshooting</h2>
          <div className="space-y-4">
            <div className="p-4 rounded-lg border border-red-200 bg-red-50">
              <h3 className="font-semibold mb-2 text-red-800">401 Unauthorized</h3>
              <ul className="list-disc list-inside text-red-700 text-sm space-y-1">
                <li>Verify the key is correct and hasn&apos;t been revoked</li>
                <li>Check the header format: <code className="bg-red-100 px-1 rounded">X-API-Key: ee_live_xxx</code></li>
                <li>Ensure the key hasn&apos;t expired</li>
              </ul>
            </div>
            <div className="p-4 rounded-lg border border-red-200 bg-red-50">
              <h3 className="font-semibold mb-2 text-red-800">403 Forbidden</h3>
              <ul className="list-disc list-inside text-red-700 text-sm space-y-1">
                <li>Check that the key has the required scopes for the endpoint</li>
                <li>Verify you&apos;re accessing resources in the key&apos;s organization</li>
              </ul>
            </div>
          </div>
        </div>
      </section>
    </DocsLayout>
  );
}
