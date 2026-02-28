import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import prisma from "@/app/libs/prismaDB";
import { getSeasonalQueryParams } from "@/app/helpers/Seasonal";
import { getHybridRecommendationsForMovie } from "@/app/libs/movieRecommendations";

export const dynamic = "force-dynamic";

const TMDB_BASE = "https://api.themoviedb.org/3";

type TmdbMovie = {
  id: number;
  title?: string;
  name?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  release_date?: string;
  vote_average?: number;
  overview?: string;
  genre_ids?: number[];
};

type NormalizedMovie = {
  id: number;
  title: string;
  posterPath: string | null;
  backdropPath: string | null;
  releaseDate: string | null;
  voteAverage: number;
  overview: string;
  genreIds: number[];
};

type PersonSpotlight = {
  name: string;
  personId: number | null;
  items: NormalizedMovie[];
};

function tmdbApiKey() {
  const key =
    process.env.TMDB_API_KEY ||
    process.env.MOVIEDB_API_KEY;

  if (!key) {
    throw new Error("TMDB API key is not configured. Set TMDB_API_KEY or MOVIEDB_API_KEY.");
  }

  return key;
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

async function tmdbFetch<T = any>(
  path: string,
  params: Record<string, string | number | undefined> = {}
): Promise<T> {
  const key = tmdbApiKey();
  const q = new URLSearchParams({
    api_key: key,
    language: "en-US",
  });

  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && `${v}`.length > 0) {
      q.set(k, String(v));
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

async function searchMovies(query: string, page = 1) {
  if (!query?.trim()) return [];
  const data = await tmdbFetch<{ results: TmdbMovie[] }>("/search/movie", {
    query,
    include_adult: "false",
    page,
  });
  return (data.results || []).map(normalizeMovie).slice(0, 16);
}

async function discoverByGenre(genreId: number, page = 1) {
  const data = await tmdbFetch<{ results: TmdbMovie[] }>("/discover/movie", {
    sort_by: "popularity.desc",
    include_adult: "false",
    page,
    with_genres: String(genreId),
    "vote_count.gte": 50,
  });
  return (data.results || []).map(normalizeMovie).slice(0, 18);
}

async function discoverByPerson(name: string, mode: "director" | "actor"): Promise<PersonSpotlight> {
  const personSearch = await tmdbFetch<{ results: Array<{ id: number; name: string }> }>("/search/person", {
    query: name,
    include_adult: "false",
    page: 1,
  });

  const personId = personSearch.results?.[0]?.id ?? null;
  if (!personId) {
    return { name, personId: null, items: [] };
  }

  const discoverParams =
    mode === "director"
      ? { with_crew: personId, sort_by: "popularity.desc", include_adult: "false" }
      : { with_cast: personId, sort_by: "popularity.desc", include_adult: "false" };

  const movies = await tmdbFetch<{ results: TmdbMovie[] }>("/discover/movie", {
    ...discoverParams,
    page: 1,
  });

  return {
    name,
    personId,
    items: (movies.results || []).map(normalizeMovie).slice(0, 14),
  };
}

function weatherQuery(weather?: string | null, tempC?: number | null) {
  const w = (weather || "").toLowerCase();
  if (w.includes("rain")) return { label: "Rainy Day Picks", query: "rain monsoon storm mystery romance" };
  if (w.includes("snow") || w.includes("cold")) return { label: "Cold Weather Comfort", query: "winter cozy family christmas feel good" };
  if (w.includes("hot") || (typeof tempC === "number" && tempC >= 33)) {
    return { label: "Heatwave Escapes", query: "summer beach adventure travel action" };
  }
  return { label: "Today Picks", query: "feel good adventure drama family" };
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

function monthLabel(dateStr: string) {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "Unknown";
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function startOfDayIso(dateStr: string) {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return null;
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

async function findSeedMovieForUser(email?: string | null) {
  if (!email) return null;
  const me = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });
  if (!me) return null;

  const [recentReview, recentRating, recentLiked, recentWatchlist] = await Promise.all([
    prisma.review.findFirst({
      where: { userId: me.id },
      orderBy: { createdAt: "desc" },
      select: {
        createdAt: true,
        movie: { select: { id: true, tmdbId: true, title: true } },
      },
    }),
    prisma.rating.findFirst({
      where: { userId: me.id },
      orderBy: { createdAt: "desc" },
      select: {
        createdAt: true,
        movie: { select: { id: true, tmdbId: true, title: true } },
      },
    }),
    prisma.liked.findFirst({
      where: { userId: me.id },
      orderBy: { addedAt: "desc" },
      select: {
        addedAt: true,
        movie: { select: { id: true, tmdbId: true, title: true } },
      },
    }),
    prisma.legacyWatchlist.findFirst({
      where: { userId: me.id },
      orderBy: { addedAt: "desc" },
      select: {
        addedAt: true,
        movie: { select: { id: true, tmdbId: true, title: true } },
      },
    }),
  ]);

  const candidates = [
    recentReview
      ? {
          at: recentReview.createdAt,
          dbMovieId: recentReview.movie.id,
          tmdbId: recentReview.movie.tmdbId,
          title: recentReview.movie.title,
        }
      : null,
    recentRating
      ? {
          at: recentRating.createdAt,
          dbMovieId: recentRating.movie.id,
          tmdbId: recentRating.movie.tmdbId,
          title: recentRating.movie.title,
        }
      : null,
    recentLiked
      ? {
          at: recentLiked.addedAt,
          dbMovieId: recentLiked.movie.id,
          tmdbId: recentLiked.movie.tmdbId,
          title: recentLiked.movie.title,
        }
      : null,
    recentWatchlist
      ? {
          at: recentWatchlist.addedAt,
          dbMovieId: recentWatchlist.movie.id,
          tmdbId: recentWatchlist.movie.tmdbId,
          title: recentWatchlist.movie.title,
        }
      : null,
  ].filter(Boolean) as Array<{ at: Date; dbMovieId: string; tmdbId: string; title: string }>;

  if (!candidates.length) return null;
  candidates.sort((a, b) => b.at.getTime() - a.at.getTime());
  return candidates[0];
}

function computeOccasionTitle(
  seasonal: { primary?: string; secondary?: string; type?: string },
  weather: { label: string }
) {
  if (seasonal.type === "festival") {
    return "Festival Spotlight";
  }
  if (seasonal.type === "season") {
    return "Seasonal Mood Picks";
  }
  return weather.label;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const weather = searchParams.get("weather");
    const tempParam = searchParams.get("tempC");
    const tempC = tempParam ? Number(tempParam) : null;

    const seasonal =
      (getSeasonalQueryParams?.() as { primary?: string; secondary?: string; type?: string } | undefined) || {};
    const weatherMood = weatherQuery(weather, Number.isFinite(tempC as number) ? (tempC as number) : null);

    const occasionQuery = seasonal.secondary || seasonal.primary || weatherMood.query;
    const occasionTitle = computeOccasionTitle(seasonal, weatherMood);

    const genreConfig = [
      { id: 28, name: "Action" },
      { id: 27, name: "Horror" },
      { id: 35, name: "Comedy" },
      { id: 18, name: "Drama" },
      { id: 10749, name: "Romance" },
      { id: 53, name: "Thriller" },
    ];

    const directorNames = [
      "Christopher Nolan",
      "S. S. Rajamouli",
      "Rajkumar Hirani",
      "Greta Gerwig",
    ];
    const actorNames = ["Shah Rukh Khan", "Salman Khan", "Deepika Padukone", "Leonardo DiCaprio"];

    const session = await getServerSession(authOptions);
    const seedMovie = await findSeedMovieForUser(session?.user?.email ?? null);

    const [
      occasionItems,
      trendingData,
      upcomingData,
      nowPlayingData,
      genreBuckets,
      directors,
      actors,
    ] = await Promise.all([
      searchMovies(occasionQuery, 1),
      tmdbFetch<{ results: TmdbMovie[] }>("/trending/movie/week", { page: 1 }),
      tmdbFetch<{ results: TmdbMovie[] }>("/movie/upcoming", { page: 1, region: "IN" }),
      tmdbFetch<{ results: TmdbMovie[] }>("/movie/now_playing", { page: 1, region: "IN" }),
      Promise.all(genreConfig.map(async (genre) => ({ ...genre, items: await discoverByGenre(genre.id, 1) }))),
      Promise.all(directorNames.map((name) => discoverByPerson(name, "director"))),
      Promise.all(actorNames.map((name) => discoverByPerson(name, "actor"))),
    ]);

    const trending = (trendingData.results || []).map(normalizeMovie).slice(0, 20);
    const upcoming = (upcomingData.results || []).map(normalizeMovie).slice(0, 30);
    const nowPlaying = (nowPlayingData.results || []).map(normalizeMovie).slice(0, 20);

    const calendarItems = dedupeMovies([...upcoming, ...nowPlaying])
      .filter((m) => !!m.releaseDate)
      .sort((a, b) => new Date(a.releaseDate || "").getTime() - new Date(b.releaseDate || "").getTime())
      .slice(0, 60);

    const byMonthMap = new Map<string, NormalizedMovie[]>();
    for (const movie of calendarItems) {
      const month = monthLabel(movie.releaseDate || "");
      if (!byMonthMap.has(month)) byMonthMap.set(month, []);
      byMonthMap.get(month)!.push(movie);
    }
    const releaseMonths = Array.from(byMonthMap.entries()).map(([month, items]) => ({
      month,
      items: items.slice(0, 12),
    }));

    const randomPool = dedupeMovies([...occasionItems, ...trending, ...upcoming]).filter(
      (m) => m.posterPath || m.backdropPath
    );
    const randomPick = randomPool.length
      ? randomPool[Math.floor(Math.random() * randomPool.length)]
      : null;

    const becauseYouWatched = seedMovie
      ? await getHybridRecommendationsForMovie({
          tmdbId: seedMovie.tmdbId,
          dbMovieId: seedMovie.dbMovieId,
          title: seedMovie.title,
          limit: 16,
        })
      : null;

    return NextResponse.json({
      generatedAt: new Date().toISOString(),
      context: {
        occasionTitle,
        occasionQuery,
        seasonType: seasonal.type || null,
        seasonPrimary: seasonal.primary || null,
        weather: weather || null,
        tempC: Number.isFinite(tempC as number) ? tempC : null,
      },
      occasionSpotlight: {
        title: occasionTitle,
        subtitle:
          seasonal.type === "festival"
            ? "Occasion-first picks inspired by ongoing Indian celebrations."
            : "Mood-first picks based on seasonal/weather context.",
        items: occasionItems,
      },
      categories: {
        genres: genreBuckets,
        directors: directors.filter((d) => d.items.length > 0),
        actors: actors.filter((a) => a.items.length > 0),
      },
      becauseYouWatched,
      releaseCalendar: {
        items: calendarItems.map((item) => ({
          ...item,
          dayIso: item.releaseDate ? startOfDayIso(item.releaseDate) : null,
        })),
        months: releaseMonths,
      },
      randomPick,
      trending,
    });
  } catch (error) {
    console.error("GET /api/movies/discovery error", error);
    return NextResponse.json(
      { error: "Failed to load movie discovery data" },
      { status: 500 }
    );
  }
}
