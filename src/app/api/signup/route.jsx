import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import prisma from "@/app/libs/prismaDB";
import { NextResponse } from "next/server";
import {
  getClientIp,
  isValidEmail,
  normalizeEmail,
  normalizeUsername,
  rateLimit,
  sanitizeAvatarUrl,
  sanitizeBio,
  sanitizeName,
  validatePasswordStrength,
} from "@/app/libs/auth_security";
import { sendVerificationEmail } from "@/app/libs/auth_emails";
import { AUTH_TOKEN_TYPE, issueAuthToken } from "@/app/libs/auth_tokens";

export async function POST(request) {
  try {
    const ip = getClientIp(request);
    const limiter = rateLimit(`auth:signup:${ip}`, {
      windowMs: 10 * 60 * 1000,
      max: 6,
      blockMs: 30 * 60 * 1000,
    });

    if (!limiter.allowed) {
      return NextResponse.json(
        { error: "Too many signup attempts. Please try again later." },
        {
          status: 429,
          headers: {
            "Retry-After": String(limiter.retryAfterSec),
          },
        }
      );
    }

    const body = await request.json();
    const email = normalizeEmail(body?.email);
    const name = sanitizeName(body?.name);
    const username = normalizeUsername(body?.username);
    const password = typeof body?.password === "string" ? body.password : "";
    const bio = sanitizeBio(body?.bio);
    const avatarUrl = sanitizeAvatarUrl(body?.avatarUrl);

    if (!name || !email || !password) {
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
    }

    if (!isValidEmail(email)) {
      return NextResponse.json({ error: "Please provide a valid email." }, { status: 400 });
    }

    if (!username) {
      return NextResponse.json(
        { error: "Username must be 3-20 chars using a-z, 0-9, underscore or dot." },
        { status: 400 }
      );
    }

    const passwordError = validatePasswordStrength(password);
    if (passwordError) {
      return NextResponse.json({ error: passwordError }, { status: 400 });
    }

    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email }, { username }],
      },
      select: {
        id: true,
      },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "Email or username is already in use." },
        { status: 409 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        username,
        password: hashedPassword,
        bio,
        avatarUrl,
      },
      select: {
        id: true,
        email: true,
        name: true,
        username: true,
        avatarUrl: true,
      },
    });

    let verificationSent = false;
    try {
      const { token } = await issueAuthToken({
        identifier: email,
        type: AUTH_TOKEN_TYPE.EMAIL_VERIFICATION,
        ttlMinutes: 60,
      });

      await sendVerificationEmail(
        {
          email: user.email,
          name: user.name,
        },
        token
      );
      verificationSent = true;
    } catch (mailError) {
      console.error("Verification email delivery failed", mailError);
    }

    return NextResponse.json(
      {
        ok: true,
        user,
        verificationSent,
        message: verificationSent
          ? "Account created. Please verify your email before logging in."
          : "Account created. Please request a new verification email on login.",
      },
      { status: 201 }
    );
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "Email or username is already in use." },
        { status: 409 }
      );
    }

    return NextResponse.json({ error: "Unable to create account." }, { status: 500 });
  }
}
