// lib/auth.ts
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/libs/auth_options"; // your NextAuth config

export async function getCurrentUserId(req: Request){
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) return null;
  return session.user.id as string;
}
