import { NextResponse } from "next/server";
import prisma from "@/app/libs/prismaDB";


export async function GET(_req: Request, { params }: { params: { id: string }}) {
const v = await prisma.video.findUnique({
where: { id: params.id },
include: { user: true },
});
return NextResponse.json(v);
}