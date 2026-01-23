import { DocsLayout } from "@/components/docs/DocsLayout";
import Link from "next/link";
import { Database, Search, Users, CheckCircle2 } from "lucide-react";

const guides = [
  {
    title: "LinkedIn Scraping",
    description: "Learn how to bulk scrape LinkedIn profiles using CSV uploads. Understand workflow types, CSV formats, and optimization tips.",
    icon: Database,
    href: "/docs/guides/scraping-linkedin",
    color: "bg-blue-500",
  },
  {
    title: "SERP Query Construction",
    description: "Understand how search queries are built for LinkedIn discovery. Optimize your inputs for better match rates.",
    icon: Search,
    href: "/docs/guides/serp-queries",
    color: "bg-emerald-500",
  },
  {
    title: "Bulk Enrichment",
    description: "Best practices for enriching large lists of leads with emails, phone numbers, and more.",
    icon: Users,
    href: "/docs/guides/bulk-enrichment",
    color: "bg-amber-500",
  },
  {
    title: "Email Verification",
    description: "Learn how to verify email addresses efficiently using SMTP and API verification methods.",
    icon: CheckCircle2,
    href: "/docs/guides/email-verification",
    color: "bg-cyan-500",
  },
];

export default function GuidesPage() {
  return (
    <DocsLayout
      title="Guides"
      description="In-depth tutorials and best practices for using Enrich Engine."
    >
      <section>
        <div className="grid gap-6">
          {guides.map((guide) => (
            <Link
              key={guide.href}
              href={guide.href}
              className="p-6 rounded-xl border border-gray-200 hover:border-[#E63946]/30 hover:shadow-md transition-all group"
            >
              <div className="flex items-start gap-4">
                <div className={`w-12 h-12 ${guide.color} rounded-xl flex items-center justify-center text-white flex-shrink-0`}>
                  <guide.icon className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold mb-2 group-hover:text-[#E63946] transition-colors">
                    {guide.title}
                  </h2>
                  <p className="text-gray-600">{guide.description}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </DocsLayout>
  );
}
