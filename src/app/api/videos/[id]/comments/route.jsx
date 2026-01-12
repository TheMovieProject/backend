import { NextResponse } from "next/server";
import prisma from "@/app/libs/prismaDB";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";


export async function GET(_req, { params }) {
const roots = await prisma.videoComment.findMany({
where: { videoId: params.id, parentId: null },
orderBy: { createdAt: "desc" },
include: { children: true, user: true },
take: 100,
});
return NextResponse.json(roots);
}


export async function POST(req, { params }) {
const session = await getServerSession(authOptions);
if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
const { content, parentId } = await req.json();
const c = await prisma.videoComment.create({ data: { userId: session.user.id, videoId: params.id, content, parentId }});
return NextResponse.json(c);
}