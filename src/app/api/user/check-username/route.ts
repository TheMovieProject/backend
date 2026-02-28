import { NextRequest, NextResponse } from "next/server";
import prisma from "@/app/libs/prismaDB";
import { getClientIp, normalizeUsername, rateLimit } from "@/app/libs/auth_security";

export async function GET(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const limiter = rateLimit(`auth:username:${ip}`, {
      windowMs: 60 * 1000,
      max: 45,
      blockMs: 5 * 60 * 1000,
    });

    if (!limiter.allowed) {
      return NextResponse.json(
        { available: false },
        {
          status: 429,
          headers: {
            "Retry-After": String(limiter.retryAfterSec),
          },
        }
      );
    }

    const u = req.nextUrl.searchParams.get("u");
    const username = normalizeUsername(u);
    if (!username) return NextResponse.json({ available: false });

    const existing = await prisma.user.findUnique({
      where: { username },
      select: { id: true },
    });

    return NextResponse.json({ available: !existing });
  } catch {
    return NextResponse.json({ available: false }, { status: 500 });
  }
}
