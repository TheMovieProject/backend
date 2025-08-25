// app/api/follow/suggestions/route.ts
import { NextResponse } from "next/server";
import { getAuthSession } from "@/app/api/auth/[...nextauth]/options";
import prismadb from "@/app/api/auth/[...nextauth]/connect";

export async function GET() {
  try {
    const session = await getAuthSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Load me by email (same pattern as your feed route)
    const me = await prismadb.user.findUnique({
      where: { email: session.user.email },
      select: {
        id: true,
        following: { select: { followingId: true } }, // users I already follow
      },
    });

    if (!me) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const alreadyFollowingIds = new Set(me.following.map((f: { followingId: any; }) => f.followingId));

    // Top 5 suggestions (not me, not already-followed), ordered by follower count
    const suggestions = await prismadb.user.findMany({
      where: {
        id: {
          notIn: [me.id, ...Array.from(alreadyFollowingIds)],
        },
      },
      take: 5,
      orderBy: {
        followedBy: { _count: "desc" }, // relation name from your schema
      },
      select: {
        id: true,
        username: true,
        email: true,
        avatarUrl: true,
        image: true,
        _count: { select: { followedBy: true } },
      },
    });

    const result = suggestions.map((u: { id: any; username: any; email: string; avatarUrl: any; image: any; _count: { followedBy: any; }; }) => ({
      id: u.id,
      username: u.username || u.email?.split("@")[0] || "Anonymous",
      avatarUrl: u.avatarUrl || u.image || null,
      followersCount: u._count.followedBy,
    }));

    return NextResponse.json(result);
  } catch (err) {
    console.error("Follow suggestions error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
