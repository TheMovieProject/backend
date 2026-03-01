import crypto from "crypto";
import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { createRouteLogger } from "@/lib/api-debug";
import { createNotification } from "@/app/libs/notifications";
import {
  buildUniqueWatchlistSlug,
  buildWatchlistWhereForUser,
  err,
  getCurrentUserOrNull,
  isObjectId,
  normalizeVisibility,
  ok,
  parseWatchlistSummary,
  recordWatchlistActivity,
  syncLegacyWatchlistToDefault,
  visibilityToLegacyIsPublic,
} from "@/app/libs/watchlists";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const maxDuration = 30;

export async function GET(req: NextRequest) {
  const logger = createRouteLogger("GET /api/watchlists");
  const handlerTimer = logger.start("handler_total");

  try {
    const authTimer = logger.start("auth_lookup");
    const me = await getCurrentUserOrNull();
    logger.end(authTimer);
    if (!me) return err("UNAUTHORIZED", "Unauthorized", 401);

    const syncTimer = logger.start("legacy_sync");
    const defaultWatchlist = await syncLegacyWatchlistToDefault(me.id);
    logger.end(syncTimer);

    logger.log("db query start", { userId: me.id, movieId: req.nextUrl.searchParams.get("movieId") });
    const dbTimer = logger.start("db_query");
    const watchlists = await prisma.watchlist.findMany({
      where: buildWatchlistWhereForUser(me.id),
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
      select: {
        id: true,
        ownerId: true,
        name: true,
        slug: true,
        visibility: true,
        isPublic: true,
        coverImage: true,
        isSystemDefault: true,
        shareToken: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: { items: true },
        },
        items: {
          orderBy: [{ rank: "asc" }, { addedAt: "asc" }],
          take: 1,
          select: {
            movie: {
              select: { posterUrl: true },
            },
          },
        },
        members: {
          where: { userId: me.id, status: "ACTIVE" as any },
          select: { userId: true, role: true },
        },
      },
    });
    const visibleWatchlists = watchlists.filter(
      (w) => !(w.slug === "my-watchlist" && !w.isSystemDefault)
    );

    const movieIdQuery = req.nextUrl.searchParams.get("movieId")?.trim();
    let movieMembership:
      | {
          requestedMovieId: string;
          inAny: boolean;
          inDefault: boolean;
          watchlistIds: string[];
        }
      | undefined;

    if (movieIdQuery) {
      const movie = await prisma.movie.findUnique({
        where: { tmdbId: String(movieIdQuery) },
        select: { id: true, tmdbId: true },
      });

      if (movie) {
        const ids = visibleWatchlists.map((w) => w.id);
        const rows = ids.length
          ? await prisma.watchlistItem.findMany({
              where: {
                movieId: movie.id,
                watchlistId: { in: ids },
              },
              select: { watchlistId: true },
            })
          : [];

        const watchlistIds = rows.map((r) => r.watchlistId);
        movieMembership = {
          requestedMovieId: movie.tmdbId,
          inAny: watchlistIds.length > 0,
          inDefault: watchlistIds.includes(defaultWatchlist.id),
          watchlistIds,
        };
      } else {
        movieMembership = {
          requestedMovieId: String(movieIdQuery),
          inAny: false,
          inDefault: false,
          watchlistIds: [],
        };
      }
    }
    logger.end(dbTimer);
    logger.log("db query end", { watchlistCount: visibleWatchlists.length, userId: me.id });

    return ok({
      watchlists: visibleWatchlists.map((w) => parseWatchlistSummary(w, me.id)),
      defaultWatchlistId: defaultWatchlist.id,
      movieMembership,
    });
  } catch (error) {
    console.error("GET /api/watchlists error", error);
    return err("INTERNAL_ERROR", "Failed to load watchlists", 500);
  } finally {
    logger.end(handlerTimer);
  }
}

