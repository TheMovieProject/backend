import { NextRequest } from "next/server";
import prisma from "@/app/libs/prismaDB";
import {
  DEFAULT_WATCHLIST_SLUG,
  LEGACY_DEFAULT_WATCHLIST_SLUG,
  err,
  findMovieByRouteParam,
  getAccessibleWatchlistForUser,
  getCurrentUserOrNull,
  ok,
  recordWatchlistActivity,
  roleCanEdit,
} from "@/app/libs/watchlists";

function isDefaultWatchlist(watchlist: { slug?: string | null; isSystemDefault?: boolean | null }) {
  return Boolean(watchlist.isSystemDefault) || watchlist.slug === DEFAULT_WATCHLIST_SLUG || watchlist.slug === LEGACY_DEFAULT_WATCHLIST_SLUG;
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string; movieId: string } }
) {
  try {
    const me = await getCurrentUserOrNull();
    if (!me) return err("UNAUTHORIZED", "Unauthorized", 401);

    const access = await getAccessibleWatchlistForUser(params.id, me.id);
    if (!access) return err("NOT_FOUND", "Watchlist not found", 404);
    if (!roleCanEdit(access.role)) return err("FORBIDDEN", "Editor or owner access required", 403);

    const movie = await findMovieByRouteParam(params.movieId);
    if (!movie) return ok({ deleted: 0 });

    const deleted = await prisma.watchlistItem.deleteMany({
      where: {
        watchlistId: access.watchlist.id,
        movieId: movie.id,
      },
    });

    if (deleted.count > 0) {
      await recordWatchlistActivity({
        watchlistId: access.watchlist.id,
        actorId: me.id,
        type: "ITEM_REMOVED",
        movieId: movie.id,
      });
    }

    if (isDefaultWatchlist(access.watchlist)) {
      const stillInOwnerLists = await prisma.watchlistItem.findFirst({
        where: {
          movieId: movie.id,
          watchlist: {
            ownerId: access.watchlist.ownerId,
          },
        },
        select: { id: true },
      });

      if (!stillInOwnerLists) {
        await prisma.legacyWatchlist.deleteMany({
          where: {
            userId: access.watchlist.ownerId,
            movieId: movie.id,
          },
        });
      }
    }

    return ok({ deleted: deleted.count, movieId: movie.id, tmdbId: movie.tmdbId });
  } catch (error) {
    console.error("DELETE /api/watchlists/[id]/items/[movieId] error", error);
    return err("INTERNAL_ERROR", "Failed to remove item", 500);
  }
}

