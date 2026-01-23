"use client";

import { useState, useEffect } from "react";

interface EnrichEngineLogoProps {
  size?: number;
  animated?: boolean;
  showText?: boolean;
  textSize?: "sm" | "md" | "lg";
  className?: string;
}

export default function EnrichEngineLogo({
  size = 40,
  animated = true,
  showText = false,
  textSize = "md",
  className = "",
}: EnrichEngineLogoProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [pulsePhase, setPulsePhase] = useState(0);

  // Subtle continuous pulse animation
  useEffect(() => {
    if (!animated) return;
    const interval = setInterval(() => {
      setPulsePhase((prev) => (prev + 1) % 360);
    }, 50);
    return () => clearInterval(interval);
  }, [animated]);

  const strokeOpacity = animated
    ? 0.7 + 0.3 * Math.sin((pulsePhase * Math.PI) / 180)
    : 1;

  const innerGlow = animated
    ? 0.1 + 0.1 * Math.sin((pulsePhase * Math.PI) / 180)
    : 0.15;

  const textSizeClasses = {
    sm: "text-base",
    md: "text-lg",
    lg: "text-xl",
  };

  return (
    <div
      className={`flex items-center gap-2 ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          viewBox="0 0 160 160"
          fill="none"
          className="transition-transform duration-300"
          style={{
            transform: isHovered ? "scale(1.05)" : "scale(1)",
          }}
        >
          {/* Glow filter */}
          <defs>
            <filter id="engineGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <linearGradient id="engineGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#E63946" />
              <stop offset="100%" stopColor="#C5303C" />
            </linearGradient>
          </defs>

          {/* Background glow on hover */}
          {(isHovered || animated) && (
            <path
              d="M 80 30 L 120 50 L 120 110 L 80 130 L 40 110 L 40 50 Z"
              fill="#E63946"
              fillOpacity={isHovered ? 0.15 : innerGlow}
              className="transition-all duration-300"
            />
          )}

          <g
            stroke="url(#engineGradient)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter={isHovered ? "url(#engineGlow)" : undefined}
            style={{ opacity: strokeOpacity }}
          >
            {/* Outer engine housing - hexagonal/block shape */}
            <path
              d="M 80 30 L 120 50 L 120 110 L 80 130 L 40 110 L 40 50 Z"
              fill="none"
              className="transition-all duration-300"
              style={{
                strokeDasharray: isHovered ? "0" : "none",
              }}
            />

            {/* Inner chamber - represents combustion core */}
            <path
              d="M 80 50 L 100 60 L 100 100 L 80 110 L 60 100 L 60 60 Z"
              fill="none"
              className="transition-all duration-300"
            />

            {/* Central power line - crankshaft/drive shaft */}
            <line
              x1="80"
              y1="50"
              x2="80"
              y2="110"
              className="transition-all duration-300"
              style={{
                strokeWidth: isHovered ? 4 : 3,
              }}
            />

            {/* Piston arms - horizontal connecting rods */}
            <line
              x1="60"
              y1="70"
              x2="100"
              y2="70"
              className="transition-all duration-300"
              style={{
                transform: isHovered ? "translateY(-2px)" : "translateY(0)",
              }}
            />
            <line
              x1="60"
              y1="90"
              x2="100"
              y2="90"
              className="transition-all duration-300"
              style={{
                transform: isHovered ? "translateY(2px)" : "translateY(0)",
              }}
            />
          </g>

          {/* Energy particles on hover */}
          {isHovered && (
            <>
              <circle cx="80" cy="80" r="3" fill="#E63946" fillOpacity="0.6">
                <animate
                  attributeName="r"
                  values="2;4;2"
                  dur="0.8s"
                  repeatCount="indefinite"
                />
                <animate
                  attributeName="fillOpacity"
                  values="0.6;0.3;0.6"
                  dur="0.8s"
                  repeatCount="indefinite"
                />
              </circle>
              <circle cx="80" cy="60" r="2" fill="#E63946" fillOpacity="0.4">
                <animate
                  attributeName="cy"
                  values="60;55;60"
                  dur="0.6s"
                  repeatCount="indefinite"
                />
              </circle>
              <circle cx="80" cy="100" r="2" fill="#E63946" fillOpacity="0.4">
                <animate
                  attributeName="cy"
                  values="100;105;100"
                  dur="0.6s"
                  repeatCount="indefinite"
                />
              </circle>
            </>
          )}
        </svg>
      </div>

      {showText && (
        <span
          className={`font-semibold tracking-tight text-[#111827] ${textSizeClasses[textSize]}`}
        >
          Enrich Engine
        </span>
      )}
    </div>
  );
}

// Export a simple static version for non-interactive contexts
export function EnrichEngineLogoStatic({
  size = 40,
  className = "",
  color = "#E63946",
}: {
  size?: number;
  className?: string;
  color?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 160 160"
      fill="none"
      className={className}
    >
      <g
        stroke={color}
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M 80 30 L 120 50 L 120 110 L 80 130 L 40 110 L 40 50 Z" fill="none" />
        <path d="M 80 50 L 100 60 L 100 100 L 80 110 L 60 100 L 60 60 Z" fill="none" />
        <line x1="80" y1="50" x2="80" y2="110" />
        <line x1="60" y1="70" x2="100" y2="70" />
        <line x1="60" y1="90" x2="100" y2="90" />
      </g>
    </svg>
  );
}

// SVG string for download
export const logoSvgString = `<svg width="160" height="160" viewBox="0 0 160 160" fill="none" xmlns="http://www.w3.org/2000/svg">
  <g stroke="#E63946" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
    <path d="M 80 30 L 120 50 L 120 110 L 80 130 L 40 110 L 40 50 Z" fill="none"/>
    <path d="M 80 50 L 100 60 L 100 100 L 80 110 L 60 100 L 60 60 Z" fill="none"/>
    <line x1="80" y1="50" x2="80" y2="110"/>
    <line x1="60" y1="70" x2="100" y2="70"/>
    <line x1="60" y1="90" x2="100" y2="90"/>
  </g>
</svg>`;

// Full logo with text for download
export const fullLogoSvgString = `<svg width="300" height="60" viewBox="0 0 300 60" fill="none" xmlns="http://www.w3.org/2000/svg">
  <g transform="translate(5, 5)">
    <g stroke="#E63946" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" transform="scale(0.3125)">
      <path d="M 80 30 L 120 50 L 120 110 L 80 130 L 40 110 L 40 50 Z" fill="none"/>
      <path d="M 80 50 L 100 60 L 100 100 L 80 110 L 60 100 L 60 60 Z" fill="none"/>
      <line x1="80" y1="50" x2="80" y2="110"/>
      <line x1="60" y1="70" x2="100" y2="70"/>
      <line x1="60" y1="90" x2="100" y2="90"/>
    </g>
  </g>
  <text x="65" y="38" font-family="system-ui, -apple-system, sans-serif" font-size="22" font-weight="600" fill="#111827">Enrich Engine</text>
</svg>`;
