import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import prisma from "@/app/libs/prismaDB";

const isObjectId = (v) => typeof v === "string" && /^[a-f\d]{24}$/i.test(v);

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return new Response("Unauthorized", { status: 401 });

    const body = await req.json().catch(() => null);
    const movieIdRaw = body?.movieId;
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

    await prisma.watchlist.deleteMany({
      where: { userId: user.id, movieId: movie.id },
    });

    return new Response("Movie removed from watchlist", { status: 200 });
  } catch (error) {
    console.error("Error removing movie from watchlist:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
