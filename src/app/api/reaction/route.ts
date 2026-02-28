import { getServerSession } from "next-auth";
import type { NextAuthOptions } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import prisma from "@/app/libs/prismaDB";
import { createNotification } from "@/app/libs/notifications";

/* ---------- helpers ---------- */
function buildTree(flat: any[] = []) {
  const map: Record<string, any> = {};
  const roots: any[] = [];
  for (const c of flat) map[c.id] = { ...c, children: [] };
  for (const c of flat) {
    if (c.parentId && map[c.parentId]) map[c.parentId].children.push(map[c.id]);
    else roots.push(map[c.id]);
  }
  return roots;
}
const countTree = (nodes: any[]): number =>
  nodes.reduce((n, c) => n + 1 + (c.children?.length ? countTree(c.children) : 0), 0);

/* ---------- ensure counts are numeric ---------- */
async function ensureCounters(entityType: "blog" | "review", entityId: string) {
  if (entityType === "blog") {
    const b = await prisma.blog.findUnique({ where: { id: entityId } });
    if (b && (b.likes == null || b.fire == null)) {
      await prisma.blog.update({
        where: { id: entityId },
        data: { likes: b.likes ?? 0, fire: b.fire ?? 0 },
      });
    }
  } else {
    const r = await prisma.review.findUnique({ where: { id: entityId } });
    if (r && (r.likes == null || r.fire == null || r.popularity == null)) {
      await prisma.review.update({
        where: { id: entityId },
        data: {
          likes: r.likes ?? 0,
          fire: r.fire ?? 0,
          popularity: r.popularity ?? 0,
        },
      });
    }
  }
}

/* ---------- force-sync counts from reactions ---------- */
async function syncCountsFromReactions(entityType: "blog" | "review", entityId: string) {
  const [likeCount, fireCount] = await Promise.all([
    prisma.entityReaction.count({
      where: { entityType, entityId, reactionType: { in: ["like", "likes"] } },
    }),
    prisma.entityReaction.count({
      where: { entityType, entityId, reactionType: "fire" },
    }),
  ]);

  if (entityType === "blog") {
    await prisma.blog.update({
      where: { id: entityId },
      data: { likes: likeCount, fire: fireCount },
    });
  } else {
    await prisma.review.update({
      where: { id: entityId },
      data: { likes: likeCount, fire: fireCount, popularity: likeCount + fireCount },
    });
  }
}

