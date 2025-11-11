import { NextResponse } from 'next/server';
import prisma from "@/app/libs/prismaDB";
import { z } from 'zod';
import { getCurrentUserId } from '@/app/libs/auth'; // implement for your auth

const VoteSchema = z.object({
  movieId: z.string().min(1),
});

export async function POST(req: Request) {
  try {
    const userId = await getCurrentUserId(req);
    if (!userId) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const parse = VoteSchema.safeParse(body);
    if (!parse.success) {
      return NextResponse.json({ ok: false, error: 'Invalid payload' }, { status: 400 });
    }
    const { movieId } = parse.data;

    // ensure the movie exists
    const movie = await prisma.movie.findUnique({ where: { id: movieId }, select: { id: true } });
    if (!movie) {
      return NextResponse.json({ ok: false, error: 'Movie not found' }, { status: 404 });
    }

    // atomic toggle
    const result = await prisma.$transaction(async (tx:any) => {
      const existing = await tx.movieVote.findUnique({
        where: { userId_movieId: { userId, movieId } },
        select: { id: true },
      });

      if (existing) {
        // remove vote
        await tx.movieVote.delete({ where: { userId_movieId: { userId, movieId } } });
        const updated = await tx.movie.update({
          where: { id: movieId },
          data: { votes: { decrement: 1 } },
          select: { id: true, votes: true },
        });
        return { voted: false, votes: Math.max(updated.votes, 0) };
      } else {
        // add vote
        await tx.movieVote.create({
          data: { userId, movieId },
        });
        const updated = await tx.movie.update({
          where: { id: movieId },
          data: { votes: { increment: 1 } },
          select: { id: true, votes: true },
        });
        return { voted: true, votes: updated.votes };
      }
    });

    return NextResponse.json({ ok: true, ...result, movieId });
  } catch (err: any) {
    // handle unique constraint races gracefully
    const msg = err?.message || '';
    if (msg.includes('Unique constraint') || msg.includes('E11000')) {
      return NextResponse.json({ ok: false, error: 'Duplicate vote' }, { status: 409 });
    }
    console.error(err);
    return NextResponse.json({ ok: false, error: 'Failed to toggle vote' }, { status: 500 });
  }
}
