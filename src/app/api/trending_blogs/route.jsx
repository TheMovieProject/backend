import prisma from "@/app/libs/prismaDB";
import { NextResponse } from "next/server";

const calculateTrendingScore = (likes, comments, views, createdAt) => {
  const hoursSincePosted = Math.max((Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60), 1);
  return ((likes * 3) + (comments * 2) + views) / hoursSincePosted;
};

export async function GET() {
  try {
    const blogs = await prisma.blog.findMany({
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
        comments: { select: { id: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    const trendingBlogs = blogs
      .map((blog) => ({
        ...blog,
        trendingScore: calculateTrendingScore(
          blog.likes || 0,
          blog.comments?.length || 0,
          blog.views || 0,
          blog.createdAt
        ),
      }))
      .sort((a, b) => b.trendingScore - a.trendingScore);

    return NextResponse.json(trendingBlogs, { status: 200 });
  } catch (err) {
    console.error("Error fetching trending blogs:", err);
    return NextResponse.json(
      {
        message: "Error fetching trending blogs.",
        error: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }
}
