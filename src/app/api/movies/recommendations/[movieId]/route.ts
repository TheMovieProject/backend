import { NextResponse } from "next/server";
import prisma from "@/app/libs/prismaDB";
import { getHybridRecommendationsForMovie } from "@/app/libs/movieRecommendations";

export async function GET(
  _req: Request,
  { params }: { params: { movieId: string } }
) {
  try {
    const movieId = String(params?.movieId || "");
    if (!movieId) {
      return NextResponse.json({ error: "movieId is required" }, { status: 400 });
    }

    const localMovie = await prisma.movie.findUnique({
      where: { tmdbId: movieId },
      select: {
        id: true,
        title: true,
      },
    });

    const recommendations = await getHybridRecommendationsForMovie({
      tmdbId: movieId,
      dbMovieId: localMovie?.id ?? null,
      title: localMovie?.title ?? null,
      limit: 16,
    });

    return NextResponse.json(
      recommendations || {
        seedMovieTitle: "",
        seedTmdbId: movieId,
        subtitle:
          "Ranked with matrix factorization from audience behavior, then re-weighted by genre, actor, and director similarity.",
        signals: {
          director: null,
          actors: [],
          genres: [],
        },
        items: [],
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=900, stale-while-revalidate=3600",
        },
      }
    );
  } catch (error) {
    console.error("GET /api/movies/recommendations/[movieId] error", error);
    return NextResponse.json(
      { error: "Failed to load movie recommendations" },
      { status: 500 }
    );
  }
}
