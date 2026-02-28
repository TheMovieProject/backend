import crypto from "crypto";
import prisma from "@/app/libs/prismaDB";
import { normalizeEmail } from "@/app/libs/auth_security";

export const AUTH_TOKEN_TYPE = {
  EMAIL_VERIFICATION: "email_verification",
  PASSWORD_RESET: "password_reset",
} as const;

export type AuthTokenType = (typeof AUTH_TOKEN_TYPE)[keyof typeof AUTH_TOKEN_TYPE];

type IssueAuthTokenInput = {
  identifier: string;
  type: AuthTokenType;
  ttlMinutes: number;
};

type ConsumeAuthTokenInput = {
  identifier: string;
  type: AuthTokenType;
  token: string;
};

function hashToken(rawToken: string): string {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
}

function normalizeIdentifier(identifier: string): string {
  return normalizeEmail(identifier);
}

export async function issueAuthToken({
  identifier,
  type,
  ttlMinutes,
}: IssueAuthTokenInput): Promise<{ token: string; expiresAt: Date }> {
  const normalizedIdentifier = normalizeIdentifier(identifier);
  const token = crypto.randomBytes(32).toString("base64url");
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);

  await prisma.authToken.deleteMany({
    where: {
      identifier: normalizedIdentifier,
      type,
      consumedAt: null,
    },
  });

  await prisma.authToken.create({
    data: {
      identifier: normalizedIdentifier,
      type,
      tokenHash,
      expiresAt,
    },
  });

  return { token, expiresAt };
}

export async function consumeAuthToken({
  identifier,
  type,
  token,
}: ConsumeAuthTokenInput): Promise<{ id: string; identifier: string } | null> {
  const normalizedIdentifier = normalizeIdentifier(identifier);
  const tokenHash = hashToken(token);
  const now = new Date();

  const existing = await prisma.authToken.findFirst({
    where: {
      identifier: normalizedIdentifier,
      type,
      tokenHash,
      consumedAt: null,
      expiresAt: {
        gt: now,
      },
    },
    select: {
      id: true,
      identifier: true,
    },
  });

  if (!existing) {
    return null;
  }

  await prisma.authToken.update({
    where: {
      id: existing.id,
    },
    data: {
      consumedAt: now,
    },
  });

  return existing;
}

export async function revokeAuthTokens(
  identifier: string,
  type: AuthTokenType
): Promise<void> {
  const normalizedIdentifier = normalizeIdentifier(identifier);
  await prisma.authToken.deleteMany({
    where: {
      identifier: normalizedIdentifier,
      type,
    },
  });
}
