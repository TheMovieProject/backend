import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import prisma from "@/app/libs/prismaDB";
import { resolveMovie } from "@/app/libs/watchlist_collections";

async function getCurrentUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return null;
  return prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  });
}

async function getOwnedCollection(collectionId: string, userId: string) {
  const collection = await prisma.watchlist.findUnique({
    where: { id: collectionId },
    select: { id: true, ownerId: true },
  });
  if (!collection || collection.ownerId !== userId) return null;
  return collection;
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const me = await getCurrentUser();
    if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const list = await getOwnedCollection(params.id, me.id);
    if (!list) return NextResponse.json({ error: "List not found" }, { status: 404 });

    const body = await req.json().catch(() => ({}));
    const movieId = typeof body?.movieId === "string" ? body.movieId : String(body?.movieId || "");
    const title = typeof body?.title === "string" ? body.title : null;
    const posterUrl = typeof body?.posterUrl === "string" ? body.posterUrl : null;

    if (!movieId) return NextResponse.json({ error: "movieId required" }, { status: 400 });

    const movie = await resolveMovie({ movieId, title, posterUrl });

    const created = await prisma.watchlistItem.upsert({
      where: {
        watchlistId_movieId: {
          watchlistId: list.id,
          movieId: movie.id,
        },
      },
      update: {},
      create: {
        watchlistId: list.id,
        movieId: movie.id,
      },
      include: { movie: true },
    });

    return NextResponse.json({ ok: true, item: created }, { status: 201 });
  } catch (error) {
    console.error("POST /api/watchlist/lists/[id]/items error", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const me = await getCurrentUser();
    if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const list = await getOwnedCollection(params.id, me.id);
    if (!list) return NextResponse.json({ error: "List not found" }, { status: 404 });

    const body = await req.json().catch(() => ({}));
    const movieIdRaw = body?.movieId;
    if (!movieIdRaw) return NextResponse.json({ error: "movieId required" }, { status: 400 });
    const movieId = String(movieIdRaw);

    const movie = /^[a-f\d]{24}$/i.test(movieId)
      ? await prisma.movie.findUnique({ where: { id: movieId }, select: { id: true } })
      : await prisma.movie.findUnique({ where: { tmdbId: movieId }, select: { id: true } });

    if (!movie) return NextResponse.json({ ok: true, deleted: 0 });

    const deleted = await prisma.watchlistItem.deleteMany({
      where: {
        watchlistId: list.id,
        movieId: movie.id,
      },
    });

    return NextResponse.json({ ok: true, deleted: deleted.count });
  } catch (error) {
    console.error("DELETE /api/watchlist/lists/[id]/items error", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
