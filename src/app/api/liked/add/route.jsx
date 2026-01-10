// app/api/liked/add/route.js
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import prisma from "@/app/libs/prismaDB";
export async function POST(req) {
  try {
   const session = await getServerSession(authOptions);
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

    const tmdbId = String(movieId);

    // Ensure Movie exists (tmdbId unique)
     // create OR update the movie so you never stay stuck with "unknown"
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
