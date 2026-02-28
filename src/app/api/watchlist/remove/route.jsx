import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import prisma from "@/app/libs/prismaDB";
import { ensureDefaultCollection } from "@/app/libs/watchlist_collections";

const isObjectId = (v) => typeof v === "string" && /^[a-f\d]{24}$/i.test(v);

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return new Response("Unauthorized", { status: 401 });

    const body = await req.json().catch(() => null);
    const movieIdRaw = body?.movieId;
    const listId = typeof body?.listId === "string" ? body.listId : null;
    if (!movieIdRaw) return new Response("movieId required", { status: 400 });

    const movieId = String(movieIdRaw);

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    });
    if (!user) return new Response("User not found", { status: 404 });

    // ✅ If client sends DB ObjectId, use it directly.
    // ✅ Else treat it as tmdbId.
    const movie = isObjectId(movieId)
      ? await prisma.movie.findUnique({ where: { id: movieId }, select: { id: true } })
      : await prisma.movie.findUnique({ where: { tmdbId: movieId }, select: { id: true } });

    if (!movie) return new Response("Movie not found", { status: 404 });

    const defaultCollection = await ensureDefaultCollection(user.id);
    let targetCollectionId = defaultCollection.id;

    if (listId) {
      const ownedList = await prisma.watchlist.findUnique({
        where: { id: listId },
        select: { id: true, ownerId: true },
      });
      if (ownedList?.ownerId === user.id) {
        targetCollectionId = ownedList.id;
      }
    }

    await prisma.watchlistItem.deleteMany({
      where: { watchlistId: targetCollectionId, movieId: movie.id },
    });

    if (targetCollectionId === defaultCollection.id) {
      await prisma.legacyWatchlist.deleteMany({
        where: { userId: user.id, movieId: movie.id },
      });
    }

    return new Response("Movie removed from watchlist", { status: 200 });
  } catch (error) {
    console.error("Error removing movie from watchlist:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
