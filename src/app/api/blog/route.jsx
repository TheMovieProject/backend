// /api/blog/route.js
import prisma from "@/app/api/auth/[...nextauth]/connect";
import { NextResponse } from "next/server";

// Handle GET request to fetch all blog posts
export const GET = async () => {
  try {
    const blogs = await prisma.blog.findMany({
      include: {
        user: true,
      },
    });

    return NextResponse.json(blogs, { status: 200 });
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
};

// Handle POST request to create a new blog post
export const POST = async (req) => {
  try {
    const { title, hashtags, content, userEmail, thumbnail , blogNumber } = await req.json();

    if (!title || !content || !userEmail) {
      return NextResponse.json(
        { message: "Title, content, and userEmail are required." },
        { status: 400 }
      );
    }

    const blog = await prisma.blog.create({
      data: {
        title,
        hashtags,
        content,
        thumbnail,
        user: {
          connect: {
            email: userEmail
          }
        },
        blogNumber
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
};
