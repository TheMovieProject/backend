import prismadb from "@/app/api/auth/[...nextauth]/connect";
import { NextResponse } from "next/server";
import { getAuthSession } from "@/app/api/auth/[...nextauth]/options";

export async function GET(req, { params }) {
  try {
    const session = await await getAuthSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const currentUser = await prismadb.user.findUnique({
      where: { email: session.user.email }
    })

    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // FIX: Ensure params and `id` are properly accessed
    if (!params || !params.id) {
      return NextResponse.json({ error: 'Missing user ID in params' }, { status: 400 })
    }

    const follow = await prismadb.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId: currentUser.id,
          followingId: params.id // Corrected to `params.id`
        }
      }
    })

    return NextResponse.json({ isFollowing: !!follow })
  } catch (error) {
    console.error('[FOLLOW_STATUS_ERROR]', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
