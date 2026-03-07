import prisma from "@/app/libs/prismaDB";

const TMDB_BASE = "https://api.themoviedb.org/3";
const TMDB_FALLBACK_KEY = "095ba7f7fba6c8e94aa5f385a319cea7";

type TmdbMovie = {
  id: number;
  title?: string;
  name?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  release_date?: string;
  vote_average?: number;
  vote_count?: number;
  overview?: string;
  genre_ids?: number[];
};

type TmdbMovieDetails = TmdbMovie & {
  genres?: Array<{ id: number; name: string }>;
  credits?: {
    cast?: Array<{ id: number; name: string; order?: number }>;
    crew?: Array<{ id: number; name: string; job?: string; department?: string }>;
  };
};

type MatrixFactorizationSignal = {
  score: number;
  title: string;
  posterUrl: string | null;
  supportCount: number;
};

type CandidateBucket = {
  movie: NormalizedMovie;
  preliminaryScore: number;
  matrixFactorizationScore: number;
  sources: Set<string>;
};

type UserIdRow = {
  userId: string;
};

type SeedWatchlistUserRow = {
  addedByUserId: string | null;
  watchlist: {
    ownerId: string;
  } | null;
};

type MovieInteractionRow = {
  userId: string;
  movieId: string;
};

type RatingInteractionRow = {
  userId: string;
  movieId: string;
  value: number;
};

type WatchlistInteractionRow = {
  movieId: string;
  addedByUserId: string | null;
  watchlist: {
    ownerId: string;
  } | null;
};

type LocalMovieRow = {
  id: string;
  tmdbId: string;
  title: string;
  posterUrl: string | null;
};

export type NormalizedMovie = {
  id: number;
  title: string;
  posterPath: string | null;
  backdropPath: string | null;
  releaseDate: string | null;
  voteAverage: number;
  overview: string;
  genreIds: number[];
  posterUrl?: string | null;
};

export type HybridRecommendationResult = {
  seedMovieTitle: string;
  seedTmdbId: string;
  subtitle: string;
  signals: {
    director: string | null;
    actors: string[];
    genres: string[];
  };
  items: NormalizedMovie[];
};

const CONTENT_WEIGHTS = {
  genre: 0.4,
  actor: 0.35,
  director: 0.25,
} as const;

const FINAL_SCORE_WEIGHTS = {
  matrixFactorization: 0.56,
  content: 0.3,
  source: 0.08,
  quality: 0.06,
} as const;

function tmdbApiKey() {
  return (
    process.env.TMDB_API_KEY ||
    process.env.MOVIEDB_API_KEY ||
    process.env.NEXT_PUBLIC_API_KEY ||
    TMDB_FALLBACK_KEY
  );
}

async function tmdbFetch<T = any>(
  path: string,
  params: Record<string, string | number | undefined> = {}
): Promise<T> {
  const q = new URLSearchParams({
    api_key: tmdbApiKey(),
    language: "en-US",
  });

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && `${value}`.length > 0) {
      q.set(key, String(value));
    }
  }

  const res = await fetch(`${TMDB_BASE}${path}?${q.toString()}`, {
    next: { revalidate: 900 },
  });

  if (!res.ok) {
    throw new Error(`TMDB request failed: ${path} (${res.status})`);
  }

  return (await res.json()) as T;
}

function normalizeMovie(movie: TmdbMovie): NormalizedMovie {
  return {
    id: movie.id,
    title: movie.title || movie.name || "Untitled",
    posterPath: movie.poster_path ?? null,
    backdropPath: movie.backdrop_path ?? null,
    releaseDate: movie.release_date || null,
    voteAverage: Number(movie.vote_average || 0),
    overview: movie.overview || "",
    genreIds: movie.genre_ids || [],
  };
}

function normalizeDetailMovie(movie: TmdbMovieDetails): NormalizedMovie {
  return {
    id: movie.id,
    title: movie.title || movie.name || "Untitled",
    posterPath: movie.poster_path ?? null,
    backdropPath: movie.backdrop_path ?? null,
    releaseDate: movie.release_date || null,
    voteAverage: Number(movie.vote_average || 0),
    overview: movie.overview || "",
    genreIds: movie.genres?.map((genre) => genre.id) || movie.genre_ids || [],
  };
}

function dedupeMovies(items: NormalizedMovie[]) {
  const seen = new Set<number>();
  const out: NormalizedMovie[] = [];

  for (const item of items) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    out.push(item);
  }

  return out;
}

