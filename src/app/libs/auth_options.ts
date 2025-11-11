// lib/auth-options.ts
import prisma from "@/app/libs/prismaDB";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import type { NextAuthOptions } from "next-auth";
import bcrypt from "bcryptjs";

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
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Please enter an email and password");
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });
        if (!user || !user.password) {
          throw new Error("No user found");
        }

        const ok = await bcrypt.compare(credentials.password, user.password);
        if (!ok) {
          throw new Error("Incorrect password");
        }
        return user; // must return a plain object; Prisma returns one
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = (user as any).id;
        token.email = user.email ?? null;
        token.username = (user as any).username ?? null;
        token.bio = (user as any).bio ?? null;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id as string;
        session.user.email = (token.email as string) ?? null;
        (session.user as any).username = (token as any).username ?? null;
        (session.user as any).bio = (token as any).bio ?? null;
      }
      return session;
    },
  },
  secret: process.env.SECRET,
  session: { strategy: "jwt" },
  debug: process.env.NODE_ENV === "development",
};
