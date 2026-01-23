"use client";

import { useEffect, useRef } from "react";

export default function DotPatternBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const timeRef = useRef(0);

  const draw = (ctx: CanvasRenderingContext2D, width: number, height: number, time: number) => {
    // Clear with warm gray background
    ctx.fillStyle = "#F8F8F7";
    ctx.fillRect(0, 0, width, height);

    const dotSpacing = 24;
    const baseRadius = 1.5;

    // Calculate grid dimensions
    const cols = Math.ceil(width / dotSpacing) + 1;
    const rows = Math.ceil(height / dotSpacing) + 1;

    // Draw dots with subtle wave animation
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const x = col * dotSpacing;
        const y = row * dotSpacing;

        // Create subtle wave effect
        const waveX = Math.sin((x + time * 30) * 0.01) * 0.5;
        const waveY = Math.cos((y + time * 20) * 0.01) * 0.5;
        const distanceFromCenter = Math.sqrt(
          Math.pow(x - width / 2, 2) + Math.pow(y - height / 2, 2)
        );
        const wave = Math.sin((distanceFromCenter - time * 40) * 0.005);

        // Opacity varies with wave
        const opacity = 0.12 + wave * 0.05 + waveX * 0.02 + waveY * 0.02;

        // Draw dot
        ctx.beginPath();
        ctx.arc(x, y, baseRadius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0, 0, 0, ${Math.max(0.05, Math.min(0.25, opacity))})`;
        ctx.fill();
      }
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Check for reduced motion preference
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.scale(dpr, dpr);
    };

    resize();
    window.addEventListener("resize", resize);

    if (prefersReducedMotion) {
      // Just draw once for reduced motion
      draw(ctx, window.innerWidth, window.innerHeight, 0);
    } else {
      const animate = () => {
        timeRef.current += 0.016; // ~60fps increment
        draw(ctx, window.innerWidth, window.innerHeight, timeRef.current);
        animationRef.current = requestAnimationFrame(animate);
      };
      animate();
    }

    return () => {
      window.removeEventListener("resize", resize);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full pointer-events-none"
      aria-hidden="true"
    />
  );
}
