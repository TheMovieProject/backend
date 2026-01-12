// app/api/feed/route.js
import { NextResponse } from "next/server";
import { getAuthSession } from "@/app/api/auth/[...nextauth]/options";
import prismadb from "@/app/api/auth/[...nextauth]/connect";

const LIMIT_DEFAULT = 20;

/* ---------- utils ---------- */

function scoreItem(item, _userGenres, followingIds, baseScore) {
  let score = baseScore;

  // follow boost
  if (followingIds.has(item.userId)) score += 20;

  // engagement (diminishing returns)
  score += Math.log((item.likes || 0) + 1) * 2;
  score += Math.log((item.fire || 0) + 1) * 3;
  score += Math.log((item.commentsCount || 0) + 1) * 1.5;

  // recency (2-day decay)
  const hoursOld = (Date.now() - new Date(item.createdAt).getTime()) / 36e5;
  score += Math.max(0, 48 - hoursOld) * 0.2;

  // slight type bias
  if (item.type === "review") score += 2;
  if (item.type === "blog") score += 1;

  return score;
}

function errMsg(e) {
  if (e instanceof Error) return e.message;
  if (typeof e === "string") return e;
  try {
    return JSON.stringify(e);
  } catch {
    return "Unknown error";
  }
}

/* ---------- GET (feed) ---------- */

export async function GET(req) {
  try {
    const session = await getAuthSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const mode = searchParams.get("mode") ?? "forYou"; // 'forYou' | 'following'
    const limit = Math.min(Number(searchParams.get("limit") ?? LIMIT_DEFAULT), 50);
    const cursorParam = searchParams.get("cursor");
    const cursor = cursorParam && cursorParam.trim() ? cursorParam : undefined;

    const me = await prismadb.user.findUnique({
      where: { email: session.user.email },
      select: {
        id: true,
        email: true,
        movieGenres: true,
        following: { select: { followingId: true } },
      },
    });

    if (!me) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const followingIds = new Set(me.following.map((f) => f.followingId));

    // gather following emails for blogs
    const followingUsers =
      followingIds.size > 0
        ? await prismadb.user.findMany({
            where: { id: { in: Array.from(followingIds) } },
            select: { email: true },
          })
        : [];

    const followingEmails = new Set(followingUsers.map((u) => u.email).filter(Boolean));

    const take = limit * 2;

    const reviewWhere =
      mode === "following" && followingIds.size > 0
        ? { userId: { in: Array.from(followingIds) } }
        : {};

    const blogWhere =
      mode === "following" && followingEmails.size > 0
        ? { userEmail: { in: Array.from(followingEmails) } }
        : {};

    // 1) Fetch reviews + blogs
    const [reviews, blogs] = await Promise.all([
      prismadb.review.findMany({
        where: { ...reviewWhere },
        orderBy: { createdAt: "desc" },
        take,
        include: {
          user: {
            select: { id: true, username: true, email: true, avatarUrl: true, image: true },
          },
          movie: { select: { id: true, tmdbId: true, title: true, posterUrl: true } },
          reviewComments: { select: { id: true } },
        },
      }),
      prismadb.blog.findMany({
        where: blogWhere,
        orderBy: { createdAt: "desc" },
        take,
        include: {
          user: {
            select: { id: true, username: true, email: true, avatarUrl: true, image: true },
          },
          comments: { select: { id: true } },
        },
      }),
    ]);

    // 2) Fetch AUTHOR ratings for these reviews (rating by review.userId for review.movieId)
    const ratingPairs = reviews
      .filter((r) => r.userId && r.movieId)
      .map((r) => ({ userId: r.userId, movieId: r.movieId }));

    const authorRatings = ratingPairs.length
      ? await prismadb.rating.findMany({
          where: { OR: ratingPairs },
          select: { userId: true, movieId: true, value: true },
        })
      : [];

    const authorRatingMap = new Map(
      authorRatings.map((r) => [`${r.userId}-${r.movieId}`, r.value])
    );

    // 3) Build feed items (NOW WITH AUTHOR RATING)
    const items = [
      ...reviews.map((r) => {
        const authorRating =
          r.movieId ? authorRatingMap.get(`${r.userId}-${r.movieId}`) ?? null : null;

        return {
          type: "review",
          id: r.id,
          userId: r.userId,
          user: {
            id: r.user?.id,
            username: r.user?.username ?? null,
            email: r.user?.email ?? null,
            avatarUrl: r.user?.avatarUrl ?? null,
            image: r.user?.image ?? null,
          },
          createdAt: r.createdAt,
          likes: r.likes ?? 0,
          fire: r.fire ?? 0,
          commentsCount: r.reviewComments?.length || 0,

          movie: r.movie
            ? {
                id: r.movie.id,
                tmdbId: r.movie.tmdbId ?? null,
                title: r.movie.title ?? null,
                posterUrl: r.movie.posterUrl ?? null,
              }
            : undefined,

          // ✅ show rating of the author who wrote this review
          authorRating,

          title: r.movie?.title ?? "Unknown",
          thumbnail: r.movie?.posterUrl ?? null,
          excerpt: r.content
          ? r.content.slice(0, 440) + (r.content.length > 440 ? "...." : "")
          : "",
        };
      }),
      ...blogs.map((b) => ({
        type: "blog",
        id: b.id,
        userId: b.user?.id,
        user: {
          id: b.user?.id,
          username: b.user?.username ?? null,
          email: b.user?.email ?? null,
          avatarUrl: b.user?.avatarUrl ?? null,
          image: b.user?.image ?? null,
        },
        createdAt: b.createdAt,
        likes: b.likes ?? 0,
        fire: b.fire ?? 0,
        commentsCount: b.comments?.length || 0,
        title: b.title,
        thumbnail: b.thumbnail ?? null,
        excerpt: b.content
          ? b.content.slice(0, 240) + (b.content.length > 240 ? "..." : "")
          : "",

        authorRating: null, // blogs don't have movie rating
      })),
    ];

    // 4) User reactions
    const itemIds = items.map((i) => i.id);

    const userReactions = await prismadb.entityReaction.findMany({
      where: {
        userId: me.id,
        entityId: { in: itemIds },
        entityType: { in: ["review", "blog"] },
      },
    });

    const reactionMap = new Map();
    userReactions.forEach((r) => {
      const key = `${r.entityId}-${r.entityType}`;
      if (!reactionMap.has(key)) reactionMap.set(key, new Set());
      reactionMap.get(key).add(r.reactionType);
    });

    items.forEach((item) => {
      const key = `${item.id}-${item.type}`;
      const r = reactionMap.get(key);
      item.userLiked = r?.has("likes") || false;
      item.userFired = r?.has("fire") || false;
    });

    // 5) score + sort
    const finalItems =
      mode === "forYou"
        ? items
            .map((it) => ({
              ...it,
              score: scoreItem(it, me.movieGenres ?? [], followingIds, 0),
            }))
            .sort((a, b) => (b.score || 0) - (a.score || 0))
        : items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // 6) pagination
    const page = finalItems.slice(0, limit);
    const nextCursor =
      page.length === limit && finalItems.length > limit ? page[page.length - 1].id : null;

    return NextResponse.json({
      items: page,
      nextCursor,
      meta: {
        mode,
        totalFetched: items.length,
        returned: page.length,
        hasMore: nextCursor !== null,
      },
    });
  } catch (error) {
    console.error("FEED ERROR:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details:
          process.env.NODE_ENV === "development"
            ? error instanceof Error
              ? error.message
              : String(error)
            : undefined,
      },
      { status: 500 }
    );
  }
}


