import { NextRequest, NextResponse } from "next/server";
import { createRouteLogger } from "@/lib/api-debug";
import { getLikedStatusMapForUser, normalizeMovieIds } from "@/lib/liked";
import { getCurrentUserOrNull } from "@/app/libs/watchlists";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(req: NextRequest) {
  const logger = createRouteLogger("POST /api/liked/status/bulk");
  const handlerTimer = logger.start("handler_total");

  try {
    const body = await req.json().catch(() => ({}));
    const movieIds = normalizeMovieIds(body?.movieIds);

    if (!movieIds.length) {
      return NextResponse.json({ liked: {} });
    }

    const authTimer = logger.start("auth_lookup");
    const user = await getCurrentUserOrNull();
    logger.end(authTimer);

    if (!user) {
      return NextResponse.json({
        liked: Object.fromEntries(movieIds.map((movieId) => [movieId, false])),
      });
    }

    logger.log("db query start", { movieCount: movieIds.length, userId: user.id });
    const dbTimer = logger.start("db_query");
    const liked = await getLikedStatusMapForUser(user.id, movieIds);
    logger.end(dbTimer);
    logger.log("db query end", { movieCount: movieIds.length, userId: user.id });

    return NextResponse.json({ liked });
  } catch (error) {
    console.error("POST /api/liked/status/bulk error", error);
    return NextResponse.json(
      { message: "Failed to load liked statuses" },
      { status: 500 }
    );
  } finally {
    logger.end(handlerTimer);
  }
}