export async function POST(req: NextRequest) {
  try {
    const me = await getCurrentUserOrNull();
    if (!me) return err("UNAUTHORIZED", "Unauthorized", 401);

    const body = await req.json().catch(() => ({}));
    const rawName = typeof body?.name === "string" ? body.name : "";
    const name = rawName.trim().slice(0, 60);
    const requestedMemberUserIds: string[] = Array.isArray(body?.memberUserIds)
      ? body.memberUserIds
          .map((id: unknown) => String(id || "").trim())
          .filter((id: string) => isObjectId(id))
      : [];
    const dedupedMemberUserIds: string[] = [...new Set(requestedMemberUserIds)].filter((id) => id !== me.id);
    const visibility = dedupedMemberUserIds.length ? "SHARED" : normalizeVisibility(body?.visibility);
    const coverImage =
      typeof body?.coverImage === "string" && body.coverImage.trim()
        ? body.coverImage.trim().slice(0, 500)
        : null;

    if (!name || name.length < 2) {
      return err("VALIDATION_ERROR", "Watchlist name must be at least 2 characters.", 400);
    }

    if (dedupedMemberUserIds.length > 50) {
      return err("VALIDATION_ERROR", "You can add up to 50 people to a collection.", 400);
    }

    if (dedupedMemberUserIds.length) {
      const relations = await prisma.follow.findMany({
        where: {
          OR: [
            { followerId: me.id, followingId: { in: dedupedMemberUserIds } },
            { followingId: me.id, followerId: { in: dedupedMemberUserIds } },
          ],
        },
        select: {
          followerId: true,
          followingId: true,
        },
      });

      const allowedIds = new Set<string>();
      for (const row of relations) {
        if (row.followerId === me.id && row.followingId) allowedIds.add(row.followingId);
        if (row.followingId === me.id && row.followerId) allowedIds.add(row.followerId);
      }

      const invalid = dedupedMemberUserIds.filter((id) => !allowedIds.has(id));
      if (invalid.length) {
        return err(
          "FORBIDDEN",
          "You can only add users who follow you or users you follow.",
          403
        );
      }
    }

    const slug = await buildUniqueWatchlistSlug(me.id, name);

    const created = await prisma.$transaction(async (tx) => {
      const watchlist = await tx.watchlist.create({
        data: {
          ownerId: me.id,
          name,
          slug,
          visibility: visibility as any,
          isPublic: visibilityToLegacyIsPublic(visibility),
          coverImage,
          isSystemDefault: false,
          shareToken: crypto.randomUUID(),
        },
        include: {
          _count: { select: { items: true } },
          members: { where: { userId: me.id }, select: { userId: true, role: true } },
        },
      });

      await tx.watchlistMember.upsert({
        where: {
          watchlistId_userId: {
            watchlistId: watchlist.id,
            userId: me.id,
          },
        },
        update: {
          role: "OWNER" as any,
          status: "ACTIVE" as any,
          joinedAt: new Date(),
        },
        create: {
          watchlistId: watchlist.id,
          userId: me.id,
          role: "OWNER" as any,
          status: "ACTIVE" as any,
          joinedAt: new Date(),
        },
      });

      if (dedupedMemberUserIds.length) {
        await tx.watchlistMember.createMany({
          data: dedupedMemberUserIds.map((userId) => ({
            watchlistId: watchlist.id,
            userId,
            role: "EDITOR" as any,
            status: "ACTIVE" as any,
            joinedAt: new Date(),
          })),
        });
      }

      const withCounts = await tx.watchlist.findUnique({
        where: { id: watchlist.id },
        include: {
          _count: { select: { items: true } },
          members: { where: { userId: me.id }, select: { userId: true, role: true } },
        },
      });

      return withCounts || watchlist;
    });

    await recordWatchlistActivity({
      watchlistId: created.id,
      actorId: me.id,
      type: "WATCHLIST_CREATED",
      metadata: { visibility, memberCount: dedupedMemberUserIds.length + 1 },
    });

    if (dedupedMemberUserIds.length) {
      const actorName = me.username || me.name || "Someone";
      const link = `/watchlists/${created.id}`;
      await Promise.allSettled(
        dedupedMemberUserIds.map((userId) =>
          createNotification({
            userId,
            actorId: me.id,
            type: "SYSTEM",
            entityType: "WATCHLIST",
            entityId: created.id,
            title: `${actorName} added you to "${name}" watchlist`,
            body: `Open ${name} to start saving movies together.`,
            link,
          })
        )
      );
    }

    return ok({ watchlist: parseWatchlistSummary(created, me.id) }, 201);
  } catch (error) {
    const maybe = error as { code?: string };
    if (maybe?.code === "P2002") {
      return err("CONFLICT", "A watchlist with that slug already exists.", 409);
    }
    console.error("POST /api/watchlists error", error);
    return err("INTERNAL_ERROR", "Failed to create watchlist", 500);
  }
}
