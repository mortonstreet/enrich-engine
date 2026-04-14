"use client";
import { Suspense, useEffect, useState } from "react";
import AuthCard from "@/components/AuthCard";
import { Button } from '@/components/ui/button';
import { toast } from "sonner";
import { useSearchParams } from "next/navigation";
import { useMagicLink } from "@/hooks/api/useAuth";
import { Mail, ArrowRight } from "lucide-react";
import {
  buildAuthFlowCallbackPath,
  buildInvitationCallbackPath,
  normalizeAuthCallbackPath,
  DEFAULT_AUTH_CALLBACK_PATH,
} from "@/lib/auth-callback";
import {
  extractAuthErrorDetails,
  getAuthErrorMessage,
  normalizeAuthErrorCode,
} from "@/lib/auth-errors";

function LoginPageContent() {
  const searchParams = useSearchParams();

  // Get invitation params from query
  const inviteId = searchParams.get("inviteId");
  const inviteEmail = searchParams.get("email");
  const redirectUrl = searchParams.get("redirect");
  const correlationId = searchParams.get("correlationId");
  const authErrorCode = normalizeAuthErrorCode(
    searchParams.get("authError") ?? searchParams.get("error"),
  );

  const safeRedirectPath = normalizeAuthCallbackPath(
    redirectUrl,
    DEFAULT_AUTH_CALLBACK_PATH,
  ).path;
  const inviteRedirectPath =
    buildInvitationCallbackPath(inviteId, inviteEmail) || DEFAULT_AUTH_CALLBACK_PATH;

  const [email, setEmail] = useState(inviteEmail || "");
  const [magicLinkSent, setMagicLinkSent] = useState(false);

  const magicLinkMutation = useMagicLink();

  useEffect(() => {
    if (!authErrorCode) return;
    toast.error(getAuthErrorMessage(authErrorCode, correlationId));
  }, [authErrorCode, correlationId]);

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return toast.error("Please enter your email address.");

    const callbackURL = buildAuthFlowCallbackPath({
      redirectPath: redirectUrl,
      invitationId: inviteId,
      invitationEmail: email || inviteEmail,
      fallbackPath: "/dashboard",
    });

    magicLinkMutation.mutate(
      { email, callbackURL },
      {
        onSuccess: (result) => {
          if (result.error) {
            const details = extractAuthErrorDetails(result.error);
            if (details.code) {
              toast.error(getAuthErrorMessage(details.code, details.correlationId));
            } else {
              toast.error(details.message || "Failed to send sign-in link");
            }
          } else {
            setMagicLinkSent(true);
            toast.success("Check your email for the sign-in link!");
          }
        },
        onError: (error) => {
          const details = extractAuthErrorDetails(error);
          if (details.code) {
            toast.error(getAuthErrorMessage(details.code, details.correlationId));
          } else {
            toast.error("Failed to send sign-in link. Please try again.");
          }
        },
      }
    );
  }

  return (
    <AuthCard
      title="Welcome back"
      subtitle="Sign in to your OmniDial account"
    >
      {inviteId && (
        <div className="mb-6 p-4 rounded-xl bg-muted border border-border text-sm text-foreground">
          <p className="font-medium">You&apos;ve been invited to join an organization</p>
          <p className="text-muted-foreground mt-1">
            Sign in to accept, or{" "}
            <a
              href={`/signup?inviteId=${inviteId}&email=${encodeURIComponent(inviteEmail || '')}&redirect=${encodeURIComponent(redirectUrl ? safeRedirectPath : inviteRedirectPath)}`}
              className="text-primary hover:text-primary/80 font-medium"
            >
              create an account
            </a>
            {" "}if you&apos;re new.
          </p>
        </div>
      )}

      {/* Magic link sent confirmation */}
      {magicLinkSent ? (
        <div className="space-y-4">
          <div className="p-6 rounded-xl bg-muted border border-border text-center">
            <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
              <Mail className="w-6 h-6 text-primary" />
            </div>
            <p className="text-foreground font-medium">Check your email</p>
            <p className="text-sm text-muted-foreground mt-2">
              We sent a sign-in link to <span className="font-medium text-foreground">{email}</span>
            </p>
            <p className="text-xs text-muted-foreground mt-4">
              The link will expire in 10 minutes.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => setMagicLinkSent(false)}
            className="w-full"
          >
            Back to sign in
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Email + Magic Link Form */}
          <form onSubmit={handleMagicLink} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium text-foreground">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => !inviteEmail && setEmail(e.target.value)}
                  required
                  readOnly={!!inviteEmail}
                  placeholder="you@company.com"
                  className={`w-full h-11 pl-10 pr-4 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-ring transition-colors ${inviteEmail ? 'bg-muted cursor-not-allowed' : ''}`}
                />
              </div>
              {inviteEmail && (
                <p className="text-xs text-muted-foreground">
                  Sign in with this email to accept the invitation.
                </p>
              )}
            </div>

            <Button
              type="submit"
              disabled={magicLinkMutation.isPending}
              className="w-full h-11 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors group"
            >
              {magicLinkMutation.isPending ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Sending link...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  Send sign-in link
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </span>
              )}
            </Button>
          </form>

          {/* Sign up link */}
          <p className="text-center text-sm text-muted-foreground pt-2">
            Don&apos;t have an account?{" "}
            <a
              className="text-primary hover:text-primary/80 font-medium transition-colors"
              href={inviteId
                ? `/signup?inviteId=${inviteId}&email=${encodeURIComponent(inviteEmail || '')}&redirect=${encodeURIComponent(redirectUrl ? safeRedirectPath : inviteRedirectPath)}`
                : "/signup"
              }
            >
              Sign up
            </a>
          </p>
        </div>
      )}
    </AuthCard>
  );
}

function LoadingState() {
  return (
    <div className="min-h-screen grid place-items-center p-6">
      <div className="text-muted-foreground">Loading...</div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <LoginPageContent />
    </Suspense>
  );
}
