"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/base-input";
import { useWaitlistSignup } from "@/hooks/api/useEnrichment";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Check, Loader2 } from "lucide-react";

export default function WaitlistPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState("");
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
      setSubmittedEmail(email.trim());
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
              Enrich Engine
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

      <main className="max-w-md mx-auto px-6 py-20 md:py-28">
        {submitted ? (
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-foreground flex items-center justify-center mx-auto mb-8">
              <Check className="w-8 h-8 text-background" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
              You&apos;re on the list
            </h1>
            <p className="text-muted-foreground mb-8 text-lg">
              We&apos;ll be in touch at{" "}
              <span className="text-foreground font-medium">{submittedEmail}</span>
            </p>
            <Link href="/">
              <Button variant="outline" size="lg">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Home
              </Button>
            </Link>
          </div>
        ) : (
          <>
            <div className="text-center mb-10">
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
                Request Access
              </h1>
              <p className="text-muted-foreground text-lg leading-relaxed">
                Enrich Engine is currently invite-only. Join the waitlist and we&apos;ll reach out when we&apos;re ready for you.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={waitlistMutation.isPending}
                className="h-14 text-base px-4"
              />

              <Button
                type="submit"
                disabled={waitlistMutation.isPending || !email.trim()}
                className="w-full h-14 text-base font-medium"
              >
                {waitlistMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Joining...
                  </>
                ) : (
                  <>
                    Join Waitlist
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            </form>

            <p className="mt-6 text-sm text-center text-muted-foreground">
              We&apos;ll never share your email. Unsubscribe anytime.
            </p>
          </>
        )}
      </main>
    </div>
  );
}
