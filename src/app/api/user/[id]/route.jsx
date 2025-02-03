import prisma from "@/app/api/auth/[...nextauth]/connect";
import { NextResponse } from "next/server";
import { getAuthSession } from "@/app/api/auth/[...nextauth]/options";

export async function GET(request, { params }) {
  try {
    const session = await getAuthSession();
    const { id } = params;

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id },
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

    return NextResponse.json(user);
  } catch (error) {
    console.error("Error fetching user:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function PUT(request, { params }) {
  try {
    const session = await getAuthSession();
    const { id } = params;

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!currentUser || currentUser.id !== id) {
      return NextResponse.json(
        { error: "Unauthorized to update this profile" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { username, bio, avatarUrl, movieGenres } = body;

    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        username: username || undefined,
        bio: bio || undefined,
        avatarUrl: avatarUrl || undefined,
        movieGenres: movieGenres || undefined,
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

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error("Profile update error:", error);
    return NextResponse.json(
      { error: "Error updating profile" },
      { status: 500 }
    );
  }
}