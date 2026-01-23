import { DocsLayout } from "@/components/docs/DocsLayout";
import Link from "next/link";
import { Search, Database, Users, List, AlertTriangle, Key, CheckCircle2 } from "lucide-react";

const endpoints = [
  {
    title: "Authentication",
    description: "Learn about session-based and API key authentication",
    icon: Key,
    href: "/docs/api-reference/authentication",
    color: "bg-violet-500",
  },
  {
    title: "Search",
    description: "Search for people by role, company, or keywords",
    icon: Search,
    href: "/docs/api-reference/search",
    color: "bg-blue-500",
  },
  {
    title: "Scrape",
    description: "Bulk scrape LinkedIn profiles from CSV files",
    icon: Database,
    href: "/docs/api-reference/scrape",
    color: "bg-emerald-500",
  },
  {
    title: "Enrich",
    description: "Enrich profiles with emails, phones, and more",
    icon: Users,
    href: "/docs/api-reference/enrich",
    color: "bg-amber-500",
  },
  {
    title: "Lists",
    description: "Manage lead lists and folders",
    icon: List,
    href: "/docs/api-reference/lists",
    color: "bg-pink-500",
  },
  {
    title: "Verification",
    description: "Verify email addresses using SMTP and API",
    icon: CheckCircle2,
    href: "/docs/api-reference/verification",
    color: "bg-cyan-500",
  },
  {
    title: "Errors",
    description: "Error codes and troubleshooting",
    icon: AlertTriangle,
    href: "/docs/api-reference/errors",
    color: "bg-red-500",
  },
];

export default function ApiReferencePage() {
  return (
    <DocsLayout
      title="API Reference"
      description="Complete documentation for all Enrich Engine API endpoints."
    >
      <section>
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Base URL</h2>
          <div className="p-4 bg-gray-100 rounded-xl font-mono text-sm">
            https://api.enrichengine.io/api
          </div>
        </div>

        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Authentication</h2>
          <p className="text-gray-600 mb-4">
            Most endpoints require authentication. There are two methods:
          </p>
          <ul className="list-disc list-inside text-gray-600 space-y-2">
            <li>
              <strong>Session auth</strong> - For dashboard access. Credentials included automatically with cookies.
            </li>
            <li>
              <strong>API Key auth</strong> - For external access. Include <code className="bg-gray-100 px-1 rounded">X-API-Key</code> header.
            </li>
          </ul>
        </div>

        <h2 className="text-xl font-semibold mb-4">Endpoints</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {endpoints.map((endpoint) => (
            <Link
              key={endpoint.href}
              href={endpoint.href}
              className="p-4 rounded-xl border border-gray-200 hover:border-[#E63946]/30 hover:shadow-md transition-all group"
            >
              <div className="flex items-start gap-4">
                <div className={`w-10 h-10 ${endpoint.color} rounded-lg flex items-center justify-center text-white flex-shrink-0`}>
                  <endpoint.icon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1 group-hover:text-[#E63946] transition-colors">
                    {endpoint.title}
                  </h3>
                  <p className="text-sm text-gray-600">{endpoint.description}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </DocsLayout>
  );
}
