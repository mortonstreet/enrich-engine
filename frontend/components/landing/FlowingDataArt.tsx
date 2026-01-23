"use client";

import { useEffect, useRef } from "react";

interface FlowingDataArtProps {
  position: "left" | "right";
  className?: string;
}

// Ethereal flowing data visualization with organic shapes and soft gradients
export default function FlowingDataArt({ position, className = "" }: FlowingDataArtProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const timeRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = 500;
    const height = 900;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.scale(dpr, dpr);

    // Seed for consistent randomness
    const seed = position === "left" ? 42 : 137;
    let random = seed;
    const seededRandom = () => {
      random = (random * 9301 + 49297) % 233280;
      return random / 233280;
    };

    // Generate flow field particles
    interface Particle {
      x: number;
      y: number;
      size: number;
      opacity: number;
      speed: number;
      angle: number;
      color: string;
      type: "pixel" | "blur" | "char";
      char?: string;
      life: number;
      maxLife: number;
    }

    const particles: Particle[] = [];
    const chars = "01abcdef".split("");

    // Color palette - soft blues, cyans, and touches of violet
    const colors = [
      "rgba(147, 197, 253, VAR)", // Light blue
      "rgba(96, 165, 250, VAR)",  // Blue
      "rgba(129, 140, 248, VAR)", // Indigo
      "rgba(167, 139, 250, VAR)", // Violet
      "rgba(34, 211, 238, VAR)",  // Cyan
      "rgba(186, 230, 253, VAR)", // Sky
    ];

    // Initialize particles
    const initParticles = () => {
      particles.length = 0;
      const count = 200;

      for (let i = 0; i < count; i++) {
        const x = position === "left"
          ? seededRandom() * width * 0.8 + width * 0.1
          : seededRandom() * width * 0.8 + width * 0.1;
        const y = seededRandom() * height;

        const type = seededRandom() < 0.15 ? "char" : seededRandom() < 0.4 ? "blur" : "pixel";

        particles.push({
          x,
          y,
          size: type === "blur" ? 20 + seededRandom() * 40 : 3 + seededRandom() * 6,
          opacity: 0.1 + seededRandom() * 0.5,
          speed: 0.2 + seededRandom() * 0.5,
          angle: (seededRandom() - 0.5) * 0.3,
          color: colors[Math.floor(seededRandom() * colors.length)],
          type,
          char: type === "char" ? chars[Math.floor(seededRandom() * chars.length)] : undefined,
          life: seededRandom() * 1000,
          maxLife: 500 + seededRandom() * 1000,
        });
      }
    };

    initParticles();

    // Flow field function - creates organic wave patterns
    const flowField = (x: number, y: number, time: number) => {
      const scale = 0.003;
      const angle = Math.sin(x * scale + time * 0.0005) * Math.cos(y * scale * 0.5 + time * 0.0003) * Math.PI;
      return angle;
    };

    // Draw function
    const draw = (time: number) => {
      ctx.clearRect(0, 0, width, height);

      // Sort particles by size for depth effect
      particles.sort((a, b) => b.size - a.size);

      particles.forEach((p, i) => {
        // Update particle position based on flow field
        const flowAngle = flowField(p.x, p.y, time);
        p.x += Math.cos(flowAngle + p.angle) * p.speed;
        p.y += Math.sin(flowAngle) * p.speed * 0.5 + p.speed * 0.3;

        // Update life
        p.life += 1;

        // Calculate fade based on life cycle
        const lifeFade = Math.sin((p.life / p.maxLife) * Math.PI);
        const currentOpacity = p.opacity * lifeFade * 0.8;

        // Reset particle if it goes off screen or completes life cycle
        if (p.y > height + 50 || p.y < -50 || p.x < -50 || p.x > width + 50 || p.life > p.maxLife) {
          p.y = -20 - seededRandom() * 100;
          p.x = position === "left"
            ? seededRandom() * width * 0.7 + width * 0.15
            : seededRandom() * width * 0.7 + width * 0.15;
          p.life = 0;
          p.maxLife = 500 + seededRandom() * 1000;
        }

        const colorWithOpacity = p.color.replace("VAR", currentOpacity.toString());

        if (p.type === "blur") {
          // Soft blurred circles for cloud effect
          const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
          gradient.addColorStop(0, colorWithOpacity);
          gradient.addColorStop(0.5, p.color.replace("VAR", (currentOpacity * 0.3).toString()));
          gradient.addColorStop(1, "rgba(255, 255, 255, 0)");

          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fillStyle = gradient;
          ctx.fill();
        } else if (p.type === "char") {
          // Alphanumeric characters
          ctx.font = `${p.size * 3}px "SF Mono", "Monaco", monospace`;
          ctx.fillStyle = colorWithOpacity;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(p.char!, p.x, p.y);
        } else {
          // Crisp pixel squares
          ctx.fillStyle = colorWithOpacity;
          ctx.fillRect(
            Math.floor(p.x - p.size / 2),
            Math.floor(p.y - p.size / 2),
            p.size,
            p.size
          );
        }
      });

      // Add some connecting lines between nearby pixels
      ctx.strokeStyle = "rgba(147, 197, 253, 0.05)";
      ctx.lineWidth = 1;
      particles.forEach((p1, i) => {
        if (p1.type !== "pixel") return;
        particles.slice(i + 1, i + 10).forEach((p2) => {
          if (p2.type !== "pixel") return;
          const dist = Math.hypot(p1.x - p2.x, p1.y - p2.y);
          if (dist < 40) {
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
          }
        });
      });

      timeRef.current = time;
      animationRef.current = requestAnimationFrame(draw);
    };

    // Check for reduced motion preference
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefersReducedMotion) {
      // Draw static version
      draw(0);
    } else {
      animationRef.current = requestAnimationFrame(draw);
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [position]);

  return (
    <canvas
      ref={canvasRef}
      className={`absolute top-0 ${position === "left" ? "left-0" : "right-0"} pointer-events-none ${className}`}
      style={{
        width: 500,
        height: 900,
        opacity: 0.85,
        filter: "blur(0.5px)",
      }}
      aria-hidden="true"
    />
  );
}
