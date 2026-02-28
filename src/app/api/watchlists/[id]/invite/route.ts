import { NextRequest } from "next/server";
import prisma from "@/app/libs/prismaDB";
import {
  createInviteToken,
  err,
  getAccessibleWatchlistForUser,
  getCurrentUserOrNull,
  ok,
  recordWatchlistActivity,
  roleCanManage,
  safeListRoleFromBody,
} from "@/app/libs/watchlists";

const INVITE_EXPIRY_DAYS = 7;

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const me = await getCurrentUserOrNull();
    if (!me) return err("UNAUTHORIZED", "Unauthorized", 401);

    const access = await getAccessibleWatchlistForUser(params.id, me.id);
    if (!access) return err("NOT_FOUND", "Watchlist not found", 404);
    if (!roleCanManage(access.role)) return err("FORBIDDEN", "Owner access required", 403);

    const body = await req.json().catch(() => ({}));
    const requestedRole = safeListRoleFromBody(body?.role);
    const userId = typeof body?.userId === "string" && body.userId.trim() ? body.userId.trim() : null;
    const email = typeof body?.email === "string" && body.email.trim() ? body.email.trim().toLowerCase() : null;

    if (!userId && !email) {
      return err("VALIDATION_ERROR", "Provide email or userId for invite", 400);
    }

    const targetUser = userId
      ? await prisma.user.findUnique({
          where: { id: userId },
          select: { id: true, email: true, name: true, username: true },
        })
      : email
        ? await prisma.user.findUnique({
            where: { email },
            select: { id: true, email: true, name: true, username: true },
          })
        : null;

    const targetEmail = targetUser?.email || email;
    const targetUserId = targetUser?.id || null;

    if (targetUserId === access.watchlist.ownerId || targetEmail === me.email) {
      return err("VALIDATION_ERROR", "Owner is already a member", 400);
    }

    if (targetUserId) {
      const existingMember = await prisma.watchlistMember.findUnique({
        where: {
          watchlistId_userId: {
            watchlistId: access.watchlist.id,
            userId: targetUserId,
          },
        },
        select: { id: true, status: true, role: true },
      });

      if (existingMember?.status === "ACTIVE") {
        return err("CONFLICT", "User is already a member", 409);
      }
    }

    const existingPendingInvite = await prisma.watchlistInvite.findFirst({
      where: {
        watchlistId: access.watchlist.id,
        status: "INVITED" as any,
        expiresAt: { gt: new Date() },
        OR: [
          ...(targetUserId ? [{ invitedUserId: targetUserId }] : []),
          ...(targetEmail ? [{ email: targetEmail }] : []),
        ],
      },
      orderBy: [{ createdAt: "desc" }],
    });

    if (existingPendingInvite) {
      return ok({
        invite: {
          id: existingPendingInvite.id,
          token: existingPendingInvite.token,
          role: existingPendingInvite.role,
          status: existingPendingInvite.status,
          email: existingPendingInvite.email,
          invitedUserId: existingPendingInvite.invitedUserId,
          expiresAt: existingPendingInvite.expiresAt,
          createdAt: existingPendingInvite.createdAt,
          acceptUrl: `${req.nextUrl.origin}/api/watchlists/invites/${existingPendingInvite.token}/accept`,
        },
      });
    }

    const expiresAt = new Date(Date.now() + INVITE_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
    const token = createInviteToken();

    const invite = await prisma.watchlistInvite.create({
      data: {
        watchlistId: access.watchlist.id,
        token,
        email: targetEmail ?? null,
        invitedUserId: targetUserId,
        invitedByUserId: me.id,
        role: requestedRole as any,
        status: "INVITED" as any,
        expiresAt,
      },
    });

    await recordWatchlistActivity({
      watchlistId: access.watchlist.id,
      actorId: me.id,
      type: "MEMBER_INVITED",
      targetUserId: targetUserId ?? null,
      metadata: { email: targetEmail ?? null, role: requestedRole },
    });

    return ok(
      {
        invite: {
          id: invite.id,
          token: invite.token,
          role: invite.role,
          status: invite.status,
          email: invite.email,
          invitedUserId: invite.invitedUserId,
          expiresAt: invite.expiresAt,
          createdAt: invite.createdAt,
          acceptUrl: `${req.nextUrl.origin}/api/watchlists/invites/${invite.token}/accept`,
        },
      },
      201
    );
  } catch (error) {
    console.error("POST /api/watchlists/[id]/invite error", error);
    return err("INTERNAL_ERROR", "Failed to create invite", 500);
  }
}

