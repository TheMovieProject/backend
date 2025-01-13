import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import prisma from "@/app/libs/prismaDB";

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

// Handle POST request to create a new review comment
export async function POST(req) {
    try {
      console.log("Received POST request to create a new review comment");
      const session = await getServerSession(authOptions);
      console.log("Session:", session);
  
      const user = await getUser(session);
      console.log("User:", user);
  
      const body = await req.json();
      console.log("Request Body:", body);
  
      const { reviewId, comment } = body;
  
      if (!reviewId || !comment) {
        console.warn("Invalid or missing data:", { reviewId, comment });
        return new Response("Invalid or missing data", { status: 400 });
      }
  
      const newComment = await prisma.reviewComment.create({
        data: {
          comment,
          userId: user.id,
          reviewId,
        },
      });
  
      console.log("Created Comment:", newComment);
      return new Response(JSON.stringify(newComment), { status: 201 });
    } catch (error) {
      console.error("Error in POST function:", error);
      return new Response(error.message, { status: error.message === "Unauthorized" ? 401 : 500 });
    }
  }
  

// Handle GET request to fetch comments for a specific review
export async function GET(req) {
    try {
      console.log("Received GET request to fetch comments for a review");
      const url = new URL(req.url);
      const reviewId = url.searchParams.get('reviewId');
      console.log("Review ID:", reviewId);
  
      if (!reviewId) {
        console.warn("Review ID is missing");
        return new Response("Review ID is required", { status: 400 });
      }
  
      const comments = await prisma.reviewComment.findMany({
        where: { reviewId },
        include: {
          user: {
            select: { name: true, image: true },
          },
        },
        orderBy: { createdAt: 'asc' },
      });
  
      console.log("Fetched Comments:", comments);
      return new Response(JSON.stringify(comments), { status: 200 });
    } catch (error) {
      console.error("Error in GET function:", error);
      return new Response("Internal server error", { status: 500 });
    }
  }
  