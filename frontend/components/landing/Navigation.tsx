"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { ChevronDown, ChevronRight, Code, Database, Search, Users, Briefcase, FileText, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import EnrichEngineLogo from "@/components/landing/EnrichEngineLogo";

const productsMenu = [
  {
    id: "api",
    title: "API",
    description: "LinkedIn scraping, email finding, and bulk enrichment",
    icon: Code,
    href: "/docs",
    preview: {
      type: "code",
      content: `enrich = Enrich(api_key = "a8849c5...")

result = enrich.find_email(
  ["linkedin.com/in/sarah"],
  verified = True
)`,
    },
  },
  {
    id: "bulk",
    title: "Bulk Enrich",
    description: "Process thousands of leads at once",
    icon: Database,
    href: "/bulk-enrich",
    preview: {
      type: "table",
      headers: ["Name", "Email", "Status"],
      rows: [
        { icon: "P", name: "Sarah Chen", email: "sarah@scale.ai", status: "Verified" },
        { icon: "M", name: "Mike Rodriguez", email: "mike@notion.so", status: "Verified" },
        { icon: "J", name: "Jennifer Kim", email: "jen@figma.com", status: "Verified" },
      ],
    },
  },
  {
    id: "search",
    title: "Search",
    description: "Find leads by role, company, or location",
    icon: Search,
    href: "/search",
    preview: {
      type: "search",
      placeholder: "VP of Sales at startups...",
    },
  },
];

const companyMenu = {
  about: [
    { title: "About", description: "Our mission and story", icon: Briefcase, href: "/about" },
    { title: "Careers", description: "Build the future of enrichment", icon: Users, href: "/careers", badge: "We're hiring" },
    { title: "Case Studies", description: "How top teams use Enrich", icon: FileText, href: "/case-studies" },
  ],
  more: [
    { title: "Contact", href: "/contact" },
    { title: "Blog", href: "/blog" },
    { title: "Brand", href: "/brand" },
  ],
};


