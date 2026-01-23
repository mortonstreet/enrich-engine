"use client";

import { useState } from "react";
import { Menu, X } from "lucide-react";
import AppSidebar from "@/components/dashboard/AppSidebar";
import MobileNav from "@/components/dashboard/MobileNav";
import { EnrichEngineLogoStatic } from "@/components/landing/EnrichEngineLogo";

interface AppLayoutProps {
  children: React.ReactNode;
  onLogout: () => void;
  onOpenCreateOrg: () => void;
}

export function AppLayout({ children, onLogout, onOpenCreateOrg }: AppLayoutProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="h-screen bg-white flex overflow-hidden">
      {/* Desktop Sidebar */}
      <div className="hidden md:flex flex-shrink-0">
        <AppSidebar onLogout={onLogout} onOpenCreateOrg={onOpenCreateOrg} />
      </div>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-white border-b border-gray-200">
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-[#E63946] rounded flex items-center justify-center overflow-hidden">
              <EnrichEngineLogoStatic size={18} color="#FFFFFF" />
            </div>
            <span className="font-semibold text-gray-900">Enrich</span>
          </div>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            {mobileMenuOpen ? (
              <X className="h-5 w-5 text-gray-600" />
            ) : (
              <Menu className="h-5 w-5 text-gray-600" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Sidebar Overlay */}
      {mobileMenuOpen && (
        <>
          <div
            className="md:hidden fixed inset-0 z-40 bg-black/20 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="md:hidden fixed inset-y-0 left-0 z-50 w-[280px] bg-white shadow-xl animate-in slide-in-from-left duration-200">
            <AppSidebar
              onLogout={() => {
                setMobileMenuOpen(false);
                onLogout();
              }}
              onOpenCreateOrg={() => {
                setMobileMenuOpen(false);
                onOpenCreateOrg();
              }}
            />
          </div>
        </>
      )}

      {/* Main Content */}
      <main className="flex-1 overflow-auto pt-14 pb-20 md:pt-0 md:pb-0 bg-[#FAFBFC]">
        {children}
      </main>

      {/* Mobile Bottom Navigation */}
      <MobileNav />
    </div>
  );
}
