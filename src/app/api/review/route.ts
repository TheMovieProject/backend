import { getServerSession } from "next-auth";
import type { NextAuthOptions } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import prisma from "@/app/libs/prismaDB";

const buildTree = (flat: any[]) => {
  const map: Record<string, any> = {};
  const roots: any[] = [];
  for (const c of flat) map[c.id] = { ...c, children: [] };
  for (const c of flat)
    (c.parentId && map[c.parentId]) ? map[c.parentId].children.push(map[c.id]) : roots.push(map[c.id]);
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

// ——— GET: Fetch reviews ———
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const tmdbId = url.searchParams.get("movieId");
    const userId = url.searchParams.get("userId");

    const session = await getServerSession(authOptions as unknown as NextAuthOptions);

    const me = session?.user?.email
      ? await prisma.user.findUnique({ where: { email: session.user.email } })
      : null;

    const where = userId ? { userId } : { movie: { tmdbId: tmdbId! } };

    const rows = await prisma.review.findMany({
      where,
      include: {
        movie: { select: { tmdbId: true, title: true, posterUrl: true } },
        user: { select: { id: true, username: true, avatarUrl: true, image: true } },
        reviewComments: {
          include: { user: { select: { id: true, username: true, avatarUrl: true, image: true } } },
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: userId ? { createdAt: "desc" } : undefined,
    });

    // mark my reactions in bulk
    let myReactions: Record<string, { likedByMe: boolean; firedByMe: boolean }> = {};
    if (me && rows.length) {
      const ids = rows.map((r: { id: any }) => r.id);
      const rs = await prisma.entityReaction.findMany({
        where: { userId: me.id, entityType: "review", entityId: { in: ids } },
      });
      for (const r of rs) {
        myReactions[r.entityId] = myReactions[r.entityId] || { likedByMe: false, firedByMe: false };
        if (r.reactionType === "likes") myReactions[r.entityId].likedByMe = true;
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

// ——— POST: Create a new review (or update existing) ———
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions as unknown as NextAuthOptions);
    if (!session?.user?.email) return new Response("Unauthorized", { status: 401 });

    const me = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!me) return new Response("User not found", { status: 404 });

    const { movieId, reviewText } = await req.json();
    if (!movieId || !reviewText?.trim()) {
      return new Response("Invalid or missing data", { status: 400 });
    }

    // Find the movie
    const movie = await prisma.movie.findUnique({ where: { tmdbId: movieId } });
    if (!movie) {
      return new Response("Movie not found", { status: 404 });
    }

    // Check if user already has a review for this movie
    const existingReview = await prisma.review.findUnique({
      where: { userId_movieId: { userId: me.id, movieId: movie.id } },
    });

    let created;
    if (existingReview) {
      // Update existing review
      created = await prisma.review.update({
        where: { id: existingReview.id },
        data: { content: reviewText.trim(), updatedAt: new Date() },
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
      // Create new review
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

// ——— DELETE: Delete a review (author only) ———
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

    // Delete review (cascades to comments via onDelete)
    await prisma.review.delete({ where: { id: reviewId } });

    return new Response("Deleted", { status: 200 });
  } catch (e: any) {
    console.error(e);
    return new Response("Server error", { status: 500 });
  }
}