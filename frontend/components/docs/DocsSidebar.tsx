"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";

interface NavItem {
  title: string;
  href: string;
  items?: NavItem[];
}

const navigation: NavItem[] = [
  {
    title: "Getting Started",
    href: "/docs/getting-started",
  },
  {
    title: "API Reference",
    href: "/docs/api-reference",
    items: [
      { title: "Authentication", href: "/docs/api-reference/authentication" },
      { title: "Search", href: "/docs/api-reference/search" },
      { title: "Scrape", href: "/docs/api-reference/scrape" },
      { title: "Enrich", href: "/docs/api-reference/enrich" },
      { title: "Lists", href: "/docs/api-reference/lists" },
      { title: "Verification", href: "/docs/api-reference/verification" },
      { title: "Errors", href: "/docs/api-reference/errors" },
    ],
  },
  {
    title: "External API",
    href: "/docs/external-api",
    items: [
      { title: "API Keys", href: "/docs/external-api/api-keys" },
    ],
  },
  {
    title: "Guides",
    href: "/docs/guides",
    items: [
      { title: "LinkedIn Scraping", href: "/docs/guides/scraping-linkedin" },
      { title: "SERP Queries", href: "/docs/guides/serp-queries" },
      { title: "Bulk Enrichment", href: "/docs/guides/bulk-enrichment" },
      { title: "Email Verification", href: "/docs/guides/email-verification" },
    ],
  },
];

function NavItemComponent({ item, depth = 0 }: { item: NavItem; depth?: number }) {
  const pathname = usePathname();
  const isActive = pathname === item.href;
  const isParentActive = item.items?.some(child => pathname === child.href);

  return (
    <div>
      <Link
        href={item.href}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
          isActive
            ? "bg-[#E63946]/10 text-[#E63946] font-medium"
            : isParentActive
            ? "text-gray-900 font-medium"
            : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
        }`}
        style={{ paddingLeft: `${12 + depth * 12}px` }}
      >
        {item.items && (
          <ChevronRight className={`w-4 h-4 transition-transform ${isParentActive ? "rotate-90" : ""}`} />
        )}
        {item.title}
      </Link>
      {item.items && (isActive || isParentActive) && (
        <div className="ml-2 mt-1 space-y-1">
          {item.items.map((child) => (
            <NavItemComponent key={child.href} item={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export function DocsSidebar() {
  return (
    <aside className="w-64 flex-shrink-0">
      <div className="sticky top-24 space-y-1">
        <Link
          href="/docs"
          className="block px-3 py-2 text-sm font-semibold text-gray-900 mb-4"
        >
          Documentation
        </Link>
        <nav className="space-y-1">
          {navigation.map((item) => (
            <NavItemComponent key={item.href} item={item} />
          ))}
        </nav>
      </div>
    </aside>
  );
}
