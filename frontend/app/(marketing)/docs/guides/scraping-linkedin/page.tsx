import { DocsLayout } from "@/components/docs/DocsLayout";
import { CodeBlock } from "@/components/docs/CodeBlock";
import Link from "next/link";

export default function ScrapingLinkedInPage() {
  return (
    <DocsLayout
      title="LinkedIn Scraping Guide"
      description="How to bulk scrape LinkedIn profiles using CSV uploads."
    >
      <section className="space-y-8">
        <div>
          <p className="text-gray-600 mb-6">
            Enrich Engine&apos;s scraping system finds LinkedIn profiles by searching Google
            with targeted queries. Upload a CSV with company names, person names, or domains,
            and the system will discover matching profiles.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-4">Workflow Types</h2>
          <p className="text-gray-600 mb-4">
            The system automatically detects your workflow based on CSV columns:
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold">Workflow</th>
                  <th className="text-left py-3 px-4 font-semibold">Use Case</th>
                  <th className="text-left py-3 px-4 font-semibold">Required Columns</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                <tr>
                  <td className="py-3 px-4 font-medium">Company + Role</td>
                  <td className="py-3 px-4 text-gray-600">Find people by title at companies</td>
                  <td className="py-3 px-4 font-mono text-sm">company, role (or role1, role2...)</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-medium">Name Search</td>
                  <td className="py-3 px-4 text-gray-600">Find specific people by name</td>
                  <td className="py-3 px-4 font-mono text-sm">first_name, last_name</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-medium">Domain Search</td>
                  <td className="py-3 px-4 text-gray-600">Find people at domains/websites</td>
                  <td className="py-3 px-4 font-mono text-sm">domain, role (or role1, role2...)</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-4">CSV Format: Company + Role</h2>
          <p className="text-gray-600 mb-4">
            Find people by job title at specific companies. This is the most common workflow.
          </p>
          <CodeBlock
            code={`company,role
Anthropic,VP of Sales
Stripe,Head of Engineering
OpenAI,CTO
Notion,Product Manager`}
            language="csv"
            title="Simple Format"
          />
          <p className="text-gray-600 mt-4 mb-4">
            For multiple roles at the same company, use numbered role columns:
          </p>
          <CodeBlock
            code={`company,role1,role2,role3
Anthropic,CEO,CTO,VP of Sales
Stripe,CEO,CFO,Head of Product
OpenAI,CEO,CTO,VP of Engineering`}
            language="csv"
            title="Multiple Roles Format"
          />
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-4">CSV Format: Name Search</h2>
          <p className="text-gray-600 mb-4">
            Find LinkedIn profiles for specific people by name. Adding company improves accuracy.
          </p>
          <CodeBlock
            code={`first_name,last_name,company
John,Smith,Anthropic
Jane,Doe,Stripe
Mike,Johnson,OpenAI`}
            language="csv"
            title="Name Search Format"
          />
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-4">CSV Format: Domain Search</h2>
          <p className="text-gray-600 mb-4">
            Find people at companies when you have their website domain.
          </p>
          <CodeBlock
            code={`domain,role
anthropic.com,VP of Sales
stripe.com,Head of Engineering
openai.com,CTO`}
            language="csv"
            title="Domain Search Format"
          />
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-4">Multi-Person Scraping</h2>
          <p className="text-gray-600 mb-4">
            The system can find multiple people for the same role at a company.
            If you have duplicate rows, it will find different people for each:
          </p>
          <CodeBlock
            code={`company,role
Anthropic,Software Engineer
Anthropic,Software Engineer
Anthropic,Software Engineer`}
            language="csv"
          />
          <p className="text-gray-600 mt-4">
            This will find 3 different Software Engineers at Anthropic.
            The system tracks which profiles have been found and excludes them
            from subsequent searches to avoid duplicates.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-4">How It Works</h2>
          <ol className="list-decimal list-inside text-gray-600 space-y-3">
            <li>
              <strong>Query Generation:</strong> For each row, the system builds a Google search query
              like <code className="bg-gray-100 px-1 rounded">site:linkedin.com/in/ &quot;VP of Sales&quot; &quot;Anthropic&quot;</code>
            </li>
            <li>
              <strong>Search Execution:</strong> The query is sent to Serper (Google Search API)
            </li>
            <li>
              <strong>Result Extraction:</strong> LinkedIn profile URLs are extracted from results
            </li>
            <li>
              <strong>Name Parsing:</strong> First/last names are parsed from the result title
            </li>
            <li>
              <strong>Deduplication:</strong> Already-found URLs are excluded from future searches
            </li>
          </ol>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-4">Tips for Better Results</h2>
          <div className="space-y-4">
            <div className="p-4 rounded-lg border border-green-200 bg-green-50">
              <h3 className="font-semibold text-green-800 mb-2">Use Official Company Names</h3>
              <p className="text-green-700 text-sm">
                &quot;Anthropic&quot; works better than &quot;Anthropic AI&quot; or &quot;Anthropic, PBC&quot;.
                Use the name as it appears on LinkedIn company pages.
              </p>
            </div>
            <div className="p-4 rounded-lg border border-green-200 bg-green-50">
              <h3 className="font-semibold text-green-800 mb-2">Be Specific with Titles</h3>
              <p className="text-green-700 text-sm">
                &quot;VP of Sales&quot; yields better results than &quot;Sales&quot;.
                More specific titles have higher match precision.
              </p>
            </div>
            <div className="p-4 rounded-lg border border-green-200 bg-green-50">
              <h3 className="font-semibold text-green-800 mb-2">Unique Names Have Higher Success</h3>
              <p className="text-green-700 text-sm">
                Name searches work best for distinctive names. Common names like
                &quot;John Smith&quot; may return incorrect matches without additional context.
              </p>
            </div>
            <div className="p-4 rounded-lg border border-amber-200 bg-amber-50">
              <h3 className="font-semibold text-amber-800 mb-2">Profile Completeness Matters</h3>
              <p className="text-amber-700 text-sm">
                People with incomplete LinkedIn profiles or privacy settings may not
                appear in search results. This is a limitation of Google indexing.
              </p>
            </div>
          </div>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-4">Result Statuses</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold">Status</th>
                  <th className="text-left py-3 px-4 font-semibold">Meaning</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                <tr>
                  <td className="py-3 px-4 font-mono text-sm text-green-600">completed</td>
                  <td className="py-3 px-4 text-gray-600">LinkedIn profile found</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-mono text-sm text-amber-600">no_result</td>
                  <td className="py-3 px-4 text-gray-600">No matching profile in search results</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-mono text-sm text-red-600">failed</td>
                  <td className="py-3 px-4 text-gray-600">Search error (API limit, network issue)</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-4">Next Steps</h2>
          <p className="text-gray-600 mb-4">
            After scraping, you can:
          </p>
          <ul className="list-disc list-inside text-gray-600 space-y-2">
            <li>
              <strong>Sync to a list:</strong> Click &quot;Sync to List&quot; to create leads from found profiles
            </li>
            <li>
              <strong>Enrich profiles:</strong> Use the{" "}
              <Link href="/docs/api-reference/enrich" className="text-[#E63946] hover:underline">
                Enrich API
              </Link>{" "}
              to add emails and phone numbers
            </li>
            <li>
              <strong>Export results:</strong> Download as CSV for use in other tools
            </li>
          </ul>
        </div>
      </section>
    </DocsLayout>
  );
}
