// lib/auth.ts
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/libs/auth_options";

export async function getCurrentUserId(): Promise<string | null> {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) return null;
  return session.user.id; // No TypeScript error!
}