/* eslint-disable  @typescript-eslint/no-explicit-any */

"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChevronDown,
  Check,
  Plus,
  LogOut,
  Search,
  FileText,
  Wand2,
  Database,
  BarChart3,
  CreditCard,
  Key,
  Settings,
  BookOpen,
  ExternalLink,
  MessageSquare,
  Home,
  Users,
  FolderOpen,
  Shield,
  Palette,
} from "lucide-react";
import { useOrganizations, useSetActiveOrganizationMutation } from "@/hooks/api/useOrganization";
import { toast } from "sonner";
import { useActiveOrganization, useSession } from "@/lib/auth-client";
import EnrichEngineLogo from "@/components/landing/EnrichEngineLogo";

// Navigation structure with groups
const navGroups = [
  {
    id: "main",
    items: [
      { href: "/dashboard", label: "Home", icon: Home, exact: true },
    ],
  },
  {
    id: "playground",
    label: "API Playground",
    items: [
      { href: "/dashboard/search", label: "Search", icon: Search },
      { href: "/dashboard/scrape", label: "Scrape", icon: FileText },
      { href: "/dashboard/enrich", label: "Enrich", icon: Wand2 },
      { href: "/dashboard/bulk", label: "Bulk", icon: Database },
    ],
  },
  {
    id: "management",
    label: "Management",
    items: [
      { href: "/dashboard/lists", label: "Lists", icon: FolderOpen },
      { href: "/dashboard/leads", label: "Leads", icon: Users },
      { href: "/dashboard/history", label: "Usage", icon: BarChart3 },
      { href: "/dashboard/settings", label: "Settings", icon: Settings },
    ],
  },
  {
    id: "learn",
    label: "Learn",
    items: [
      { href: "/docs", label: "Docs", icon: BookOpen, external: true },
      { href: "/demos", label: "Demos", icon: ExternalLink, external: true },
    ],
  },
];

const adminNav = [
  { href: "/dashboard/admin", label: "Admin", icon: Shield },
  { href: "/dashboard/theme-builder", label: "Theme Builder", icon: Palette },
];

interface AppSidebarProps {
  onLogout: () => void;
  onOpenCreateOrg: () => void;
}

