import { NextResponse } from "next/server";
import { getAuthSession } from "@/app/api/auth/[...nextauth]/options";
import prisma from "@/app/libs/prismaDB";
import { htmlToPlainText, truncateText } from "@/app/libs/textUtils";

export const maxDuration = 30;

const LIMIT_DEFAULT = 12;
const LIMIT_MAX = 24;
const VALID_MODES = new Set(["forYou", "following"]);
const VALID_ENTITY_TYPES = new Set(["review", "blog"]);
const VALID_REACTION_TYPES = new Set(["like", "fire"]);
const LEGACY_TO_CANONICAL_REACTION = { likes: "like", fire: "fire", like: "like" };

function scoreItem(item, followingIds, baseScore = 0) {
  let score = baseScore;

  if (followingIds.has(item.userId)) score += 20;

  score += Math.log((item.likes || 0) + 1) * 2;
  score += Math.log((item.fire || 0) + 1) * 3;
  score += Math.log((item.commentsCount || 0) + 1) * 1.5;

  const hoursOld = (Date.now() - new Date(item.createdAt).getTime()) / 36e5;
  score += Math.max(0, 48 - hoursOld) * 0.2;

  if (item.type === "review") score += 2;
  if (item.type === "blog") score += 1;

  return score;
}

function toErrorMessage(err) {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  try {
    return JSON.stringify(err);
  } catch {
    return "Unknown error";
  }
}

function parseLimit(rawLimit) {
  const parsed = Number(rawLimit ?? LIMIT_DEFAULT);
  if (!Number.isFinite(parsed) || parsed <= 0) return LIMIT_DEFAULT;
  return Math.min(Math.floor(parsed), LIMIT_MAX);
}

function parseCursor(rawCursor) {
  if (rawCursor == null) return 0;
  const parsed = Number(rawCursor);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return Math.floor(parsed);
}

async function syncReactionCounters(entityType, entityId) {
  const [likes, fire] = await Promise.all([
    prisma.entityReaction.count({
      where: { entityType, entityId, reactionType: { in: ["like", "likes"] } },
    }),
    prisma.entityReaction.count({
      where: { entityType, entityId, reactionType: "fire" },
    }),
  ]);

  if (entityType === "review") {
    await prisma.review.update({
      where: { id: entityId },
      data: { likes, fire, popularity: likes + fire },
    });
  } else {
    await prisma.blog.update({
      where: { id: entityId },
      data: { likes, fire },
    });
  }

  return { likes, fire };
}

