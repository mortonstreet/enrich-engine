"use client";

import { useState, useEffect } from "react";
import { ArrowUpRight } from "lucide-react";

const searchQueries = [
  "Sales leaders at series B startups in SF...",
  "VP of Engineering at fintech companies...",
  "Marketing directors at e-commerce brands...",
  "Founders of AI startups with 50+ employees...",
  "CTOs at healthcare tech in New York...",
  "Head of Growth at B2B SaaS companies...",
  "Product managers at Fortune 500...",
  "HR directors at remote-first companies...",
];

export default function AnimatedSearchBar() {
  const [currentQuery, setCurrentQuery] = useState(0);
  const [displayText, setDisplayText] = useState("");
  const [isTyping, setIsTyping] = useState(true);
  const [isFocused, setIsFocused] = useState(false);
  const [userInput, setUserInput] = useState("");

  useEffect(() => {
    if (isFocused) return; // Stop animation when user focuses

    const query = searchQueries[currentQuery];
    let charIndex = 0;
    let timeout: NodeJS.Timeout;

    if (isTyping) {
      // Typing effect
      const typeChar = () => {
        if (charIndex <= query.length) {
          setDisplayText(query.slice(0, charIndex));
          charIndex++;
          timeout = setTimeout(typeChar, 50 + Math.random() * 30);
        } else {
          // Pause at end before erasing
          timeout = setTimeout(() => setIsTyping(false), 2000);
        }
      };
      typeChar();
    } else {
      // Erasing effect
      let eraseIndex = query.length;
      const eraseChar = () => {
        if (eraseIndex >= 0) {
          setDisplayText(query.slice(0, eraseIndex));
          eraseIndex--;
          timeout = setTimeout(eraseChar, 20);
        } else {
          // Move to next query
          setCurrentQuery((prev) => (prev + 1) % searchQueries.length);
          setIsTyping(true);
        }
      };
      eraseChar();
    }

    return () => clearTimeout(timeout);
  }, [currentQuery, isTyping, isFocused]);

  return (
    <div className="max-w-xl mx-auto px-4 sm:px-0">
      <div className="relative">
        <input
          type="text"
          value={isFocused ? userInput : displayText}
          onChange={(e) => setUserInput(e.target.value)}
          placeholder={isFocused ? "Search for leads..." : ""}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          className="w-full px-4 sm:px-6 py-4 sm:py-5 pr-14 sm:pr-16 text-sm sm:text-base bg-white border border-gray-200 rounded-xl sm:rounded-2xl shadow-lg shadow-gray-100/50 focus:outline-none focus:border-[#E63946]/30 focus:shadow-[#E63946]/10 focus:shadow-xl transition-all duration-300"
          style={{ caretColor: "#E63946" }}
        />
        {/* Blinking cursor when typing - hidden on mobile for cleaner look */}
        {!isFocused && (
          <span
            className="absolute top-1/2 -translate-y-1/2 w-0.5 h-5 sm:h-6 bg-[#E63946] animate-pulse hidden sm:block"
            style={{
              left: `min(${24 + displayText.length * 8.5}px, calc(100% - 80px))`,
            }}
          />
        )}
        <button className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 w-10 h-10 sm:w-11 sm:h-11 bg-[#111827] rounded-lg sm:rounded-xl flex items-center justify-center text-white hover:bg-black transition-colors">
          <ArrowUpRight className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>
      </div>

    </div>
  );
}
