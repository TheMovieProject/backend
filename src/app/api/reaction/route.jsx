import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import prisma from "@/app/libs/prismaDB";

// Helper function to get user
async function getUser(session) {
  if (!session?.user?.email) {
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

// Handle POST request
export async function POST(req) {
  try {
    console.log("Reaction API called");
    
    const session = await getServerSession(authOptions);
    console.log("Session:", session ? "Valid" : "Invalid");
    
    // Parse request body
    const body = await req.json();
    console.log("Request body:", body);
    
    const { entityId, entityType, type } = body;
    console.log("Extracted data:", { entityId, entityType, type });
    
    // Validate input
    if (!entityId || !entityType || !type || !['like', 'fire'].includes(type)) {
      console.error("Validation error:", { entityId, entityType, type });
      return new Response("Invalid or missing data", { status: 400 });
    }
    
    const user = await getUser(session);
    console.log("User found:", user.id);
    
    // Map entity types to their Prisma models
    const validEntities = {
      blog: "blog",
      review: "review",
    };
    
    // Convert reaction type to match database field ('like' -> 'likes')
    const reactionField = type === 'like' ? 'likes' : type;
    
    // Check if the entity exists
    let entity;
    if (entityType === 'review') {
      entity = await prisma.review.findUnique({
        where: { id: entityId },
      });
    } else if (entityType === 'blog') {
      entity = await prisma.blog.findUnique({
        where: { id: entityId },
      });
    }
    
    if (!entity) {
      console.error("Entity not found:", entityId);
      return new Response("Entity not found", { status: 404 });
    }
    
    // Check if the user has already reacted
    const existingReaction = await prisma.entityReaction.findFirst({
      where: {
        userId: user.id,
        entityId: entityId,
        entityType: entityType,
        reactionType: reactionField,
      },
    });
    
    console.log("Existing reaction:", existingReaction ? "Found" : "Not found");
    
    // Process reaction
    if (existingReaction) {
      // Remove existing reaction
      await prisma.entityReaction.delete({
        where: { id: existingReaction.id },
      });
      
      // Decrease reaction count
      if (entityType === 'review') {
        const updatedEntity = await prisma.review.update({
          where: { id: entityId },
          data: { 
            [reactionField]: Math.max((entity[reactionField] || 0) - 1, 0) 
          },
        });
        return new Response(JSON.stringify(updatedEntity), { status: 200 });
      } else if (entityType === 'blog') {
        const updatedEntity = await prisma.blog.update({
          where: { id: entityId },
          data: { 
            [reactionField]: Math.max((entity[reactionField] || 0) - 1, 0) 
          },
        });
        return new Response(JSON.stringify(updatedEntity), { status: 200 });
      }
    } else {
      // Add new reaction
      await prisma.entityReaction.create({
        data: {
          userId: user.id,
          entityId: entityId,
          entityType: entityType,
          reactionType: reactionField,
        },
      });
      
      // Increase reaction count
      if (entityType === 'review') {
        const updatedEntity = await prisma.review.update({
          where: { id: entityId },
          data: { 
            [reactionField]: (entity[reactionField] || 0) + 1 
          },
        });
        return new Response(JSON.stringify(updatedEntity), { status: 200 });
      } else if (entityType === 'blog') {
        const updatedEntity = await prisma.blog.update({
          where: { id: entityId },
          data: { 
            [reactionField]: (entity[reactionField] || 0) + 1 
          },
        });
        return new Response(JSON.stringify(updatedEntity), { status: 200 });
      }
    }
    
    return new Response("Operation completed", { status: 200 });
  } catch (error) {
    console.error("Error in reaction API:", error);
    return new Response(error.message, { 
      status: error.message === "Unauthorized" ? 401 : 500 
    });
  }
}