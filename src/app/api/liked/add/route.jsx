import { getAuthSession } from "@/app/api/auth/[...nextauth]/options";
import prisma from "@/app/libs/prismaDB";

export async function POST(req) {
    try {
        // Get session
        let session;
        try {
            session = await getAuthSession();
        } catch (error) {
            return new Response("Error getting session", { status: 500 });
        }

        if (!session || !session.user || !session.user.email) {
            console.log("Unauthorized request");
            return new Response("Unauthorized", { status: 401 });
        }

        // Parse and validate request body
        let body;
        try {
            body = await req.json();
            if (!body || typeof body !== "object") {
                throw new Error("Invalid request body");
            }
        } catch (error) {
            return new Response("Invalid request body", { status: 400 });
        }

        const { movieId, title, posterUrl } = body;

        if (!movieId || typeof movieId !== "string" || !title || typeof title !== "string") {
            return new Response("Missing or invalid data", { status: 400 });
        }

        // Fetch user by email
        let user;
        try {
            user = await prisma.user.findUnique({
                where: { email: session.user.email },
            });

            if (!user) {
                console.log("User not found");
                return new Response("User not found", { status: 404 });
            }
        } catch (error) {
            console.error("Error finding user:", error);
            return new Response("Error finding user", { status: 500 });
        }

        // Find or create movie
        let movie;
        try {
            movie = await prisma.movie.upsert({
                where: { tmdbId: movieId },
                update: {},
                create: {
                    tmdbId: movieId,
                    title,
                    posterUrl,
                },
            });
        } catch (error) {
            console.error("Error finding/creating movie:", error);
            return new Response("Error finding/creating movie", { status: 500 });
        }

        // Add to liked list in a transaction
        try {
            const newLikedItem = await prisma.$transaction(async (prisma) => {
                const likedItem = await prisma.liked.findUnique({
                    where: {
                        userId_movieId: {
                            userId: user.id,
                            movieId: movie.id,
                        },
                    },
                });

                if (likedItem) {
                    throw new Error("Movie already in liked list");
                }

                return await prisma.liked.create({
                    data: {
                        userId: user.id,
                        movieId: movie.id,
                    },
                });
            });

            return new Response(JSON.stringify(newLikedItem), { status: 201 });
        } catch (error) {
            if (error.message === "Movie already in liked list") {
                return new Response(error.message, { status: 409 });
            }
            console.error("Error adding to liked:", error);
            return new Response("Error adding to liked", { status: 500 });
        }
    } catch (error) {
        console.error("Unhandled error in POST function:", error);
        return new Response(`Internal Server Error: ${error.message}`, { status: 500 });
    }
}
