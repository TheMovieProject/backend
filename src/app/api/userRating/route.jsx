import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import prisma from "@/app/libs/prismaDB";

// Helper function to get user
async function getUser(session) {
    if (!session || !session.user || !session.user.email) {
        throw new Error("Unauthorized");
    }
    const user = await prisma.user.findUnique({
        where: { email: session.user.email },
    });
    if (!user) throw new Error("User not found");
    return user;
}

// Helper function to get or create movie
async function getOrCreateMovie(tmdbId) {
    let movie = await prisma.movie.findUnique({
        where: { tmdbId: String(tmdbId) },
    });
    if (!movie) {
        movie = await prisma.movie.create({
            data: { tmdbId: tmdbId, title: "Unknown", posterUrl: "Unknown" },
        });
    }
    return movie;
}

// Handle GET request
export async function GET(req) {
    try {
        const url = new URL(req.url);
        const tmdbId = url.searchParams.get("movieId");

        if (!tmdbId) {
            return new Response("Missing movieId", { status: 400 });
        }

        const movie = await getOrCreateMovie(tmdbId);

        const ratings = await prisma.rating.findMany({
            where: { movieId: movie.id },
        });

        if (ratings.length === 0) {
            return new Response(JSON.stringify({ averageRating: 0, userRating: null }), { status: 200 });
        }

        const ratingCount = ratings.length;
        if (ratingCount === 0) {
            return new Response(JSON.stringify({ averageRating: 0, userRating: null, ratingCount }), { status: 200 });
        }

        const averageRating = ratings.reduce((sum, rating) => sum + rating.value, 0) / ratings.length;

        let userRating = null;
        const session = await getServerSession(authOptions);
        if (session) {
            const user = await getUser(session);
            const userRatingRecord = ratings.find(rating => rating.userId === user.id);
            userRating = userRatingRecord ? userRatingRecord.value : null;
        }

        return new Response(JSON.stringify({ averageRating, userRating , ratingCount }), { status: 200 });
    } catch (error) {
        console.error("Error in GET function:", error);
        return new Response(error.message, { status: error.message === "Unauthorized" ? 401 : 500 });
    }
}

// Handle POST request
export async function POST(req) {
    try {
        const session = await getServerSession(authOptions);
        const user = await getUser(session);

        const body = await req.json();
        const { movieId: tmdbId, value } = body;

        if (!tmdbId || typeof value !== 'number') {
            return new Response("Missing or invalid data", { status: 400 });
        }

        const movie = await getOrCreateMovie(tmdbId);

        const rating = await prisma.rating.upsert({
            where: {
                userId_movieId: {
                    userId: user.id,
                    movieId: movie.id,
                },
            },
            update: {
                value,
                updatedAt: new Date(),
            },
            create: {
                userId: user.id,
                movieId: movie.id,
                value,
                createdAt: new Date(),
                updatedAt: new Date(),
            },
        });

        return new Response(JSON.stringify(rating), { status: 201 });
    } catch (error) {
        console.error("Error in POST function:", error);
        return new Response(error.message, { status: error.message === "Unauthorized" ? 401 : 500 });
    }
}