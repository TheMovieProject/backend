import prismadb from "@/app/api/auth/[...nextauth]/connect";
import { NextResponse } from "next/server";
import { getServerSession } from 'next-auth'
import { getAuthSession } from "@/app/api/auth/[...nextauth]/options";
import { createNotification } from "@/app/libs/notifications";

export async function POST(req) {
  try {
    const session = await await getAuthSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { targetUserId } = await req.json()
    if (!targetUserId) {
      return NextResponse.json({ error: 'Target user ID required' }, { status: 400 })
    }

    const currentUser = await prismadb.user.findUnique({
      where: { email: session.user.email }
    })

    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const existing = await prismadb.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId: currentUser.id,
          followingId: targetUserId,
        },
      },
    });

    if (existing) {
      return NextResponse.json(existing);
    }

    // Create follow relationship
    const follow = await prismadb.follow.create({
      data: {
        followerId: currentUser.id,
        followingId: targetUserId
      }
    })

    await createNotification({
      userId: targetUserId,
      actorId: currentUser.id,
      type: "FOLLOW",
      entityType: "user",
      entityId: currentUser.id,
      title: `${currentUser.username || "Someone"} started following you`,
      link: `/profile/${currentUser.id}`,
    });

    return NextResponse.json(follow)
  } catch (error) {
    console.error('[FOLLOW_ERROR]', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

export async function DELETE(req) {
  try {
    const session = await getAuthSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { targetUserId } = await req.json()
    if (!targetUserId) {
      return NextResponse.json({ error: 'Target user ID required' }, { status: 400 })
    }

    const currentUser = await prismadb.user.findUnique({
      where: { email: session.user.email }
    })

    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Remove follow relationship
    const follow = await prismadb.follow.delete({
      where: {
        followerId_followingId: {
          followerId: currentUser.id,
          followingId: targetUserId
        }
      }
    })

    return NextResponse.json(follow)
  } catch (error) {
    console.error('[UNFOLLOW_ERROR]', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
