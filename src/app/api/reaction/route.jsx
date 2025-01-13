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

// Handle POST request
export async function POST(req) {
    try {
        // Fetch session and user
        const session = await getServerSession(authOptions);
        console.log("Session:", session);
        const user = await getUser(session);
        console.log("User:", user);

        // Parse request body
        const body = await req.json();
        const { reviewId, type } = body;
        console.log("Request Body:", body);

        if (!reviewId || !type || !['likes', 'emojis', 'fire'].includes(type)) {
            console.error("Invalid or missing data:", { reviewId, type });
            return new Response("Invalid or missing data", { status: 400 });
        }

        // Check if the user has already reacted to this review
        const existingReaction = await prisma.liked.findFirst({
            where: {
                userId: user.id,
                movieId: reviewId,
            },
        });
        console.log("Existing Reaction:", existingReaction);

        if (existingReaction) {
            // If the user has already reacted, remove the reaction
            console.log("Removing existing reaction");
            await prisma.liked.delete({
                where: { id: existingReaction.id },
            });

            // Update the review's reaction counts
            const review = await prisma.review.findUnique({
                where: { id: reviewId },
            });
            console.log("Review before update:", review);

            if (!review) {
                console.error("Review not found:", { reviewId });
                return new Response("Review not found", { status: 404 });
            }

            // Decrement the reaction count
            const updateField = { [type]: Math.max(review[type] - 1, 0) };
            console.log("Updating review with field:", updateField);

            const updatedReview = await prisma.review.update({
                where: { id: reviewId },
                data: updateField,
            });
            console.log("Updated Review:", updatedReview);

            return new Response(JSON.stringify(updatedReview), { status: 200 });
        } else {
            // If no existing reaction, create a new one
            console.log("Creating new reaction");
            await prisma.liked.create({
                data: {
                    userId: user.id,
                    movieId: reviewId,
                },
            });

            // Update the review's reaction counts
            const review = await prisma.review.findUnique({
                where: { id: reviewId },
            });
            console.log("Review before update:", review);

            if (!review) {
                console.error("Review not found:", { reviewId });
                return new Response("Review not found", { status: 404 });
            }

            // Increment the reaction count
            const updateField = { [type]: review[type] + 1 };
            console.log("Updating review with field:", updateField);

            const updatedReview = await prisma.review.update({
                where: { id: reviewId },
                data: updateField,
            });
            console.log("Updated Review:", updatedReview);

            return new Response(JSON.stringify(updatedReview), { status: 200 });
        }
    } catch (error) {
        console.error("Error in POST function:", error);
        return new Response(error.message, { status: error.message === "Unauthorized" ? 401 : 500 });
    }
}