export default function AppSidebar({ onLogout, onOpenCreateOrg }: AppSidebarProps) {
  const pathname = usePathname();
  const [orgDropdownOpen, setOrgDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { data: session } = useSession();
  const activeOrganization = useActiveOrganization();
  const { data: organizations } = useOrganizations();
  const setActiveMutation = useSetActiveOrganizationMutation();
  const isAdmin = (session?.user as any)?.role === "admin";

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOrgDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSwitchOrg = (orgId: string) => {
    setActiveMutation.mutate(
      { organizationId: orgId },
      {
        onSuccess: () => {
          toast.success("Organization switched successfully");
          setOrgDropdownOpen(false);
        },
        onError: () => {
          toast.error("Failed to switch organization");
        },
      }
    );
  };

  const isActive = (item: { href: string; exact?: boolean }) => {
    if (item.exact || item.href === "/dashboard") {
      return pathname === item.href;
    }
    return pathname?.startsWith(item.href);
  };

  const NavItem = ({
    href,
    label,
    icon: Icon,
    active,
    external,
  }: {
    href: string;
    label: string;
    icon: any;
    active?: boolean;
    external?: boolean;
  }) => {
    const Component = external ? "a" : Link;
    const linkProps = external ? { target: "_blank", rel: "noopener noreferrer" } : {};

    return (
      <Component
        href={href}
        {...linkProps}
        className={`
          group flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all duration-150
          ${active
            ? "bg-[#E63946]/10 text-[#E63946] font-medium"
            : "text-gray-600 hover:text-gray-900 hover:bg-gray-100/80"
          }
        `}
      >
        <Icon className={`h-4 w-4 flex-shrink-0 ${active ? "text-[#E63946]" : "text-gray-500"}`} />
        <span className="flex-1">{label}</span>
        {external && <ExternalLink className="h-3 w-3 text-gray-400" />}
      </Component>
    );
  };

  return (
    <aside className="w-[220px] h-full bg-white border-r border-gray-200 flex flex-col">
      {/* Logo Header */}
      <div className="px-4 py-3 border-b border-gray-100">
        <Link href="/dashboard" className="flex items-center">
          <EnrichEngineLogo size={28} showText textSize="sm" animated />
        </Link>
      </div>

      {/* Workspace Selector */}
      <div className="p-3 border-b border-gray-100" ref={dropdownRef}>
        <button
          onClick={() => setOrgDropdownOpen(!orgDropdownOpen)}
          className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <div className="w-6 h-6 bg-[#E63946] rounded flex items-center justify-center flex-shrink-0">
            <span className="text-white text-xs font-bold">
              {activeOrganization?.data?.name?.charAt(0).toUpperCase() || "E"}
            </span>
          </div>
          <span className="flex-1 text-left text-sm font-medium text-gray-900 truncate">
            {activeOrganization?.data?.name || "Personal"}
          </span>
          <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${orgDropdownOpen ? "rotate-180" : ""}`} />
        </button>

        {/* Org Dropdown */}
        {orgDropdownOpen && (
          <div className="absolute left-3 right-3 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden z-50">
            <div className="p-2 max-h-48 overflow-y-auto">
              {organizations?.data?.map((org) => (
                <button
                  key={org.id}
                  onClick={() => handleSwitchOrg(org.id)}
                  disabled={setActiveMutation.isPending}
                  className={`
                    w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors text-left
                    ${org.id === activeOrganization?.data?.id ? "bg-gray-100" : "hover:bg-gray-50"}
                    disabled:opacity-50 disabled:cursor-not-allowed
                  `}
                >
                  <div className="w-5 h-5 bg-[#E63946]/10 rounded flex items-center justify-center flex-shrink-0">
                    <span className="text-[#E63946] text-xs font-semibold">
                      {org.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <span className="flex-1 truncate text-gray-700">{org.name}</span>
                  {org.id === activeOrganization?.data?.id && (
                    <Check className="h-3.5 w-3.5 text-[#E63946]" />
                  )}
                </button>
              ))}
            </div>
            <div className="border-t border-gray-100 p-2">
              <button
                onClick={() => {
                  setOrgDropdownOpen(false);
                  onOpenCreateOrg();
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[#E63946] hover:bg-[#E63946]/5 rounded-lg transition-colors"
              >
                <Plus className="h-4 w-4" />
                <span>Create workspace</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-6">
        {navGroups.map((group) => (
          <div key={group.id}>
            {group.label && (
              <p className="px-3 mb-2 text-xs font-medium text-gray-400 uppercase tracking-wider">
                {group.label}
              </p>
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => (
                <NavItem
                  key={item.href + item.label}
                  href={item.href}
                  label={item.label}
                  icon={item.icon}
                  active={isActive(item)}
                  external={(item as any).external}
                />
              ))}
            </div>
          </div>
        ))}

        {/* Admin section */}
        {isAdmin && (
          <div>
            <p className="px-3 mb-2 text-xs font-medium text-gray-400 uppercase tracking-wider">
              Admin
            </p>
            <div className="space-y-0.5">
              {adminNav.map((item) => (
                <NavItem
                  key={item.href}
                  href={item.href}
                  label={item.label}
                  icon={item.icon}
                  active={pathname?.startsWith(item.href)}
                />
              ))}
            </div>
          </div>
        )}
      </nav>

      {/* Bottom Section */}
      <div className="p-3 border-t border-gray-100 space-y-2">
        {/* Feedback */}
        <a
          href="https://www.enrichengine.io/contact"
          className="flex items-center gap-2 px-3 py-2 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
        >
          <MessageSquare className="h-4 w-4" />
          <span>Give us feedback</span>
        </a>

        {/* User Section */}
        <div className="flex items-center gap-2 px-3 py-2">
          <div className="w-7 h-7 rounded-full bg-[#E63946] flex items-center justify-center">
            <span className="text-white text-xs font-semibold">
              {session?.user?.name?.charAt(0).toUpperCase() || "U"}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {session?.user?.name || "User"}
            </p>
          </div>
          <button
            onClick={onLogout}
            className="p-2.5 text-gray-400 hover:text-[#E63946] hover:bg-[#E63946]/5 rounded-lg transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
            title="Sign out"
            aria-label="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
