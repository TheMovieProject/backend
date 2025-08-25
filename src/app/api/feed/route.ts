// app/api/feed/route.ts
import { NextResponse, NextRequest } from 'next/server';
import { getAuthSession } from '@/app/api/auth/[...nextauth]/options';
import prismadb from '@/app/api/auth/[...nextauth]/connect';

const LIMIT_DEFAULT = 20;

interface FeedUser {
  id: string;
  username: string | null;
  email: string | null;
  avatarUrl: string | null;
  image: string | null;
}

interface FeedMovie {
  id: string;
  tmdbId: string | null;
  title: string;
  posterUrl: string | null;
}

interface FeedItem {
  type: 'review' | 'blog';
  id: string;
  userId: string;
  user: FeedUser;
  createdAt: Date;
  likes: number;
  fire: number;
  commentsCount: number;
  title: string;
  thumbnail: string | null;
  excerpt: string;
  movie?: FeedMovie;
  score?: number;
  userLiked?: boolean;
  userFired?: boolean;
}

/* ---------- utils ---------- */

function scoreItem(
  item: FeedItem,
  _userGenres: string[],
  followingIds: Set<string>,
  baseScore: number
): number {
  let score = baseScore;

  // follow boost
  if (followingIds.has(item.userId)) score += 20;

  // engagement (diminishing returns)
  score += Math.log(item.likes + 1) * 2;
  score += Math.log(item.fire + 1) * 3;
  score += Math.log(item.commentsCount + 1) * 1.5;

  // recency (2-day decay)
  const hoursOld = (Date.now() - new Date(item.createdAt).getTime()) / 36e5;
  score += Math.max(0, 48 - hoursOld) * 0.2;

  // slight type bias
  if (item.type === 'review') score += 2;
  if (item.type === 'blog') score += 1;

  return score;
}

function errMsg(e: unknown) {
  if (e instanceof Error) return e.message;
  if (typeof e === 'string') return e;
  try {
    return JSON.stringify(e);
  } catch {
    return 'Unknown error';
  }
}

/* ---------- GET (feed) ---------- */

