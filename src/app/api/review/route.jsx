import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import prisma from "@/app/libs/prismaDB";

// Configure API to handle larger request bodies
// export const config = {
//   api: {
//     bodyParser: {
//       sizeLimit: '2mb',
//     },
//   },
// };

// Helper function to get user
async function getUser(session) {
    if (!session || !session.user || !session.user.email) {
        throw new Error("Unauthorized");
    }
    
    try {
        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
        });
        
        if (!user) {
            throw new Error("User not found");
        }
        
        return user;
    } catch (error) {
        console.error("Error fetching user:", error);
        throw new Error("Failed to authenticate user");
    }
}

// Helper function to fetch movie details from TMDb
async function fetchMovieDetails(tmdbId) {
    try {
        const TMDB_API_KEY = process.env.MOVIEDB_API_KEY;
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
        
        const response = await fetch(
            `https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${TMDB_API_KEY}`,
            { 
                signal: controller.signal,
                headers: {
                    'Content-Type': 'application/json'
                }
            }
        );
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
            console.error(`TMDB API error: ${response.status} for movie ID ${tmdbId}`);
            return {
                title: "Unknown Title",
                posterUrl: "/img/NoImage.png"
            };
        }

        const data = await response.json();
        
        return {
            title: data.title || "Untitled",
            posterUrl: data.poster_path 
                ? `https://image.tmdb.org/t/p/w500${data.poster_path}` 
                : "/img/NoImage.png"
        };
    } catch (error) {
        console.error("Error fetching movie details:", error);
        return {
            title: "Unknown Title",
            posterUrl: "/img/NoImage.png"
        };
    }
}

// Helper function to get or create a movie in the database
async function getOrCreateMovie(tmdbId) {
    try {
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
    } catch (error) {
        console.error(`Error in getOrCreateMovie for tmdbId ${tmdbId}:`, error);
        throw new Error("Failed to process movie data");
    }
}

// Handle GET request
// Handle GET request
export async function GET(req) {
    try {
        const url = new URL(req.url);
        const tmdbId = url.searchParams.get("movieId");
        const userId = url.searchParams.get("userId");

        // If userId is provided, fetch reviews by user
        if (userId) {
            const reviews = await prisma.review.findMany({
                where: { userId: userId },
                include: {
                    movie: true,
                    user: true,
                    reviewComments: {
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
                orderBy: {
                    createdAt: 'desc'
                }
            });

            return new Response(JSON.stringify(reviews), { 
                status: 200,
                headers: {
                    'Content-Type': 'application/json'
                }
            });
        }

        // If movieId is provided, fetch reviews by movie (your existing code)
        if (!tmdbId) {
            return new Response("Missing movie ID", { status: 400 });
        }

        const reviews = await prisma.review.findMany({
            where: { movie: { tmdbId } },
            include: {
                user: true,
                reviewComments: {
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

        return new Response(JSON.stringify(reviews), { 
            status: 200,
            headers: {
                'Content-Type': 'application/json'
            }
        });
    } catch (error) {
        console.error("Error in GET function:", error);
        return new Response(JSON.stringify({ error: error.message }), { 
            status: 500,
            headers: {
                'Content-Type': 'application/json'
            }
        });
    }
}

// Handle POST request
export async function POST(req) {
    let session;
    let user;
    let body;
    
    try {
        // Safely parse request body with error handling
        try {
            // Check if request has content
            const contentLength = req.headers.get('content-length');
            if (!contentLength || parseInt(contentLength) === 0) {
                return new Response(JSON.stringify({ error: "Empty request body" }), { 
                    status: 400,
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });
            }
            
            // Buffer the request to prevent streaming issues
            const rawText = await req.text();
            if (!rawText || rawText.trim() === '') {
                return new Response(JSON.stringify({ error: "Empty request body" }), { 
                    status: 400,
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });
            }
            
            // Parse the JSON text
            body = JSON.parse(rawText);
            
        } catch (parseError) {
            console.error("JSON parsing error:", parseError);
            return new Response(JSON.stringify({ 
                error: "Invalid JSON in request body",
                details: parseError.message 
            }), { 
                status: 400,
                headers: {
                    'Content-Type': 'application/json'
                }
            });
        }
        
        // Validate the parsed body
        const { movieId: tmdbId, reviewText } = body;

        if (!tmdbId || typeof reviewText !== "string") {
            return new Response(JSON.stringify({ error: "Missing or invalid data" }), { 
                status: 400,
                headers: {
                    'Content-Type': 'application/json'
                }
            });
        }
        
        // Fetch session and user
        session = await getServerSession(authOptions);
        user = await getUser(session);

        // Use transaction for atomicity
        const review = await prisma.$transaction(async (tx) => {
            // Get or create movie
            const movie = await getOrCreateMovie(tmdbId);

            // Check for existing review
            const existingReview = await tx.review.findFirst({
                where: {
                    userId: user.id,
                    movieId: movie.id,
                },
            });

            if (existingReview) {
                // Update existing review
                return await tx.review.update({
                    where: { id: existingReview.id },
                    data: { 
                        content: reviewText, 
                        updatedAt: new Date() 
                    },
                });
            } else {
                // Create new review
                return await tx.review.create({
                    data: {
                        content: reviewText,
                        createdAt: new Date(),
                        userId: user.id,
                        movieId: movie.id
                    },
                });
            }
        });

        return new Response(JSON.stringify(review), { 
            status: review.createdAt === review.updatedAt ? 201 : 200,
            headers: {
                'Content-Type': 'application/json'
            }
        });
    } catch (error) {
        console.error("Error in POST function:", error);
        
        // More specific error messages
        let errorMessage = "An error occurred while processing your review";
        let statusCode = 500;
        
        if (error.message === "Unauthorized" || error.message === "Failed to authenticate user") {
            errorMessage = "You must be logged in to post a review";
            statusCode = 401;
        } else if (error.message === "User not found") {
            errorMessage = "Your user account could not be found";
            statusCode = 404;
        } else if (error.message === "Failed to process movie data") {
            errorMessage = "Could not process movie information";
            statusCode = 500;
        } else if (error.message.includes("Prisma")) {
            errorMessage = "Database error occurred";
            statusCode = 500;
        }
        
        return new Response(JSON.stringify({ error: errorMessage }), { 
            status: statusCode,
            headers: {
                'Content-Type': 'application/json'
            }
        });
    }
}