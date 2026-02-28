import { getServerSession } from "next-auth";
import type { NextAuthOptions } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import prisma from "@/app/libs/prismaDB";

/* ---------------- helpers ---------------- */

const buildTree = (flat: any[]) => {
  const map: Record<string, any> = {};
  const roots: any[] = [];
  for (const c of flat) map[c.id] = { ...c, children: [] };
  for (const c of flat)
    c.parentId && map[c.parentId]
      ? map[c.parentId].children.push(map[c.id])
      : roots.push(map[c.id]);
  return roots;
};

const countTree = (nodes: any[]): number =>
  nodes.reduce((n, c) => n + 1 + (c.children?.length ? countTree(c.children) : 0), 0);

const eng = (r: any, cc: number) => (r.likes || 0) + (r.fire || 0) + cc;

const shapeReview = (r: any, myReactions: Record<string, any> = {}) => {
  const tree = buildTree(r.reviewComments || []);
  const cc = countTree(tree);
  return {
    id: r.id,
    content: r.content,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    likes: r.likes,
    fire: r.fire,
    popularity: r.popularity,
    user: r.user,
    movie: r.movie,
    commentsTree: tree,
    commentsCount: cc,
    likedByMe: myReactions[r.id]?.likedByMe ?? false,
    firedByMe: myReactions[r.id]?.firedByMe ?? false,
  };
};

function tmdbPoster(path?: string | null) {
  if (!path) return null;
  return `https://image.tmdb.org/t/p/w500${path}`;
}

/**
 * ✅ Ensures Movie exists with required fields:
 * - tmdbId (unique)
 * - title (required in your schema)
 * - posterUrl (optional)
 */

