import prisma from "@/app/libs/prismaDB";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";

export async function GET(_req, { params }) {
  const slug = params?.slug;
  if (!slug) {
    return NextResponse.json({ message: "Missing blog id." }, { status: 400 });
  }

  try {
    const existing = await prisma.blog.findUnique({
      where: { id: slug },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
            name: true,
            image: true,
            avatarUrl: true,
          },
        },
      },
    });

    if (!existing) {
      return NextResponse.json({ message: "Blog post not found." }, { status: 404 });
    }

    const blog = await prisma.blog.update({
      where: { id: slug },
      data: { views: { increment: 1 } },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
            name: true,
            image: true,
            avatarUrl: true,
          },
        },
      },
    });

    let likedByMe = false;
    let firedByMe = false;

    const session = await getServerSession(authOptions);
    if (session?.user?.email) {
      const me = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { id: true },
      });

      if (me) {
        const myReactions = await prisma.entityReaction.findMany({
          where: {
            userId: me.id,
            entityType: "blog",
            entityId: slug,
            reactionType: { in: ["like", "likes", "fire"] },
          },
          select: { reactionType: true },
        });
        likedByMe = myReactions.some((r) => r.reactionType === "like" || r.reactionType === "likes");
        firedByMe = myReactions.some((r) => r.reactionType === "fire");
      }
    }

    return NextResponse.json(
      {
        ...blog,
        likedByMe,
        firedByMe,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("Error fetching blog post:", err);
    return NextResponse.json(
      {
        message: "Error fetching blog post.",
        error: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }
}
