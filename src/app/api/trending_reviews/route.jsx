import prisma from "@/app/api/auth/[...nextauth]/connect";
import { NextResponse } from "next/server";
const calculateTrendingScore = (likes, comments, views, createdAt) => {
    const hoursSincePosted = Math.max((Date.now() - new Date(createdAt)) / (1000 * 60 * 60), 1);
    return ((likes * 3) + (comments * 2) + (views * 1)) / hoursSincePosted;
  };
  
  export async function GET() {
    try {
      console.log("Fetching trending reviews...");
  
      const reviews = await prisma.review.findMany({
        include: {
          user: true, // Include user details
          reviewComments: true, // Include comments count
          movie: true, // Include movie details
        },
        orderBy: { createdAt: "desc" },
        take: 50,
      });
  
      const trendingReviews = reviews.map((review) => ({
        ...review,
        trendingScore: calculateTrendingScore(
          review.likes || 0,
          review.reviewComments.length || 0,
          review.views || 0,
          review.createdAt
        ),
      }));
  
      trendingReviews.sort((a, b) => b.trendingScore - a.trendingScore);
  
      console.log("Trending reviews fetched successfully");
      return NextResponse.json(trendingReviews, { status: 200 });
    } catch (err) {
      console.error("Error fetching trending reviews:", err);
      return NextResponse.json(
        { message: "Error fetching trending reviews.", error: err.message },
        { status: 500 }
      );
    }
  }