import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import prisma from "@/app/libs/prismaDB";
import { NextResponse } from "next/server";

const MAX_LIMIT = 100;

function toTags(hashtags) {
  if (!hashtags || typeof hashtags !== "string") return [];

  return Array.from(
    new Set(
      hashtags
        .split(/\s+/)
        .map((tag) => tag.trim())
        .filter(Boolean)
        .map((tag) => (tag.startsWith("#") ? tag.slice(1) : tag))
        .map((tag) => tag.toLowerCase())
        .filter(Boolean)
    )
  );
}

function parseLimit(rawValue) {
  const parsed = Number(rawValue ?? 20);
  if (!Number.isFinite(parsed) || parsed <= 0) return 20;
  return Math.min(Math.floor(parsed), MAX_LIMIT);
}

export async function GET(req) {
  try {
    const userId = req.nextUrl.searchParams.get("userId");
    const userEmail = req.nextUrl.searchParams.get("userEmail");
    const limit = parseLimit(req.nextUrl.searchParams.get("limit"));
    const where = userId
      ? { user: { is: { id: userId } } }
      : userEmail
        ? { userEmail }
        : undefined;

    const blogs = await prisma.blog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            username: true,
            name: true,
            avatarUrl: true,
            image: true,
          },
        },
        comments: { select: { id: true } },
      },
    });

    return NextResponse.json(
      blogs.map((blog) => ({
        ...blog,
        commentsCount: blog.comments?.length ?? 0,
        excerpt: blog.content ? blog.content.slice(0, 220) : "",
      })),
      { status: 200 }
    );
  } catch (err) {
    console.error("Error fetching posts:", err);
    return NextResponse.json(
      {
        message: "Error fetching posts",
        error: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }
}

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const me = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, email: true },
    });
    if (!me) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    const { title, hashtags, content, thumbnail, blogNumber } = await req.json();
    const safeTitle = typeof title === "string" ? title.trim() : "";
    const safeContent = typeof content === "string" ? content.trim() : "";

    if (!safeTitle || !safeContent) {
      return NextResponse.json(
        { message: "Title and content are required." },
        { status: 400 }
      );
    }

    const tags = toTags(hashtags);

    let resolvedBlogNumber = Number.isFinite(Number(blogNumber))
      ? Math.max(1, Math.floor(Number(blogNumber)))
      : null;

    if (!resolvedBlogNumber) {
      const latest = await prisma.blog.findFirst({
        where: { userEmail: me.email },
        orderBy: { blogNumber: "desc" },
        select: { blogNumber: true },
      });
      resolvedBlogNumber = (latest?.blogNumber ?? 0) + 1;
    }

    const blog = await prisma.blog.create({
      data: {
        title: safeTitle,
        hashtags: typeof hashtags === "string" ? hashtags : null,
        content: safeContent,
        thumbnail: typeof thumbnail === "string" && thumbnail.trim() ? thumbnail.trim() : null,
        blogNumber: resolvedBlogNumber,
        tags,
        user: { connect: { email: me.email } },
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            username: true,
            name: true,
            avatarUrl: true,
            image: true,
          },
        },
      },
    });

    return NextResponse.json(blog, { status: 201 });
  } catch (err) {
    console.error("Error creating post:", err);
    return NextResponse.json(
      {
        message: "Error creating post",
        error: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }
}
