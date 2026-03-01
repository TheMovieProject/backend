import crypto from "crypto";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import type { Prisma } from "@prisma/client";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import prisma from "@/lib/prisma";

export const DEFAULT_WATCHLIST_NAME = "All Watchlisted";
export const DEFAULT_WATCHLIST_SLUG = "all-watchlisted";
export const LEGACY_DEFAULT_WATCHLIST_SLUG = "my-watchlist";
export const RANK_STEP = 1024;
const LEGACY_SYNC_TTL_MS = 15_000;
const legacySyncState = new Map<string, { syncedAt: number; promise: Promise<void> | null }>();

export type WatchlistVisibilityValue = "PRIVATE" | "SHARED";
export type WatchlistRoleValue = "OWNER" | "EDITOR" | "VIEWER";
export type WatchlistMemberStatusValue = "ACTIVE" | "INVITED" | "REVOKED" | "LEFT";

export type JsonSuccess<T> = { ok: true; data: T };
export type JsonFailure = {
  ok: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
};

export function ok<T>(data: T, status = 200) {
  return NextResponse.json({ ok: true, data } satisfies JsonSuccess<T>, { status });
}

export function err(code: string, message: string, status = 400, details?: unknown) {
  return NextResponse.json(
    { ok: false, error: { code, message, ...(details === undefined ? {} : { details }) } } satisfies JsonFailure,
    { status }
  );
}

export function isObjectId(value: unknown): value is string {
  return typeof value === "string" && /^[a-f\d]{24}$/i.test(value);
}

export function normalizeVisibility(input: unknown): WatchlistVisibilityValue {
  return String(input || "").toUpperCase() === "SHARED" ? "SHARED" : "PRIVATE";
}

export function visibilityToLegacyIsPublic(visibility: WatchlistVisibilityValue) {
  return visibility === "SHARED";
}

export function roleCanEdit(role: WatchlistRoleValue) {
  return role === "OWNER" || role === "EDITOR";
}

export function roleCanManage(role: WatchlistRoleValue) {
  return role === "OWNER";
}

export function createInviteToken() {
  return crypto.randomBytes(24).toString("hex");
}

function slugify(input: string) {
  return String(input || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

function randomSuffix() {
  return crypto.randomBytes(2).toString("hex");
}

export async function buildUniqueWatchlistSlug(ownerId: string, name: string) {
  const base = slugify(name) || `list-${randomSuffix()}`;
  let candidate = base;

  for (let tries = 0; tries < 20; tries += 1) {
    const exists = await prisma.watchlist.findUnique({
      where: {
        ownerId_slug: {
          ownerId,
          slug: candidate,
        },
      },
      select: { id: true },
    });
    if (!exists) return candidate;
    candidate = `${base}-${randomSuffix()}`;
  }

  return `${base}-${Date.now().toString(36)}`;
}

export async function getCurrentUserOrNull() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return null;
  return prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, email: true, name: true, username: true, image: true, avatarUrl: true },
  });
}

export async function resolveMovieForWatchlist({
  movieId,
  title,
  posterUrl,
}: {
  movieId: string;
  title?: string | null;
  posterUrl?: string | null;
}) {
  const tmdbId = String(movieId || "").trim();
  if (!tmdbId) throw new Error("movieId is required");

  return prisma.movie.upsert({
    where: { tmdbId },
    update: {
      title: title || undefined,
      posterUrl: posterUrl ?? undefined,
    },
    create: {
      tmdbId,
      title: title || "Untitled movie",
      posterUrl: posterUrl ?? null,
    },
  });
}

export async function findMovieByRouteParam(movieIdOrTmdbId: string) {
  if (isObjectId(movieIdOrTmdbId)) {
    return prisma.movie.findUnique({ where: { id: movieIdOrTmdbId }, select: { id: true, tmdbId: true } });
  }
  return prisma.movie.findUnique({ where: { tmdbId: movieIdOrTmdbId }, select: { id: true, tmdbId: true } });
}

