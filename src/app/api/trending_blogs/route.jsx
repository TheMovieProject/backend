import prisma from "@/app/api/auth/[...nextauth]/connect";
import { NextResponse } from "next/server";

const calculateTrendingScore = (likes, comments, views, createdAt) => {
  const hoursSincePosted = Math.max((Date.now() - new Date(createdAt)) / (1000 * 60 * 60), 1);
  return (likes * 3) + (comments * 2) + (views * 1) / hoursSincePosted;
};
 
export const GET = async () => {
  try {
    console.log("Fetching trending blogs...");

    // Fetch blogs with user details
    const blogs = await prisma.blog.findMany({
      include: {
        user: true,  // Include author details
        comments: true, // Get comments count
      },
      orderBy: { createdAt: "desc" }, // Order by newest
      take: 50, // Limit results
    });

    // Calculate trending score for each blog
    const trendingBlogs = blogs.map(blog => ({
      ...blog,
      trendingScore: calculateTrendingScore(blog.likes, blog.comments.length, blog.views, blog.createdAt),
    }));

    // Sort blogs by trending score (highest first)
    trendingBlogs.sort((a, b) => b.trendingScore - a.trendingScore);

    console.log("Trending blogs fetched successfully");

    return NextResponse.json(trendingBlogs, { status: 200 });
  } catch (err) {
    console.error("Error fetching trending blogs:", err);

    return NextResponse.json(
      { message: "Error fetching trending blogs.", error: err.message },
      { status: 500 }
    );
  }
};
