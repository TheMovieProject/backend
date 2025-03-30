import { NextResponse } from "next/server";
import prisma from "@/app/api/auth/[...nextauth]/connect"; // Adjust based on your Prisma setup

// ✅ Fetch comments for a blog post
export async function GET(req) {
  console.log("====== COMMENT API - GET REQUEST ======");
  console.log("Request URL:", req.url);
  console.log("Request method:", req.method);
  console.log("Request headers:", Object.fromEntries([...req.headers]));
  
  try {
    console.log("Parsing search parameters...");
    const { searchParams } = new URL(req.url);
    const blogId = searchParams.get("blogId");
    console.log("Requested blogId:", blogId);
    
    if (!blogId) {
      console.log("Error: Blog ID is missing");
      return NextResponse.json({ error: "Blog ID is required" }, { status: 400 });
    }
    
    console.log("Fetching comments for blog:", blogId);
    try {
      const comments = await prisma.blogComment.findMany({
        where: { blogId },
        include: { user: { select: { name: true, email: true, username:true , avatarUrl: true } } },
        orderBy: { createdAt: "desc" },
      });
      
      console.log(`Found ${comments.length} comments`);
      console.log("Comment IDs:", comments.map(c => c.id));
      
      return NextResponse.json(comments);
    } catch (dbError) {
      console.error("Database error while fetching comments:", dbError);
      console.error("Error details:", JSON.stringify(dbError, null, 2));
      return NextResponse.json({ error: `Database error: ${dbError.message}` }, { status: 500 });
    }
  } catch (error) {
    console.error("Error fetching comments:", error);
    console.error("Error stack:", error.stack);
    return NextResponse.json({ error: "Failed to load comments" }, { status: 500 });
  }
}

// ✅ Post a new comment
export async function POST(req) {
  console.log("====== COMMENT API - POST REQUEST ======");
  console.log("Request URL:", req.url);
  console.log("Request method:", req.method);
  console.log("Request headers:", Object.fromEntries([...req.headers]));
  
  try {
    console.log("Parsing request body...");
    let body;
    try {
      body = await req.json();
      console.log("Request body:", JSON.stringify(body, null, 2));
    } catch (parseError) {
      console.error("Error parsing request body:", parseError);
      return NextResponse.json({ error: "Invalid JSON in request body" }, { status: 400 });
    }
    
    const { content, userId, blogId } = body;
    
    // Validate required fields
    console.log("Validating required fields...");
    console.log("Content:", content ? "Present" : "Missing");
    console.log("User ID:", userId ? userId : "Missing");
    console.log("Blog ID:", blogId ? blogId : "Missing");
    
    if (!content) {
      console.log("Error: Missing content");
      return NextResponse.json({ error: "Comment content is required" }, { status: 400 });
    }
    
    if (!userId) {
      console.log("Error: Missing userId");
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }
    
    if (!blogId) {
      console.log("Error: Missing blogId");
      return NextResponse.json({ error: "Blog ID is required" }, { status: 400 });
    }
    
    // Check if the user exists
    console.log("Checking if user exists...");
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId }
      });
      
      if (!user) {
        console.log(`Error: User with ID ${userId} not found`);
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }
      
      console.log("User found:", user.id);
    } catch (userError) {
      console.error("Error checking user:", userError);
      return NextResponse.json({ error: `Error checking user: ${userError.message}` }, { status: 500 });
    }
    
    // Check if the blog exists
    console.log("Checking if blog exists...");
    try {
      const blog = await prisma.blog.findUnique({
        where: { id: blogId }
      });
      
      if (!blog) {
        console.log(`Error: Blog with ID ${blogId} not found`);
        return NextResponse.json({ error: "Blog not found" }, { status: 404 });
      }
      
      console.log("Blog found:", blog.id);
    } catch (blogError) {
      console.error("Error checking blog:", blogError);
      return NextResponse.json({ error: `Error checking blog: ${blogError.message}` }, { status: 500 });
    }
    
    // Detect tagged users
    console.log("Detecting tagged users in content...");
    try {
      // Extract usernames from content
      const taggedUsernames = content.match(/@(\w+)/g)?.map(tag => tag.substring(1)) || [];
      
      // Convert usernames to user IDs
      const taggedUsers = await prisma.user.findMany({
        where: {
          username: { in: taggedUsernames }
        },
        select: { id: true }
      });
      
      // Create the comment with tagged users
      const newComment = await prisma.blogComment.create({
        data: {
          content,
          userId,
          blogId,
          taggedUsers: taggedUsers.map(user => user.id), // Store ObjectIds
        },
        include: {
          user: true
        }
      });
      
      console.log("Comment created successfully:", newComment.id);
      console.log("New comment data:", JSON.stringify(newComment, null, 2));
      
      return NextResponse.json(newComment);
    } catch (createError) {
      console.error("Error creating comment:", createError);
      console.error("Error details:", JSON.stringify(createError, null, 2));
      return NextResponse.json({ 
        error: `Failed to create comment: ${createError.message}`,
        details: createError
      }, { status: 500 });
    }
  } catch (error) {
    console.error("Unhandled error in comment API:", error);
    console.error("Error stack:", error.stack);
    return NextResponse.json({ 
      error: "Failed to post comment", 
      message: error.message 
    }, { status: 500 });
  }
}