export async function ensureOwnerMembership(watchlistId: string, ownerId: string) {
  return prisma.watchlistMember.upsert({
    where: {
      watchlistId_userId: {
        watchlistId,
        userId: ownerId,
      },
    },
    update: {
      role: "OWNER" as any,
      status: "ACTIVE" as any,
      joinedAt: new Date(),
    },
    create: {
      watchlistId,
      userId: ownerId,
      role: "OWNER" as any,
      status: "ACTIVE" as any,
      joinedAt: new Date(),
    },
  });
}

export async function ensureDefaultWatchlist(ownerId: string) {
  const existing = await prisma.watchlist.findFirst({
    where: {
      ownerId,
      slug: { in: [DEFAULT_WATCHLIST_SLUG, LEGACY_DEFAULT_WATCHLIST_SLUG] },
    },
  });

  let watchlist = existing;
  if (!watchlist) {
    watchlist = await prisma.watchlist.create({
      data: {
        ownerId,
        name: DEFAULT_WATCHLIST_NAME,
        slug: DEFAULT_WATCHLIST_SLUG,
        visibility: "PRIVATE" as any,
        isPublic: false,
        isSystemDefault: true,
        shareToken: crypto.randomUUID(),
      },
    });
  } else {
    const patch: Record<string, unknown> = {};
    if (!watchlist.isSystemDefault) patch.isSystemDefault = true;
    if (!watchlist.visibility) patch.visibility = (watchlist.isPublic ? "SHARED" : "PRIVATE") as any;
    if (watchlist.slug === LEGACY_DEFAULT_WATCHLIST_SLUG) {
      patch.slug = DEFAULT_WATCHLIST_SLUG;
      patch.name = DEFAULT_WATCHLIST_NAME;
    }
    if (Object.keys(patch).length) {
      watchlist = await prisma.watchlist.update({
        where: { id: watchlist.id },
        data: patch,
      });
    }
  }

  await ensureOwnerMembership(watchlist.id, ownerId);
  return watchlist;
}

export async function syncLegacyWatchlistToDefault(ownerId: string) {
  const defaultWatchlist = await ensureDefaultWatchlist(ownerId);
  const currentState = legacySyncState.get(ownerId);
  const now = Date.now();

  if (currentState?.promise) {
    await currentState.promise;
    return defaultWatchlist;
  }

  if (currentState && now - currentState.syncedAt < LEGACY_SYNC_TTL_MS) {
    return defaultWatchlist;
  }

  const syncPromise = (async () => {
    const legacy = await prisma.legacyWatchlist.findMany({
      where: { userId: ownerId },
      select: { movieId: true },
    });

    if (!legacy.length) return;

    const legacyMovieIds = [...new Set(legacy.map((row) => row.movieId).filter(Boolean))];
    if (!legacyMovieIds.length) return;

    const existing = await prisma.watchlistItem.findMany({
      where: { watchlistId: defaultWatchlist.id, movieId: { in: legacyMovieIds } },
      select: { movieId: true },
    });
    const existingMovieIds = new Set(existing.map((row) => row.movieId));

    const baseRank = await getNextRank(defaultWatchlist.id);
    const itemsToCreate = legacyMovieIds
      .filter((movieId) => !existingMovieIds.has(movieId))
      .map((movieId, idx) => ({
        watchlistId: defaultWatchlist.id,
        movieId,
        addedByUserId: ownerId,
        rank: typeof baseRank === "number" ? baseRank + idx * RANK_STEP : null,
      }));

    if (!itemsToCreate.length) return;

    try {
      await prisma.watchlistItem.createMany({ data: itemsToCreate });
    } catch (error) {
      const maybe = error as { code?: string };
      if (maybe?.code !== "P2002") throw error;
    }
  })();

  legacySyncState.set(ownerId, {
    syncedAt: currentState?.syncedAt ?? 0,
    promise: syncPromise,
  });

  try {
    await syncPromise;
    legacySyncState.set(ownerId, { syncedAt: Date.now(), promise: null });
  } catch (error) {
    legacySyncState.delete(ownerId);
    throw error;
  }

  return defaultWatchlist;
}

