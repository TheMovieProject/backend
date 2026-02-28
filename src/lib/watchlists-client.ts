"use client";

export type WatchlistSummaryClient = {
  id: string;
  name: string;
  slug: string;
  visibility: "PRIVATE" | "SHARED";
  isSystemDefault: boolean;
  itemCount: number;
  myRole?: "OWNER" | "EDITOR" | "VIEWER";
};

export type MovieMembershipClient = {
  requestedMovieId: string;
  inAny: boolean;
  inDefault: boolean;
  watchlistIds: string[];
};

export type WatchlistsClientState = {
  watchlists: WatchlistSummaryClient[];
  defaultWatchlistId: string | null;
  movieMembership: MovieMembershipClient | null;
};

export class WatchlistsClientError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "WatchlistsClientError";
    this.status = status;
  }
}

function normalizeState(data: any): WatchlistsClientState {
  return {
    watchlists: Array.isArray(data?.watchlists) ? data.watchlists : [],
    defaultWatchlistId:
      typeof data?.defaultWatchlistId === "string" ? data.defaultWatchlistId : null,
    movieMembership: data?.movieMembership ?? null,
  };
}

let baseCache: WatchlistsClientState | null = null;
let basePromise: Promise<WatchlistsClientState> | null = null;
const movieCache = new Map<string, WatchlistsClientState>();
const moviePromises = new Map<string, Promise<WatchlistsClientState>>();

async function fetchWatchlists(movieId?: string): Promise<WatchlistsClientState> {
  const query = movieId
    ? `?movieId=${encodeURIComponent(movieId)}`
    : "";
  const response = await fetch(`/api/watchlists${query}`, {
    cache: "no-store",
  });

  const payload = await response.json().catch(() => null);

  if (response.status === 401) {
    throw new WatchlistsClientError("Login to save movies", 401);
  }

  if (!response.ok || !payload?.ok) {
    throw new WatchlistsClientError(
      payload?.error?.message || "Failed to load watchlists",
      response.status
    );
  }

  const normalized = normalizeState(payload.data);

  baseCache = {
    watchlists: normalized.watchlists,
    defaultWatchlistId: normalized.defaultWatchlistId,
    movieMembership: null,
  };

  if (movieId) {
    movieCache.set(movieId, normalized);
  }

  return normalized;
}

export async function loadBaseWatchlists(force = false) {
  if (!force && baseCache) return baseCache;
  if (!force && basePromise) return basePromise;

  basePromise = fetchWatchlists().finally(() => {
    basePromise = null;
  });

  return basePromise;
}

export async function loadMovieWatchlists(movieId: string, force = false) {
  const normalizedMovieId = String(movieId || "").trim();
  if (!normalizedMovieId) {
    return loadBaseWatchlists(force);
  }

  if (!force && movieCache.has(normalizedMovieId)) {
    return movieCache.get(normalizedMovieId)!;
  }

  if (!force && moviePromises.has(normalizedMovieId)) {
    return moviePromises.get(normalizedMovieId)!;
  }

  const promise = fetchWatchlists(normalizedMovieId).finally(() => {
    moviePromises.delete(normalizedMovieId);
  });

  moviePromises.set(normalizedMovieId, promise);
  return promise;
}

export function invalidateWatchlistsCache(movieId?: string) {
  baseCache = null;
  basePromise = null;

  if (movieId) {
    movieCache.delete(movieId);
    moviePromises.delete(movieId);
    return;
  }

  movieCache.clear();
  moviePromises.clear();
}