export async function GET(req: NextRequest) {
  try {
    const session = await getAuthSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const mode = (searchParams.get('mode') ?? 'forYou') as 'forYou' | 'following';
    const limit = Math.min(Number(searchParams.get('limit') ?? LIMIT_DEFAULT), 50);
    const cursor = searchParams.get('cursor') ?? undefined;

    // current user by email
    const me = await prismadb.user.findUnique({
      where: { email: session.user.email },
      select: {
        id: true,
        email: true,
        movieGenres: true,
        following: { select: { followingId: true } },
      },
    });

    if (!me) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const followingIds = new Set<string>(
      me.following.map((f: { followingId: string }) => f.followingId)
    );

    // gather following emails for blogs
    const followingUsers =
      followingIds.size > 0
        ? await prismadb.user.findMany({
            where: { id: { in: Array.from(followingIds) } },
            select: { email: true },
          })
        : [];

    const followingEmails = new Set<string>(
      (followingUsers.map((u: { email: any; }) => u.email).filter(Boolean) as string[]) ?? []
    );

    const take = limit * 2;

    const reviewWhere =
      mode === 'following' && followingIds.size > 0
        ? { userId: { in: Array.from(followingIds) } }
        : {};

    const blogWhere =
      mode === 'following' && followingEmails.size > 0
        ? { userEmail: { in: Array.from(followingEmails) } }
        : {};

    const [reviews, blogs] = await Promise.all([
      prismadb.review.findMany({
        where: reviewWhere,
        orderBy: { createdAt: 'desc' },
        take,
        include: {
          user: {
            select: {
              id: true,
              username: true,
              email: true,
              avatarUrl: true,
              image: true,
            },
          },
          movie: {
            select: {
              id: true,
              tmdbId: true,
              title: true,
              posterUrl: true,
            },
          },
          reviewComments: { select: { id: true } },
        },
        cursor: cursor ? { id: cursor } : undefined,
        skip: cursor ? 1 : 0,
      }),
      prismadb.blog.findMany({
        where: blogWhere,
        orderBy: { createdAt: 'desc' },
        take,
        include: {
          user: {
            select: {
              id: true,
              username: true,
              email: true,
              avatarUrl: true,
              image: true,
            },
          },
          comments: { select: { id: true } },
        },
        cursor: cursor ? { id: cursor } : undefined,
        skip: cursor ? 1 : 0,
      }),
    ]);

    // map to FeedItem with explicit shapes
    const items: FeedItem[] = [
      ...reviews.map((r: { id: any; userId: any; user: { id: any; username: any; email: any; avatarUrl: any; image: any; }; createdAt: any; likes: any; fire: any; reviewComments: string | any[]; movie: { id: any; tmdbId: any; title: any; posterUrl: any; }; content: string; }) => ({
        type: 'review' as const,
        id: r.id,
        userId: r.userId,
        user: {
          id: r.user.id,
          username: r.user.username ?? null,
          email: r.user.email ?? null,
          avatarUrl: r.user.avatarUrl ?? null,
          image: r.user.image ?? null,
        },
        createdAt: r.createdAt,
        likes: r.likes,
        fire: r.fire,
        commentsCount: r.reviewComments?.length || 0,
        movie: r.movie
          ? {
              id: r.movie.id,
              tmdbId: r.movie.tmdbId ?? null,
              title: r.movie.title,
              posterUrl: r.movie.posterUrl ?? null,
            }
          : undefined,
        title: r.movie?.title ?? 'Untitled',
        thumbnail: r.movie?.posterUrl ?? null,
        excerpt: r.content
          ? r.content.slice(0, 240) + (r.content.length > 240 ? '...' : '')
          : '',
      })),
      ...blogs.map((b: { id: any; user: { id: any; username: any; email: any; avatarUrl: any; image: any; }; createdAt: any; likes: any; fire: any; comments: string | any[]; title: any; thumbnail: any; content: string; }) => ({
        type: 'blog' as const,
        id: b.id,
        userId: b.user.id,
        user: {
          id: b.user.id,
          username: b.user.username ?? null,
          email: b.user.email ?? null,
          avatarUrl: b.user.avatarUrl ?? null,
          image: b.user.image ?? null,
        },
        createdAt: b.createdAt,
        likes: b.likes,
        fire: b.fire,
        commentsCount: b.comments?.length || 0,
        title: b.title,
        thumbnail: b.thumbnail ?? null,
        excerpt: b.content
          ? b.content.slice(0, 240) + (b.content.length > 240 ? '...' : '')
          : '',
      })),
    ];

    // user reactions for flags
    const itemIds = items.map(i => i.id);
    const userReactions = await prismadb.entityReaction.findMany({
      where: {
        userId: me.id,
        entityId: { in: itemIds },
        entityType: { in: ['review', 'blog'] },
      },
    });

    const reactionMap = new Map<string, Set<string>>();
    userReactions.forEach((r: { entityId: any; entityType: any; reactionType: string; }) => {
      const key = `${r.entityId}-${r.entityType}`;
      if (!reactionMap.has(key)) reactionMap.set(key, new Set());
      reactionMap.get(key)!.add(r.reactionType);
    });

    items.forEach(item => {
      const key = `${item.id}-${item.type}`;
      const r = reactionMap.get(key);
      item.userLiked = r?.has('likes') || false;
      item.userFired = r?.has('fire') || false;
    });

    // score + sort
    const finalItems =
      mode === 'forYou'
        ? items
            .map(it => ({
              ...it,
              score: scoreItem(it, me.movieGenres ?? [], followingIds, 0),
            }))
            .sort((a, b) => (b.score || 0) - (a.score || 0))
        : items.sort(
            (a, b) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );

    // pagination (by position)
    const page = finalItems.slice(0, limit);
    const nextCursor =
      page.length === limit && finalItems.length > limit
        ? page[page.length - 1].id
        : null;

    return NextResponse.json({
      items: page,
      nextCursor,
      meta: {
        mode,
        totalFetched: items.length,
        returned: page.length,
        hasMore: nextCursor !== null,
      },
    });
  } catch (error: unknown) {
    console.error('Feed API error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details:
          process.env.NODE_ENV === 'development' ? errMsg(error) : undefined,
      },
      { status: 500 }
    );
  }
}

/* ---------- POST (add/remove reaction) ---------- */

export async function POST(req: NextRequest) {
  try {
    const session = await getAuthSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const currentUser = await prismadb.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    });

    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { entityId, entityType, reactionType, action } = await req.json();

    if (!entityId || !entityType || !reactionType || !action) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (action === 'add') {
      await prismadb.entityReaction.upsert({
        where: {
          userId_entityId_entityType_reactionType: {
            userId: currentUser.id,
            entityId,
            entityType,
            reactionType,
          },
        },
        update: {},
        create: {
          userId: currentUser.id,
          entityId,
          entityType,
          reactionType,
        },
      });

      const increment = { [reactionType]: { increment: 1 } } as const;

      if (entityType === 'review') {
        await prismadb.review.update({ where: { id: entityId }, data: increment });
      } else if (entityType === 'blog') {
        await prismadb.blog.update({ where: { id: entityId }, data: increment });
      }
    } else if (action === 'remove') {
      await prismadb.entityReaction.deleteMany({
        where: {
          userId: currentUser.id,
          entityId,
          entityType,
          reactionType,
        },
      });

      const decrement = { [reactionType]: { decrement: 1 } } as const;

      if (entityType === 'review') {
        await prismadb.review.update({ where: { id: entityId }, data: decrement });
      } else if (entityType === 'blog') {
        await prismadb.blog.update({ where: { id: entityId }, data: decrement });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Feed POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: errMsg(error) },
      { status: 500 }
    );
  }
}
