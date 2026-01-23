"use client";

import Navigation from "@/components/landing/Navigation";
import ExaFooter from "@/components/landing/ExaFooter";
import AnimatedPixelBackground from "@/components/landing/AnimatedPixelBackground";
import ScrollReveal from "@/components/landing/ScrollReveal";
import EnrichEngineLogo, { logoSvgString, fullLogoSvgString } from "@/components/landing/EnrichEngineLogo";
import { Download, Copy, Check } from "lucide-react";
import { useState } from "react";

const colors = [
  { name: "Primary Red", hex: "#E63946", usage: "Primary brand color, CTAs, accents" },
  { name: "Dark Red", hex: "#C5303C", usage: "Hover states, darker accents" },
  { name: "Light Red", hex: "#F07178", usage: "Backgrounds, highlights" },
  { name: "Dark", hex: "#111827", usage: "Text, headers, buttons" },
  { name: "Gray", hex: "#6B7280", usage: "Secondary text, borders" },
  { name: "Light Gray", hex: "#F3F4F6", usage: "Backgrounds, cards" },
];

const logoVariants = [
  { name: "Primary", bg: "bg-white", textColor: "text-[#111827]" },
  { name: "Dark Mode", bg: "bg-[#111827]", textColor: "text-white" },
  { name: "Red Background", bg: "bg-[#E63946]", textColor: "text-white" },
];

