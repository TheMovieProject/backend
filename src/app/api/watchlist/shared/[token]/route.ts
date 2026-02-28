import { NextResponse } from "next/server";
import prisma from "@/app/libs/prismaDB";

export async function GET(
  _req: Request,
  { params }: { params: { token: string } }
) {
  try {
    const token = params.token;
    if (!token) return NextResponse.json({ error: "Missing token" }, { status: 400 });

    const list = await prisma.watchlist.findUnique({
      where: { shareToken: token },
      include: {
        owner: {
          select: {
            id: true,
            username: true,
            avatarUrl: true,
            image: true,
          },
        },
        items: {
          orderBy: [{ rank: "asc" }, { addedAt: "desc" }],
          include: {
            movie: true,
          },
        },
      },
    });

    const visibility = list?.visibility || (list?.isPublic ? "SHARED" : "PRIVATE");
    if (!list || visibility !== "SHARED") {
      return NextResponse.json({ error: "Shared list not found" }, { status: 404 });
    }

    return NextResponse.json({
      id: list.id,
      name: list.name,
      slug: list.slug,
      owner: list.owner,
      createdAt: list.createdAt,
      updatedAt: list.updatedAt,
      count: list.items.length,
      items: list.items,
    });
  } catch (error) {
    console.error("GET /api/watchlist/shared/[token] error", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