/* =====================================================================================
   POST /api/reaction
===================================================================================== */
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions as unknown as NextAuthOptions);
    if (!session?.user?.email) return new Response("Unauthorized", { status: 401 });

    const me = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!me) return new Response("User not found", { status: 404 });

    const { entityId, entityType, type } = await req.json();
    const validTypes = new Set(["like", "fire"]);
    const validEntities = new Set(["review", "blog"]);
    if (!entityId || !validTypes.has(type) || !validEntities.has(entityType)) {
      return new Response("Bad request", { status: 400 });
    }

    await ensureCounters(entityType, entityId);

    let targetOwnerId: string | null = null;
    let notificationLink = "/";

    if (entityType === "review") {
      const targetMeta = await prisma.review.findUnique({
        where: { id: entityId },
        select: {
          userId: true,
          movie: { select: { tmdbId: true } },
        },
      });

      if (!targetMeta) {
        return new Response("Not found", { status: 404 });
      }

      targetOwnerId = targetMeta.userId;
      notificationLink = targetMeta.movie?.tmdbId ? `/movies/${targetMeta.movie.tmdbId}` : "/";
    } else {
      const targetMeta = await prisma.blog.findUnique({
        where: { id: entityId },
        select: {
          id: true,
          user: { select: { id: true } },
        },
      });

      if (!targetMeta) {
        return new Response("Not found", { status: 404 });
      }

      targetOwnerId = targetMeta.user?.id ?? null;
      notificationLink = `/blog/${entityId}`;
    }

    const existing = await prisma.entityReaction.findFirst({
      where: {
        userId: me.id,
        entityId,
        entityType,
        reactionType: { in: type === "like" ? ["like", "likes"] : [type] },
      },
    });

    if (existing) {
      // Remove reaction
      await prisma.$transaction([
        prisma.entityReaction.delete({ where: { id: existing.id } }),
        entityType === "review"
          ? prisma.review.update({
              where: { id: entityId },
              data: {
                [type === "like" ? "likes" : "fire"]: { decrement: 1 } as any,
                popularity: { decrement: 1 },
              },
            })
          : prisma.blog.update({
              where: { id: entityId },
              data: { [type === "like" ? "likes" : "fire"]: { decrement: 1 } as any },
            }),
      ]);
    } else {
      // Add reaction
      await prisma.$transaction([
        prisma.entityReaction.create({
          data: {
            userId: me.id,
            entityId,
            entityType,
            reactionType: type,
          },
        }),
        entityType === "review"
          ? prisma.review.update({
              where: { id: entityId },
              data: {
                [type === "like" ? "likes" : "fire"]: { increment: 1 } as any,
                popularity: { increment: 1 },
              },
            })
          : prisma.blog.update({
              where: { id: entityId },
              data: { [type === "like" ? "likes" : "fire"]: { increment: 1 } as any },
            }),
      ]);

      if (targetOwnerId) {
        await createNotification({
          userId: targetOwnerId,
          actorId: me.id,
          type: type === "like" ? "REACTION_LIKE" : "REACTION_FIRE",
          entityType,
          entityId,
          title:
            type === "like"
              ? `${me.username || "Someone"} liked your ${entityType}`
              : `${me.username || "Someone"} reacted with fire on your ${entityType}`,
          link: notificationLink,
        });
      }
    }

    await syncCountsFromReactions(entityType, entityId);

    // Return latest state
    if (entityType === "review") {
      const r = await prisma.review.findUnique({
        where: { id: entityId },
        include: {
          user: { select: { id: true, username: true, avatarUrl: true, image: true } },
          reviewComments: {
            include: {
              user: { select: { id: true, username: true, avatarUrl: true, image: true } },
            },
          },
        },
      });
      if (!r) return new Response("Not found", { status: 404 });

      const meReacts = await prisma.entityReaction.findMany({
        where: { userId: me.id, entityType, entityId },
        select: { reactionType: true },
      });

      const likedByMe = meReacts.some(
        (x: { reactionType: string; }) => x.reactionType === "like" || x.reactionType === "likes"
      );
      const firedByMe = meReacts.some((x: { reactionType: string; }) => x.reactionType === "fire");

      const payload = {
        id: r.id,
        likes: r.likes ?? 0,
        fire: r.fire ?? 0,
        popularity: r.popularity ?? 0,
        likedByMe,
        firedByMe,
        commentsCount: countTree(buildTree(r.reviewComments)),
      };
      return new Response(JSON.stringify(payload), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Blog case
    const b = await prisma.blog.findUnique({
      where: { id: entityId },
      select: { id: true, likes: true, fire: true },
    });
    if (!b) return new Response("Not found", { status: 404 });

    const myBlogReacts = await prisma.entityReaction.findMany({
      where: { userId: me.id, entityType: "blog", entityId },
      select: { reactionType: true },
    });

    const likedByMe = myBlogReacts.some(
      (x: { reactionType: string; }) => x.reactionType === "like" || x.reactionType === "likes"
    );
    const firedByMe = myBlogReacts.some((x: { reactionType: string; }) => x.reactionType === "fire");

    return new Response(
      JSON.stringify({
        id: b.id,
        likes: b.likes ?? 0,
        fire: b.fire ?? 0,
        shares: 0,
        likedByMe,
        firedByMe,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (e: any) {
    console.error("Reaction API error:", e);
    return new Response(e.message || "Server error", { status: 500 });
  }
}

/* =====================================================================================
   GET /api/reaction?entityType=blog|review&ids=a,b,c
===================================================================================== */
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions as unknown as NextAuthOptions);
    if (!session?.user?.email) return new Response("Unauthorized", { status: 401 });

    const me = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!me) return new Response("User not found", { status: 404 });

    const { searchParams } = new URL(req.url);
    const entityType = searchParams.get("entityType");
    const idsParam = searchParams.get("ids");
    if (!entityType || !idsParam) return new Response("Bad request", { status: 400 });

    const ids = idsParam.split(",").filter(Boolean);
    const reacts = await prisma.entityReaction.findMany({
      where: { userId: me.id, entityType, entityId: { in: ids } },
      select: { entityId: true, reactionType: true },
    });

    const map: Record<string, { likedByMe: boolean; firedByMe: boolean }> = {};
    for (const id of ids) map[id] = { likedByMe: false, firedByMe: false };
    for (const r of reacts) {
      if (r.reactionType === "like" || r.reactionType === "likes") map[r.entityId].likedByMe = true;
      if (r.reactionType === "fire") map[r.entityId].firedByMe = true;
    }

    return new Response(JSON.stringify(map), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("GET /reaction error:", e);
    return new Response(e.message || "Server error", { status: 500 });
  }
}
