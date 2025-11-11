// app/api/auth/[...nextauth]/options.ts
import { getServerSession} from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import prisma from "@/app/libs/prismaDB";
import bcrypt from "bcryptjs";

export const authOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    }),
    CredentialsProvider({
      name: "credentials",
      credentials: {
        name: { label: "Name", type: "text" },
        email: { label: "Email", type: "text" },
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) throw new Error("Please enter an email and password");
        const user = await prisma.user.findUnique({ where: { email: credentials.email } });
        if (!user || !user.password) throw new Error("No user found");
        const ok = await bcrypt.compare(credentials.password, user.password);
        if (!ok) throw new Error("Incorrect password");
        return user;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = (user).id;
        token.email = user.email;
        token.username = (user).username ?? null;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user).id = token.id;
        (session.user).username = (token).username ?? null;
        session.user.email = token.email;
      }
      return session;
    },
  },
  secret: process.env.SECRET,
  session: { strategy: "jwt" }, // <- correct type
  debug: process.env.NODE_ENV === "development",
};

export const getAuthSession = () => getServerSession(authOptions);
// export { authOptions };