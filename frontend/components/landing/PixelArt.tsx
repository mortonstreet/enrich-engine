"use client";

import { useEffect, useRef } from "react";

interface PixelArtProps {
  position: "left" | "right";
  variant?: number;
}

// Generate abstract data-visualization-like pixel clusters
function generatePixelCluster(
  ctx: CanvasRenderingContext2D,
  baseX: number,
  baseY: number,
  scale: number,
  opacity: number
) {
  const pixelSize = 8 * scale;
  const colors = [
    `rgba(255, 107, 53, ${opacity})`,    // Coral orange
    `rgba(255, 143, 101, ${opacity})`,   // Lighter orange
    `rgba(255, 87, 34, ${opacity})`,     // Deep orange
    `rgba(255, 171, 145, ${opacity * 0.7})`, // Peach
  ];

  // Create organic cluster patterns that look like data fragments
  const patterns = [
    // Vertical data stream
    [[0,0], [0,1], [0,2], [0,3], [1,1], [1,2], [-1,2]],
    // Horizontal spread
    [[0,0], [1,0], [2,0], [1,1], [2,1], [3,0]],
    // Diagonal flow
    [[0,0], [1,1], [2,2], [1,2], [2,3], [3,3]],
    // Cluster
    [[0,0], [1,0], [0,1], [1,1], [2,1], [1,2]],
    // Scattered
    [[0,0], [2,1], [1,3], [3,2], [0,4]],
    // L-shape
    [[0,0], [0,1], [0,2], [1,2], [2,2]],
    // Cross
    [[1,0], [0,1], [1,1], [2,1], [1,2]],
  ];

  const pattern = patterns[Math.floor(Math.random() * patterns.length)];

  pattern.forEach(([dx, dy]) => {
    const color = colors[Math.floor(Math.random() * colors.length)];
    ctx.fillStyle = color;
    ctx.fillRect(
      baseX + dx * pixelSize,
      baseY + dy * pixelSize,
      pixelSize - 1,
      pixelSize - 1
    );
  });
}

export default function PixelArt({ position, variant = 0 }: PixelArtProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = 400;
    const height = 800;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.scale(dpr, dpr);

    // Clear
    ctx.clearRect(0, 0, width, height);

    // Seed based on position and variant for consistent randomness
    const seed = position === "left" ? 12345 + variant : 67890 + variant;
    let random = seed;
    const seededRandom = () => {
      random = (random * 9301 + 49297) % 233280;
      return random / 233280;
    };

    // Generate clusters scattered along the edge
    const clusterCount = 8 + Math.floor(seededRandom() * 6);

    for (let i = 0; i < clusterCount; i++) {
      const progress = i / clusterCount;

      // Position clusters along the height with some randomness
      const baseY = progress * height * 0.9 + seededRandom() * 60;

      // X position: cluster near the edge but with variation
      let baseX: number;
      if (position === "left") {
        baseX = width * 0.3 + seededRandom() * width * 0.5;
      } else {
        baseX = seededRandom() * width * 0.5;
      }

      const scale = 0.6 + seededRandom() * 0.8;
      const opacity = 0.4 + seededRandom() * 0.5;

      generatePixelCluster(ctx, baseX, baseY, scale, opacity);
    }

    // Add some smaller scattered individual pixels for depth
    const scatterCount = 20 + Math.floor(seededRandom() * 15);
    for (let i = 0; i < scatterCount; i++) {
      const x = seededRandom() * width;
      const y = seededRandom() * height;
      const size = 4 + seededRandom() * 8;
      const opacity = 0.2 + seededRandom() * 0.4;

      ctx.fillStyle = `rgba(255, 143, 101, ${opacity})`;
      ctx.fillRect(x, y, size, size);
    }
  }, [position, variant]);

  return (
    <canvas
      ref={canvasRef}
      className={`absolute top-0 ${position === "left" ? "left-0" : "right-0"} pointer-events-none`}
      style={{
        width: 400,
        height: 800,
        opacity: 0.9,
      }}
      aria-hidden="true"
    />
  );
}
