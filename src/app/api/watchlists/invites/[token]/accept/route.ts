import { NextRequest } from "next/server";
import prisma from "@/app/libs/prismaDB";
import {
  ensureOwnerMembership,
  err,
  getCurrentUserOrNull,
  ok,
  recordWatchlistActivity,
} from "@/app/libs/watchlists";

export async function POST(
  _req: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const me = await getCurrentUserOrNull();
    if (!me) return err("UNAUTHORIZED", "Unauthorized", 401);

    const invite = await prisma.watchlistInvite.findUnique({
      where: { token: params.token },
      include: {
        watchlist: {
          select: { id: true, ownerId: true, name: true },
        },
      },
    });

    if (!invite) return err("NOT_FOUND", "Invite not found", 404);

    if (invite.status !== "INVITED") {
      return err("INVITE_INVALID", "Invite is no longer active", 400);
    }

    if (invite.expiresAt.getTime() < Date.now()) {
      await prisma.watchlistInvite.update({
        where: { id: invite.id },
        data: { status: "EXPIRED" as any },
      });
      return err("INVITE_EXPIRED", "Invite has expired", 410);
    }

    if (invite.invitedUserId && invite.invitedUserId !== me.id) {
      return err("FORBIDDEN", "This invite is for another user", 403);
    }

    if (invite.email && invite.email.toLowerCase() !== me.email.toLowerCase()) {
      return err("FORBIDDEN", "This invite email does not match your account", 403);
    }

    await ensureOwnerMembership(invite.watchlist.id, invite.watchlist.ownerId);

    const member = await prisma.watchlistMember.upsert({
      where: {
        watchlistId_userId: {
          watchlistId: invite.watchlistId,
          userId: me.id,
        },
      },
      update: {
        role: invite.role as any,
        status: "ACTIVE" as any,
        joinedAt: new Date(),
      },
      create: {
        watchlistId: invite.watchlistId,
        userId: me.id,
        role: invite.role as any,
        status: "ACTIVE" as any,
        joinedAt: new Date(),
        invitedByUserId: invite.invitedByUserId,
      },
    });

    await prisma.watchlistInvite.update({
      where: { id: invite.id },
      data: {
        status: "ACCEPTED" as any,
        acceptedAt: new Date(),
        invitedUserId: me.id,
        email: me.email.toLowerCase(),
      },
    });

    await recordWatchlistActivity({
      watchlistId: invite.watchlistId,
      actorId: me.id,
      type: "MEMBER_JOINED",
      targetUserId: me.id,
      metadata: { inviteId: invite.id, role: member.role },
    });

    return ok({
      watchlistId: invite.watchlistId,
      watchlistName: invite.watchlist.name,
      member: {
        id: member.id,
        userId: member.userId,
        role: member.role,
        status: member.status,
        joinedAt: member.joinedAt,
      },
    });
  } catch (error) {
    console.error("POST /api/watchlists/invites/[token]/accept error", error);
    return err("INTERNAL_ERROR", "Failed to accept invite", 500);
  }
}

