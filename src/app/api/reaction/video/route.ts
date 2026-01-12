import { NextResponse } from "next/server";
import prisma from "@/app/libs/prismaDB";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";


export async function POST(req: Request) {
const session = await getServerSession(authOptions);
if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
const { videoId } = await req.json();
try {
await prisma.entityReaction.create({ data: { userId: session.user.id, entityId: videoId, entityType: "video", reactionType: "like" }});
await prisma.video.update({ where: { id: videoId }, data: { likes: { increment: 1 }}});
return NextResponse.json({ ok: true });
} catch {
// toggle behavior: if exists, remove
await prisma.entityReaction.deleteMany({ where: { userId: session.user.id, entityId: videoId, entityType: "video", reactionType: "like" }});
await prisma.video.update({ where: { id: videoId }, data: { likes: { decrement: 1 }}});
return NextResponse.json({ ok: true, removed: true });
}
}