export async function getNextRank(watchlistId: string) {
  const [lastRanked, hasAnyItem] = await Promise.all([
    prisma.watchlistItem.findFirst({
      where: { watchlistId, rank: { not: null } },
      orderBy: [{ rank: "desc" }, { addedAt: "desc" }],
      select: { rank: true },
    }),
    prisma.watchlistItem.findFirst({
      where: { watchlistId },
      select: { id: true },
    }),
  ]);

  if (typeof lastRanked?.rank === "number") {
    return lastRanked.rank + RANK_STEP;
  }

  return hasAnyItem ? null : RANK_STEP;
}

export async function ensureRanks(watchlistId: string) {
  const items = await prisma.watchlistItem.findMany({
    where: { watchlistId },
    orderBy: [{ rank: "asc" }, { addedAt: "asc" }],
    select: { id: true, rank: true },
  });

  const missing = items.some((item) => typeof item.rank !== "number");
  if (!missing) return;

  await prisma.$transaction(
    items.map((item, idx) =>
      prisma.watchlistItem.update({
        where: { id: item.id },
        data: { rank: (idx + 1) * RANK_STEP },
      })
    )
  );
}

export function sortWatchlistItemsByRank<T extends { rank?: number | null; addedAt?: Date | string | null }>(items: T[]) {
  return [...items].sort((a, b) => {
    const aRank = typeof a.rank === "number" ? a.rank : Number.POSITIVE_INFINITY;
    const bRank = typeof b.rank === "number" ? b.rank : Number.POSITIVE_INFINITY;
    if (aRank !== bRank) return aRank - bRank;

    const aAddedAt = a.addedAt ? new Date(a.addedAt).getTime() : 0;
    const bAddedAt = b.addedAt ? new Date(b.addedAt).getTime() : 0;
    return aAddedAt - bAddedAt;
  });
}

export async function recordWatchlistActivity({
  watchlistId,
  actorId,
  type,
  movieId,
  targetUserId,
  metadata,
}: {
  watchlistId: string;
  actorId?: string | null;
  type:
    | "WATCHLIST_CREATED"
    | "WATCHLIST_UPDATED"
    | "ITEM_ADDED"
    | "ITEM_REMOVED"
    | "ITEMS_REORDERED"
    | "MEMBER_INVITED"
    | "MEMBER_JOINED";
  movieId?: string | null;
  targetUserId?: string | null;
  metadata?: Prisma.InputJsonValue | null;
}) {
  try {
    await prisma.watchlistActivity.create({
      data: {
        watchlistId,
        actorId: actorId ?? null,
        type: type as any,
        movieId: movieId ?? null,
        targetUserId: targetUserId ?? null,
        metadata: metadata ?? null,
      },
    });
  } catch {
    // Activity is non-critical.
  }
}

export type AccessContext = {
  watchlist: any;
  role: WatchlistRoleValue;
  membership: any | null;
  isOwner: boolean;
};

export async function getAccessibleWatchlistForUser(watchlistId: string, userId: string): Promise<AccessContext | null> {
  const watchlist = await prisma.watchlist.findUnique({
    where: { id: watchlistId },
  });
  if (!watchlist) return null;

  await ensureOwnerMembership(watchlist.id, watchlist.ownerId);

  if (watchlist.ownerId === userId) {
    return { watchlist, role: "OWNER", membership: null, isOwner: true };
  }

  const membership = await prisma.watchlistMember.findUnique({
    where: {
      watchlistId_userId: {
        watchlistId,
        userId,
      },
    },
  });

  if (!membership || membership.status !== "ACTIVE") return null;
  return { watchlist, role: membership.role as WatchlistRoleValue, membership, isOwner: false };
}

