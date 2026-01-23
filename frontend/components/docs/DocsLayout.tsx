"use client";

import Navigation from "@/components/landing/Navigation";
import ExaFooter from "@/components/landing/ExaFooter";
import { DocsSidebar } from "./DocsSidebar";

interface DocsLayoutProps {
  children: React.ReactNode;
  title: string;
  description?: string;
}

export function DocsLayout({ children, title, description }: DocsLayoutProps) {
  return (
    <div className="min-h-screen bg-white text-gray-900">
      <Navigation />
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="flex gap-12">
          <DocsSidebar />
          <main className="flex-1 min-w-0">
            <div className="mb-8">
              <h1 className="text-3xl font-semibold mb-2">{title}</h1>
              {description && (
                <p className="text-lg text-gray-600">{description}</p>
              )}
            </div>
            <div className="prose prose-gray max-w-none">
              {children}
            </div>
          </main>
        </div>
      </div>
      <ExaFooter />
    </div>
  );
}
