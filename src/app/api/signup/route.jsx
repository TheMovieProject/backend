import bcrypt from 'bcryptjs';
import prisma from '../../libs/prismaDB';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const body = await request.json();
    const { email, name, username, password , bio , avatarUrl } = body;

    // Validate input fields
    if (!name || !email || !password) {
      return NextResponse.json({ error: "Missing field" }, { status: 400 });
    }

    // Check if the user already exists
    const existingUser = await prisma.user.findUnique({
      where: {
        email:email, // Assuming email is unique
      },
    });

    if (existingUser) {
      return NextResponse.json({ error: "User already exists" }, { status: 400 });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create a new user
    const user = await prisma.user.create({
      data: {
        name,
        email,
        username,
        password: hashedPassword,
        bio,
        avatarUrl
      },
    });

    return NextResponse.json(user);
  } catch (error) {
    // Handle any errors that occur
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
