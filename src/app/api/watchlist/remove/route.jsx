import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import prisma from "@/app/libs/prismaDB";

export async function POST(req) {
    try {
        console.log("POST request received");

        const session = await getServerSession(authOptions);
        console.log("Session:", session);

        if (!session) {
            console.log("No session found, unauthorized");
            return new Response("Unauthorized", { status: 401 });
        }

        const { movieId } = await req.json();
        console.log("Movie ID received:", movieId);

        if (!movieId) {
            console.log("Movie ID is missing in the request body");
            return new Response("Movie ID is required", { status: 400 });
        }

        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
        });
        console.log("User found:", user);

        if (!user) {
            console.log("User not found");
            return new Response("User not found", { status: 404 });
        }

        const deletedItem = await prisma.watchlist.deleteMany({
            where: {
                userId: user.id,
                movieId: movieId,
            },
        });
        console.log("Deleted item result:", deletedItem);

        if (deletedItem.count === 0) {
            console.log("Movie not found in watchlist");
            return new Response("Movie not found in watchlist", { status: 404 });
        }

        console.log("Movie successfully removed from watchlist");
        return new Response("Movie removed from watchlist", { status: 200 });
    } catch (error) {
        console.error("Error removing movie from watchlist:", error);
        return new Response("Internal Server Error", { status: 500 });
    }
}
