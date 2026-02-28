import prisma from "@/lib/prisma";

export type LikedStatusMap = Record<string, boolean>;

export function normalizeMovieIds(movieIds: unknown): string[] {
  if (!Array.isArray(movieIds)) return [];

  const normalized = movieIds
    .map((movieId) => String(movieId ?? "").trim())
    .filter(Boolean);

  return [...new Set(normalized)];
}

export async function getLikedStatusMapForUser(
  userId: string | null | undefined,
  movieIds: unknown
): Promise<LikedStatusMap> {
  const normalizedMovieIds = normalizeMovieIds(movieIds);
  const likedMap = Object.fromEntries(
    normalizedMovieIds.map((movieId) => [movieId, false])
  ) as LikedStatusMap;

  if (!userId || !normalizedMovieIds.length) {
    return likedMap;
  }

  const rows = await prisma.liked.findMany({
    where: {
      userId,
      movie: {
        is: {
          tmdbId: { in: normalizedMovieIds },
        },
      },
    },
    select: {
      movie: {
        select: {
          tmdbId: true,
        },
      },
    },
  });

  for (const row of rows) {
    const tmdbId = row.movie?.tmdbId;
    if (tmdbId) likedMap[tmdbId] = true;
  }

  return likedMap;
}
