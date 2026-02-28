import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

const AUTH_SECRET = process.env.NEXTAUTH_SECRET ?? process.env.SECRET;

const AUTH_PAGES = new Set(["/login", "/signup"]);
const PROTECTED_PATHS = [
  "/profile",
  "/write",
  "/watchlist",
  "/watchlists",
  "/liked",
  "/movies",
  "/home",
  "/theater",
];

const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "img-src 'self' data: blob: https:",
  "media-src 'self' blob: https:",
  process.env.NODE_ENV === "development"
    ? "script-src 'self' 'unsafe-inline' 'unsafe-eval' https:"
    : "script-src 'self' 'unsafe-inline' https:",
  "style-src 'self' 'unsafe-inline' https:",
  "font-src 'self' data: https:",
  "connect-src 'self' https: wss:",
].join("; ");

function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  );
}

function isSafeInternalPath(pathname: string | null): pathname is string {
  return Boolean(pathname && pathname.startsWith("/") && !pathname.startsWith("//"));
}

function isAuthPath(pathname: string): boolean {
  return (
    pathname === "/login" ||
    pathname.startsWith("/login?") ||
    pathname === "/signup" ||
    pathname.startsWith("/signup?")
  );
}

function applySecurityHeaders(res: NextResponse, req: NextRequest): NextResponse {
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  res.headers.set("Content-Security-Policy", CONTENT_SECURITY_POLICY);

  if (req.nextUrl.protocol === "https:") {
    res.headers.set(
      "Strict-Transport-Security",
      "max-age=63072000; includeSubDomains; preload"
    );
  }

  return res;
}

export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const token = await getToken({ req, secret: AUTH_SECRET });

  if (!token && isProtectedPath(pathname)) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("from", `${pathname}${search}`);
    return applySecurityHeaders(NextResponse.redirect(loginUrl), req);
  }

  if (token && AUTH_PAGES.has(pathname)) {
    const from = req.nextUrl.searchParams.get("from");
    const redirectPath =
      isSafeInternalPath(from) && !isAuthPath(from) ? from : "/profile";

    return applySecurityHeaders(
      NextResponse.redirect(new URL(redirectPath, req.url)),
      req
    );
  }

  return applySecurityHeaders(NextResponse.next(), req);
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};