export async function GET(req) {
  try {
    const session = await getAuthSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const requestedMode = searchParams.get("mode") ?? "forYou";
    const mode = VALID_MODES.has(requestedMode) ? requestedMode : "forYou";
    const limit = parseLimit(searchParams.get("limit"));
    const cursor = parseCursor(searchParams.get("cursor"));
    const baseWindow = cursor + limit;
    const take =
      mode === "following"
        ? Math.min(Math.max(baseWindow, limit * 2), 120)
        : Math.min(Math.max(baseWindow, limit * 2), 160);

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

    const followingIds = new Set(me.following.map((f) => f.followingId));

    if (mode === "following" && followingIds.size === 0) {
      return NextResponse.json({
        items: [],
        nextCursor: null,
        meta: {
          mode,
          cursor,
          totalFetched: 0,
          returned: 0,
          hasMore: false,
        },
      });
    }

    const followingUsers =
      followingIds.size > 0
        ? await prisma.user.findMany({
            where: { id: { in: Array.from(followingIds) } },
            select: { email: true },
          })
        : [];
    const followingEmails = new Set(followingUsers.map((u) => u.email).filter(Boolean));

    const reviewWhere = mode === "following" ? { userId: { in: Array.from(followingIds) } } : {};
    const blogWhere = mode === "following" ? { userEmail: { in: Array.from(followingEmails) } } : {};

    const [reviews, blogs] = await Promise.all([
      prisma.review.findMany({
        where: reviewWhere,
        orderBy: { createdAt: "desc" },
        take,
        select: {
          id: true,
          userId: true,
          movieId: true,
          content: true,
          createdAt: true,
          likes: true,
          fire: true,
          user: { select: { id: true, username: true, email: true, avatarUrl: true, image: true } },
          movie: { select: { id: true, tmdbId: true, title: true, posterUrl: true } },
          _count: { select: { reviewComments: true } },
        },
      }),
      prisma.blog.findMany({
        where: blogWhere,
        orderBy: { createdAt: "desc" },
        take,
        select: {
          id: true,
          title: true,
          content: true,
          thumbnail: true,
          createdAt: true,
          likes: true,
          fire: true,
          user: { select: { id: true, username: true, email: true, avatarUrl: true, image: true } },
          _count: { select: { comments: true } },
        },
      }),
    ]);

    const ratingPairs = [];
    const ratingPairKeys = new Set();
    for (const review of reviews) {
      if (!review.userId || !review.movieId) continue;
      const key = `${review.userId}-${review.movieId}`;
      if (ratingPairKeys.has(key)) continue;
      ratingPairKeys.add(key);
      ratingPairs.push({ userId: review.userId, movieId: review.movieId });
    }

    const authorRatings = ratingPairs.length
      ? await prisma.rating.findMany({
          where: { OR: ratingPairs },
          select: { userId: true, movieId: true, value: true },
        })
      : [];

    const authorRatingMap = new Map(authorRatings.map((r) => [`${r.userId}-${r.movieId}`, r.value]));

    const items = [
      ...reviews.map((r) => ({
        type: "review",
        id: r.id,
        userId: r.userId,
        user: {
          id: r.user?.id ?? null,
          username: r.user?.username ?? null,
          email: r.user?.email ?? null,
          avatarUrl: r.user?.avatarUrl ?? null,
          image: r.user?.image ?? null,
        },
        createdAt: r.createdAt,
        likes: r.likes ?? 0,
        fire: r.fire ?? 0,
        commentsCount: r._count?.reviewComments ?? 0,
        movie: r.movie
          ? {
              id: r.movie.id,
              tmdbId: r.movie.tmdbId ?? null,
              title: r.movie.title ?? null,
              posterUrl: r.movie.posterUrl ?? null,
            }
          : undefined,
        authorRating: r.movieId ? authorRatingMap.get(`${r.userId}-${r.movieId}`) ?? null : null,
        title: r.movie?.title ?? "Unknown",
        thumbnail: r.movie?.posterUrl ?? null,
        excerpt: truncateText(htmlToPlainText(r.content ?? ""), 360),
        content: r.content ?? "",
      })),
      ...blogs.map((b) => ({
        type: "blog",
        id: b.id,
        userId: b.user?.id ?? null,
        user: {
          id: b.user?.id ?? null,
          username: b.user?.username ?? null,
          email: b.user?.email ?? null,
          avatarUrl: b.user?.avatarUrl ?? null,
          image: b.user?.image ?? null,
        },
        createdAt: b.createdAt,
        likes: b.likes ?? 0,
        fire: b.fire ?? 0,
        commentsCount: b._count?.comments ?? 0,
        title: b.title,
        thumbnail: b.thumbnail ?? null,
        excerpt: truncateText(htmlToPlainText(b.content ?? ""), 220),
        content: b.content ?? "",
        authorRating: null,
      })),
    ];

    const itemIds = items.map((i) => i.id);
    const userReactions = itemIds.length
      ? await prisma.entityReaction.findMany({
          where: {
            userId: me.id,
            entityId: { in: itemIds },
            entityType: { in: ["review", "blog"] },
          },
          select: { entityId: true, entityType: true, reactionType: true },
        })
      : [];

    const reactionMap = new Map();
    for (const reaction of userReactions) {
      const key = `${reaction.entityId}-${reaction.entityType}`;
      if (!reactionMap.has(key)) reactionMap.set(key, new Set());
      reactionMap.get(key).add(LEGACY_TO_CANONICAL_REACTION[reaction.reactionType] ?? reaction.reactionType);
    }

    items.forEach((item) => {
      const key = `${item.id}-${item.type}`;
      const reactions = reactionMap.get(key);
      item.likedByMe = reactions?.has("like") || false;
      item.firedByMe = reactions?.has("fire") || false;
    });

    const scored =
      mode === "forYou"
        ? items
            .map((it) => ({
              ...it,
              score: scoreItem(it, followingIds, 0),
            }))
            .sort((a, b) => (b.score || 0) - (a.score || 0))
        : items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const page = scored.slice(cursor, cursor + limit);
    const nextCursor = cursor + page.length < scored.length ? cursor + page.length : null;

    return NextResponse.json({
      items: page,
      nextCursor,
      meta: {
        mode,
        cursor,
        totalFetched: items.length,
        returned: page.length,
        hasMore: nextCursor !== null,
      },
    });
  } catch (error) {
    console.error("FEED_ERROR", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: process.env.NODE_ENV === "development" ? toErrorMessage(error) : undefined,
      },
      { status: 500 }
    );
  }
}

export async function POST(req) {
  try {
    const session = await getAuthSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const me = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    });
    if (!me) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const body = await req.json();
    const entityId = body?.entityId;
    const entityType = body?.entityType;
    const action = body?.action;
    const rawReactionType = body?.reactionType;
    const reactionType = LEGACY_TO_CANONICAL_REACTION[rawReactionType];

    if (!entityId || !VALID_ENTITY_TYPES.has(entityType)) {
      return NextResponse.json({ error: "Invalid entity" }, { status: 400 });
    }
    if (!reactionType || !VALID_REACTION_TYPES.has(reactionType)) {
      return NextResponse.json({ error: "Invalid reactionType" }, { status: 400 });
    }
    if (action !== "add" && action !== "remove") {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    const existing = await prisma.entityReaction.findFirst({
      where: {
        userId: me.id,
        entityId,
        entityType,
        reactionType: { in: [reactionType, reactionType === "like" ? "likes" : reactionType] },
      },
      select: { id: true },
    });

    if (action === "add" && !existing) {
      await prisma.entityReaction.create({
        data: {
          userId: me.id,
          entityId,
          entityType,
          reactionType,
        },
      });
    }

    if (action === "remove" && existing) {
      await prisma.entityReaction.delete({
        where: { id: existing.id },
      });
    }

    const counts = await syncReactionCounters(entityType, entityId);
    const myReactions = await prisma.entityReaction.findMany({
      where: {
        userId: me.id,
        entityType,
        entityId,
        reactionType: { in: ["like", "likes", "fire"] },
      },
      select: { reactionType: true },
    });
    const likedByMe = myReactions.some((r) => r.reactionType === "like" || r.reactionType === "likes");
    const firedByMe = myReactions.some((r) => r.reactionType === "fire");

    return NextResponse.json({
      success: true,
      likes: counts.likes,
      fire: counts.fire,
      likedByMe,
      firedByMe,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error", details: toErrorMessage(error) },
      { status: 500 }
    );
  }
}
