import prisma from "@/app/api/auth/[...nextauth]/connect";
import { NextResponse } from "next/server";

export const GET = async (req, { params }) => {
  const { slug } = params; // Extract the dynamic segment

  try {
    const user = await prisma.user.findUnique({
      where: { id: slug }, // Match the user ID with the `slug`
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        // Add other fields as needed
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(user, { status: 200 });
  } catch (error) {
    console.error("Error fetching user:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
};