/* ---------- POST (add/remove reaction) ---------- */

export async function POST(req) {
  try {
    const session = await getAuthSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const currentUser = await prismadb.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    });

    if (!currentUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const body = await req.json();
    const { entityId, entityType, reactionType, action } = body || {};

    if (!entityId || !entityType || !reactionType || !action) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (action === "add") {
      await prismadb.entityReaction.upsert({
        where: {
          userId_entityId_entityType_reactionType: {
            userId: currentUser.id,
            entityId,
            entityType,
            reactionType,
          },
        },
        update: {},
        create: {
          userId: currentUser.id,
          entityId,
          entityType,
          reactionType,
        },
      });

      const increment = { [reactionType]: { increment: 1 } };

      if (entityType === "review") {
        await prismadb.review.update({ where: { id: entityId }, data: increment });
      } else if (entityType === "blog") {
        await prismadb.blog.update({ where: { id: entityId }, data: increment });
      }
    } else if (action === "remove") {
      await prismadb.entityReaction.deleteMany({
        where: {
          userId: currentUser.id,
          entityId,
          entityType,
          reactionType,
        },
      });

      const decrement = { [reactionType]: { decrement: 1 } };

      if (entityType === "review") {
        await prismadb.review.update({ where: { id: entityId }, data: decrement });
      } else if (entityType === "blog") {
        await prismadb.blog.update({ where: { id: entityId }, data: decrement });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error", details: errMsg(error) },
      { status: 500 }
    );
  }
}
