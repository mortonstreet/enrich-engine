"use client";

import { useEffect, useRef, useState } from "react";

export default function DataArtIcon() {
  const [mounted, setMounted] = useState(false);
  const bounceRef = useRef(0);

  useEffect(() => {
    setMounted(true);

    // Animate bounce
    let animationId: number;
    const animate = () => {
      bounceRef.current += 0.15;
      animationId = requestAnimationFrame(animate);
    };

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!prefersReducedMotion) {
      animationId = requestAnimationFrame(animate);
    }

    return () => {
      if (animationId) cancelAnimationFrame(animationId);
    };
  }, []);

  if (!mounted) {
    return <div className="w-[160px] h-[160px]" />;
  }

  return (
    <div className="relative inline-block">
      <svg
        width="160"
        height="160"
        viewBox="0 0 160 160"
        className="rounded-3xl"
        style={{
          boxShadow: "0 25px 50px -12px rgba(230, 57, 70, 0.25), 0 0 0 1px rgba(230, 57, 70, 0.1)"
        }}
      >
        {/* Background */}
        <rect width="160" height="160" rx="20" fill="#E63946" />

        {/* Road/ground */}
        <rect x="0" y="115" width="160" height="25" fill="#2d2d2d" />
        <rect x="0" y="115" width="160" height="2" fill="#444" />

        {/* Animated road lines */}
        <g className="animate-road-lines">
          <rect x="10" y="126" width="20" height="3" rx="1" fill="#ffff00" opacity="0.8" />
          <rect x="50" y="126" width="20" height="3" rx="1" fill="#ffff00" opacity="0.8" />
          <rect x="90" y="126" width="20" height="3" rx="1" fill="#ffff00" opacity="0.8" />
          <rect x="130" y="126" width="20" height="3" rx="1" fill="#ffff00" opacity="0.8" />
        </g>

        {/* Speed lines */}
        <g className="animate-speed-lines" opacity="0.6">
          <line x1="5" y1="70" x2="25" y2="70" stroke="white" strokeWidth="2" strokeLinecap="round" />
          <line x1="10" y1="80" x2="35" y2="80" stroke="white" strokeWidth="2" strokeLinecap="round" />
          <line x1="5" y1="90" x2="30" y2="90" stroke="white" strokeWidth="2" strokeLinecap="round" />
        </g>

        {/* Car body group - animated bounce */}
        <g className="animate-car-bounce">
          {/* Car shadow */}
          <ellipse cx="80" cy="118" rx="35" ry="5" fill="rgba(0,0,0,0.3)" />

          {/* Main car body - Ferrari style */}
          <path
            d="M35 95 L40 75 L55 65 L105 65 L120 75 L125 95 L125 105 L35 105 Z"
            fill="#c41e3a"
          />

          {/* Car hood (front) */}
          <path
            d="M35 95 L40 85 L55 85 L55 95 Z"
            fill="#a01830"
          />

          {/* Car trunk (back) */}
          <path
            d="M105 85 L120 85 L125 95 L105 95 Z"
            fill="#a01830"
          />

          {/* Windshield frame */}
          <path
            d="M55 65 L60 55 L100 55 L105 65 Z"
            fill="#333"
          />

          {/* Interior/seats visible */}
          <rect x="60" y="65" width="40" height="20" fill="#1a1a1a" />

          {/* Side panel detail */}
          <path
            d="M40 88 L55 88 L55 100 L40 100 Z"
            fill="#a01830"
          />
          <path
            d="M105 88 L120 88 L120 100 L105 100 Z"
            fill="#a01830"
          />

          {/* Ferrari side stripe */}
          <rect x="38" y="92" width="84" height="3" fill="#ffcc00" opacity="0.9" />

          {/* Headlights */}
          <circle cx="42" cy="90" r="4" fill="#ffff99" className="animate-headlight" />
          <circle cx="42" cy="90" r="2" fill="white" />

          {/* Taillights */}
          <circle cx="122" cy="90" r="4" fill="#ff4444" className="animate-taillight" />

          {/* Side mirror */}
          <ellipse cx="52" cy="72" rx="4" ry="3" fill="#333" />

          {/* Door handle */}
          <rect x="70" y="90" width="8" height="2" rx="1" fill="#666" />

          {/* Driver */}
          <g className="driver">
            {/* Head */}
            <circle cx="80" cy="58" r="12" fill="#f4c7a0" />

            {/* Hair */}
            <path
              d="M68 52 Q72 45 80 45 Q88 45 92 52 Q92 48 80 48 Q68 48 68 52"
              fill="#4a3728"
            />

            {/* Glasses */}
            <g fill="none" stroke="#333" strokeWidth="1.5">
              {/* Left lens */}
              <rect x="71" y="55" width="8" height="6" rx="1" fill="rgba(135,206,235,0.3)" />
              {/* Right lens */}
              <rect x="81" y="55" width="8" height="6" rx="1" fill="rgba(135,206,235,0.3)" />
              {/* Bridge */}
              <line x1="79" y1="58" x2="81" y2="58" />
              {/* Temple arms */}
              <line x1="71" y1="57" x2="68" y2="56" />
              <line x1="89" y1="57" x2="92" y2="56" />
            </g>

            {/* Eyes behind glasses */}
            <circle cx="75" cy="58" r="1.5" fill="#333" />
            <circle cx="85" cy="58" r="1.5" fill="#333" />

            {/* Smile */}
            <path d="M76 64 Q80 67 84 64" fill="none" stroke="#333" strokeWidth="1.5" strokeLinecap="round" />

            {/* Ears */}
            <ellipse cx="68" cy="58" rx="2" ry="3" fill="#f4c7a0" />
            <ellipse cx="92" cy="58" rx="2" ry="3" fill="#f4c7a0" />

            {/* Body/shirt */}
            <path
              d="M70 70 L90 70 L92 85 L68 85 Z"
              fill="#2563eb"
            />

            {/* Hands on wheel */}
            <circle cx="72" cy="82" r="4" fill="#f4c7a0" />
            <circle cx="88" cy="82" r="4" fill="#f4c7a0" />

            {/* Steering wheel */}
            <circle cx="80" cy="82" r="8" fill="none" stroke="#333" strokeWidth="3" />
            <circle cx="80" cy="82" r="3" fill="#333" />
          </g>

          {/* Wind effect on hair */}
          <g className="animate-hair-wind">
            <path d="M68 48 Q60 45 55 48" fill="none" stroke="#4a3728" strokeWidth="2" strokeLinecap="round" />
            <path d="M70 50 Q62 48 58 51" fill="none" stroke="#4a3728" strokeWidth="1.5" strokeLinecap="round" />
          </g>

          {/* Front wheel */}
          <g className="animate-wheel">
            <circle cx="50" cy="110" r="12" fill="#1a1a1a" />
            <circle cx="50" cy="110" r="10" fill="#333" />
            <circle cx="50" cy="110" r="4" fill="#888" />
            {/* Spokes */}
            <g stroke="#666" strokeWidth="2">
              <line x1="50" y1="100" x2="50" y2="104" />
              <line x1="50" y1="116" x2="50" y2="120" />
              <line x1="40" y1="110" x2="44" y2="110" />
              <line x1="56" y1="110" x2="60" y2="110" />
            </g>
          </g>

          {/* Rear wheel */}
          <g className="animate-wheel">
            <circle cx="110" cy="110" r="12" fill="#1a1a1a" />
            <circle cx="110" cy="110" r="10" fill="#333" />
            <circle cx="110" cy="110" r="4" fill="#888" />
            {/* Spokes */}
            <g stroke="#666" strokeWidth="2">
              <line x1="110" y1="100" x2="110" y2="104" />
              <line x1="110" y1="116" x2="110" y2="120" />
              <line x1="100" y1="110" x2="104" y2="110" />
              <line x1="116" y1="110" x2="120" y2="110" />
            </g>
          </g>

          {/* Exhaust smoke */}
          <g className="animate-exhaust">
            <circle cx="130" cy="100" r="3" fill="rgba(200,200,200,0.5)" />
            <circle cx="138" cy="98" r="4" fill="rgba(200,200,200,0.3)" />
            <circle cx="148" cy="95" r="5" fill="rgba(200,200,200,0.2)" />
          </g>
        </g>

        {/* CSS Animations */}
        <style>{`
          .animate-wheel {
            animation: spin 0.5s linear infinite;
            transform-origin: center;
          }
          .animate-wheel:first-of-type {
            transform-origin: 50px 110px;
          }
          .animate-wheel:last-of-type {
            transform-origin: 110px 110px;
          }

          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }

          .animate-car-bounce {
            animation: bounce 0.3s ease-in-out infinite;
          }

          @keyframes bounce {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-2px); }
          }

          .animate-road-lines {
            animation: roadMove 0.5s linear infinite;
          }

          @keyframes roadMove {
            from { transform: translateX(0); }
            to { transform: translateX(-40px); }
          }

          .animate-speed-lines {
            animation: speedPulse 0.3s ease-in-out infinite;
          }

          @keyframes speedPulse {
            0%, 100% { opacity: 0.6; transform: translateX(0); }
            50% { opacity: 0.3; transform: translateX(-5px); }
          }

          .animate-exhaust {
            animation: exhaust 0.4s ease-out infinite;
          }

          @keyframes exhaust {
            0% { opacity: 0.8; transform: translateX(0) scale(1); }
            100% { opacity: 0; transform: translateX(15px) scale(1.5); }
          }

          .animate-hair-wind {
            animation: hairWind 0.5s ease-in-out infinite;
          }

          @keyframes hairWind {
            0%, 100% { transform: translateX(0); }
            50% { transform: translateX(-3px); }
          }

          .animate-headlight {
            animation: headlightGlow 1s ease-in-out infinite;
          }

          @keyframes headlightGlow {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.7; }
          }

          .animate-taillight {
            animation: taillightGlow 0.5s ease-in-out infinite;
          }

          @keyframes taillightGlow {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.6; }
          }

          @media (prefers-reduced-motion: reduce) {
            .animate-wheel,
            .animate-car-bounce,
            .animate-road-lines,
            .animate-speed-lines,
            .animate-exhaust,
            .animate-hair-wind,
            .animate-headlight,
            .animate-taillight {
              animation: none;
            }
          }
        `}</style>
      </svg>
    </div>
  );
}
