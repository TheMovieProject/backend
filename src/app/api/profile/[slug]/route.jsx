// app/api/profile/[slug]/route.jsx
import prisma from "@/app/api/auth/[...nextauth]/connect";
import { NextResponse } from "next/server";

export const maxDuration = 30;

export const GET = async (req, { params }) => {
  const { slug } = params;

  try {
    if (!slug || slug === "undefined") {
      return NextResponse.json({ error: "Invalid profile ID" }, { status: 400 });
    }

    const previewLimitRaw = Number(new URL(req.url).searchParams.get("previewLimit") ?? 5);
    const previewLimit = Number.isFinite(previewLimitRaw)
      ? Math.min(Math.max(1, Math.floor(previewLimitRaw)), 12)
      : 5;

    const user = await prisma.user.findUnique({
      where: { id: slug },
      select: {
        id: true,
        name: true,
        username: true,
        image: true,
        avatarUrl: true,
        bio: true,
        movieGenres: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const [
      reviewCount,
      blogCount,
      followerCounts,
      followingCounts,
      followersPreview,
      followingPreview,
    ] = await Promise.all([
      prisma.review.count({ where: { userId: slug } }),
      prisma.blog.count({ where: { user: { is: { id: slug } } } }),
      prisma.follow.count({ where: { followingId: slug } }),
      prisma.follow.count({ where: { followerId: slug } }),
      prisma.follow.findMany({
        where: { followingId: slug },
        take: previewLimit,
        orderBy: { createdAt: "desc" },
        select: {
          follower: {
            select: {
              id: true,
              username: true,
              image: true,
              avatarUrl: true,
            },
          },
        },
      }),
      prisma.follow.findMany({
        where: { followerId: slug },
        take: previewLimit,
        orderBy: { createdAt: "desc" },
        select: {
          following: {
            select: {
              id: true,
              username: true,
              image: true,
              avatarUrl: true,
            },
          },
        },
      }),
    ]);

    return NextResponse.json(
      {
        user: {
          id: user.id,
          name: user.name,
          username: user.username,
          bio: user.bio,
          image: user.image,
          movieGenres: user.movieGenres,
          avatarUrl: user.avatarUrl,
        },
        stats: {
          reviewCount,
          blogCount,
          followerCounts,
          followingCounts,
        },
        followers: {
          count: followerCounts,
          preview: followersPreview.map((f) => ({
            id: f.follower.id,
            username: f.follower.username,
            image: f.follower.image,
            avatarUrl: f.follower.avatarUrl,
          })),
        },
        following: {
          count: followingCounts,
          preview: followingPreview.map((f) => ({
            id: f.following.id,
            username: f.following.username,
            image: f.following.image,
            avatarUrl: f.following.avatarUrl,
          })),
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching user:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
};
