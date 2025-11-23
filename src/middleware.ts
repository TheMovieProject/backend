// middleware.ts
import { NextResponse, NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const protectedPaths = [
  "/profile",
  "/write",
  "/watchlist",
  "/liked",
  "/movies",
  "/home",
  "theater",

];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 🔍 Debug: confirm middleware is running, and what path
  console.log("🔹 MIDDLEWARE RUN →", pathname);

  // 1. Auth protection
  const isProtected = protectedPaths.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  );

  if (isProtected) {
    // ✅ Explicitly use the same SECRET as NextAuth
    const token = await getToken({
      req,
      secret: process.env.SECRET,
    });

    console.log("   → isProtected:", pathname, "token?", !!token);

    if (!token) {
      const loginUrl = new URL("/login", req.url); // or "/login"
      // loginUrl.searchParams.set("from", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // 2. Simple in-memory rate limiting (single server only)
  const ip = req.ip ?? "127.0.0.1";
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute
  const maxRequests = 60;

  const globalAny = globalThis as any;
  if (!globalAny.rateLimit) {
    globalAny.rateLimit = new Map<string, number[]>();
  }

  const requests: number[] = globalAny.rateLimit.get(ip) || [];
  const recentRequests = requests.filter((t) => now - t < windowMs);
  recentRequests.push(now);
  globalAny.rateLimit.set(ip, recentRequests);

  if (recentRequests.length > maxRequests) {
    return new NextResponse("Too Many Requests", { status: 429 });
  }

  // 3. Security headers
 // 3. Security headers
const res = NextResponse.next();
res.headers.set("X-Frame-Options", "DENY");
res.headers.set("X-Content-Type-Options", "nosniff");
res.headers.set("X-XSS-Protection", "1; mode=block");
res.headers.set(
  "Strict-Transport-Security",
  "max-age=63072000; includeSubDomains; preload"
);

// 👇 UPDATED CSP
res.headers.set(
  "Content-Security-Policy",
  [
    "default-src 'self'",
    "connect-src 'self' https://api.themoviedb.org", // allow TMDB API
    "img-src * blob: data:",
    "media-src *",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    "frame-ancestors 'none'",
  ].join("; ")
);

return res;
}

// Run on all non-static, non-API routes
export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
