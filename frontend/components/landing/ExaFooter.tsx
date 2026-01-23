"use client";

import Link from "next/link";
import { useEffect, useRef, useState, ReactNode } from "react";
import { EnrichEngineLogoStatic } from "@/components/landing/EnrichEngineLogo";

type FooterLink = {
  label: string;
  href: string;
  icon?: ReactNode;
};

const footerLinks: Record<string, FooterLink[]> = {
  Products: [
    { label: "API", href: "/docs" },
    { label: "Bulk Enrich", href: "/bulk-enrich" },
    { label: "Search", href: "/search" },
  ],
  Company: [
    { label: "About", href: "/about" },
    { label: "Careers", href: "/careers" },
    { label: "Blog", href: "/blog" },
    { label: "Contact", href: "/contact" },
  ],
  Resources: [
    { label: "Case Studies", href: "/case-studies" },
    { label: "Integrations", href: "/integrations" },
    { label: "Demos", href: "/demos" },
    { label: "FAQ", href: "/faq" },
    { label: "Pricing", href: "/pricing" },
  ],
  Connect: [
    { label: "Contact Sales", href: "/contact" },
    {
      label: "X",
      href: "https://x.com",
      icon: (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      ),
    },
    {
      label: "LinkedIn",
      href: "https://linkedin.com",
      icon: (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
        </svg>
      ),
    },
  ],
};

const footerCategories = Object.keys(footerLinks);

export default function ExaFooter() {
  const footerRef = useRef<HTMLElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.05, rootMargin: "50px" }
    );

    if (footerRef.current) {
      observer.observe(footerRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <footer
      ref={footerRef}
      className="relative bg-[#E63946] text-white"
      style={{
        position: "sticky",
        bottom: 0,
        zIndex: 0,
        minHeight: "calc(100vh - 64px)",
      }}
    >
      {/* Grain texture overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
          opacity: 0.12,
          mixBlendMode: "overlay",
        }}
      />

      {/* Mission statement hero section - exa.ai style */}
      <div className="relative z-10 pt-16 sm:pt-24 md:pt-40 lg:pt-48 pb-10 sm:pb-16 md:pb-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          {/* Mission statement */}
          <h2
            className={`text-2xl sm:text-3xl md:text-5xl lg:text-6xl font-light leading-[1.15] max-w-3xl transition-all ease-out ${
              isVisible
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-12"
            }`}
            style={{
              fontFamily: "'Source Serif 4', Georgia, serif",
              transitionDuration: "1400ms",
              transitionDelay: "250ms",
            }}
          >
            Unlock your next enterprise deal
          </h2>
        </div>
      </div>

      {/* Footer links section */}
      <div className="relative z-10 border-t border-white/15">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12 md:py-16">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-10 lg:gap-16">
            {footerCategories.map((category, categoryIndex) => (
              <div
                key={category}
                className={`transition-all ease-out ${
                  isVisible
                    ? "opacity-100 translate-y-0"
                    : "opacity-0 translate-y-10"
                }`}
                style={{
                  transitionDuration: "1200ms",
                  transitionDelay: `${500 + categoryIndex * 150}ms`,
                }}
              >
                <h4
                  className={`font-semibold text-base sm:text-lg mb-3 sm:mb-6 text-white transition-all ease-out ${
                    isVisible
                      ? "opacity-100 translate-y-0"
                      : "opacity-0 translate-y-6"
                  }`}
                  style={{
                    transitionDuration: "1000ms",
                    transitionDelay: `${600 + categoryIndex * 150}ms`,
                  }}
                >
                  {category}
                </h4>
                <ul className="space-y-2.5 sm:space-y-4">
                  {footerLinks[category].map((link, linkIndex) => (
                    <li
                      key={link.label}
                      className={`transition-all ease-out ${
                        isVisible
                          ? "opacity-100 translate-y-0"
                          : "opacity-0 translate-y-4"
                      }`}
                      style={{
                        transitionDuration: "1000ms",
                        transitionDelay: `${700 + categoryIndex * 150 + linkIndex * 80}ms`,
                      }}
                    >
                      <Link
                        href={link.href}
                        className="text-white/70 hover:text-white text-xs sm:text-sm transition-colors duration-300 flex items-center gap-2"
                      >
                        {link.icon ? link.icon : link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div
        className={`relative z-10 border-t border-white/15 transition-all ease-out ${
          isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
        }`}
        style={{
          transitionDuration: "1200ms",
          transitionDelay: "1200ms",
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div
              className={`flex flex-wrap items-center gap-4 sm:gap-6 transition-all ease-out ${
                isVisible
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-4"
              }`}
              style={{
                transitionDuration: "1000ms",
                transitionDelay: "1400ms",
              }}
            >
              <Link href="/" className="flex items-center gap-2">
                <EnrichEngineLogoStatic size={24} color="white" />
                <span className="text-white font-semibold text-base sm:text-lg">Enrich Engine</span>
              </Link>
              <div className="flex items-center gap-4">
                <Link
                  href="/privacy"
                  className="text-xs sm:text-sm text-white/50 hover:text-white transition-colors duration-300"
                >
                  Privacy
                </Link>
                <Link
                  href="/terms"
                  className="text-xs sm:text-sm text-white/50 hover:text-white transition-colors duration-300"
                >
                  Terms
                </Link>
              </div>
            </div>
            <div
              className={`flex items-center gap-2 sm:gap-3 transition-all ease-out ${
                isVisible
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-4"
              }`}
              style={{
                transitionDuration: "1000ms",
                transitionDelay: "1500ms",
              }}
            >
              <EnrichEngineLogoStatic size={20} color="white" />
              <p className="text-xs sm:text-sm text-white/60">
                © {new Date().getFullYear()} Enrich Engine
              </p>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
