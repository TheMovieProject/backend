import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/app/libs/prismaDB";
import {
  getClientIp,
  isValidEmail,
  normalizeEmail,
  rateLimit,
  validatePasswordStrength,
} from "@/app/libs/auth_security";
import { AUTH_TOKEN_TYPE, consumeAuthToken, revokeAuthTokens } from "@/app/libs/auth_tokens";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const email = normalizeEmail(body?.email);
    const token = typeof body?.token === "string" ? body.token : "";
    const password = typeof body?.password === "string" ? body.password : "";

    const ip = getClientIp(req);
    const limiter = rateLimit(`auth:reset-password:${ip}:${email}`, {
      windowMs: 10 * 60 * 1000,
      max: 12,
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

    if (!email || !token || !isValidEmail(email)) {
      return NextResponse.json(
        { ok: false, error: "Invalid or expired reset link." },
        { status: 400 }
      );
    }

    const passwordError = validatePasswordStrength(password);
    if (passwordError) {
      return NextResponse.json({ ok: false, error: passwordError }, { status: 400 });
    }

    const consumed = await consumeAuthToken({
      identifier: email,
      type: AUTH_TOKEN_TYPE.PASSWORD_RESET,
      token,
    });

    if (!consumed) {
      return NextResponse.json(
        { ok: false, error: "Invalid or expired reset link." },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const updated = await prisma.user.updateMany({
      where: {
        email,
      },
      data: {
        password: hashedPassword,
      },
    });

    if (!updated.count) {
      return NextResponse.json(
        { ok: false, error: "Invalid or expired reset link." },
        { status: 400 }
      );
    }

    await revokeAuthTokens(email, AUTH_TOKEN_TYPE.PASSWORD_RESET);

    return NextResponse.json({
      ok: true,
      message: "Password has been reset successfully.",
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Unable to reset password." },
      { status: 500 }
    );
  }
}
