import { getAuthSession } from "@/app/api/auth/[...nextauth]/options";
import prisma from "@/app/libs/prismaDB";
import LikedListClient from "@/app/components/LikedListClient/LikedListClient";

export default async function LikedPages() {
  const session = await getAuthSession();

  // Handle unauthenticated user
  if (!session) {
    return <p>You need to log in to view your liked movies.</p>;
  }

  // Find user by email
  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  });

  // Handle missing user
  if (!user) {
    return <p>User not found. Please log in again.</p>;
  }

  // Fetch liked movies with movie details
  const likedList = await prisma.liked.findMany({
    where: { userId: user.id },
    include: {
        movie: true,
    },
  })

  // Render the client component with the initial liked list
  return <LikedListClient initialLikedList={likedList} />;
}