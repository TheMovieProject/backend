// app/api/profile/[slug]/route.jsx
import prisma from "@/app/api/auth/[...nextauth]/connect";
import { NextResponse } from "next/server";

// Public profile route - only GET method
export const GET = async (req, { params }) => {
  const { slug } = params;

  try {
    // Validate slug
    if (!slug || slug === 'undefined') {
      return NextResponse.json(
        { error: "Invalid profile ID" }, 
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { 
        id: slug 
      },
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        image: true,
        avatarUrl: true,
        bio: true,
        movieGenres: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" }, 
        { status: 404 }
      );
    }

    // Don't expose email in public profile
    const publicProfile = {
      ...user,
      email: undefined
    };

    return NextResponse.json(publicProfile, { status: 200 });
  } catch (error) {
    console.error("Error fetching user:", error);
    return NextResponse.json(
      { error: "Internal Server Error" }, 
      { status: 500 }
    );
  }
};