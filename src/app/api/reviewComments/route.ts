import { getServerSession } from "next-auth";
import type { NextAuthOptions } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import prisma from "@/app/libs/prismaDB";

// keep the same helpers used in your review route
const includeUser = { id: true, username: true, avatarUrl: true, image: true };
const includeMovie = { tmdbId: true, title: true, posterUrl: true };

const buildTree = (flat: any[] = []) => {
  const map: Record<string, any> = {};
  const roots: any[] = [];
  for (const c of flat) map[c.id] = { ...c, children: [] };
  for (const c of flat)
    (c.parentId && map[c.parentId]) ? map[c.parentId].children.push(map[c.id]) : roots.push(map[c.id]);
  return roots;
};
const countTree = (nodes: any[]): number =>
  nodes.reduce((n, c) => n + 1 + (c.children?.length ? countTree(c.children) : 0), 0);

const shapeReview = (r: any) => {
  const tree = buildTree(r.reviewComments || []);
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
    commentsCount: countTree(tree),
    likedByMe: false,   // set if you track it here
    firedByMe: false,
  };
};

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions as unknown as NextAuthOptions);
    if (!session?.user?.email) return new Response("Unauthorized", { status: 401 });

    const me = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!me) return new Response("User not found", { status: 404 });

    const { reviewId, comment, parentId } = await req.json();
    if (!reviewId || !comment?.trim()) {
      return new Response("Invalid or missing data", { status: 400 });
    }

    // validate review + (optional) parent
    const r0 = await prisma.review.findUnique({ where: { id: reviewId }, select: { id: true } });
    if (!r0) return new Response("Review not found", { status: 404 });
    if (parentId) {
      const p = await prisma.reviewComment.findUnique({ where: { id: parentId } });
      if (!p || p.reviewId !== reviewId) return new Response("Invalid parentId", { status: 400 });
    }

    await prisma.reviewComment.create({
      data: { comment: comment.trim(), userId: me.id, reviewId, parentId: parentId ?? null },
    });

    // re-fetch full review and return shaped
    const updated = await prisma.review.findUnique({
      where: { id: reviewId },
      include: {
        movie: { select: includeMovie },
        user: { select: includeUser },
        reviewComments: {
          include: { user: { select: includeUser } },
          orderBy: { createdAt: "desc" },
        },
      },
    });
    if (!updated) return new Response("Review not found", { status: 404 });

    return new Response(JSON.stringify(shapeReview(updated)), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("[reviewComments POST]", e);
    return new Response("Server error", { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const reviewId = searchParams.get("reviewId");

    if (!reviewId) {
      return new Response("Review ID is required", { status: 400 });
    }

    // Fetch the review with comments
    const review = await prisma.review.findUnique({
      where: { id: reviewId },
      include: {
        movie: { select: includeMovie },
        user: { select: includeUser },
        reviewComments: {
          include: { user: { select: includeUser } },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!review) {
      return new Response("Review not found", { status: 404 });
    }

    return new Response(JSON.stringify(shapeReview(review)), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("[reviewComments GET]", e);
    return new Response("Server error", { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions as unknown as NextAuthOptions);
    if (!session?.user?.email) return new Response("Unauthorized", { status: 401 });

    const me = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!me) return new Response("User not found", { status: 404 });

    const { searchParams } = new URL(req.url);
    const commentId = searchParams.get("commentId");
    if (!commentId) return new Response("Missing commentId", { status: 400 });

    const target = await prisma.reviewComment.findUnique({
      where: { id: commentId },
      include: { review: { select: { id: true, userId: true } } },
    });
    if (!target) return new Response("Comment not found", { status: 404 });

    const isOwner = target.userId === me.id;
    const isReviewAuthor = target.review?.userId === me.id;
    if (!isOwner && !isReviewAuthor) return new Response("Forbidden", { status: 403 });

    const toDelete = new Set<string>([commentId]);
    const queue = [commentId];
    while (queue.length) {
      const currentId = queue.shift();
      if (!currentId) continue;

      const children = await prisma.reviewComment.findMany({
        where: { parentId: currentId },
        select: { id: true },
      });
      for (const child of children) {
        if (toDelete.has(child.id)) continue;
        toDelete.add(child.id);
        queue.push(child.id);
      }
    }

    await prisma.reviewComment.deleteMany({
      where: { id: { in: Array.from(toDelete) } },
    });

    const updated = await prisma.review.findUnique({
      where: { id: target.reviewId },
      include: {
        movie: { select: includeMovie },
        user: { select: includeUser },
        reviewComments: {
          include: { user: { select: includeUser } },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!updated) {
      return new Response(JSON.stringify({ deleted: true, reviewId: target.reviewId }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify(shapeReview(updated)), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("[reviewComments DELETE]", e);
    return new Response("Server error", { status: 500 });
  }
}
