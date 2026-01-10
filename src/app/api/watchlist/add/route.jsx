import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import prisma from "@/app/libs/prismaDB";

export async function POST(req) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return new Response("Unauthorized", { status: 401 });
 
  const { movieId, title, posterUrl } = await req.json();
  if (!movieId || !title) return new Response("Missing data", { status: 400 });

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  });
  if (!user) return new Response("User not found", { status: 404 });

  // normalize tmdbId (your schema expects String)
  const tmdbId = String(movieId);

  
  const movie = await prisma.movie.upsert({
    where: { tmdbId },
    update: {
      // only overwrite if incoming has value (optional)
      title: title || undefined,
      posterUrl: posterUrl ?? undefined,
    },
    create: {
      tmdbId,
      title,
      posterUrl: posterUrl ?? null,
    },
  });

  try {
    const watchlistItem = await prisma.watchlist.create({
      data: { userId: user.id, movieId: movie.id },
    });
    return new Response(JSON.stringify(watchlistItem), { status: 201 });
  } catch (e) {
    // unique constraint violation => already in watchlist
    if (e?.code === "P2002") {
      return new Response("Movie already in watchlist", { status: 409 });
    }
    console.error(e);
    return new Response("Error adding to watchlist", { status: 500 });
  }
}
