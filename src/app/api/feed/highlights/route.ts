import { NextResponse } from "next/server";
import { getAuthSession } from "@/app/api/auth/[...nextauth]/options";
import prisma from "@/app/libs/prismaDB";

export const dynamic = "force-dynamic";

type FriendsMovieBucket = {
  movieId: string;
  tmdbId: string;
  title: string;
  posterUrl: string | null;
  count: number;
  users: Array<{ id: string; username: string | null; avatarUrl: string | null }>;
};

export async function GET() {
  try {
    const session = await getAuthSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const me = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: {
        id: true,
        following: { select: { followingId: true } },
      },
    });

    if (!me) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const followingIds = me.following.map((f: { followingId: string }) => f.followingId);
    const since14d = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
    const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [friendReviews, recentReviews, recentBlogs, pollMovies] = await Promise.all([
      followingIds.length
        ? prisma.review.findMany({
            where: {
              userId: { in: followingIds },
              createdAt: { gte: since14d },
            },
            orderBy: { createdAt: "desc" },
            include: {
              user: { select: { id: true, username: true, avatarUrl: true, image: true } },
              movie: { select: { id: true, tmdbId: true, title: true, posterUrl: true } },
            },
            take: 150,
          })
        : Promise.resolve([]),
      prisma.review.findMany({
        where: { createdAt: { gte: since7d } },
        orderBy: { createdAt: "desc" },
        include: {
          user: { select: { id: true, username: true, avatarUrl: true, image: true } },
          movie: { select: { id: true, tmdbId: true, title: true, posterUrl: true } },
          reviewComments: { select: { id: true } },
        },
        take: 120,
      }),
      prisma.blog.findMany({
        where: { createdAt: { gte: since7d } },
        orderBy: { createdAt: "desc" },
        include: {
          user: { select: { id: true, username: true, avatarUrl: true, image: true } },
          comments: { select: { id: true } },
        },
        take: 120,
      }),
      prisma.movie.findMany({
        orderBy: [{ votes: "desc" }, { title: "asc" }],
        select: {
          id: true,
          tmdbId: true,
          title: true,
          posterUrl: true,
          votes: true,
        },
        take: 8,
      }),
    ]);

    const friendBuckets = new Map<string, FriendsMovieBucket>();
    for (const review of friendReviews) {
      if (!review.movieId || !review.movie) continue;
      if (!friendBuckets.has(review.movieId)) {
        friendBuckets.set(review.movieId, {
          movieId: review.movieId,
          tmdbId: review.movie.tmdbId,
          title: review.movie.title,
          posterUrl: review.movie.posterUrl || null,
          count: 0,
          users: [],
        });
      }

      const bucket = friendBuckets.get(review.movieId)!;
      bucket.count += 1;

      const exists = bucket.users.some((u) => u.id === review.userId);
      if (!exists && review.user) {
        bucket.users.push({
          id: review.user.id,
          username: review.user.username,
          avatarUrl: review.user.avatarUrl || review.user.image || null,
        });
      }
    }

    const friendsWatching = Array.from(friendBuckets.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    const mostDiscussed = [
      ...recentReviews.map((r: any) => {
        const comments = r.reviewComments?.length || 0;
        const likes = r.likes || 0;
        const fire = r.fire || 0;
        return {
          id: r.id,
          type: "review",
          title: r.movie?.title || "Review",
          href: r.movie?.tmdbId ? `/movies/${r.movie.tmdbId}` : "/movies",
          buzz: likes + fire + comments * 2,
          comments,
          likes,
          fire,
          user: {
            id: r.user?.id || null,
            username: r.user?.username || null,
            avatarUrl: r.user?.avatarUrl || r.user?.image || null,
          },
        };
      }),
      ...recentBlogs.map((b: any) => {
        const comments = b.comments?.length || 0;
        const likes = b.likes || 0;
        const fire = b.fire || 0;
        return {
          id: b.id,
          type: "blog",
          title: b.title || "Blog",
          href: `/blog/${b.id}`,
          buzz: likes + fire + comments * 2,
          comments,
          likes,
          fire,
          user: {
            id: b.user?.id || null,
            username: b.user?.username || null,
            avatarUrl: b.user?.avatarUrl || b.user?.image || null,
          },
        };
      }),
    ]
      .sort((a, b) => b.buzz - a.buzz)
      .slice(0, 10);

    const weeklyPoll = pollMovies.map((movie: any) => ({
      id: movie.id,
      tmdbId: movie.tmdbId,
      title: movie.title,
      posterUrl: movie.posterUrl || null,
      votes: movie.votes || 0,
      href: movie.tmdbId ? `/movies/${movie.tmdbId}` : "/poll",
    }));

    return NextResponse.json({
      friendsWatching,
      mostDiscussed,
      weeklyPoll,
    });
  } catch (error) {
    console.error("GET /api/feed/highlights error", error);
    return NextResponse.json({ error: "Failed to load highlights" }, { status: 500 });
  }
}
