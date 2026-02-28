import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import prisma from "@/app/libs/prismaDB";
import {
  buildUniqueCollectionSlug,
} from "@/app/libs/watchlist_collections";
import { syncLegacyWatchlistToDefault } from "@/app/libs/watchlists";

async function getCurrentUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return null;
  return prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  });
}

export async function GET(req: NextRequest) {
  try {
    const me = await getCurrentUser();
    if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await syncLegacyWatchlistToDefault(me.id);

    const collections = await prisma.watchlist.findMany({
      where: { ownerId: me.id },
      orderBy: [{ createdAt: "asc" }],
      include: {
        items: {
          orderBy: [{ rank: "asc" }, { addedAt: "desc" }],
          include: {
            movie: true,
          },
        },
      },
    });

    const origin = req.nextUrl.origin;
    return NextResponse.json({
      collections: collections.map((collection: {
        id: string;
        name: string;
        slug: string;
        visibility?: "PRIVATE" | "SHARED" | null;
        isPublic: boolean;
        shareToken: string;
        createdAt: Date;
        updatedAt: Date;
        items: unknown[];
      }) => ({
        id: collection.id,
        name: collection.name,
        slug: collection.slug,
        isPublic: collection.visibility ? collection.visibility === "SHARED" : collection.isPublic,
        visibility: collection.visibility || (collection.isPublic ? "SHARED" : "PRIVATE"),
        shareToken: collection.shareToken,
        shareUrl: `${origin}/watchlist/shared/${collection.shareToken}`,
        createdAt: collection.createdAt,
        updatedAt: collection.updatedAt,
        count: collection.items.length,
        items: collection.items,
      })),
    });
  } catch (error) {
    console.error("GET /api/watchlist/lists error", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const me = await getCurrentUser();
    if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const rawName = typeof body?.name === "string" ? body.name : "";
    const name = rawName.trim().slice(0, 60);
    const isPublic = Boolean(body?.isPublic);

    if (!name || name.length < 2) {
      return NextResponse.json(
        { error: "List name must be at least 2 characters." },
        { status: 400 }
      );
    }

    const slug = await buildUniqueCollectionSlug(me.id, name);
    const created = await prisma.watchlist.create({
      data: {
        ownerId: me.id,
        name,
        slug,
        visibility: (isPublic ? "SHARED" : "PRIVATE") as any,
        isPublic,
        isSystemDefault: false,
        shareToken: crypto.randomUUID(),
      },
    });

    return NextResponse.json({ ok: true, collection: created }, { status: 201 });
  } catch (error) {
    console.error("POST /api/watchlist/lists error", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
