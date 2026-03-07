import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import prisma from "@/app/libs/prismaDB";
import { createNotification, toClientNotification } from "@/app/libs/notifications";

async function getCurrentUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return null;

  return prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, username: true },
  });
}

export async function GET(req: NextRequest) {
  try {
    const me = await getCurrentUser();
    if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const limitRaw = Number(req.nextUrl.searchParams.get("limit") ?? 25);
    const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(1, limitRaw), 100) : 25;

    const notifications = await prisma.notification.findMany({
      where: { userId: me.id },
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        actor: {
          select: {
            id: true,
            username: true,
            avatarUrl: true,
            image: true,
          },
        },
      },
    });

    const unreadCount = await prisma.notification.count({
      where: {
        userId: me.id,
        OR: [
          { readAt: null },
          // Mongo documents created before readAt existed can have the field missing.
          { readAt: { isSet: false } as any },
        ],
      },
    });

    return NextResponse.json({
      notifications: notifications.map(toClientNotification),
      unreadCount,
    });
  } catch (error) {
    console.error("GET /api/notifications error", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const me = await getCurrentUser();
    if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const type = typeof body?.type === "string" ? body.type : "";
    const toUserId = typeof body?.toUserId === "string" ? body.toUserId : "";

    if (!type || !toUserId) {
      return NextResponse.json({ error: "type and toUserId are required" }, { status: 400 });
    }

    const validTypeMap: Record<string, "FOLLOW" | "REACTION_LIKE" | "REACTION_FIRE" | "SYSTEM"> = {
      FOLLOW: "FOLLOW",
      REACTION_LIKE: "REACTION_LIKE",
      REACTION_FIRE: "REACTION_FIRE",
      SYSTEM: "SYSTEM",
    };

    const normalizedType = validTypeMap[type];
    if (!normalizedType) {
      return NextResponse.json({ error: "Invalid notification type" }, { status: 400 });
    }

    const defaultTitle =
      normalizedType === "FOLLOW"
        ? `${me.username || "Someone"} started following you`
        : normalizedType === "REACTION_LIKE"
        ? `${me.username || "Someone"} liked your post`
        : normalizedType === "REACTION_FIRE"
        ? `${me.username || "Someone"} reacted with fire`
        : body?.title || "New notification";

    const notification = await createNotification({
      userId: toUserId,
      actorId: me.id,
      type: normalizedType,
      entityType: typeof body?.entityType === "string" ? body.entityType : null,
      entityId: typeof body?.entityId === "string" ? body.entityId : null,
      title: typeof body?.title === "string" ? body.title : defaultTitle,
      body: typeof body?.body === "string" ? body.body : null,
      link: typeof body?.link === "string" ? body.link : null,
    });

    return NextResponse.json({ ok: true, notification });
  } catch (error) {
    console.error("POST /api/notifications error", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
