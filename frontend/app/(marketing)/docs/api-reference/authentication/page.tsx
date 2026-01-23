import { DocsLayout } from "@/components/docs/DocsLayout";
import { CodeBlock } from "@/components/docs/CodeBlock";

export default function AuthenticationPage() {
  return (
    <DocsLayout
      title="Authentication"
      description="Learn how to authenticate with the Enrich Engine API."
    >
      <section className="space-y-8">
        {/* Session Auth */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Session-Based Authentication</h2>
          <p className="text-gray-600 mb-4">
            The dashboard and web application use session-based authentication.
            When you log in, a session cookie is set that&apos;s automatically included
            in subsequent requests.
          </p>
          <p className="text-gray-600 mb-4">
            For API requests from the browser, include <code className="bg-gray-100 px-1 rounded">credentials: &apos;include&apos;</code> in your fetch options:
          </p>
          <CodeBlock
            code={`const response = await fetch('https://api.enrichengine.io/api/search/people', {
  method: 'POST',
  credentials: 'include',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    role: 'VP of Sales',
    company: 'Anthropic'
  })
});`}
            language="javascript"
            title="Browser Request with Session"
          />
        </div>

        {/* API Key Auth */}
        <div>
          <h2 className="text-xl font-semibold mb-4">API Key Authentication</h2>
          <p className="text-gray-600 mb-4">
            For external integrations (like GTM Dialer or custom scripts), use API key authentication.
            API keys provide scoped access to specific resources.
          </p>

          <h3 className="text-lg font-semibold mb-3">Creating an API Key</h3>
          <ol className="list-decimal list-inside text-gray-600 mb-4 space-y-2">
            <li>Go to <strong>Settings &gt; API Keys</strong> in the dashboard</li>
            <li>Click <strong>Create API Key</strong></li>
            <li>Enter a name and select the required scopes</li>
            <li>Copy the key immediately &mdash; it won&apos;t be shown again</li>
          </ol>

          <h3 className="text-lg font-semibold mb-3">Using the API Key</h3>
          <p className="text-gray-600 mb-4">
            Include your API key in the <code className="bg-gray-100 px-1 rounded">X-API-Key</code> header:
          </p>
          <CodeBlock
            code={`curl -X GET "https://api.enrichengine.io/api/external/lists" \\
  -H "X-API-Key: ee_live_xxxxxxxxxxxxx"`}
            language="bash"
            title="cURL Request"
          />
          <CodeBlock
            code={`const response = await fetch('https://api.enrichengine.io/api/external/lists', {
  headers: {
    'X-API-Key': 'ee_live_xxxxxxxxxxxxx'
  }
});`}
            language="javascript"
            title="JavaScript Request"
          />
        </div>

        {/* Scopes */}
        <div>
          <h2 className="text-xl font-semibold mb-4">API Key Scopes</h2>
          <p className="text-gray-600 mb-4">
            API keys can be created with specific scopes to limit access:
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold">Scope</th>
                  <th className="text-left py-3 px-4 font-semibold">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                <tr>
                  <td className="py-3 px-4 font-mono text-sm">lists:read</td>
                  <td className="py-3 px-4 text-gray-600">Read access to lists and their leads</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-mono text-sm">lists:write</td>
                  <td className="py-3 px-4 text-gray-600">Create, update, and delete lists</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-mono text-sm">leads:read</td>
                  <td className="py-3 px-4 text-gray-600">Read access to lead data</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-mono text-sm">leads:write</td>
                  <td className="py-3 px-4 text-gray-600">Create, update, and delete leads</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Security */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Security Best Practices</h2>
          <ul className="list-disc list-inside text-gray-600 space-y-2">
            <li>Never expose API keys in client-side code or public repositories</li>
            <li>Use environment variables to store API keys</li>
            <li>Create separate keys for different integrations</li>
            <li>Use the minimum required scopes for each key</li>
            <li>Rotate keys periodically and revoke unused keys</li>
            <li>Set expiration dates on keys when possible</li>
          </ul>
        </div>
      </section>
    </DocsLayout>
  );
}
