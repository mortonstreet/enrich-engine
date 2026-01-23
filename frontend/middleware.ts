import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Marketing routes that should be accessible on www subdomain
const MARKETING_ROUTES = ["/", "/waitlist", "/privacy", "/terms"];

// Auth routes that should be on app subdomain
const AUTH_ROUTES = ["/login", "/signup", "/verify", "/reset-password", "/accept-invitation"];

// Protected routes that require authentication
const PROTECTED_ROUTES = ["/dashboard"];

// Check if path matches any route in the list (including nested routes)
function matchesRoute(path: string, routes: string[]): boolean {
  return routes.some(route => {
    if (route === "/") return path === "/";
    return path === route || path.startsWith(route + "/");
  });
}

// Check if user has a session cookie (presence check only - validation happens client-side)
function hasSessionCookie(request: NextRequest): boolean {
  // better-auth uses a session cookie - check for its presence
  const sessionCookie = request.cookies.get("better-auth.session_token")
    || request.cookies.get("__Secure-better-auth.session_token");
  return !!sessionCookie;
}

export function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;
  const hostname = request.headers.get("host") || "";

  // Get environment-specific domains
  const appDomain = process.env.NEXT_PUBLIC_APP_DOMAIN || "app.enrichengine.io";
  const wwwDomain = process.env.NEXT_PUBLIC_WWW_DOMAIN || "www.enrichengine.io";

  // Check if we're in production (custom domains)
  const isProduction = hostname.includes("enrichengine.io");
  const isAppDomain = hostname.startsWith("app.");
  const isWwwDomain = hostname.startsWith("www.") || hostname === "enrichengine.io";

  // Skip middleware for static files and API routes
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.includes(".") // Static files like .ico, .png, etc.
  ) {
    return NextResponse.next();
  }

  // In development, allow all routes
  if (!isProduction) {
    return NextResponse.next();
  }

  // === PRODUCTION DOMAIN ROUTING ===

  // On www/root domain - only allow marketing routes
  if (isWwwDomain) {
    if (matchesRoute(pathname, MARKETING_ROUTES)) {
      return NextResponse.next();
    }

    // Redirect non-marketing routes to app subdomain
    const url = new URL(request.url);
    url.hostname = appDomain;
    return NextResponse.redirect(url);
  }

  // On app subdomain - handle auth and protected routes
  if (isAppDomain) {
    const hasSession = hasSessionCookie(request);

    // Root path on app subdomain - redirect based on auth
    if (pathname === "/") {
      const redirectPath = hasSession ? "/dashboard" : "/login";
      const url = new URL(redirectPath, request.url);
      return NextResponse.redirect(url);
    }

    // Marketing routes should redirect to www
    if (matchesRoute(pathname, MARKETING_ROUTES) && pathname !== "/") {
      const url = new URL(request.url);
      url.hostname = wwwDomain;
      return NextResponse.redirect(url);
    }

    // Protected routes - redirect to login if no session cookie
    if (matchesRoute(pathname, PROTECTED_ROUTES) && !hasSession) {
      const url = new URL("/login", request.url);
      // Preserve the intended destination
      url.searchParams.set("redirect", pathname);
      return NextResponse.redirect(url);
    }

    // Auth routes with session - redirect to dashboard (except special pages)
    if (matchesRoute(pathname, AUTH_ROUTES) && hasSession) {
      // Allow accept-invitation and verify pages even when logged in
      if (pathname.startsWith("/accept-invitation") ||
          (pathname.startsWith("/verify") && searchParams.has("inviteId"))) {
        return NextResponse.next();
      }

      const url = new URL("/dashboard", request.url);
      return NextResponse.redirect(url);
    }

    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
