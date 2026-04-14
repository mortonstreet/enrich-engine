"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Logo } from "@/components/brand";
import PrismaticBurst from "@/components/landing/PrismaticBurst";

export default function WaitlistPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    // Simulate API call - replace with actual endpoint later
    await new Promise((resolve) => setTimeout(resolve, 800));
    setSubmitted(true);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Background */}
      <div className="fixed inset-0 z-0">
        <PrismaticBurst
          colors={["#fafafa", "#737373", "#404040"]}
          intensity={1.2}
          speed={0.3}
          animationType="rotate3d"
          mixBlendMode="overlay"
        />
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-border bg-background/80 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex justify-between items-center h-14 sm:h-16">
            <Link href="/" className="flex items-center">
              <Logo variant="full" />
            </Link>
            <Link
              href="/"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 sm:px-6 py-16">
        <div className="w-full max-w-md">
          {!submitted ? (
            <div className="space-y-8">
              <div className="space-y-4 text-center">
                <h1 className="font-display font-bold text-4xl sm:text-5xl md:text-6xl tracking-tight">
                  Request Access
                </h1>
                <p className="text-muted-foreground text-base sm:text-lg">
                  OmniDial is currently invite-only. Join the waitlist and we&apos;ll
                  reach out when we&apos;re ready for you.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-12 text-base bg-card border-border"
                />
                <Button
                  type="submit"
                  size="xl"
                  className="w-full"
                  disabled={loading}
                >
                  {loading ? "Submitting..." : "Join Waitlist"}
                </Button>
              </form>

              <p className="text-xs text-muted-foreground text-center">
                We&apos;ll never share your email. Unsubscribe anytime.
              </p>
            </div>
          ) : (
            <div className="space-y-6 text-center">
              <div className="w-16 h-16 rounded-full bg-foreground/10 flex items-center justify-center mx-auto">
                <Check className="w-8 h-8 text-foreground" />
              </div>
              <div className="space-y-2">
                <h2 className="font-display font-bold text-3xl sm:text-4xl tracking-tight">
                  You&apos;re on the list
                </h2>
                <p className="text-muted-foreground">
                  We&apos;ll be in touch at <span className="text-foreground">{email}</span>
                </p>
              </div>
              <Button asChild variant="outline" size="lg">
                <Link href="/">Back to Home</Link>
              </Button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
