import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import prisma from "@/app/libs/prismaDB";

async function getCurrentUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return null;
  return prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const me = await getCurrentUser();
    if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const list = await prisma.watchlist.findUnique({
      where: { id: params.id },
      select: { id: true, ownerId: true, shareToken: true, isPublic: true },
    });

    if (!list || list.ownerId !== me.id) {
      return NextResponse.json({ error: "List not found" }, { status: 404 });
    }

    if (!list.isPublic) {
      await prisma.watchlist.update({
        where: { id: list.id },
        data: { isPublic: true, visibility: "SHARED" as any },
      });
    }

    return NextResponse.json({
      ok: true,
      shareUrl: `${req.nextUrl.origin}/watchlist/shared/${list.shareToken}`,
      shareToken: list.shareToken,
    });
  } catch (error) {
    console.error("POST /api/watchlist/lists/[id]/share error", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
