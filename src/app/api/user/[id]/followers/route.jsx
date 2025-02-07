import prismadb from "@/app/api/auth/[...nextauth]/connect";
import { NextResponse } from "next/server";

export async function GET(req, { params }) {
    try {
        const followers = await prismadb.follow.count({
          where: { followingId: params.id }
        });
    
        const followersList = await prismadb.follow.findMany({
          where: { followingId: params.id },
          include: {
            follower: {
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
          followers,
          followersList: followersList.map(f => f.follower)
        });
      } catch (error) {
        return NextResponse.json(
          { error: "Internal error" },
          { status: 500 }
        );
      }
}