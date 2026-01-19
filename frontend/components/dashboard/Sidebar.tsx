/* eslint-disable  @typescript-eslint/no-explicit-any */

"use client";
import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Settings, LogOut, ChevronDown, Plus, Shield, Palette, Search, FolderOpen, Users, Sparkles } from "lucide-react";
import { useOrganizations, useSetActiveOrganizationMutation } from "@/hooks/api/useOrganization";
import { toast } from "sonner";
import { useActiveOrganization } from "@/lib/auth-client";
import { useSession } from "@/lib/auth-client";

const nav = [
  { href: "/dashboard",  label: "Scrape",  icon: Search },
  { href: "/dashboard/lists",  label: "Lists",  icon: FolderOpen },
  { href: "/dashboard/leads",  label: "Leads",  icon: Users },
  { href: "/dashboard/enrich",  label: "Enrich",  icon: Sparkles },
];

const bottom = [
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

const adminNav = [
  { href: "/dashboard/admin", label: "Admin", icon: Shield },
  { href: "/dashboard/theme-builder", label: "Theme Builder", icon: Palette },
];

export default function Sidebar({
  onLogout,
  onOpenCreateOrg,
  variant = "fixed",
  collapsed = false,
}: {
  onLogout?: () => void;
  onOpenCreateOrg?: () => void;
  variant?: "fixed" | "embedded";
  collapsed?: boolean;
}) {
  const isEmbedded = variant === "embedded";
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [orgDropdownOpen, setOrgDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const activeOrganization = useActiveOrganization();
  const { data: organizations } = useOrganizations();
  const setActiveMutation = useSetActiveOrganizationMutation();
  const { data: session } = useSession();
  const isAdmin = (session?.user as any)?.role === "admin";

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOrgDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
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

  const NavItem = ({
    href, label, icon: Icon, active, onClick, isCollapsed,
  }: { href: string; label: string; icon: any; active?: boolean; onClick?: () => void; isCollapsed?: boolean }) => (
    <Link
      href={href}
      onClick={onClick}
      title={isCollapsed ? label : undefined}
      className={`
        group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200
        ${active
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
        }
        ${isCollapsed ? "justify-center" : ""}
      `}
    >
      <Icon className={`h-4 w-4 flex-shrink-0 ${active ? "text-primary" : ""}`} />
      {!isCollapsed && <span className="truncate">{label}</span>}
    </Link>
  );

  // Embedded sidebar (for layouts) - simplified version without org switcher and logout
  if (isEmbedded) {
    return (
      <aside className="w-full h-full px-3 py-4 flex flex-col">
        {/* Header */}
        <div className={`mb-6 flex items-center ${collapsed ? "justify-center" : "px-1"}`}>
          {!collapsed && (
            <Link href="/dashboard" className="text-xl font-semibold tracking-tight text-foreground hover:opacity-80 transition">
              Enrich Engine
            </Link>
          )}
        </div>

        {/* Primary nav */}
        <nav className="space-y-1">
          {nav.map((n) => (
            <NavItem
              key={n.href}
              href={n.href}
              label={n.label}
              icon={n.icon}
              active={n.href === "/dashboard" ? pathname === n.href : pathname?.startsWith(n.href)}
              isCollapsed={collapsed}
            />
          ))}

          {isAdmin && (
            <>
              <div className="my-3 border-t border-border" />
              {adminNav.map((n) => (
                <NavItem
                  key={n.href}
                  href={n.href}
                  label={n.label}
                  icon={n.icon}
                  active={pathname?.startsWith(n.href)}
                  isCollapsed={collapsed}
                />
              ))}
            </>
          )}
        </nav>

        {/* Settings - with spacing above (close to main nav) */}
        <div className="mt-6">
          {bottom.map((n) => (
            <NavItem
              key={n.href}
              href={n.href}
              label={n.label}
              icon={n.icon}
              active={pathname?.startsWith(n.href)}
              isCollapsed={collapsed}
            />
          ))}
        </div>
      </aside>
    );
  }

  // Fixed sidebar (standalone) - used for mobile with full features
  return (
    <>
      {/* Mobile Top Nav */}
      <div className="sm:hidden fixed top-2 left-2 right-2 z-30 bg-card rounded-2xl border border-border shadow-sm">
        <div className="flex items-center justify-between px-4 py-3">
          <Link href="/dashboard" className="text-lg font-semibold tracking-tight text-foreground hover:opacity-80 transition">
            Enrich Engine
          </Link>

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="relative w-8 h-8 flex flex-col items-center justify-center gap-1.5"
            aria-label="Toggle menu"
          >
            <span
              className={[
                "block w-5 h-0.5 bg-foreground transition-all duration-300",
                mobileMenuOpen ? "rotate-45 translate-y-2" : "",
              ].join(" ")}
            />
            <span
              className={[
                "block w-5 h-0.5 bg-foreground transition-all duration-300",
                mobileMenuOpen ? "opacity-0" : "",
              ].join(" ")}
            />
            <span
              className={[
                "block w-5 h-0.5 bg-foreground transition-all duration-300",
                mobileMenuOpen ? "-rotate-45 -translate-y-2" : "",
              ].join(" ")}
            />
          </button>
        </div>

        {/* Mobile Dropdown Menu */}
        <div
          className={[
            "overflow-hidden transition-all duration-300",
            mobileMenuOpen ? "max-h-screen opacity-100" : "max-h-0 opacity-0",
          ].join(" ")}
        >
          <nav className="px-4 py-4 space-y-1 border-t border-border bg-card rounded-b-2xl">
            {nav.map((n) => (
              <NavItem
                key={n.href}
                href={n.href}
                label={n.label}
                icon={n.icon}
                active={n.href === "/dashboard" ? pathname === n.href : pathname?.startsWith(n.href)}
                onClick={() => setMobileMenuOpen(false)}
              />
            ))}

            {isAdmin && adminNav.map((n) => (
              <NavItem
                key={n.href}
                href={n.href}
                label={n.label}
                icon={n.icon}
                active={pathname?.startsWith(n.href)}
                onClick={() => setMobileMenuOpen(false)}
              />
            ))}

            <div className="pt-4 mt-4 border-t border-border space-y-1">
              {bottom.map((n) => (
                <NavItem
                  key={n.href}
                  href={n.href}
                  label={n.label}
                  icon={n.icon}
                  active={pathname?.startsWith(n.href)}
                  onClick={() => setMobileMenuOpen(false)}
                />
              ))}

              {/* Mobile Organization Switcher */}
              <div className="space-y-2 pt-2">
                <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase">
                  Organizations
                </div>
                {organizations?.data?.map((org) => (
                  <button
                    key={org.id}
                    onClick={() => {
                      handleSwitchOrg(org.id);
                      setMobileMenuOpen(false);
                    }}
                    disabled={setActiveMutation.isPending}
                    className={`
                      w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition
                      text-foreground
                      ${org.id === activeOrganization?.data?.id ? 'bg-muted' : 'hover:bg-muted/50'}
                      disabled:opacity-50 disabled:cursor-not-allowed
                    `}
                  >
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-primary font-semibold text-sm">
                        {org.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <span className="flex-1 min-w-0 text-left text-foreground">{org.name}</span>
                    {org.id === activeOrganization?.data?.id && (
                      <span className="flex-shrink-0 text-primary">✓</span>
                    )}
                  </button>
                ))}
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onOpenCreateOrg?.();
                  }}
                  className="
                    w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium
                    text-primary hover:bg-muted/50 transition
                  "
                >
                  <Plus className="h-5 w-5" />
                  <span>Create Organization</span>
                </button>
              </div>

              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onLogout?.();
                }}
                className="
                  group flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium
                  text-destructive hover:bg-destructive/10 transition
                "
              >
                <LogOut className="h-4 w-4" />
                <span>Sign out</span>
              </button>
            </div>
          </nav>
        </div>
      </div>
    </>
  );
}
