import {
  buildUniqueWatchlistSlug,
  DEFAULT_WATCHLIST_NAME,
  DEFAULT_WATCHLIST_SLUG,
  ensureDefaultWatchlist,
  resolveMovieForWatchlist,
} from "@/app/libs/watchlists";

export const DEFAULT_COLLECTION_NAME = DEFAULT_WATCHLIST_NAME;
export const DEFAULT_COLLECTION_SLUG = DEFAULT_WATCHLIST_SLUG;

export async function buildUniqueCollectionSlug(userId: string, name: string): Promise<string> {
  return buildUniqueWatchlistSlug(userId, name);
}

export async function ensureDefaultCollection(userId: string) {
  return ensureDefaultWatchlist(userId);
}

export async function resolveMovie({
  movieId,
  title,
  posterUrl,
}: {
  movieId: string;
  title?: string | null;
  posterUrl?: string | null;
}) {
  return resolveMovieForWatchlist({ movieId, title, posterUrl });
}
