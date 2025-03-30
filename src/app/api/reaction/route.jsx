import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import prisma from "@/app/libs/prismaDB";

// Helper function to get user
async function getUser(session) {
  console.log("getUser called with session:", JSON.stringify(session));
  if (!session?.user?.email) {
    console.log("Unauthorized: No session email");
    throw new Error("Unauthorized");
  }
  console.log("Fetching user for email:", session.user.email);
  
  try {
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });
    
    console.log("User lookup result:", user ? "User found" : "User not found");
    
    if (!user) {
      console.log("User not found for email:", session.user.email);
      throw new Error("User not found");
    }
    
    return user;
  } catch (dbError) {
    console.error("Database error during user lookup:", dbError);
    throw new Error("Database error: " + dbError.message);
  }
}

// Handle POST request
export async function POST(req) {
  console.log("======= REACTION API CALLED =======");
  console.log("Request method:", req.method);
  console.log("Request headers:", Object.fromEntries([...req.headers]));
  
  try {
    // Get session
    console.log("Attempting to get server session...");
    let session;
    try {
      session = await getServerSession(authOptions);
      console.log("Session result:", session ? "Session found" : "No session");
    } catch (sessionError) {
      console.error("Error getting session:", sessionError);
      return new Response("Session error: " + sessionError.message, { status: 500 });
    }
    
    if (!session) {
      console.log("Unauthorized: No session found");
      return new Response("Unauthorized", { status: 401 });
    }

    // Parse request body
    console.log("Parsing request body...");
    let body;
    try {
      body = await req.json();
      console.log("Received data:", JSON.stringify(body));
    } catch (parseError) {
      console.error("Error parsing request body:", parseError);
      return new Response("Invalid JSON: " + parseError.message, { status: 400 });
    }
    
    const { entityId, entityType, type } = body;

    // Validate input
    console.log("Validating input...");
    console.log("entityId:", entityId, "entityType:", entityType, "type:", type);
    
    if (!entityId) {
      console.log("Missing entityId");
      return new Response("Missing entityId", { status: 400 });
    }
    
    if (!entityType) {
      console.log("Missing entityType");
      return new Response("Missing entityType", { status: 400 });
    }
    
    if (!type) {
      console.log("Missing reaction type");
      return new Response("Missing reaction type", { status: 400 });
    }
    
    if (!["like", "fire"].includes(type)) {
      console.log("Invalid reaction type:", type);
      return new Response("Invalid reaction type. Must be 'like' or 'fire'", { status: 400 });
    }

    // Get user
    console.log("Getting user from session...");
    let user;
    try {
      user = await getUser(session);
      console.log("User retrieved:", user.id);
    } catch (userError) {
      console.error("Error getting user:", userError);
      return new Response(userError.message, { 
        status: userError.message === "Unauthorized" ? 401 : 500 
      });
    }

    // Check entity type
    console.log("Checking entity type:", entityType);
    if (!["blog", "review"].includes(entityType)) {
      console.log("Invalid entity type:", entityType);
      return new Response("Invalid entity type. Must be 'blog' or 'review'", { status: 400 });
    }

    const reactionField = type === "like" ? "likes" : "fire";
    console.log("Reaction field to update:", reactionField);

    // Find entity
    console.log(`Fetching entity (${entityType}) with ID:`, entityId);
    let entity;
    try {
      entity = await prisma[entityType].findUnique({
        where: { id: entityId },
      });
      console.log("Entity lookup result:", entity ? "Entity found" : "Entity not found");
      
      if (entity) {
        console.log("Entity current values:", JSON.stringify({
          id: entity.id,
          likes: entity.likes,
          fire: entity.fire
        }));
      }
    } catch (entityError) {
      console.error(`Error fetching ${entityType}:`, entityError);
      return new Response(`Database error: ${entityError.message}`, { status: 500 });
    }

    if (!entity) {
      console.log(`Entity not found: ${entityType} ID:`, entityId);
      return new Response("Entity not found", { status: 404 });
    }

    // Check for existing reaction
    console.log("Checking if user already reacted...");
    console.log("Looking for reaction with:", {
      userId: user.id,
      entityId,
      entityType,
      reactionType: reactionField
    });
    
    let existingReaction;
    try {
      existingReaction = await prisma.entityReaction.findFirst({
        where: {
          userId: user.id,
          entityId,
          entityType,
          reactionType: reactionField,
        },
      });
      console.log("Existing reaction:", existingReaction ? "Found" : "Not found");
    } catch (reactionError) {
      console.error("Error checking for existing reaction:", reactionError);
      return new Response(`Database error: ${reactionError.message}`, { status: 500 });
    }

    let updatedEntity;
    
    // Toggle reaction
    if (existingReaction) {
      console.log("Removing existing reaction ID:", existingReaction.id);
      try {
        await prisma.entityReaction.delete({ where: { id: existingReaction.id } });
        console.log("Reaction deleted successfully");
      } catch (deleteError) {
        console.error("Error deleting reaction:", deleteError);
        return new Response(`Database error: ${deleteError.message}`, { status: 500 });
      }

      console.log(`Decreasing ${reactionField} count for entity ${entityId}`);
      console.log(`Current count: ${entity[reactionField] || 0}`);
      console.log(`New count will be: ${Math.max((entity[reactionField] || 0) - 1, 0)}`);
      
      try {
        updatedEntity = await prisma[entityType].update({
          where: { id: entityId },
          data: { [reactionField]: Math.max((entity[reactionField] || 0) - 1, 0) },
        });
        console.log("Entity updated after removing reaction:", JSON.stringify(updatedEntity));
      } catch (updateError) {
        console.error(`Error updating ${entityType} to decrease count:`, updateError);
        return new Response(`Database error: ${updateError.message}`, { status: 500 });
      }
    } else {
      console.log("Adding new reaction for user:", user.id);
      try {
        await prisma.entityReaction.create({
          data: {
            userId: user.id,
            entityId,
            entityType,
            reactionType: reactionField,
          },
        });
        console.log("Reaction created successfully");
      } catch (createError) {
        console.error("Error creating reaction:", createError);
        return new Response(`Database error: ${createError.message}`, { status: 500 });
      }

      console.log(`Increasing ${reactionField} count for entity ${entityId}`);
      console.log(`Current count: ${entity[reactionField] || 0}`);
      console.log(`New count will be: ${(entity[reactionField] || 0) + 1}`);
      
      try {
        updatedEntity = await prisma[entityType].update({
          where: { id: entityId },
          data: { [reactionField]: (entity[reactionField] || 0) + 1 },
        });
        console.log("Entity updated after adding reaction:", JSON.stringify(updatedEntity));
      } catch (updateError) {
        console.error(`Error updating ${entityType} to increase count:`, updateError);
        return new Response(`Database error: ${updateError.message}`, { status: 500 });
      }
    }

    console.log("Sending response with updated entity");
    return new Response(JSON.stringify(updatedEntity), { 
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error("Unhandled error in reaction API:", error);
    console.error("Error stack:", error.stack);
    return new Response(`Server error: ${error.message}`, {
      status: error.message === "Unauthorized" ? 401 : 500,
    });
  }
}