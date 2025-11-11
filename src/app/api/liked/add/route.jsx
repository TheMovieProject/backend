// app/api/liked/add/route.js
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

    const { movieId, title, posterUrl } = body;
    if (!movieId || !title) {
      return new Response("Missing data", { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true }
    });
    if (!user) return new Response("User not found", { status: 404 });

    // Ensure Movie exists (tmdbId unique)
    let movie = await prisma.movie.findUnique({ where: { tmdbId: movieId } });
    if (!movie) {
      movie = await prisma.movie.create({
        data: { tmdbId: movieId, title, posterUrl: posterUrl ?? null }
      });
    } else if (!movie.posterUrl && posterUrl) {
      // backfill poster if we didn’t have one
      movie = await prisma.movie.update({
        where: { id: movie.id },
        data: { posterUrl }
      });
    }

    // Create the like (respect unique pair)
    const liked = await prisma.liked.upsert({
      where: { userId_movieId: { userId: user.id, movieId: movie.id } },
      create: { userId: user.id, movieId: movie.id },
      update: {} // already exists: no-op
    });

    return new Response(JSON.stringify({ ok: true, likedId: liked.id }), { status: 201 });
  } catch (err) {
    console.error("LIKED ADD ERR:", err);
    return new Response("Error adding to liked list", { status: 500 });
  }
}