export default function BrandPage() {
  const [copiedColor, setCopiedColor] = useState<string | null>(null);
  const [downloadedFormat, setDownloadedFormat] = useState<string | null>(null);

  const copyToClipboard = (hex: string) => {
    navigator.clipboard.writeText(hex);
    setCopiedColor(hex);
    setTimeout(() => setCopiedColor(null), 2000);
  };

  const downloadSvg = (svgContent: string, filename: string) => {
    const blob = new Blob([svgContent], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setDownloadedFormat(filename);
    setTimeout(() => setDownloadedFormat(null), 2000);
  };

  return (
    <div className="min-h-screen text-[#111827]">
      <AnimatedPixelBackground />
      <div className="relative z-10 bg-white">
        <Navigation />
        <main>
          {/* Hero */}
          <section className="py-20 md:py-28 bg-white">
            <div className="max-w-4xl mx-auto px-6 text-center">
              <ScrollReveal>
                <h1
                  className="text-4xl md:text-5xl lg:text-6xl font-normal tracking-tight mb-6"
                  style={{ fontFamily: "'Source Serif 4', Georgia, serif" }}
                >
                  Brand Guidelines
                </h1>
                <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                  Resources and guidelines for using the Enrich Engine brand in your materials.
                </p>
              </ScrollReveal>
            </div>
          </section>

          {/* Logo */}
          <section className="py-16 bg-gray-50">
            <div className="max-w-6xl mx-auto px-6">
              <ScrollReveal>
                <h2 className="text-2xl font-semibold mb-8">Logo</h2>

                {/* Interactive Logo Showcase */}
                <div className="bg-white rounded-2xl border border-gray-200 p-8 mb-8">
                  <p className="text-sm text-gray-500 mb-6 text-center">Hover over the logo to see the interactive animation</p>
                  <div className="flex justify-center mb-8">
                    <EnrichEngineLogo size={120} showText textSize="lg" animated />
                  </div>
                </div>

                {/* Logo Variants */}
                <div className="grid md:grid-cols-3 gap-6 mb-8">
                  {logoVariants.map((variant, i) => (
                    <div key={i} className={`${variant.bg} rounded-2xl p-8 flex flex-col items-center justify-center border border-gray-200 gap-4`}>
                      <div className="flex items-center gap-3">
                        <EnrichEngineLogo
                          size={48}
                          showText
                          textSize="md"
                          animated={false}
                          className={variant.textColor}
                        />
                      </div>
                      <p className={`text-sm ${variant.textColor} opacity-70`}>{variant.name}</p>
                    </div>
                  ))}
                </div>

                {/* Download Options */}
                <div className="bg-white rounded-2xl border border-gray-200 p-6">
                  <h3 className="font-semibold mb-4">Download Logo Assets</h3>
                  <div className="grid md:grid-cols-3 gap-4">
                    <button
                      onClick={() => downloadSvg(logoSvgString, "enrich-engine-icon.svg")}
                      className="flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors group"
                    >
                      {downloadedFormat === "enrich-engine-icon.svg" ? (
                        <>
                          <Check className="w-4 h-4 text-green-500" />
                          <span className="text-green-600 font-medium">Downloaded!</span>
                        </>
                      ) : (
                        <>
                          <Download className="w-4 h-4 text-gray-600 group-hover:text-[#E63946]" />
                          <span className="text-gray-700">Icon Only (SVG)</span>
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => downloadSvg(fullLogoSvgString, "enrich-engine-full-logo.svg")}
                      className="flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors group"
                    >
                      {downloadedFormat === "enrich-engine-full-logo.svg" ? (
                        <>
                          <Check className="w-4 h-4 text-green-500" />
                          <span className="text-green-600 font-medium">Downloaded!</span>
                        </>
                      ) : (
                        <>
                          <Download className="w-4 h-4 text-gray-600 group-hover:text-[#E63946]" />
                          <span className="text-gray-700">Full Logo (SVG)</span>
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(logoSvgString);
                        setDownloadedFormat("copied");
                        setTimeout(() => setDownloadedFormat(null), 2000);
                      }}
                      className="flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors group"
                    >
                      {downloadedFormat === "copied" ? (
                        <>
                          <Check className="w-4 h-4 text-green-500" />
                          <span className="text-green-600 font-medium">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4 text-gray-600 group-hover:text-[#E63946]" />
                          <span className="text-gray-700">Copy SVG Code</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </ScrollReveal>
            </div>
          </section>

          {/* Colors */}
          <section className="py-16 bg-white">
            <div className="max-w-6xl mx-auto px-6">
              <ScrollReveal>
                <h2 className="text-2xl font-semibold mb-8">Colors</h2>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {colors.map((color, i) => (
                    <div
                      key={i}
                      className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-lg transition-all cursor-pointer group"
                      onClick={() => copyToClipboard(color.hex)}
                    >
                      <div
                        className="h-24"
                        style={{ backgroundColor: color.hex }}
                      />
                      <div className="p-4">
                        <div className="flex items-center justify-between mb-1">
                          <h3 className="font-semibold">{color.name}</h3>
                          <div className="flex items-center gap-1 text-sm text-gray-500">
                            {copiedColor === color.hex ? (
                              <>
                                <Check className="w-4 h-4 text-green-500" />
                                <span className="text-green-500">Copied!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                                <span className="font-mono">{color.hex}</span>
                              </>
                            )}
                          </div>
                        </div>
                        <p className="text-sm text-gray-500">{color.usage}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollReveal>
            </div>
          </section>

          {/* Typography */}
          <section className="py-16 bg-gray-50">
            <div className="max-w-6xl mx-auto px-6">
              <ScrollReveal>
                <h2 className="text-2xl font-semibold mb-8">Typography</h2>
                <div className="grid md:grid-cols-2 gap-8">
                  <div className="bg-white rounded-2xl p-8 border border-gray-100">
                    <p className="text-sm text-gray-500 mb-4">Headlines</p>
                    <p
                      className="text-4xl font-normal mb-2"
                      style={{ fontFamily: "'Source Serif 4', Georgia, serif" }}
                    >
                      Source Serif 4
                    </p>
                    <p className="text-gray-500">
                      Used for marketing headlines and display text.
                    </p>
                  </div>
                  <div className="bg-white rounded-2xl p-8 border border-gray-100">
                    <p className="text-sm text-gray-500 mb-4">Body Text</p>
                    <p className="text-4xl font-normal mb-2">Geist</p>
                    <p className="text-gray-500">
                      Used for body text, UI elements, and general content.
                    </p>
                  </div>
                </div>
              </ScrollReveal>
            </div>
          </section>

          {/* Usage Guidelines */}
          <section className="py-16 bg-white">
            <div className="max-w-4xl mx-auto px-6">
              <ScrollReveal>
                <h2 className="text-2xl font-semibold mb-8">Usage Guidelines</h2>
                <div className="space-y-6">
                  <div className="flex items-start gap-4">
                    <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 mt-1">
                      <Check className="w-4 h-4 text-green-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1">Do</h3>
                      <p className="text-gray-600">
                        Use the logo with adequate spacing. Maintain the aspect ratio when resizing.
                        Use approved color combinations.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 mt-1">
                      <span className="text-red-600 text-sm font-bold">×</span>
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1">Don&apos;t</h3>
                      <p className="text-gray-600">
                        Don&apos;t modify the logo colors or distort proportions.
                        Don&apos;t place the logo on busy backgrounds.
                      </p>
                    </div>
                  </div>
                </div>
              </ScrollReveal>
            </div>
          </section>

          {/* Download CTA */}
          <section className="py-16 bg-white">
            <div className="max-w-4xl mx-auto px-6 text-center">
              <h2 className="text-2xl md:text-3xl font-semibold text-[#111827] mb-4">
                Download the complete brand kit
              </h2>
              <p className="text-gray-600 mb-6">
                Includes logos, icons, color palette, and guidelines.
              </p>
              <button className="inline-flex items-center gap-2 bg-[#E63946] text-white hover:bg-[#C5303C] rounded-xl px-8 py-3 font-medium transition-colors">
                <Download className="w-4 h-4" />
                Download Brand Kit
              </button>
            </div>
          </section>
        </main>
      </div>
      <ExaFooter />
    </div>
  );
}
