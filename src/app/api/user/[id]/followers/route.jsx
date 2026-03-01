import prismadb from "@/app/api/auth/[...nextauth]/connect";
import { NextResponse } from "next/server";

export const maxDuration = 15;

export async function GET(req, { params }) {
  try {
    const limitRaw = Number(new URL(req.url).searchParams.get("limit") ?? 25);
    const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(1, Math.floor(limitRaw)), 100) : 25;

    const followers = await prismadb.follow.count({
      where: { followingId: params.id },
    });

    const followersList = await prismadb.follow.findMany({
      where: { followingId: params.id },
      take: limit,
      orderBy: { createdAt: "desc" },
      select: {
        follower: {
          select: {
            id: true,
            username: true,
            email: true,
            image: true,
            avatarUrl: true,
          },
        },
      },
    });

    return NextResponse.json({
      followers,
      followersList: followersList.map((f) => f.follower),
      hasMore: followers > followersList.length,
    });
  } catch (error) {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
