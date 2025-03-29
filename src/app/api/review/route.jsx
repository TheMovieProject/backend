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

// Helper function to fetch movie details from TMDb
async function fetchMovieDetails(tmdbId) {
    const TMDB_API_KEY = process.env.MOVIEDB_API_KEY; // Ensure this is in .env
    const response = await fetch(`https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${TMDB_API_KEY}`);
    
    if (!response.ok) {
        throw new Error(`Failed to fetch movie details for TMDb ID ${tmdbId}`);
    }

    const data = await response.json();
    console.log("Fetched TMDb Data:", data);  // Debugging Line

    return {
        title: data.title || "Untitled",  // Set a better default title
        posterUrl: data.poster_path ? `https://image.tmdb.org/t/p/w500${data.poster_path}` : "/img/NoImage.png", // Fallback image
    };
}

// Helper function to get or create a movie in the database
async function getOrCreateMovie(tmdbId) {
    let movie = await prisma.movie.findUnique({
        where: { tmdbId },
    });

    const movieDetails = await fetchMovieDetails(tmdbId);

    if (!movie) {
        // Create a new movie if it doesn't exist
        movie = await prisma.movie.create({
            data: {
                tmdbId,
                title: movieDetails.title,
                posterUrl: movieDetails.posterUrl,
            },
        });
    } else if (movie.posterUrl === "Unknown" || movie.title === "Unknown") {
        // Update only if the movie data is incomplete
        movie = await prisma.movie.update({
            where: { tmdbId },
            data: {
                title: movieDetails.title,
                posterUrl: movieDetails.posterUrl,
            },
        });
    }

    return movie;
}

// Handle GET request
export async function GET(req) {
    try {
        const url = new URL(req.url);
        const tmdbId = url.searchParams.get("movieId");

        const reviews = await prisma.review.findMany({
            where: { movie: { tmdbId } },
            include: {
                user: true,
                reviewComments: {  // Add this include
                    include: {
                        user: true,
                        childComments: {
                            include: {
                                user: true
                            }
                        }
                    },
                    orderBy: {
                        createdAt: 'asc'
                    }
                }
            },
        });

        return new Response(JSON.stringify(reviews), { status: 200 });
    } catch (error) {
        console.error("Error in GET function:", error);
        return new Response(error.message, { status: 500 });
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
