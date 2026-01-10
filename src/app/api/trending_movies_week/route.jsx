import prisma from "@/app/api/auth/[...nextauth]/connect";
import { NextResponse } from "next/server";

const calculateWeeklyTrendingScore = (likes7d, ratings7d, watchlist7d, reviews7d) =>
  likes7d * 4 + reviews7d * 3 + watchlist7d * 2 + ratings7d;

export const GET = async () => {
  try {
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // ✅ Debug (remove later)
    // const [totalLikes, likesLast7d, totalRatings, ratingsLast7d] = await Promise.all([
    //   prisma.liked.count(),
    //   prisma.liked.count({ where: { addedAt: { gte: since } } }),
    //   prisma.rating.count(),
    //   prisma.rating.count({ where: { createdAt: { gte: since } } }),
    // ]);
    // console.log("since:", since.toISOString());
    // console.log({ totalLikes, likesLast7d, totalRatings, ratingsLast7d });

    const movies = await prisma.movie.findMany({
      select: {
        id: true,
        tmdbId: true,
        title: true,
        posterUrl: true,

        // only last 7 days
        liked: { where: { addedAt: { gte: since } }, select: { id: true } },
        ratings: {
          where: { createdAt: { gte: since } },
          select: { value: true }, 
        },
        watchlist: { where: { addedAt: { gte: since } }, select: { id: true } },
        reviews: { where: { createdAt: { gte: since } }, select: { id: true } },
      },
    });

    const weeklyTrending = movies
      .map((m) => {
        const likes7d = m.liked?.length ?? 0;
        const ratings7d = m.ratings?.length ?? 0;
        const watchlist7d = m.watchlist?.length ?? 0;
        const reviews7d = m.reviews?.length ?? 0;

        const avgRating7d =
          ratings7d > 0
            ? m.ratings.reduce((sum, r) => sum + (Number(r.value) || 0), 0) / ratings7d
            : 0;

        const trendingScore = calculateWeeklyTrendingScore(
          likes7d,
          ratings7d,
          watchlist7d,
          reviews7d
        );

        return {
          id: m.id,
          tmdbId: m.tmdbId,
          title: m.title,
          posterUrl: m.posterUrl,

          likes7d,
          ratings7d,
          avgRating7d,
          watchlist7d,
          reviews7d,

          trendingScore,
        };
      })
      // optional: drop movies with 0 score so list isn't all zeros
      // .filter((m) => m.trendingScore > 0)
      .sort((a, b) => b.trendingScore - a.trendingScore);

    return NextResponse.json(weeklyTrending, { status: 200 });
  } catch (err) {
    console.error("Error fetching weekly trending movies:", err);
    return NextResponse.json(
      { message: "Error fetching weekly trending movies.", error: err?.message },
      { status: 500 }
    );
  }
};
