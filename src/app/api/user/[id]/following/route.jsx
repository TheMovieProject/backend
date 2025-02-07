import prismadb from "@/app/api/auth/[...nextauth]/connect";
import { NextResponse } from "next/server";

export async function GET(req, { params }) {
  try {
    const following = await prismadb.follow.count({
      where: { followerId: params.id }
    });

    const followingList = await prismadb.follow.findMany({
      where: { followerId: params.id },
      include: {
        following: {
          select: {
            id: true,
            username: true,
            email: true,
            image: true,
            avatarUrl: true
          }
        }
      }
    });

    return NextResponse.json({
      following,
      followingList: followingList.map(f => f.following)
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal error" },
      { status: 500 }
    );
  }
}