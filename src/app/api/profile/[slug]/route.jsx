// app/api/profile/[slug]/route.jsx
import prisma from "@/app/api/auth/[...nextauth]/connect";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";

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

    // Get current session if available
    const session = await getServerSession(authOptions);
    const currentUserId = session?.user?.id;

    const [user , reviews , blogs , follower , following , followStatus]= await Promise.all([
     
      prisma.user.findUnique({
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
    }),

    prisma.review.findMany({
      where:{userId:slug},
      select:{
        id:true,
        movieId:true,
        likes:true,
        fire:true,
        popularity:true,
        createdAt:true
      }
    }),

    prisma.blog.findMany({
      where:{user:{id:slug}},
      select:{
        id:true,
        title:true,
        likes:true,
        fire:true,
        views:true,
        createdAt:true
      }
    }),
 
    // people who are following this slug
    prisma.follow.findMany({
      where:{followingId:slug},
      select:{
        followingId:true,
        follower:{
          select:{
            id:true,
            username:true,
            image:true,
            avatarUrl:true
          }
        }
      }
    }),

    // people this slug follows
    prisma.follow.findMany({
      where:{followerId:slug},
      select:{
        followerId:true,
        following:{
          select:{
            id:true,
            username:true,
            avatarUrl:true,
            image:true
          }
        }
      }
    })


    ])

    if (!user) {
      return NextResponse.json(
        { error: "User not found" }, 
        { status: 404 }
      );
    }

    const [followerCounts , followingCounts] = await Promise.all([
      prisma.follow.count({where:{followingId:slug}}),
      prisma.follow.count({where:{followerId:slug}})
    ])

    // Don't expose email in public profile
    const publicProfile = {
      user:{id:user.id,
      name:user.name,
      username:user.username,
      bio:user.bio,
      movieGenres:user.movieGenres,
      avatarUrl:user.avatarUrl,},

      stats:{
        reviewCount: reviews.length,
        blogCount: blogs.length,
        followerCounts,
        followingCounts
      },

      // followingStatus

      followers:{
        count:followerCounts,
        preview: follower.map((f)=>({
          id:f.follower.id,
          username: f.follower.username,
          image:f.follower.image,
          avatarUrl:f.follower.avatarUrl
        }))
      },

      following:{
        count:followingCounts,
        preview: following.map((f)=>({
          id:f.following.id,
          username: f.following.username,
          image:f.following.image,
          avatarUrl:f.following.avatarUrl
        }))
      }

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