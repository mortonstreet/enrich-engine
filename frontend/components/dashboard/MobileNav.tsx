"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Search, FileText, Wand2, FolderOpen, Settings } from "lucide-react";

const mobileNav = [
  { href: "/dashboard", label: "Home", icon: Home, exact: true },
  { href: "/dashboard/search", label: "Search", icon: Search },
  { href: "/dashboard/scrape", label: "Scrape", icon: FileText },
  { href: "/dashboard/enrich", label: "Enrich", icon: Wand2 },
  { href: "/dashboard/lists", label: "Lists", icon: FolderOpen },
];

export default function MobileNav() {
  const pathname = usePathname();

  const isActive = (item: { href: string; exact?: boolean }) => {
    if (item.exact || item.href === "/dashboard") {
      return pathname === item.href;
    }
    return pathname?.startsWith(item.href);
  };

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 pb-safe">
      <div className="flex items-center justify-around px-1 py-1">
        {mobileNav.map((item) => {
          const active = isActive(item);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center gap-0.5 min-w-[56px] min-h-[48px] px-2 py-1.5 rounded-lg transition-colors ${
                active
                  ? "text-[#E63946]"
                  : "text-gray-500 hover:text-gray-700 active:bg-gray-100"
              }`}
            >
              <item.icon className="h-5 w-5" />
              <span className="text-xs font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
