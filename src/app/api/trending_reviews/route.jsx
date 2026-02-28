import prisma from "@/app/libs/prismaDB";
import { NextResponse } from "next/server";

const calculateTrendingScore = (likes, comments, createdAt) => {
  const hoursSincePosted = Math.max((Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60), 1);
  return ((likes * 3) + (comments * 2)) / hoursSincePosted;
};

export async function GET() {
  try {
    const reviews = await prisma.review.findMany({
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
            avatarUrl: true,
            image: true,
          },
        },
        reviewComments: { select: { id: true } },
        movie: {
          select: {
            id: true,
            tmdbId: true,
            title: true,
            posterUrl: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    const trendingReviews = reviews
      .map((review) => ({
        ...review,
        trendingScore: calculateTrendingScore(
          review.likes || 0,
          review.reviewComments?.length || 0,
          review.createdAt
        ),
      }))
      .sort((a, b) => b.trendingScore - a.trendingScore);

    return NextResponse.json(trendingReviews, { status: 200 });
  } catch (err) {
    console.error("Error fetching trending reviews:", err);
    return NextResponse.json(
      {
        message: "Error fetching trending reviews.",
        error: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }
}