function clamp(value: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function rankWeight(index: number, total: number) {
  if (total <= 1) return 1;
  return clamp(1 - index / total, 0.12, 1);
}

function overlapScore(seedIds: number[], candidateIds: number[]) {
  if (!seedIds.length || !candidateIds.length) return 0;
  const candidateSet = new Set(candidateIds);
  const shared = seedIds.filter((id) => candidateSet.has(id)).length;
  return shared / seedIds.length;
}

function dotProduct(a: number[], b: number[]) {
  return a.reduce((sum, value, index) => sum + value * (b[index] || 0), 0);
}

function cosineSimilarity(a: number[], b: number[]) {
  const numerator = dotProduct(a, b);
  const aMagnitude = Math.sqrt(dotProduct(a, a));
  const bMagnitude = Math.sqrt(dotProduct(b, b));
  if (!aMagnitude || !bMagnitude) return 0;
  return numerator / (aMagnitude * bMagnitude);
}

function averageVectors(vectors: number[][], size: number) {
  if (!vectors.length) return Array(size).fill(0);
  const out = Array(size).fill(0);
  vectors.forEach((vector) => {
    for (let index = 0; index < size; index += 1) {
      out[index] += vector[index] || 0;
    }
  });
  return out.map((value) => value / vectors.length);
}

function seededVector(seed: number, size: number) {
  return Array.from({ length: size }, (_, index) => {
    const value = Math.sin(seed * (index + 1) * 12.9898) * 43758.5453;
    return ((value - Math.floor(value)) - 0.5) * 0.08;
  });
}

function extractDirector(details?: TmdbMovieDetails | null) {
  return details?.credits?.crew?.find((person) => person.job === "Director") || null;
}

function extractDirectorIds(details?: TmdbMovieDetails | null) {
  const director = extractDirector(details);
  return director?.id ? [director.id] : [];
}

function extractCast(details?: TmdbMovieDetails | null, limit = 4) {
  return (details?.credits?.cast || []).slice(0, limit);
}

function extractCastIds(details?: TmdbMovieDetails | null, limit = 4) {
  return extractCast(details, limit).map((person) => person.id);
}

async function fetchMovieDetails(movieId: string | number) {
  return tmdbFetch<TmdbMovieDetails>(`/movie/${movieId}`, {
    append_to_response: "credits",
  });
}

async function discoverByGenre(genreId: number, page = 1) {
  const data = await tmdbFetch<{ results: TmdbMovie[] }>("/discover/movie", {
    sort_by: "popularity.desc",
    include_adult: "false",
    page,
    with_genres: String(genreId),
    "vote_count.gte": 50,
  });

  return (data.results || []).map(normalizeMovie).slice(0, 16);
}

async function discoverByPersonId(personId: number, mode: "director" | "actor", page = 1) {
  const data = await tmdbFetch<{ results: TmdbMovie[] }>("/discover/movie", {
    page,
    include_adult: "false",
    sort_by: "popularity.desc",
    ...(mode === "director" ? { with_crew: String(personId) } : { with_cast: String(personId) }),
  });

  return (data.results || []).map(normalizeMovie).slice(0, 16);
}

async function loadMatrixFactorizationSignals(seedDbMovieId?: string | null) {
  if (!seedDbMovieId) {
    return {
      byTmdbId: new Map<number, MatrixFactorizationSignal>(),
      maxScore: 0,
    };
  }

  const [seedLikes, seedRatings, seedReviews, seedLegacyWatchlist, seedWatchlistItems]: [
    UserIdRow[],
    UserIdRow[],
    UserIdRow[],
    UserIdRow[],
    SeedWatchlistUserRow[]
  ] = await Promise.all([
    prisma.liked.findMany({
      where: { movieId: seedDbMovieId },
      select: { userId: true },
    }),
    prisma.rating.findMany({
      where: { movieId: seedDbMovieId },
      select: { userId: true },
    }),
    prisma.review.findMany({
      where: { movieId: seedDbMovieId },
      select: { userId: true },
    }),
    prisma.legacyWatchlist.findMany({
      where: { movieId: seedDbMovieId },
      select: { userId: true },
    }),
    prisma.watchlistItem.findMany({
      where: { movieId: seedDbMovieId },
      select: {
        addedByUserId: true,
        watchlist: {
          select: {
            ownerId: true,
          },
        },
      },
    }),
  ]);

  const userIds = Array.from(
    new Set(
      [
        ...seedLikes.map((row) => row.userId),
        ...seedRatings.map((row) => row.userId),
        ...seedReviews.map((row) => row.userId),
        ...seedLegacyWatchlist.map((row) => row.userId),
        ...seedWatchlistItems.flatMap((row) => [row.addedByUserId, row.watchlist?.ownerId]),
      ].filter(Boolean) as string[]
    )
  );

  if (!userIds.length) {
    return {
      byTmdbId: new Map<number, MatrixFactorizationSignal>(),
      maxScore: 0,
    };
  }

  const scopedUserIds = userIds.slice(0, 160);

  const [likedRows, ratingRows, reviewRows, legacyRows, watchlistRows]: [
    MovieInteractionRow[],
    RatingInteractionRow[],
    MovieInteractionRow[],
    MovieInteractionRow[],
    WatchlistInteractionRow[]
  ] = await Promise.all([
    prisma.liked.findMany({
      where: {
        userId: { in: scopedUserIds },
      },
      select: {
        userId: true,
        movieId: true,
      },
    }),
    prisma.rating.findMany({
      where: {
        userId: { in: scopedUserIds },
      },
      select: {
        userId: true,
        movieId: true,
        value: true,
      },
    }),
    prisma.review.findMany({
      where: {
        userId: { in: scopedUserIds },
      },
      select: {
        userId: true,
        movieId: true,
      },
    }),
    prisma.legacyWatchlist.findMany({
      where: {
        userId: { in: scopedUserIds },
      },
      select: {
        userId: true,
        movieId: true,
      },
    }),
    prisma.watchlistItem.findMany({
      where: {
        OR: [
          { addedByUserId: { in: scopedUserIds } },
          {
            watchlist: {
              is: {
                ownerId: { in: scopedUserIds },
              },
            },
          },
        ],
      },
      select: {
        movieId: true,
        addedByUserId: true,
        watchlist: {
          select: {
            ownerId: true,
          },
        },
      },
    }),
  ]);

  const interactionByUserMovie = new Map<string, number>();
  const movieSupport = new Map<string, Set<string>>();
  const movieStrength = new Map<string, number>();

  const registerInteraction = (userId: string | null | undefined, movieId: string, score: number) => {
    if (!movieId || !userId) return;
    const key = `${userId}:${movieId}`;
    interactionByUserMovie.set(key, (interactionByUserMovie.get(key) || 0) + score);

    if (!movieSupport.has(movieId)) {
      movieSupport.set(movieId, new Set<string>());
    }
    movieSupport.get(movieId)!.add(userId);
    movieStrength.set(movieId, (movieStrength.get(movieId) || 0) + score);
  };

  likedRows.forEach((row) => registerInteraction(row.userId, row.movieId, 1.2));
  ratingRows.forEach((row) =>
    registerInteraction(row.userId, row.movieId, 0.55 + clamp(Number(row.value || 0) / 5, 0, 1) * 1.15)
  );
  reviewRows.forEach((row) => registerInteraction(row.userId, row.movieId, 1.45));
  legacyRows.forEach((row) => registerInteraction(row.userId, row.movieId, 0.82));
  watchlistRows.forEach((row) => {
    registerInteraction(row.addedByUserId, row.movieId, 0.82);
    registerInteraction(row.watchlist?.ownerId, row.movieId, 0.82);
  });

  const movieIds = Array.from(movieSupport.keys())
    .sort((a, b) => {
      if (a === seedDbMovieId) return -1;
      if (b === seedDbMovieId) return 1;
      const supportDiff = (movieSupport.get(b)?.size || 0) - (movieSupport.get(a)?.size || 0);
      if (supportDiff !== 0) return supportDiff;
      return (movieStrength.get(b) || 0) - (movieStrength.get(a) || 0);
    })
    .slice(0, 420);

  if (!movieIds.includes(seedDbMovieId)) {
    movieIds.unshift(seedDbMovieId);
  }

  if (!movieIds.length) {
    return {
      byTmdbId: new Map<number, MatrixFactorizationSignal>(),
      maxScore: 0,
    };
  }

  const observations = Array.from(interactionByUserMovie.entries())
    .map(([key, value]) => {
      const delimiterIndex = key.indexOf(":");
      const userId = key.slice(0, delimiterIndex);
      const movieId = key.slice(delimiterIndex + 1);
      return { userId, movieId, value: clamp(value, 0, 5) };
    })
    .filter((entry) => movieIds.includes(entry.movieId));

  const scopedMovieIds = Array.from(new Set(observations.map((entry) => entry.movieId)));
  if (!scopedMovieIds.includes(seedDbMovieId)) {
    scopedMovieIds.unshift(seedDbMovieId);
  }

  const matrixUserIds = Array.from(new Set(observations.map((entry) => entry.userId)));
  const seedAudienceUserIds = Array.from(
    new Set(observations.filter((entry) => entry.movieId === seedDbMovieId).map((entry) => entry.userId))
  );

  if (matrixUserIds.length < 2 || scopedMovieIds.length < 3 || seedAudienceUserIds.length < 2) {
    return {
      byTmdbId: new Map<number, MatrixFactorizationSignal>(),
      maxScore: 0,
    };
  }

  const movies: LocalMovieRow[] = await prisma.movie.findMany({
    where: {
      id: { in: scopedMovieIds },
    },
    select: {
      id: true,
      tmdbId: true,
      title: true,
      posterUrl: true,
    },
  });

  const movieIndex = new Map(scopedMovieIds.map((movieId, index) => [movieId, index]));
  const userIndex = new Map(matrixUserIds.map((userId, index) => [userId, index]));

  const latentSize = Math.min(12, Math.max(6, Math.round(Math.sqrt(scopedMovieIds.length / 3))));
  const userFactors = matrixUserIds.map((_, index) => seededVector(index + 1, latentSize));
  const itemFactors = scopedMovieIds.map((_, index) => seededVector(index + 101, latentSize));
  const userBias = Array(matrixUserIds.length).fill(0);
  const itemBias = Array(scopedMovieIds.length).fill(0);
  const globalMean = observations.reduce((sum, entry) => sum + entry.value, 0) / observations.length;

  let learningRate = 0.035;
  const regularization = 0.018;
  for (let epoch = 0; epoch < 32; epoch += 1) {
    observations.forEach((entry) => {
      const uIndex = userIndex.get(entry.userId);
      const iIndex = movieIndex.get(entry.movieId);
      if (uIndex === undefined || iIndex === undefined) return;

      const userVector = userFactors[uIndex];
      const itemVector = itemFactors[iIndex];
      const prediction = globalMean + userBias[uIndex] + itemBias[iIndex] + dotProduct(userVector, itemVector);
      const error = entry.value - prediction;

      userBias[uIndex] += learningRate * (error - regularization * userBias[uIndex]);
      itemBias[iIndex] += learningRate * (error - regularization * itemBias[iIndex]);

      for (let factorIndex = 0; factorIndex < latentSize; factorIndex += 1) {
        const userFactor = userVector[factorIndex];
        const itemFactor = itemVector[factorIndex];
        userVector[factorIndex] += learningRate * (error * itemFactor - regularization * userFactor);
        itemVector[factorIndex] += learningRate * (error * userFactor - regularization * itemFactor);
      }
    });
    learningRate *= 0.93;
  }

  const seedMovieIndex = movieIndex.get(seedDbMovieId);
  if (seedMovieIndex === undefined) {
    return {
      byTmdbId: new Map<number, MatrixFactorizationSignal>(),
      maxScore: 0,
    };
  }

  const audienceIndexes = seedAudienceUserIds
    .map((userId) => userIndex.get(userId))
    .filter((index): index is number => index !== undefined);

  if (!audienceIndexes.length) {
    return {
      byTmdbId: new Map<number, MatrixFactorizationSignal>(),
      maxScore: 0,
    };
  }

  const audienceVector = averageVectors(
    audienceIndexes.map((index) => userFactors[index]),
    latentSize
  );
  const audienceBias =
    audienceIndexes.reduce((sum, index) => sum + userBias[index], 0) / Math.max(1, audienceIndexes.length);
  const seedItemVector = itemFactors[seedMovieIndex];

  const byTmdbId = new Map<number, MatrixFactorizationSignal>();
  let maxScore = 0;

  movies.forEach((movie) => {
    if (movie.id === seedDbMovieId) return;
    const tmdbId = Number.parseInt(String(movie.tmdbId), 10);
    const itemIndex = movieIndex.get(movie.id);
    if (!Number.isFinite(tmdbId) || itemIndex === undefined) return;

    const itemVector = itemFactors[itemIndex];
    const predictedPreference =
      globalMean + audienceBias + itemBias[itemIndex] + dotProduct(audienceVector, itemVector);
    const latentSimilarity = cosineSimilarity(seedItemVector, itemVector);
    const supportCount = movieSupport.get(movie.id)?.size || 0;
    const supportBoost = clamp(supportCount / Math.max(2, audienceIndexes.length), 0, 1);
    const score = Math.max(0, predictedPreference) + Math.max(0, latentSimilarity) * 1.35 + supportBoost * 0.4;

    maxScore = Math.max(maxScore, score);
    byTmdbId.set(tmdbId, {
      score,
      title: movie.title,
      posterUrl: movie.posterUrl ?? null,
      supportCount,
    });
  });

  return { byTmdbId, maxScore };
}

function buildSubtitle(seedDetails: TmdbMovieDetails) {
  const director = extractDirector(seedDetails)?.name || null;
  const actors = extractCast(seedDetails, 2).map((person) => person.name);
  const genres = (seedDetails.genres || []).slice(0, 2).map((genre) => genre.name);

  return {
    subtitle: "",
    signals: {
      director,
      actors,
      genres,
    },
  };
}

export async function getHybridRecommendationsForMovie({
  tmdbId,
  title,
  dbMovieId,
  limit = 16,
}: {
  tmdbId: string;
  title?: string | null;
  dbMovieId?: string | null;
  limit?: number;
}): Promise<HybridRecommendationResult | null> {
  if (!tmdbId) return null;

  const seedDetails = await fetchMovieDetails(tmdbId);
  const seedMovie = normalizeDetailMovie(seedDetails);
  const directorIds = extractDirectorIds(seedDetails);
  const actorIds = extractCastIds(seedDetails, 3);
  const genreIds = seedDetails.genres?.map((genre) => genre.id).slice(0, 2) || seedMovie.genreIds.slice(0, 2);

  const [recommendations, similar, genreLists, directorList, actorLists, matrixFactorization] = await Promise.all([
    tmdbFetch<{ results: TmdbMovie[] }>(`/movie/${tmdbId}/recommendations`, { page: 1 }),
    tmdbFetch<{ results: TmdbMovie[] }>(`/movie/${tmdbId}/similar`, { page: 1 }),
    Promise.all(genreIds.map((genreId) => discoverByGenre(genreId, 1))),
    directorIds[0] ? discoverByPersonId(directorIds[0], "director", 1) : Promise.resolve([]),
    Promise.all(actorIds.slice(0, 2).map((actorId) => discoverByPersonId(actorId, "actor", 1))),
    loadMatrixFactorizationSignals(dbMovieId),
  ]);

  const candidates = new Map<number, CandidateBucket>();

  const addCandidate = (movie: NormalizedMovie, source: string, score: number) => {
    if (!movie?.id || movie.id === seedMovie.id) return;

    const current =
      candidates.get(movie.id) ||
      ({
        movie,
        preliminaryScore: 0,
        matrixFactorizationScore: 0,
        sources: new Set<string>(),
      } satisfies CandidateBucket);

    current.movie = {
      ...current.movie,
      ...movie,
    };
    current.preliminaryScore += score;
    current.sources.add(source);
    candidates.set(movie.id, current);
  };

  const recommendationItems = (recommendations.results || []).map(normalizeMovie).slice(0, 20);
  const similarItems = (similar.results || []).map(normalizeMovie).slice(0, 20);

  recommendationItems.forEach((movie, index) => {
    addCandidate(movie, "recommendation", 1.1 * rankWeight(index, recommendationItems.length));
  });
  similarItems.forEach((movie, index) => {
    addCandidate(movie, "similar", 0.95 * rankWeight(index, similarItems.length));
  });
  genreLists.flat().forEach((movie, index, list) => {
    addCandidate(movie, "genre", 0.68 * rankWeight(index, list.length));
  });
  directorList.forEach((movie, index) => {
    addCandidate(movie, "director", 0.88 * rankWeight(index, directorList.length));
  });
  actorLists.flat().forEach((movie, index, list) => {
    addCandidate(movie, "actor", 0.74 * rankWeight(index, list.length));
  });

  matrixFactorization.byTmdbId.forEach((signal, movieId) => {
    const current =
      candidates.get(movieId) ||
      ({
        movie: {
          id: movieId,
          title: signal.title,
          posterPath: null,
          backdropPath: null,
          releaseDate: null,
          voteAverage: 0,
          overview: "",
          genreIds: [],
          posterUrl: signal.posterUrl,
        },
        preliminaryScore: 0,
        matrixFactorizationScore: 0,
        sources: new Set<string>(),
      } satisfies CandidateBucket);

    current.matrixFactorizationScore = signal.score;
    current.sources.add("matrix-factorization");
    candidates.set(movieId, current);
  });

  const maxMatrixFactorizationScore = matrixFactorization.maxScore || 0;
  const seedGenreIds = seedMovie.genreIds;
  const seedDirectorIds = directorIds;
  const seedActorIds = actorIds;
  const preview = Array.from(candidates.values())
    .sort((a, b) => {
      const aMatrix = maxMatrixFactorizationScore
        ? a.matrixFactorizationScore / maxMatrixFactorizationScore
        : 0;
      const bMatrix = maxMatrixFactorizationScore
        ? b.matrixFactorizationScore / maxMatrixFactorizationScore
        : 0;
      return b.preliminaryScore + bMatrix - (a.preliminaryScore + aMatrix);
    })
    .slice(0, 28);

  const detailEntries = await Promise.all(
    preview.map(async (candidate) => {
      try {
        const detail = await fetchMovieDetails(candidate.movie.id);
        return [candidate.movie.id, detail] as const;
      } catch {
        return [candidate.movie.id, null] as const;
      }
    })
  );

  const detailMap = new Map<number, TmdbMovieDetails | null>(detailEntries);
  const maxPreliminaryScore = preview.reduce((max, candidate) => Math.max(max, candidate.preliminaryScore), 0);
  const hasMatrixFactorizationSignals = maxMatrixFactorizationScore > 0;
  const weights = hasMatrixFactorizationSignals
    ? FINAL_SCORE_WEIGHTS
    : { matrixFactorization: 0, content: 0.68, source: 0.18, quality: 0.14 };

  const ranked = preview
    .map((candidate) => {
      const detail = detailMap.get(candidate.movie.id);
      const movie = detail ? normalizeDetailMovie(detail) : candidate.movie;
      const candidateDirectorIds = extractDirectorIds(detail || undefined);
      const candidateActorIds = extractCastIds(detail || undefined, 4);
      const genreScore = overlapScore(seedGenreIds, movie.genreIds);
      const actorScore = overlapScore(seedActorIds, candidateActorIds);
      const directorScore = overlapScore(seedDirectorIds, candidateDirectorIds);
      const contentScore =
        genreScore * CONTENT_WEIGHTS.genre +
        actorScore * CONTENT_WEIGHTS.actor +
        directorScore * CONTENT_WEIGHTS.director;
      const matrixFactorizationScore = hasMatrixFactorizationSignals
        ? candidate.matrixFactorizationScore / maxMatrixFactorizationScore
        : 0;
      const sourceScore = maxPreliminaryScore ? candidate.preliminaryScore / maxPreliminaryScore : 0;
      const voteAverage = Number(detail?.vote_average ?? movie.voteAverage ?? 0);
      const voteCount = Number(detail?.vote_count ?? 0);
      const qualityScore =
        clamp((voteAverage - 5.5) / 4.5, 0, 1) * 0.72 +
        clamp(Math.log10(voteCount + 1) / 3, 0, 1) * 0.28;
      const sourceBonus =
        (candidate.sources.has("director") ? 0.02 : 0) +
        (candidate.sources.has("actor") ? 0.02 : 0) +
        (candidate.sources.has("genre") ? 0.015 : 0) +
        (candidate.sources.has("matrix-factorization") ? 0.03 : 0) +
        (candidate.sources.size >= 3 ? 0.03 : 0);

      const finalScore =
        matrixFactorizationScore * weights.matrixFactorization +
        contentScore * weights.content +
        sourceScore * weights.source +
        qualityScore * weights.quality +
        sourceBonus;

      return {
        movie: detail
          ? movie
          : {
              ...movie,
              posterUrl: candidate.movie.posterUrl ?? null,
            },
        finalScore,
      };
    })
    .sort((a, b) => b.finalScore - a.finalScore)
    .map((entry) => entry.movie);

  const { subtitle, signals } = buildSubtitle(seedDetails);

  return {
    seedMovieTitle: title || seedMovie.title,
    seedTmdbId: String(tmdbId),
    subtitle,
    signals,
    items: dedupeMovies(ranked).slice(0, limit),
  };
}
