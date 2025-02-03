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
    if (!user) {
        throw new Error("User not found");
    }
    return user;
}

// Helper function to get or create movie
async function getOrCreateMovie(tmdbId) {
    let movie = await prisma.movie.findUnique({
        where: { tmdbId },
    });
    if (!movie) {
        movie = await prisma.movie.create({
            data: { tmdbId, title: "Unknown", posterUrl: "Unknown" },
        });
    }
    return movie;
}

// Handle GET request
export async function GET(req) {
    try {
        const url = new URL(req.url);
        const tmdbId = url.searchParams.get("movieId");
        const userEmail = url.searchParams.get("userEmail");
        const userId = url.searchParams.get("userId");

        // Build filters dynamically
        const filters = {};
        if (tmdbId) {
            const movie = await getOrCreateMovie(tmdbId);
            filters.movieId = movie.id;
        }
        if (userEmail) {
            filters.user = { email: userEmail }; // Use nested filtering for user's email
        }
        if (userId) {
            filters.userId = userId; // Add direct userId filter
        }

        if (Object.keys(filters).length === 0) {
            return new Response("Missing filter parameters", { status: 400 });
        }

        // Fetch reviews with user data
        const reviews = await prisma.review.findMany({
            where: filters,
            include: {
                user: true,
                movie: true,
            },
        });

        return new Response(JSON.stringify(reviews), { status: 200 });
    } catch (error) {
        console.error("Error in GET function:", error);
        return new Response(error.message, { status: error.message === "Unauthorized" ? 401 : 500 });
    }
}

// Handle POST request
export async function POST(req) {
    try {
        // Fetch session and user
        const session = await getServerSession(authOptions); 
        const user = await getUser(session);

        // Parse request body
        const body = await req.json();
        const { movieId: tmdbId, reviewText } = body;

        if (!tmdbId || typeof reviewText !== "string") {
            return new Response("Missing or invalid data", { status: 400 });
        }

        // Get or create movie
        const movie = await getOrCreateMovie(tmdbId);

        // Check for existing review
        const existingReview = await prisma.review.findFirst({
            where: {
                user: { email: user.email },
                movieId: movie.id,
            },
        });

        let review;
        if (existingReview) {
            // Update existing review
            review = await prisma.review.update({
                where: { id: existingReview.id },
                data: { content: reviewText, updatedAt: new Date() },
            });
        } else {
            // Create new review
            review = await prisma.review.create({
                data: {
                    content: reviewText,
                    createdAt: new Date(),
                    user: {
                        connect: { email: user.email }, // Link review to user by email
                    },
                    movie: {
                        connect: { id: movie.id }, // Link review to movie by ID
                    },
                },
            });
        }

        return new Response(JSON.stringify(review), { status: existingReview ? 200 : 201 });
    } catch (error) {
        console.error("Error in POST function:", error);
        return new Response(error.message, { status: 500 });
    }
}