/* ---------------- GET: Fetch reviews ---------------- */

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const tmdbId = url.searchParams.get("movieId");
    const userId = url.searchParams.get("userId");

    const session = await getServerSession(authOptions as unknown as NextAuthOptions);

    const me = session?.user?.email
      ? await prisma.user.findUnique({ where: { email: session.user.email } })
      : null;

    let rows: any[] = [];

    if (userId) {
      // 1) get reviews only
      const reviews = await prisma.review.findMany({
        where: { userId },
        include: {
          user: { select: { id: true, username: true, avatarUrl: true, image: true } },
          reviewComments: {
            include: { user: { select: { id: true, username: true, avatarUrl: true, image: true } } },
            orderBy: { createdAt: "desc" },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      // 2) get movies in bulk (only existing)
      const movieIds = [...new Set(reviews.map((r: any) => r.movieId))].filter(Boolean);

      const movies = await prisma.movie.findMany({
        where: { id: { in: movieIds } },
        select: { id: true, tmdbId: true, title: true, posterUrl: true },
      });

      const movieMap = new Map(movies.map((m: { id: any; }) => [m.id, m]));

      // 3) attach movie manually; drop broken ones
      rows = reviews
        .map((r: any) => ({ ...r, movie: movieMap.get(r.movieId) || null }))
        .filter((r: any) => r.movie !== null);
    } else {
      if (!tmdbId) {
        return new Response(JSON.stringify({ error: "Missing movieId" }), { status: 400 });
      }

      // tmdb route (safe because it filters by movie anyway)
      rows = await prisma.review.findMany({
        where: { movie: { is: { tmdbId: tmdbId } } },
        include: {
          movie: { select: { tmdbId: true, title: true, posterUrl: true } },
          user: { select: { id: true, username: true, avatarUrl: true, image: true } },
          reviewComments: {
            include: { user: { select: { id: true, username: true, avatarUrl: true, image: true } } },
            orderBy: { createdAt: "desc" },
          },
        },
      });
    }

    // mark my reactions in bulk
    let myReactions: Record<string, { likedByMe: boolean; firedByMe: boolean }> = {};
    if (me && rows.length) {
      const ids = rows.map((r: any) => r.id);
      const rs = await prisma.entityReaction.findMany({
        where: { userId: me.id, entityType: "review", entityId: { in: ids } },
      });
      for (const r of rs) {
        myReactions[r.entityId] = myReactions[r.entityId] || {
          likedByMe: false,
          firedByMe: false,
        };
        if (r.reactionType === "like" || r.reactionType === "likes") {
          myReactions[r.entityId].likedByMe = true;
        }
        if (r.reactionType === "fire") myReactions[r.entityId].firedByMe = true;
      }
    }

    const shaped = rows.map((r: any) => shapeReview(r, myReactions));

    if (!userId) {
      shaped.sort(
        (a: any, b: any) =>
          eng(b, b.commentsCount) - eng(a, a.commentsCount) ||
          +new Date(b.createdAt) - +new Date(a.createdAt)
      );
    }

    return new Response(JSON.stringify(shaped), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error(e);
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
}

/* ---------------- POST: Create/update review + auto-create movie ---------------- */

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions as unknown as NextAuthOptions);
    if (!session?.user?.email) return new Response("Unauthorized", { status: 401 });

    const me = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!me) return new Response("User not found", { status: 404 });

    const { movieId, reviewText , title, posterUrl } = await req.json();
    if (!movieId || !reviewText?.trim()) {
      return new Response("Invalid or missing data", { status: 400 });
    }

    const tmdbId = String(movieId);
   
     const TMDB_IMG = "https://image.tmdb.org/t/p/w500";

// posterUrl may come as "/path.jpg" from tmdb
const normalizedPosterUrl =
  typeof posterUrl === "string" && posterUrl.trim()
    ? posterUrl.startsWith("http")
      ? posterUrl
      : `${TMDB_IMG}${posterUrl}` // converts "/abc.jpg" -> full url
    : null;

const safeTitle = typeof title === "string" && title.trim() ? title.trim() : null;
if (!safeTitle) return new Response("Missing title", { status: 400 });

   const movie = await prisma.movie.upsert({
  where: { tmdbId },
  update: {
    title: safeTitle,
    // only set posterUrl if we actually have one
    ...(normalizedPosterUrl ? { posterUrl: normalizedPosterUrl } : {}),
  },
  create: {
    tmdbId,
    title: safeTitle,
    posterUrl: normalizedPosterUrl,
  },
});

    // Check if user already has a review for this movie
    const existingReview = await prisma.review.findUnique({
      where: { userId_movieId: { userId: me.id, movieId: movie.id } },
    });

    let created;
    if (existingReview) {
      created = await prisma.review.update({
        where: { id: existingReview.id },
        data: { content: reviewText.trim() },
        include: {
          movie: { select: { tmdbId: true, title: true, posterUrl: true } },
          user: { select: { id: true, username: true, avatarUrl: true, image: true } },
          reviewComments: {
            include: { user: { select: { id: true, username: true, avatarUrl: true, image: true } } },
            orderBy: { createdAt: "desc" },
          },
        },
      });
    } else {
      created = await prisma.review.create({
        data: {
          content: reviewText.trim(),
          userId: me.id,
          movieId: movie.id,
        },
        include: {
          movie: { select: { tmdbId: true, title: true, posterUrl: true } },
          user: { select: { id: true, username: true, avatarUrl: true, image: true } },
          reviewComments: {
            include: { user: { select: { id: true, username: true, avatarUrl: true, image: true } } },
            orderBy: { createdAt: "desc" },
          },
        },
      });
    }

    const response = shapeReview(created, {});

    return new Response(JSON.stringify(response), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("[review POST] Error:", e);
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
}

/* ---------------- DELETE: Delete review ---------------- */

export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions as unknown as NextAuthOptions);
    if (!session?.user?.email) return new Response("Unauthorized", { status: 401 });

    const me = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!me) return new Response("User not found", { status: 404 });

    const url = new URL(req.url);
    const reviewId = url.searchParams.get("reviewId");
    if (!reviewId) return new Response("Missing reviewId", { status: 400 });

    const review = await prisma.review.findUnique({ where: { id: reviewId } });
    if (!review) return new Response("Review not found", { status: 404 });
    if (review.userId !== me.id) return new Response("Forbidden", { status: 403 });

    await prisma.$transaction([
      prisma.reviewComment.deleteMany({ where: { reviewId } }),
      prisma.entityReaction.deleteMany({
        where: { entityType: "review", entityId: reviewId },
      }),
      prisma.review.delete({ where: { id: reviewId } }),
    ]);

    return new Response("Deleted", { status: 200 });
  } catch (e: any) {
    console.error(e);
    return new Response("Server error", { status: 500 });
  }
}
