// middleware.ts
import { NextResponse, NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

// Add paths that should require login
const protectedPaths = ["/profile", "/write", "/feed", "/watchlist", "/liked","/movies"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 1. Check if the path is protected
  if (protectedPaths.some((path) => pathname.startsWith(path))) {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

    if (!token) {
      const loginUrl = new URL("/login", req.url);
      loginUrl.searchParams.set("from", pathname); // redirect back after login
      return NextResponse.redirect(loginUrl);
    }
  }

  // 2. Add security headers
  const response = NextResponse.next();
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set(
    "Strict-Transport-Security",
    "max-age=63072000; includeSubDomains; preload"
  );
  response.headers.set(
    "Content-Security-Policy",
    "default-src 'self'; img-src * blob: data:; media-src *; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; frame-ancestors 'none';"
  );

  // 3. (Optional) Rate limiting - simple in-memory
  // Works only on single-server deployments (not distributed)
  const ip = req.ip ?? "127.0.0.1";
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute
  const maxRequests = 60; // per minute

  if (!(global as any).rateLimit) (global as any).rateLimit = new Map();
  const requests = (global as any).rateLimit.get(ip) || [];
  const recentRequests = requests.filter((t: number) => now - t < windowMs);

  recentRequests.push(now);
  (global as any).rateLimit.set(ip, recentRequests);

  if (recentRequests.length > maxRequests) {
    return new NextResponse("Too Many Requests", { status: 429 });
  }

  return response;
}

// Apply middleware only to app routes
export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
