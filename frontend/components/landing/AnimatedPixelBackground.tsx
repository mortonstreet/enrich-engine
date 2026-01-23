"use client";

import { useEffect, useRef } from "react";

// Animated flowing lines design inspired by Cooley's wireframe globe aesthetic
export default function AnimatedPixelBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = window.innerWidth;
    let height = window.innerHeight;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.scale(dpr, dpr);
    };

    resize();
    window.addEventListener("resize", resize);

    // Flowing curve definition
    interface FlowingCurve {
      points: { x: number; y: number; vx: number; vy: number }[];
      baseOpacity: number;
      phaseOffset: number;
      speed: number;
      lineWidth: number;
      color: string;
    }

    // Red color palette
    const colors = [
      "rgba(230, 57, 70, 0.6)",   // Primary red
      "rgba(240, 113, 120, 0.5)", // Light red
      "rgba(245, 165, 172, 0.4)", // Rose
      "rgba(200, 50, 60, 0.5)",   // Deep red
      "rgba(255, 100, 110, 0.4)", // Bright red
    ];

    const curves: FlowingCurve[] = [];

    // Create flowing curves
    const createCurve = (): FlowingCurve => {
      const numPoints = 4 + Math.floor(Math.random() * 3);
      const points = [];

      // Start from edges or corners
      const startSide = Math.floor(Math.random() * 4);
      let startX: number, startY: number;

      switch (startSide) {
        case 0: // Top
          startX = Math.random() * width;
          startY = -50;
          break;
        case 1: // Right
          startX = width + 50;
          startY = Math.random() * height;
          break;
        case 2: // Bottom
          startX = Math.random() * width;
          startY = height + 50;
          break;
        default: // Left
          startX = -50;
          startY = Math.random() * height;
      }

      for (let i = 0; i < numPoints; i++) {
        const progress = i / (numPoints - 1);
        points.push({
          x: startX + (width * 0.5 - startX) * progress + (Math.random() - 0.5) * width * 0.4,
          y: startY + (height * 0.5 - startY) * progress + (Math.random() - 0.5) * height * 0.4,
          vx: (Math.random() - 0.5) * 0.3,
          vy: (Math.random() - 0.5) * 0.3,
        });
      }

      return {
        points,
        baseOpacity: 0.3 + Math.random() * 0.4,
        phaseOffset: Math.random() * Math.PI * 2,
        speed: 0.5 + Math.random() * 0.5,
        lineWidth: 1 + Math.random() * 2,
        color: colors[Math.floor(Math.random() * colors.length)],
      };
    };

    // Initialize curves
    for (let i = 0; i < 15; i++) {
      curves.push(createCurve());
    }

    // Floating particles along curves
    interface Particle {
      curveIndex: number;
      t: number; // Position along curve (0-1)
      speed: number;
      size: number;
      opacity: number;
    }

    const particles: Particle[] = [];
    for (let i = 0; i < 40; i++) {
      particles.push({
        curveIndex: Math.floor(Math.random() * curves.length),
        t: Math.random(),
        speed: 0.001 + Math.random() * 0.002,
        size: 2 + Math.random() * 3,
        opacity: 0.4 + Math.random() * 0.4,
      });
    }

    // Get point on bezier curve
    const getPointOnCurve = (points: { x: number; y: number }[], t: number) => {
      if (points.length < 2) return points[0];

      const n = points.length - 1;
      let x = 0, y = 0;

      for (let i = 0; i <= n; i++) {
        const binomial = factorial(n) / (factorial(i) * factorial(n - i));
        const term = binomial * Math.pow(1 - t, n - i) * Math.pow(t, i);
        x += term * points[i].x;
        y += term * points[i].y;
      }

      return { x, y };
    };

    // Memoized factorial to avoid recalculation in animation loop
    const factorialCache: Record<number, number> = {};
    const factorial = (n: number): number => {
      if (n <= 1) return 1;
      if (factorialCache[n]) return factorialCache[n];
      factorialCache[n] = n * factorial(n - 1);
      return factorialCache[n];
    };

    const draw = (timestamp: number) => {
      ctx.clearRect(0, 0, width, height);

      // Update and draw curves
      curves.forEach((curve, curveIndex) => {
        // Animate control points with smooth wave motion
        curve.points.forEach((point, i) => {
          const waveX = Math.sin(timestamp * 0.0005 * curve.speed + curve.phaseOffset + i * 0.5) * 0.5;
          const waveY = Math.cos(timestamp * 0.0004 * curve.speed + curve.phaseOffset + i * 0.7) * 0.5;

          point.x += point.vx + waveX;
          point.y += point.vy + waveY;

          // Soft boundary - gently push back toward center
          const centerX = width / 2;
          const centerY = height / 2;
          const maxDist = Math.max(width, height) * 0.6;

          const dx = point.x - centerX;
          const dy = point.y - centerY;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist > maxDist) {
            point.vx -= dx * 0.0001;
            point.vy -= dy * 0.0001;
          }

          // Dampen velocity
          point.vx *= 0.999;
          point.vy *= 0.999;
        });

        // Draw curve with gradient
        ctx.beginPath();
        ctx.strokeStyle = curve.color;
        ctx.lineWidth = curve.lineWidth;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";

        // Draw smooth curve through points
        const segments = 50;
        for (let i = 0; i <= segments; i++) {
          const t = i / segments;
          const point = getPointOnCurve(curve.points, t);

          if (i === 0) {
            ctx.moveTo(point.x, point.y);
          } else {
            ctx.lineTo(point.x, point.y);
          }
        }

        ctx.stroke();

        // Draw subtle glow on some curves
        if (curveIndex % 3 === 0) {
          ctx.save();
          ctx.strokeStyle = curve.color.replace(/[\d.]+\)$/, "0.2)");
          ctx.lineWidth = curve.lineWidth + 4;
          ctx.filter = "blur(3px)";
          ctx.stroke();
          ctx.restore();
        }
      });

      // Update and draw particles
      particles.forEach((particle) => {
        particle.t += particle.speed;
        if (particle.t > 1) {
          particle.t = 0;
          particle.curveIndex = Math.floor(Math.random() * curves.length);
        }

        const curve = curves[particle.curveIndex];
        const point = getPointOnCurve(curve.points, particle.t);

        // Pulsing opacity
        const pulse = Math.sin(timestamp * 0.003 + particle.t * Math.PI * 2) * 0.2;
        const opacity = Math.max(0.2, particle.opacity + pulse);

        ctx.beginPath();
        ctx.arc(point.x, point.y, particle.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(230, 57, 70, ${opacity})`;
        ctx.fill();

        // Particle glow
        ctx.beginPath();
        ctx.arc(point.x, point.y, particle.size + 2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(230, 57, 70, ${opacity * 0.3})`;
        ctx.fill();
      });

      // Draw some connecting lines between nearby curve points for network effect
      ctx.strokeStyle = "rgba(230, 57, 70, 0.1)";
      ctx.lineWidth = 0.5;

      for (let i = 0; i < curves.length; i++) {
        for (let j = i + 1; j < curves.length; j++) {
          const p1 = getPointOnCurve(curves[i].points, 0.5);
          const p2 = getPointOnCurve(curves[j].points, 0.5);
          const dist = Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2);

          if (dist < 200) {
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.globalAlpha = (1 - dist / 200) * 0.3;
            ctx.stroke();
            ctx.globalAlpha = 1;
          }
        }
      }

      animationRef.current = requestAnimationFrame(draw);
    };

    // Check reduced motion preference and listen for changes
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

    const handleMotionChange = (e: MediaQueryListEvent | MediaQueryList) => {
      if (e.matches) {
        // Stop animation when reduced motion is preferred
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
          animationRef.current = null;
        }
        // Draw static frame
        draw(0);
      } else {
        // Resume animation when reduced motion is not preferred
        if (!animationRef.current) {
          animationRef.current = requestAnimationFrame(draw);
        }
      }
    };

    // Initial check
    handleMotionChange(motionQuery);

    // Listen for preference changes
    motionQuery.addEventListener("change", handleMotionChange);

    return () => {
      window.removeEventListener("resize", resize);
      motionQuery.removeEventListener("change", handleMotionChange);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 0 }}
      aria-hidden="true"
      role="presentation"
    />
  );
}
