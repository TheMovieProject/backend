import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import prisma from "@/app/libs/prismaDB";
import { NextResponse } from 'next/server';

// Helper function to get user
async function getUser(session) {
  if (!session || !session.user || !session.user.email) {
    throw new Error("Unauthorized");
  }
  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  });
  if (!user) {
    throw new Error("User not found");
  }
  return user;
}

// Handle GET request to fetch blogs
export const GET = async (req) => {
  const session = await getServerSession(authOptions);
  
  // Ensure the user is authenticated before proceeding
  if (!session || !session.user || !session.user.email) {
    return NextResponse.json(
      { message: "Unauthorized" },
      { status: 401 }
    );
  }

  // Get the userEmail query parameter
  const userEmail = req.nextUrl.searchParams.get("userEmail");

  try {
    let blogs;
    if (userEmail) {
      // Fetch blogs by user email
      blogs = await prisma.blog.findMany({
        where: {
          userEmail: userEmail, // Match blogs for the specific user
        },
        include: {
          user: true, // Include user data if needed
        },
      });
    } else {
      // Fetch all blogs if no userEmail is provided
      blogs = await prisma.blog.findMany({
        include: {
          user: true,
        },
      });
    }

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
    const { title, hashtags, content, userEmail, thumbnail, blogNumber } = await req.json();

    // Check if required fields are provided
    if (!title || !content || !userEmail) {
      return NextResponse.json(
        { message: "Title, content, and userEmail are required." },
        { status: 400 }
      );
    }

    // Create the blog and associate it with the user via the userEmail
    const blog = await prisma.blog.create({
      data: {
        title,
        hashtags,
        content,
        thumbnail,
        blogNumber,
        user: {
          connect: {
            email: userEmail // Associate the blog with the logged-in user
          }
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
};