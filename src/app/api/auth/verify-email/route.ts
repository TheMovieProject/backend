import { NextRequest, NextResponse } from "next/server";
import prisma from "@/app/libs/prismaDB";
import { isValidEmail, normalizeEmail } from "@/app/libs/auth_security";
import { AUTH_TOKEN_TYPE, consumeAuthToken, revokeAuthTokens } from "@/app/libs/auth_tokens";

function loginRedirect(req: NextRequest, verified: "0" | "1", email?: string) {
  const url = new URL("/login", req.url);
  url.searchParams.set("verified", verified);
  if (email) {
    url.searchParams.set("email", email);
  }
  return NextResponse.redirect(url);
}

export async function GET(req: NextRequest) {
  try {
    const token = req.nextUrl.searchParams.get("token") ?? "";
    const email = normalizeEmail(req.nextUrl.searchParams.get("email"));

    if (!token || !email || !isValidEmail(email)) {
      return loginRedirect(req, "0");
    }

    const consumed = await consumeAuthToken({
      identifier: email,
      type: AUTH_TOKEN_TYPE.EMAIL_VERIFICATION,
      token,
    });

    if (!consumed) {
      return loginRedirect(req, "0", email);
    }

    await prisma.user.updateMany({
      where: {
        email,
      },
      data: {
        emailVerified: new Date(),
      },
    });

    await revokeAuthTokens(email, AUTH_TOKEN_TYPE.EMAIL_VERIFICATION);
    return loginRedirect(req, "1", email);
  } catch {
    return loginRedirect(req, "0");
  }
}
