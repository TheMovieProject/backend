// app/api/liked/remove/route.js
import prisma from "@/app/libs/prismaDB";
import { getAuthSession } from "@/app/api/auth/[...nextauth]/options";

export async function POST(req) {
  try {
    const session = await getAuthSession().catch(() => null);
    if (!session?.user?.email) {
      return new Response("Unauthorized", { status: 401 });
    }

    const body = await req.json().catch(() => null);
    if (!body) return new Response("Invalid JSON", { status: 400 });

    const { movieId } = body; // this is tmdbId from client
    if (!movieId) return new Response("Missing movieId", { status: 400 });

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true }
    });
    if (!user) return new Response("User not found", { status: 404 });

    const movie = await prisma.movie.findUnique({ where: { tmdbId: movieId } });
    if (!movie) {
      // nothing to remove
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    }

    await prisma.liked.deleteMany({
      where: { userId: user.id, movieId: movie.id }
    });

    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  } catch (err) {
    console.error("LIKED REMOVE ERR:", err);
    return new Response("Error removing from liked list", { status: 500 });
  }
}
