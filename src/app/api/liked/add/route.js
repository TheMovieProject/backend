import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import prisma from "@/app/libs/prismaDB";

export async function POST(req) {
   try {
    let session;
    try {
        session = await getServerSession(authOptions);
    } catch (error) {
      return new Response("Error getting session", { status: 500 });
    }

    if (!session || !session.user || !session.user.email) {
        console.log("No session found or user email missing");
    }

    let body;
    try {
        body = await req.json();
    } catch (error) {
        return new Response("Error parsing request body", { status: 400 });
    }

    const { movieId, title, posterUrl } = body;

    if (!movieId || !title) {
        console.log("Missing data");
        return new Response("Missing data", { status: 400 });
    }

    // Fetch user ID using the email
    let user;
    try {
        user = await prisma.user.findUnique({
            where: {
                email: session.user.email,
            },
        });
        if (!user) {
            console.log("User not found");
            return new Response("User not found", { status: 404 });
        }
    } catch (error) {
        console.error("Error finding user:", error);
        return new Response("Error finding user", { status: 500 });
    }

    let movie;
        try {
            console.log("Searching for movie with tmdbId:", movieId);
            movie = await prisma.movie.findUnique({ where: { tmdbId: movieId } });
            console.log("Found movie:", movie);

            if (!movie) {
                console.log("Movie not found, creating new movie");
                movie = await prisma.movie.create({
                    data: {
                        tmdbId: movieId,
                        title,
                        posterUrl,
                    },
                });
                console.log("Created movie:", movie);
            }
        } catch (error) {
            console.error("Error finding/creating movie:", error);
            return new Response("Error finding/creating movie", { status: 500 });
        }

        try {
            console.log("Adding movie to liked list for user:", user.id);
            const likedItem = await prisma.liked.create({
                data: {
                    userId: user.id,
                    movieId: movie.id,
                },
            });
            if(likedItem.count > 0){
                return new Response("Movie already in liked list", { status: 404 });
            }
            return new Response(JSON.stringify(likedItem), { status: 201 });
        } catch (error) {
            console.error("Error adding to likedlist:", error);
            return new Response("Error adding to likedlist", { status: 500 });
        }

   } catch (error) {
    console.error("Unhandled error in POST function:", error);
    return new Response(`Internal Server Error: ${error.message}`, { status: 500 });
   }
}
