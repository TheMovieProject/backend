// lib/auth-options.ts
import prisma from "@/app/libs/prismaDB";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import type { NextAuthOptions } from "next-auth";
import type { JWT } from "next-auth/jwt";
import bcrypt from "bcryptjs";
import {
  clearRateLimit,
  getClientIp,
  normalizeEmail,
  rateLimit,
  toNullableString,
} from "@/app/libs/auth_security";

const AUTH_SECRET = process.env.NEXTAUTH_SECRET ?? process.env.SECRET;
const DUMMY_PASSWORD_HASH = bcrypt.hashSync("invalid-auth-attempt", 12);
const SESSION_NAME_MAX_LENGTH = 80;
const SESSION_USERNAME_MAX_LENGTH = 20;
const SESSION_BIO_MAX_LENGTH = 500;
const SESSION_URL_MAX_LENGTH = 2000;
const SESSION_MOVIE_GENRES_LIMIT = 10;
const SESSION_MOVIE_GENRE_MAX_LENGTH = 40;

function toClampedNullableString(
  value: unknown,
  maxLength: number
): string | null {
  const normalized = toNullableString(value);
  if (!normalized) return null;
  return normalized.slice(0, maxLength);
}

function toSessionUrl(value: unknown): string | null {
  const raw = toNullableString(value);
  if (!raw) return null;
  if (raw.length > SESSION_URL_MAX_LENGTH) return null;
  if (raw.startsWith("data:")) return null;

  try {
    const parsed = new URL(raw);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
}

function toSessionMovieGenres(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  const seen = new Set<string>();
  const genres: string[] = [];

  for (const item of value) {
    if (typeof item !== "string") continue;

    const genre = item.trim().slice(0, SESSION_MOVIE_GENRE_MAX_LENGTH);
    if (!genre || seen.has(genre)) continue;

    seen.add(genre);
    genres.push(genre);

    if (genres.length >= SESSION_MOVIE_GENRES_LIMIT) break;
  }

  return genres;
}

function sanitizeJwtToken(token: JWT): JWT {
  const nextToken = {} as JWT;

  if (typeof token.sub === "string") nextToken.sub = token.sub;
  if (typeof token.iat === "number") nextToken.iat = token.iat;
  if (typeof token.exp === "number") nextToken.exp = token.exp;
  if (typeof token.jti === "string") nextToken.jti = token.jti;

  nextToken.id =
    typeof token.id === "string"
      ? token.id
      : typeof token.sub === "string"
      ? token.sub
      : "";
  nextToken.email = toClampedNullableString(token.email, 254);
  nextToken.name = toClampedNullableString(token.name, SESSION_NAME_MAX_LENGTH);
  nextToken.picture = toSessionUrl(token.picture);
  nextToken.username = toClampedNullableString(
    token.username,
    SESSION_USERNAME_MAX_LENGTH
  );
  nextToken.bio = toClampedNullableString(token.bio, SESSION_BIO_MAX_LENGTH);
  nextToken.avatarUrl = toSessionUrl(token.avatarUrl);
  nextToken.movieGenres = toSessionMovieGenres(token.movieGenres);

  return nextToken;
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, req) {
        const email = normalizeEmail(credentials?.email);
        const password =
          typeof credentials?.password === "string" ? credentials.password : "";

        if (!email || !password) {
          return null;
        }

        const ip = getClientIp(req as { headers?: unknown });
        const throttleKey = `auth:login:${ip}:${email}`;
        const throttle = rateLimit(throttleKey, {
          windowMs: 15 * 60 * 1000,
          max: 8,
          blockMs: 30 * 60 * 1000,
        });

        if (!throttle.allowed) {
          throw new Error("Too many login attempts. Please try again later.");
        }

        const user = await prisma.user.findUnique({
          where: { email },
          select: {
            id: true,
            email: true,
            name: true,
            password: true,
            emailVerified: true,
            username: true,
            bio: true,
            image: true,
            avatarUrl: true,
            movieGenres: true,
          },
        });

        if (!user?.password) {
          await bcrypt.compare(password, DUMMY_PASSWORD_HASH);
          return null;
        }

        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
          return null;
        }

        if (!user.emailVerified) {
          throw new Error("Please verify your email before logging in.");
        }

        clearRateLimit(throttleKey);

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          username: user.username,
          bio: user.bio,
          image: user.image,
          avatarUrl: user.avatarUrl,
          movieGenres: user.movieGenres ?? [],
        };
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      const email = normalizeEmail(user?.email);
      if (!email) return false;

      if (account?.provider === "google") {
        await prisma.user.updateMany({
          where: {
            email,
            emailVerified: null,
          },
          data: {
            emailVerified: new Date(),
          },
        });
      }

      return true;
    },
    async jwt({ token, user, trigger, session }) {
      const nextToken = sanitizeJwtToken(token);

      if (user) {
        if (typeof user.id === "string") {
          nextToken.id = user.id;
          nextToken.sub = user.id;
        }
        nextToken.email = toClampedNullableString(user.email, 254);
        nextToken.name = toClampedNullableString(user.name, SESSION_NAME_MAX_LENGTH);
        nextToken.picture = toSessionUrl(user.image);
        nextToken.username = toClampedNullableString(
          user.username,
          SESSION_USERNAME_MAX_LENGTH
        );
        nextToken.bio = toClampedNullableString(user.bio, SESSION_BIO_MAX_LENGTH);
        nextToken.avatarUrl = toSessionUrl(user.avatarUrl);
        nextToken.movieGenres = toSessionMovieGenres(user.movieGenres);
      }

      if (trigger === "update" && session?.user) {
        nextToken.username =
          toClampedNullableString(session.user.username, SESSION_USERNAME_MAX_LENGTH) ??
          nextToken.username ??
          null;
        nextToken.bio =
          toClampedNullableString(session.user.bio, SESSION_BIO_MAX_LENGTH) ??
          nextToken.bio ??
          null;
        nextToken.avatarUrl =
          toSessionUrl(session.user.avatarUrl) ?? nextToken.avatarUrl ?? null;
        nextToken.movieGenres = Array.isArray(session.user.movieGenres)
          ? toSessionMovieGenres(session.user.movieGenres)
          : nextToken.movieGenres ?? [];
      }

      return nextToken;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = typeof token.id === "string" ? token.id : "";
        session.user.email = toNullableString(token.email);
        session.user.name = toNullableString(token.name);
        session.user.image = toNullableString(token.picture);
        session.user.username = toNullableString(token.username);
        session.user.bio = toNullableString(token.bio);
        session.user.avatarUrl = toNullableString(token.avatarUrl);
        session.user.movieGenres = Array.isArray(token.movieGenres)
          ? token.movieGenres.filter(
              (genre: unknown): genre is string => typeof genre === "string"
            )
          : [];
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  secret: AUTH_SECRET,
  session: {
    strategy: "jwt",
    maxAge: 7 * 24 * 60 * 60,
    updateAge: 12 * 60 * 60,
  },
  debug: process.env.NODE_ENV === "development",
};