export function parseWatchlistSummary(input: any, currentUserId?: string) {
  const visibility: WatchlistVisibilityValue =
    (input.visibility as WatchlistVisibilityValue | undefined) || (input.isPublic ? "SHARED" : "PRIVATE");
  const previewPosterUrl =
    Array.isArray(input.items) && input.items.length
      ? input.items.find((item: any) => item?.movie?.posterUrl)?.movie?.posterUrl ?? null
      : null;

  const myMembership = Array.isArray(input.members)
    ? input.members.find((m: any) => m.userId === currentUserId)
    : null;
  const myRole =
    input.ownerId === currentUserId
      ? "OWNER"
      : ((myMembership?.role as WatchlistRoleValue | undefined) ?? undefined);

  return {
    id: input.id,
    name: input.name,
    slug: input.slug,
    coverImage: input.coverImage ?? null,
    previewPosterUrl,
    visibility,
    isSystemDefault: Boolean(input.isSystemDefault) || input.slug === DEFAULT_WATCHLIST_SLUG || input.slug === LEGACY_DEFAULT_WATCHLIST_SLUG,
    ownerId: input.ownerId,
    shareToken: input.shareToken ?? null,
    createdAt: input.createdAt,
    updatedAt: input.updatedAt,
    itemCount: typeof input._count?.items === "number" ? input._count.items : input.items?.length ?? 0,
    myRole,
  };
}

export function buildWatchlistWhereForUser(userId: string) {
  return {
    OR: [
      { ownerId: userId },
      {
        members: {
          some: {
            userId,
            status: "ACTIVE" as any,
          },
        },
      },
    ],
  };
}

export async function addMovieToWatchlist({
  watchlistId,
  actorUserId,
  movieId,
  title,
  posterUrl,
  notes,
}: {
  watchlistId: string;
  actorUserId: string;
  movieId: string;
  title?: string | null;
  posterUrl?: string | null;
  notes?: string | null;
}) {
  const movie = await resolveMovieForWatchlist({ movieId, title, posterUrl });

  const nextRank = await getNextRank(watchlistId);

  const item = await prisma.watchlistItem.upsert({
    where: {
      watchlistId_movieId: {
        watchlistId,
        movieId: movie.id,
      },
    },
    update: {
      notes: typeof notes === "string" ? notes.slice(0, 280) : undefined,
      addedByUserId: actorUserId,
    },
    create: {
      watchlistId,
      movieId: movie.id,
      addedByUserId: actorUserId,
      notes: typeof notes === "string" ? notes.slice(0, 280) : null,
      rank: typeof nextRank === "number" ? nextRank : null,
    },
    include: {
      movie: true,
      addedByUser: {
        select: { id: true, name: true, username: true, avatarUrl: true, image: true },
      },
    },
  });

  return { item, movie };
}

export async function addMovieToDefaultOwnerWatchlistIfNeeded({
  ownerId,
  sourceWatchlistId,
  actorUserId,
  movieDbId,
}: {
  ownerId: string;
  sourceWatchlistId: string;
  actorUserId: string;
  movieDbId: string;
}) {
  const defaultWatchlist = await ensureDefaultWatchlist(ownerId);
  if (defaultWatchlist.id === sourceWatchlistId) return defaultWatchlist;

  const nextRank = await getNextRank(defaultWatchlist.id);

  try {
    await prisma.watchlistItem.upsert({
      where: {
        watchlistId_movieId: {
          watchlistId: defaultWatchlist.id,
          movieId: movieDbId,
        },
      },
      update: {
        addedByUserId: actorUserId,
      },
        create: {
          watchlistId: defaultWatchlist.id,
          movieId: movieDbId,
          addedByUserId: actorUserId,
          rank: typeof nextRank === "number" ? nextRank : null,
        },
      });
  } catch (error) {
    const maybe = error as { code?: string };
    if (maybe?.code !== "P2002") throw error;
  }

  return defaultWatchlist;
}

export function safeListRoleFromBody(value: unknown): WatchlistRoleValue {
  const upper = String(value || "").toUpperCase();
  if (upper === "EDITOR" || upper === "VIEWER") return upper;
  return "VIEWER";
}
