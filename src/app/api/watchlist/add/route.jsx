import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import prisma from "@/app/libs/prismaDB";
import { ensureDefaultCollection, resolveMovie } from "@/app/libs/watchlist_collections";

export async function POST(req) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return new Response("Unauthorized", { status: 401 });
 
  const { movieId, title, posterUrl, listId } = await req.json();
  if (!movieId || !title) return new Response("Missing data", { status: 400 });

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  });
  if (!user) return new Response("User not found", { status: 404 });

  const movie = await resolveMovie({
    movieId: String(movieId),
    title,
    posterUrl,
  });

  const defaultCollection = await ensureDefaultCollection(user.id);

  let targetCollectionId = defaultCollection.id;
  if (listId && typeof listId === "string") {
    const ownedList = await prisma.watchlist.findUnique({
      where: { id: listId },
      select: { id: true, ownerId: true },
    });
    if (ownedList?.ownerId === user.id) {
      targetCollectionId = ownedList.id;
    }
  }

  try {
    const [watchlistItem, collectionItem] = await prisma.$transaction([
      prisma.legacyWatchlist.upsert({
        where: {
          userId_movieId: {
            userId: user.id,
            movieId: movie.id,
          },
        },
        update: {},
        create: {
          userId: user.id,
          movieId: movie.id,
        },
      }),
      prisma.watchlistItem.upsert({
        where: {
          watchlistId_movieId: {
            watchlistId: targetCollectionId,
            movieId: movie.id,
          },
        },
        update: {},
        create: {
          watchlistId: targetCollectionId,
          movieId: movie.id,
        },
      }),
    ]);

    return new Response(
      JSON.stringify({
        ...watchlistItem,
        collectionItem,
        listId: targetCollectionId,
      }),
      { status: 201 }
    );
  } catch (e) {
    // unique constraint violation => already in watchlist
    if (e?.code === "P2002") {
      return new Response("Movie already in watchlist", { status: 409 });
    }
    console.error(e);
    return new Response("Error adding to watchlist", { status: 500 });
  }
}
