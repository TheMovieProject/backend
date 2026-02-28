import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import prisma from "@/app/libs/prismaDB";
import { ensureDefaultCollection } from "@/app/libs/watchlist_collections";


export async function GET(req) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return Response.json({ inWatchlist: false});
  }

  const url = new URL(req.url);
  const tmdbId = url.searchParams.get("movieId");
  if (!tmdbId) return new Response("movieId required", { status: 400 });

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  });
  if (!user) return Response.json({ inWatchlist: false });

  const movie = await prisma.movie.findUnique({
    where: { tmdbId: String(tmdbId) },
    select: { id: true },
  });

  if (!movie) return Response.json({ inWatchlist: false });

  const defaultCollection = await ensureDefaultCollection(user.id);

  const [legacy, collectionEntry] = await Promise.all([
    prisma.legacyWatchlist.findUnique({
      where: {
        userId_movieId: { userId: user.id, movieId: movie.id },
      },
      select: { id: true },
    }),
    prisma.watchlistItem.findUnique({
      where: {
        watchlistId_movieId: {
          watchlistId: defaultCollection.id,
          movieId: movie.id,
        },
      },
      select: { id: true },
    }),
  ]);

  return Response.json({ inWatchlist: !!legacy || !!collectionEntry });
}
