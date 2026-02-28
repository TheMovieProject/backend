import { NextResponse } from "next/server";
import prisma from "@/app/libs/prismaDB";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { createNotification } from "@/app/libs/notifications";

export async function POST(req) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const me = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  });
  if (!me) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const { videoId } = await req.json();
  if (!videoId) return NextResponse.json({ error: "videoId is required" }, { status: 400 });

  const video = await prisma.video.findUnique({
    where: { id: videoId },
    select: { id: true, userId: true, title: true },
  });
  if (!video) return NextResponse.json({ error: "Video not found" }, { status: 404 });

  const existing = await prisma.entityReaction.findFirst({
    where: {
      userId: me.id,
      entityId: videoId,
      entityType: "video",
      reactionType: "like",
    },
    select: { id: true },
  });

  if (existing) {
    await prisma.entityReaction.delete({ where: { id: existing.id } });
  } else {
    await prisma.entityReaction.create({
      data: {
        userId: me.id,
        entityId: videoId,
        entityType: "video",
        reactionType: "like",
      },
    });
  }

  const likes = await prisma.entityReaction.count({
    where: { entityId: videoId, entityType: "video", reactionType: "like" },
  });

  await prisma.video.update({
    where: { id: videoId },
    data: { likes },
  });

  if (!existing) {
    await createNotification({
      userId: video.userId,
      actorId: me.id,
      type: "REACTION_LIKE",
      entityType: "video",
      entityId: videoId,
      title: `${session.user.username || "Someone"} liked your video`,
      body: video.title ? `Video: ${video.title}` : null,
      link: `/theater/watch?id=${videoId}`,
    });
  }

  return NextResponse.json({ ok: true, removed: !!existing, likes });
}
