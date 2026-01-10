import { NextResponse } from "next/server";
import prisma from "@/app/libs/prismaDB";


export async function GET(req: Request) {
const { searchParams } = new URL(req.url);
const q = searchParams.get("q");
const where: any = { visibility: "public", status: "ready" };
if (q) where.title = { contains: q, mode: "insensitive" };
const items = await prisma.video.findMany({
where,
orderBy: { createdAt: "desc" },
select: { id: true, title: true, posterUrl: true, muxPlaybackId: true, likes: true },
take: 30,
});
return NextResponse.json(items);
}