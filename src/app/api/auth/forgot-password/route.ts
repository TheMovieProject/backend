import { NextRequest, NextResponse } from "next/server";
import prisma from "@/app/libs/prismaDB";
import {
  getClientIp,
  isValidEmail,
  normalizeEmail,
  rateLimit,
} from "@/app/libs/auth_security";
import { sendPasswordResetEmail } from "@/app/libs/auth_emails";
import { AUTH_TOKEN_TYPE, issueAuthToken } from "@/app/libs/auth_tokens";

const GENERIC_MESSAGE =
  "If an account exists, password reset instructions have been sent.";

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const limiter = rateLimit(`auth:forgot-password:${ip}`, {
      windowMs: 10 * 60 * 1000,
      max: 8,
      blockMs: 30 * 60 * 1000,
    });

    if (!limiter.allowed) {
      return NextResponse.json(
        { ok: false, error: "Too many requests. Please try again later." },
        {
          status: 429,
          headers: {
            "Retry-After": String(limiter.retryAfterSec),
          },
        }
      );
    }

    const body = await req.json().catch(() => ({}));
    const email = normalizeEmail(body?.email);

    if (!email || !isValidEmail(email)) {
      return NextResponse.json({ ok: true, message: GENERIC_MESSAGE });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        email: true,
        name: true,
      },
    });

    if (!user) {
      return NextResponse.json({ ok: true, message: GENERIC_MESSAGE });
    }

    const { token } = await issueAuthToken({
      identifier: email,
      type: AUTH_TOKEN_TYPE.PASSWORD_RESET,
      ttlMinutes: 30,
    });

    await sendPasswordResetEmail(
      {
        email: user.email,
        name: user.name,
      },
      token
    );

    return NextResponse.json({ ok: true, message: GENERIC_MESSAGE });
  } catch {
    return NextResponse.json({ ok: true, message: GENERIC_MESSAGE });
  }
}
