import { NextResponse } from 'next/server';
import prisma from "@/app/libs/prismaDB";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const movies = await prisma.movie.findMany({
      orderBy: [{ votes: 'desc' }, { title: 'asc' }],
      select: {
        id: true,
        tmdbId: true,
        title: true,
        posterUrl: true,
        votes: true,
      },
      take: 100, // adjust if you want
    });

    return NextResponse.json({ ok: true, movies });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ ok: false, error: 'Failed to fetch poll list' }, { status: 500 });
  }
}