export default function Navigation() {
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [activeProduct, setActiveProduct] = useState(productsMenu[0]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileExpanded, setMobileExpanded] = useState<string | null>(null);

  // Close mobile menu on resize to desktop (lg breakpoint = 1024px)
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setMobileMenuOpen(false);
        setMobileExpanded(null);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-black/5">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center">
            <EnrichEngineLogo size={32} showText textSize="md" />
          </Link>

          {/* Center nav - visible at lg (1024px+) where mega menus fit */}
          <div className="hidden lg:flex items-center gap-1">
            {/* Products */}
            <div
              className="relative"
              onMouseEnter={() => setActiveMenu("products")}
              onMouseLeave={() => setActiveMenu(null)}
            >
              <button className={`flex items-center gap-1 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                activeMenu === "products" ? "bg-gray-100 text-black" : "text-gray-600 hover:text-black"
              }`}>
                Products
                <ChevronDown className="w-4 h-4" />
              </button>

              {activeMenu === "products" && (
                <div className="absolute top-full left-1/2 -translate-x-1/2 pt-2">
                  <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 p-6 w-[800px] grid grid-cols-3 gap-6">
                    {productsMenu.map((item) => (
                      <Link
                        key={item.id}
                        href={item.href}
                        onMouseEnter={() => setActiveProduct(item)}
                        className={`block text-left p-4 rounded-xl transition-colors ${
                          activeProduct.id === item.id ? "bg-gray-50" : "hover:bg-gray-50"
                        }`}
                      >
                        <h3 className="font-semibold text-base mb-1">{item.title}</h3>
                        <p className="text-gray-500 text-sm">{item.description}</p>

                        {/* Preview */}
                        <div className="mt-4">
                          {item.preview.type === "code" && (
                            <div className="bg-[#1a1a2e] rounded-lg p-3 text-xs font-mono">
                              <pre className="text-gray-300 whitespace-pre-wrap">
                                <span className="text-blue-400">enrich</span> = <span className="text-yellow-300">Enrich</span>(api_key = <span className="text-green-400">&quot;a88...&quot;</span>)
                              </pre>
                            </div>
                          )}
                          {item.preview.type === "table" && (
                            <div className="bg-gray-50 rounded-lg p-2 text-xs">
                              <div className="grid grid-cols-3 gap-2 text-gray-400 mb-2 px-1">
                                <span>Name</span>
                                <span>Email</span>
                                <span>Status</span>
                              </div>
                              {item.preview.rows?.slice(0, 2).map((row, i) => (
                                <div key={i} className="grid grid-cols-3 gap-2 py-1 px-1 text-gray-700">
                                  <span className="flex items-center gap-1">
                                    <span className="w-4 h-4 rounded bg-blue-100 text-blue-600 text-[10px] flex items-center justify-center">{row.icon}</span>
                                    {row.name.split(" ")[0]}
                                  </span>
                                  <span className="text-blue-600 truncate">{row.email}</span>
                                  <span className="text-green-600">{row.status}</span>
                                </div>
                              ))}
                            </div>
                          )}
                          {item.preview.type === "search" && (
                            <div className="bg-gray-50 rounded-lg p-2">
                              <div className="flex items-center gap-2 text-gray-400 text-sm">
                                <Search className="w-4 h-4" />
                                <span>{item.preview.placeholder}</span>
                              </div>
                            </div>
                          )}
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Company */}
            <div
              className="relative"
              onMouseEnter={() => setActiveMenu("company")}
              onMouseLeave={() => setActiveMenu(null)}
            >
              <button className={`flex items-center gap-1 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                activeMenu === "company" ? "bg-gray-100 text-black" : "text-gray-600 hover:text-black"
              }`}>
                Company
                <ChevronDown className="w-4 h-4" />
              </button>

              {activeMenu === "company" && (
                <div className="absolute top-full left-1/2 -translate-x-1/2 pt-2">
                  <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 p-6 w-[500px] grid grid-cols-2 gap-8">
                    <div>
                      <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-4">About Us</p>
                      <div className="space-y-1">
                        {companyMenu.about.map((item) => (
                          <Link
                            key={item.title}
                            href={item.href}
                            className="flex items-start gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors group"
                          >
                            <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-gray-600 group-hover:bg-[#E63946] group-hover:text-white transition-colors">
                              <item.icon className="w-5 h-5" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-sm">{item.title}</span>
                                {item.badge && (
                                  <span className="text-[10px] px-2 py-0.5 bg-blue-100 text-blue-600 rounded-full">{item.badge}</span>
                                )}
                              </div>
                              <p className="text-gray-500 text-xs">{item.description}</p>
                            </div>
                          </Link>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-4">More</p>
                      <div className="space-y-1">
                        {companyMenu.more.map((item) => (
                          <Link
                            key={item.title}
                            href={item.href}
                            className="block px-3 py-2 text-sm text-gray-700 hover:text-black hover:bg-gray-50 rounded-lg transition-colors"
                          >
                            {item.title}
                          </Link>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <Link href="/pricing" className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-black transition-colors">
              Pricing
            </Link>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-3">
            <Link
              href="/contact"
              className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-black transition-colors hidden lg:block"
            >
              Contact sales
            </Link>
            <Link href="/login" className="hidden lg:block">
              <Button className="bg-[#111827] text-white hover:bg-black rounded-lg px-4 py-2 text-sm font-medium">
                Sign in
              </Button>
            </Link>

            {/* Mobile menu button - visible below lg (1024px) */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
              aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            >
              {mobileMenuOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu overlay - visible below lg */}
      {mobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 top-16 bg-black/20 z-40"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Mobile menu drawer - visible below lg */}
      <div
        className={`lg:hidden fixed top-16 left-0 right-0 bottom-0 bg-white z-50 transform transition-transform duration-300 ease-in-out ${
          mobileMenuOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="h-full overflow-y-auto pb-20">
          <div className="px-4 sm:px-6 md:px-8 py-4 md:py-6 space-y-2 max-w-2xl mx-auto">
            {/* Products accordion */}
            <div className="border-b border-gray-100">
              <button
                onClick={() => setMobileExpanded(mobileExpanded === "products" ? null : "products")}
                className="flex items-center justify-between w-full py-4 text-left"
              >
                <span className="text-base font-medium">Products</span>
                <ChevronRight className={`w-5 h-5 text-gray-400 transition-transform ${
                  mobileExpanded === "products" ? "rotate-90" : ""
                }`} />
              </button>
              {mobileExpanded === "products" && (
                <div className="pb-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                  {productsMenu.map((item) => (
                    <Link
                      key={item.id}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-start gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors"
                    >
                      <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-gray-600 flex-shrink-0">
                        <item.icon className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <span className="font-medium text-sm block">{item.title}</span>
                        <p className="text-gray-500 text-xs line-clamp-2">{item.description}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Company accordion */}
            <div className="border-b border-gray-100">
              <button
                onClick={() => setMobileExpanded(mobileExpanded === "company" ? null : "company")}
                className="flex items-center justify-between w-full py-4 text-left"
              >
                <span className="text-base font-medium">Company</span>
                <ChevronRight className={`w-5 h-5 text-gray-400 transition-transform ${
                  mobileExpanded === "company" ? "rotate-90" : ""
                }`} />
              </button>
              {mobileExpanded === "company" && (
                <div className="pb-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 mb-3">
                    {companyMenu.about.map((item) => (
                      <Link
                        key={item.title}
                        href={item.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex items-start gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors"
                      >
                        <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-gray-600 flex-shrink-0">
                          <item.icon className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-sm">{item.title}</span>
                            {item.badge && (
                              <span className="text-[10px] px-2 py-0.5 bg-blue-100 text-blue-600 rounded-full whitespace-nowrap">{item.badge}</span>
                            )}
                          </div>
                          <p className="text-gray-500 text-xs line-clamp-2">{item.description}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                  <div className="pt-3 border-t border-gray-100 flex flex-wrap gap-2">
                    {companyMenu.more.map((item) => (
                      <Link
                        key={item.title}
                        href={item.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className="px-4 py-2 text-sm text-gray-700 hover:text-black hover:bg-gray-50 rounded-lg transition-colors"
                      >
                        {item.title}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Pricing link */}
            <Link
              href="/pricing"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-between py-4 border-b border-gray-100"
            >
              <span className="text-base font-medium">Pricing</span>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </Link>

            {/* Contact sales link */}
            <Link
              href="/contact"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-between py-4 border-b border-gray-100"
            >
              <span className="text-base font-medium">Contact sales</span>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </Link>
          </div>

          {/* Mobile CTA */}
          <div className="px-4 sm:px-6 md:px-8 py-4 md:py-6 border-t border-gray-100 mt-4 max-w-2xl mx-auto">
            <div className="flex flex-col sm:flex-row gap-3">
              <Link href="/login" onClick={() => setMobileMenuOpen(false)} className="flex-1">
                <Button className="w-full bg-[#111827] text-white hover:bg-black rounded-lg px-4 py-3 text-sm font-medium">
                  Sign in
                </Button>
              </Link>
              <Link href="/signup" onClick={() => setMobileMenuOpen(false)} className="flex-1">
                <Button variant="outline" className="w-full rounded-lg px-4 py-3 text-sm font-medium">
                  Get started free
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
