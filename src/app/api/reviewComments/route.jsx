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
       console.log("Received POST request for review comment");
       const session = await getServerSession(authOptions);
       const user = await getUser(session);
        
       const body = await req.json();
       console.log("Request Body:", body);
        
       const { reviewId, comment, parentId } = body;
        
       if (!reviewId || !comment) {
           console.warn("Invalid or missing data:", { reviewId, comment });
           return new Response("Invalid or missing data", { status: 400 });
       }
        
       const validParentId = parentId && typeof parentId === "string" ? parentId : null;
        
       const newComment = await prisma.reviewComment.create({
           data: {
               comment,
               userId: user.id,
               reviewId,
               parentId: validParentId,
               createdAt: new Date() // Explicitly set creation time
           },
           include: {
               user: true
           }
       });
        
       console.log("Created Comment:", newComment);
       
       // Fetch the updated review with all comments
       const updatedReview = await prisma.review.findUnique({
           where: { id: reviewId },
           include: {
            reviewComments: { // Corrected to match schema
              include: {
                user: true,
                childComments: {
                  include: {
                    user: true
                  }
                }
              },
              orderBy: {
                createdAt: "desc"
              }
            }
          }
       });

       return new Response(JSON.stringify(updatedReview), { status: 201 });
   } catch (error) {
       console.error("Error in POST function:", error);
       return new Response(error.message, { status: error.message === "Unauthorized" ? 401 : 500 });
   }
}

// Handle GET request to fetch comments for a specific review
export async function GET(req) {
    try {
        const reviewId = req.nextUrl.searchParams.get('reviewId');
  
        if (!reviewId) {
            return new Response("Review ID is required", { status: 400 });
        }
  
        // Fetch comments with nested structure
        const comments = await prisma.reviewComment.findMany({
            where: { reviewId },
            include: {
                user: { 
                    select: { 
                        id: true,
                        name: true, 
                        username: true,
                        image: true,
                        avatarUrl: true 
                    } 
                },
                childComments: {
                    include: {
                        user: { 
                            select: { 
                                id: true,
                                name: true, 
                                image: true 
                            } 
                        }
                    }
                }
            },
            orderBy: { createdAt: 'asc' },
        });
  
        return new Response(JSON.stringify(comments), { status: 200 });
    } catch (error) {
        console.error("Error in GET function:", error);
        return new Response("Internal server error", { status: 500 });
    }
  }