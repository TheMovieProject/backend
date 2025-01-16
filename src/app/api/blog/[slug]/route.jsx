import prisma from "@/app/api/auth/[...nextauth]/connect";
import { NextResponse } from "next/server";

export const GET = async (req, { params }) => {
  const { slug } = params;

  try {
    console.log("Fetching blog with ID:", slug);

    // Fetch the blog post by its unique ID
    const blog = await prisma.blog.update({
      where: { id: slug }, // Use `slug` as the blog's ID
      data: {
        views: {
          increment: 1, // Increment the views count
        },
      },
      include: {
        user: true, // Include user details for the blog post
      },
    });

    if (!blog) {
      return NextResponse.json(
        { message: "Blog post not found." },
        { status: 404 }
      );
    }

    console.log("Blog post fetched successfully:", blog);

    return NextResponse.json(blog, { status: 200 });
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
};
