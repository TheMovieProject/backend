import { getAuthSession } from "@/app/api/auth/[...nextauth]/options";
import prisma from "@/app/libs/prismaDB";
import WatchlistClient from "@/app/components/WatchListClient/WatchListClient";

export default async function WatchlistPage() {
    const session = await getAuthSession()

    if (!session) {
        return <p>You need to log in to view your watchlist.</p>;
    }

    const user = await prisma.user.findUnique({
        where: { email: session.user.email },
    });

    if (!user) {
        return <p>User not found. Please log in again.</p>;
    }

    const watchlist = await prisma.watchlist.findMany({
        where: { userId: user.id },
        include: {
            movie: true,
        },
    });

    return <WatchlistClient initialWatchlist={watchlist} />;
}