import { NextRequest } from "next/server";
import prisma from "@/app/libs/prismaDB";
import {
  RANK_STEP,
  ensureRanks,
  err,
  getAccessibleWatchlistForUser,
  getCurrentUserOrNull,
  ok,
  recordWatchlistActivity,
  roleCanEdit,
} from "@/app/libs/watchlists";

export async function PATCH(
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
    const orderedMovieIds = Array.isArray(body?.orderedMovieIds) ? body.orderedMovieIds : null;
    if (!orderedMovieIds) {
      return err("VALIDATION_ERROR", "orderedMovieIds array is required", 400);
    }

    await ensureRanks(access.watchlist.id);

    const currentItems = await prisma.watchlistItem.findMany({
      where: { watchlistId: access.watchlist.id },
      orderBy: [{ rank: "asc" }, { addedAt: "asc" }],
      select: {
        id: true,
        movieId: true,
        movie: { select: { tmdbId: true } },
      },
    });

    const byInputKey = new Map<string, string>();
    for (const item of currentItems) {
      byInputKey.set(item.movieId, item.movieId);
      if (item.movie?.tmdbId) byInputKey.set(item.movie.tmdbId, item.movieId);
    }

    const seen = new Set<string>();
    const normalizedRequested: string[] = [];
    for (const raw of orderedMovieIds) {
      const key = typeof raw === "string" ? raw : String(raw ?? "");
      const canonicalMovieId = byInputKey.get(key);
      if (!canonicalMovieId || seen.has(canonicalMovieId)) continue;
      seen.add(canonicalMovieId);
      normalizedRequested.push(canonicalMovieId);
    }

    if (!normalizedRequested.length && currentItems.length) {
      return err("VALIDATION_ERROR", "No valid movie ids found for this watchlist", 400);
    }

    const remainingMovieIds = currentItems
      .map((item) => item.movieId)
      .filter((movieId) => !seen.has(movieId));

    const finalMovieOrder = [...normalizedRequested, ...remainingMovieIds];
    const itemByMovieId = new Map(currentItems.map((item) => [item.movieId, item]));

    await prisma.$transaction(
      finalMovieOrder.map((movieId, idx) =>
        prisma.watchlistItem.update({
          where: { id: itemByMovieId.get(movieId)!.id },
          data: { rank: (idx + 1) * RANK_STEP },
        })
      )
    );

    await recordWatchlistActivity({
      watchlistId: access.watchlist.id,
      actorId: me.id,
      type: "ITEMS_REORDERED",
      metadata: { count: finalMovieOrder.length },
    });

    return ok({
      watchlistId: access.watchlist.id,
      orderedMovieIds: finalMovieOrder,
    });
  } catch (error) {
    console.error("PATCH /api/watchlists/[id]/items/reorder error", error);
    return err("INTERNAL_ERROR", "Failed to reorder items", 500);
  }
}

