"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/base-input";
import { useWaitlistSignup } from "@/hooks/api/useEnrichment";
import { toast } from "sonner";
import { ArrowLeft, Check, Loader2, Mail } from "lucide-react";

export default function WaitlistPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const waitlistMutation = useWaitlistSignup();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      toast.error("Please enter your email");
      return;
    }

    try {
      const result = await waitlistMutation.mutateAsync({
        email: email.trim(),
        source: "marketing_page",
      });
      setSubmitted(true);
      toast.success(result.message);
    } catch {
      toast.error("Failed to join waitlist. Please try again.");
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="text-xl font-semibold tracking-tight">
              EnrichEngine
            </Link>
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </Link>
          </div>
        </div>
      </nav>

      <main className="max-w-lg mx-auto px-6 py-20">
        {submitted ? (
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
              <Check className="w-8 h-8 text-green-600" />
            </div>
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight mb-4">
              You&apos;re on the list!
            </h1>
            <p className="text-muted-foreground mb-8">
              We&apos;ll notify you when EnrichEngine is ready. In the meantime, follow
              us for updates.
            </p>
            <Link href="/">
              <Button variant="outline">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Home
              </Button>
            </Link>
          </div>
        ) : (
          <>
            <div className="text-center mb-8">
              <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
                <Mail className="w-7 h-7 text-primary" />
              </div>
              <h1 className="text-2xl md:text-3xl font-semibold tracking-tight mb-3">
                Join the Waitlist
              </h1>
              <p className="text-muted-foreground">
                Be the first to know when EnrichEngine launches. Get early access
                to the most powerful LinkedIn enrichment tool.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium">
                  Email Address
                </label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={waitlistMutation.isPending}
                  className="h-12"
                />
              </div>

              <Button
                type="submit"
                disabled={waitlistMutation.isPending || !email.trim()}
                className="w-full h-12"
              >
                {waitlistMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Joining...
                  </>
                ) : (
                  "Join Waitlist"
                )}
              </Button>
            </form>

            <p className="mt-6 text-xs text-center text-muted-foreground">
              We&apos;ll only email you about EnrichEngine updates. No spam, ever.
            </p>
          </>
        )}
      </main>
    </div>
  );
}
