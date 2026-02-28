import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthSession } from "@/app/api/auth/[...nextauth]/options";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("query") || "").trim();
    const limit = Math.min(parseInt(searchParams.get("limit") || "5", 10), 20);
    const exact = searchParams.get("exact") === "1";
    const excludeMe = searchParams.get("excludeMe") === "1";

    if (!q) return NextResponse.json([]);

    // Optional: exclude the logged-in user from results
    let meId = null;
    if (excludeMe) {
      const session = await getAuthSession();
      if (session?.user?.email) {
        const me = await prisma.user.findUnique({
          where: { email: session.user.email },
          select: { id: true },
        });
        meId = me?.id || null;
      }
    }

    let users;
    if (exact) {
      const exactFilters: Prisma.UserWhereInput[] = [
        { username: { equals: q, mode: Prisma.QueryMode.insensitive } },
      ];
      if (meId) {
        exactFilters.push({ id: { not: meId } });
      }

      // exact username match (case-insensitive)
      users = await prisma.user.findMany({
        where: {
          AND: exactFilters,
        },
        take: 1,
        select: {
          id: true,
          username: true,
          name: true,
          avatarUrl: true,
          image: true,
        },
      });
    } else {
      const searchFilters: Prisma.UserWhereInput[] = [
        {
          OR: [
            { username: { contains: q, mode: Prisma.QueryMode.insensitive } },
            { name: { contains: q, mode: Prisma.QueryMode.insensitive } },
          ],
        },
      ];
      if (meId) {
        searchFilters.push({ id: { not: meId } });
      }

      users = await prisma.user.findMany({
        where: {
          AND: searchFilters,
        },
        orderBy: { createdAt: "desc" },
        take: limit,
        select: {
          id: true,
          username: true,
          name: true,
          avatarUrl: true,
          image: true,
        },
      });
    }

    const result = users.map((u: { id: any; username: any; name: any; avatarUrl: any; image: any; }) => ({
      id: u.id,
      username: u.username || u.name || "User",
      name: u.name || "",
      avatarUrl: u.avatarUrl || u.image || null,
    }));

    return NextResponse.json(result);
  } catch (e) {
    console.error("[USER_LOOKUP_ERROR]", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
