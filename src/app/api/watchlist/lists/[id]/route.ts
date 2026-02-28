import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import prisma from "@/app/libs/prismaDB";
import {
  buildUniqueCollectionSlug,
  DEFAULT_COLLECTION_SLUG,
} from "@/app/libs/watchlist_collections";

async function getCurrentUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return null;
  return prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const me = await getCurrentUser();
    if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const list = await prisma.watchlist.findUnique({
      where: { id: params.id },
      select: { id: true, ownerId: true, slug: true },
    });

    if (!list || list.ownerId !== me.id) {
      return NextResponse.json({ error: "List not found" }, { status: 404 });
    }

    const body = await req.json().catch(() => ({}));
    const patch: Record<string, unknown> = {};

    if (typeof body?.name === "string") {
      const name = body.name.trim().slice(0, 60);
      if (!name || name.length < 2) {
        return NextResponse.json(
          { error: "List name must be at least 2 characters." },
          { status: 400 }
        );
      }

      patch.name = name;
      if (list.slug !== DEFAULT_COLLECTION_SLUG) {
        patch.slug = await buildUniqueCollectionSlug(me.id, name);
      }
    }

    if (typeof body?.isPublic === "boolean") {
      patch.isPublic = body.isPublic;
      patch.visibility = (body.isPublic ? "SHARED" : "PRIVATE") as any;
    }

    if (!Object.keys(patch).length) {
      return NextResponse.json({ error: "No valid updates provided." }, { status: 400 });
    }

    const updated = await prisma.watchlist.update({
      where: { id: list.id },
      data: patch,
    });

    return NextResponse.json({ ok: true, collection: updated });
  } catch (error) {
    console.error("PATCH /api/watchlist/lists/[id] error", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const me = await getCurrentUser();
    if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const list = await prisma.watchlist.findUnique({
      where: { id: params.id },
      select: { id: true, ownerId: true, slug: true },
    });

    if (!list || list.ownerId !== me.id) {
      return NextResponse.json({ error: "List not found" }, { status: 404 });
    }

    if (list.slug === DEFAULT_COLLECTION_SLUG) {
      return NextResponse.json(
        { error: "Default watchlist cannot be deleted." },
        { status: 400 }
      );
    }

    await prisma.watchlist.delete({
      where: { id: list.id },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/watchlist/lists/[id] error", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
