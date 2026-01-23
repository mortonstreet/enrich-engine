import { ImageResponse } from "next/og";

export const runtime = "edge";

export const alt = "Enrich Engine";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "linear-gradient(135deg, #FAFAFA 0%, #F5F5F5 100%)",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 40,
        }}
      >
        {/* Logo */}
        <svg
          width="160"
          height="160"
          viewBox="0 0 160 160"
          fill="none"
        >
          <g
            stroke="#E63946"
            strokeWidth="4"
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

        {/* Text */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 16,
          }}
        >
          <div
            style={{
              fontSize: 64,
              fontWeight: 700,
              color: "#111827",
              letterSpacing: "-0.02em",
            }}
          >
            Enrich Engine
          </div>
          <div
            style={{
              fontSize: 28,
              color: "#6B7280",
              fontWeight: 400,
            }}
          >
            Intelligent email enrichment platform
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
