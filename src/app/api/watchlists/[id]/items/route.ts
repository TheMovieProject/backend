import { NextRequest } from "next/server";
import prisma from "@/app/libs/prismaDB";
import {
  addMovieToDefaultOwnerWatchlistIfNeeded,
  addMovieToWatchlist,
  err,
  getAccessibleWatchlistForUser,
  getCurrentUserOrNull,
  ok,
  recordWatchlistActivity,
  roleCanEdit,
} from "@/app/libs/watchlists";

export const maxDuration = 30;

function mapItem(item: any) {
  return {
    id: item.id,
    watchlistId: item.watchlistId,
    movieId: item.movieId,
    notes: item.notes ?? null,
    rank: typeof item.rank === "number" ? item.rank : null,
    addedAt: item.addedAt,
    updatedAt: item.updatedAt ?? null,
    addedByUserId: item.addedByUserId ?? null,
    movie: item.movie,
    addedByUser: item.addedByUser
      ? {
          id: item.addedByUser.id,
          name: item.addedByUser.name,
          username: item.addedByUser.username,
          avatarUrl: item.addedByUser.avatarUrl,
          image: item.addedByUser.image,
        }
      : null,
  };
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const me = await getCurrentUserOrNull();
    if (!me) return err("UNAUTHORIZED", "Unauthorized", 401);

    const access = await getAccessibleWatchlistForUser(params.id, me.id);
    if (!access) return err("NOT_FOUND", "Watchlist not found", 404);
    if (!roleCanEdit(access.role)) return err("FORBIDDEN", "Editor or owner access required", 403);

    const body = await req.json().catch(() => ({}));
    const movieId = typeof body?.movieId === "string" ? body.movieId.trim() : String(body?.movieId || "").trim();
    const title = typeof body?.title === "string" ? body.title : null;
    const posterUrl = typeof body?.posterUrl === "string" ? body.posterUrl : null;
    const notes = typeof body?.notes === "string" ? body.notes : null;

    if (!movieId) return err("VALIDATION_ERROR", "movieId is required", 400);

    const { item, movie } = await addMovieToWatchlist({
      watchlistId: access.watchlist.id,
      actorUserId: me.id,
      movieId,
      title,
      posterUrl,
      notes,
    });

    const defaultWatchlist = await addMovieToDefaultOwnerWatchlistIfNeeded({
      ownerId: access.watchlist.ownerId,
      sourceWatchlistId: access.watchlist.id,
      actorUserId: me.id,
      movieDbId: movie.id,
    });

    try {
      await prisma.legacyWatchlist.upsert({
        where: {
          userId_movieId: {
            userId: access.watchlist.ownerId,
            movieId: movie.id,
          },
        },
        update: {},
        create: {
          userId: access.watchlist.ownerId,
          movieId: movie.id,
        },
      });
    } catch {
      // Legacy mirror is best-effort for existing status/trending features.
    }

    await recordWatchlistActivity({
      watchlistId: access.watchlist.id,
      actorId: me.id,
      type: "ITEM_ADDED",
      movieId: movie.id,
      metadata: { mirroredToDefaultWatchlistId: defaultWatchlist.id },
    });

    return ok(
      {
        item: mapItem(item),
        mirroredToDefaultWatchlistId: defaultWatchlist.id,
      },
      201
    );
  } catch (error) {
    console.error("POST /api/watchlists/[id]/items error", error);
    return err("INTERNAL_ERROR", "Failed to add item", 500);
  }
}

