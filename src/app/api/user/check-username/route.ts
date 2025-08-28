import { NextRequest, NextResponse } from "next/server";
import prisma from "@/app/api/auth/[...nextauth]/connect";

export async function GET(req: NextRequest) {
  try {
    const u = req.nextUrl.searchParams.get("u")?.toLowerCase() || "";
    if (!u) return NextResponse.json({ available: false });

    // Validate quickly here too
    const USERNAME_RE = /^[a-z0-9_\.]{3,20}$/;
    if (!USERNAME_RE.test(u)) return NextResponse.json({ available: false });

    const existing = await prisma.user.findFirst({
      where: { username: u },
      select: { id: true },
    });

    return NextResponse.json({ available: !existing });
  } catch (e) {
    return NextResponse.json({ available: false });
  }
}
