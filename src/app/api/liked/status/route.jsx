import { NextResponse } from "next/server";
import { createRouteLogger } from "@/lib/api-debug";
import { getLikedStatusMapForUser } from "@/lib/liked";
import { getCurrentUserOrNull } from "@/app/libs/watchlists";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const GET=async(req)=>{
    const logger = createRouteLogger("GET /api/liked/status");
    const handlerTimer = logger.start("handler_total");

    try {
        const url = new URL(req.url)
        const tmdbId = String(url.searchParams.get("movieId") || "").trim()

        if(!tmdbId) return NextResponse.json({message:"movieId required"} , {status:400})

        const authTimer = logger.start("auth_lookup");
        const user = await getCurrentUserOrNull();
        logger.end(authTimer);

        if(!user){
            return NextResponse.json({isLiked:false})
        }

        logger.log("db query start", { movieId: tmdbId, userId: user.id });
        const dbTimer = logger.start("db_query");
        const liked = await getLikedStatusMapForUser(user.id, [tmdbId]);
        logger.end(dbTimer);
        logger.log("db query end", { movieId: tmdbId, userId: user.id });

        return NextResponse.json({isLiked:Boolean(liked[tmdbId])})
    } catch (error) {
        console.error("GET /api/liked/status error", error);
        return NextResponse.json({message:"Error"} , {status:500})
    } finally {
        logger.end(handlerTimer);
    }
}
