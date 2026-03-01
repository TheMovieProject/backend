import { NextRequest } from "next/server";
import type { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import {
  DEFAULT_WATCHLIST_SLUG,
  LEGACY_DEFAULT_WATCHLIST_SLUG,
  buildUniqueWatchlistSlug,
  err,
  getAccessibleWatchlistForUser,
  getCurrentUserOrNull,
  normalizeVisibility,
  ok,
  parseWatchlistSummary,
  recordWatchlistActivity,
  roleCanManage,
  sortWatchlistItemsByRank,
  visibilityToLegacyIsPublic,
} from "@/app/libs/watchlists";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const maxDuration = 30;

function mapMember(member: any) {
  return {
    id: member.id,
    userId: member.userId,
    role: member.role,
    status: member.status,
    joinedAt: member.joinedAt,
    createdAt: member.createdAt,
    user: member.user
      ? {
          id: member.user.id,
          name: member.user.name,
          username: member.user.username,
          avatarUrl: member.user.avatarUrl,
          image: member.user.image,
          email: member.user.email,
        }
      : null,
  };
}

function mapInvite(invite: any) {
  return {
    id: invite.id,
    token: invite.token,
    email: invite.email,
    invitedUserId: invite.invitedUserId,
    role: invite.role,
    status: invite.status,
    expiresAt: invite.expiresAt,
    acceptedAt: invite.acceptedAt,
    createdAt: invite.createdAt,
    invitedUser: invite.invitedUser
      ? {
          id: invite.invitedUser.id,
          email: invite.invitedUser.email,
          name: invite.invitedUser.name,
          username: invite.invitedUser.username,
        }
      : null,
    invitedByUser: invite.invitedByUser
      ? {
          id: invite.invitedByUser.id,
          email: invite.invitedByUser.email,
          name: invite.invitedByUser.name,
          username: invite.invitedByUser.username,
        }
      : null,
  };
}

function mapItem(item: any) {
  return {
    id: item.id,
    watchlistId: item.watchlistId,
    movieId: item.movieId,
    notes: item.notes ?? null,
    rank: typeof item.rank === "number" ? item.rank : null,
    addedAt: item.addedAt,
    updatedAt: item.updatedAt ?? null,
    addedByUserId: item.addedByUserId ?? null,
    movie: item.movie,
    addedByUser: item.addedByUser
      ? {
          id: item.addedByUser.id,
          name: item.addedByUser.name,
          username: item.addedByUser.username,
          avatarUrl: item.addedByUser.avatarUrl,
          image: item.addedByUser.image,
        }
      : null,
  };
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const me = await getCurrentUserOrNull();
    if (!me) return err("UNAUTHORIZED", "Unauthorized", 401);

    const access = await getAccessibleWatchlistForUser(params.id, me.id);
    if (!access) return err("NOT_FOUND", "Watchlist not found", 404);

    const full = await prisma.watchlist.findUnique({
      where: { id: params.id },
      include: {
        owner: {
          select: { id: true, name: true, username: true, email: true, avatarUrl: true, image: true },
        },
        _count: {
          select: { items: true, members: true },
        },
        items: {
          orderBy: [{ rank: "asc" }, { addedAt: "asc" }],
          include: {
            movie: {
              select: {
                id: true,
                tmdbId: true,
                title: true,
                posterUrl: true,
              },
            },
            addedByUser: {
              select: { id: true, name: true, username: true, avatarUrl: true, image: true },
            },
          },
        },
        members: {
          where: { status: "ACTIVE" as any },
          orderBy: [{ createdAt: "asc" }],
          include: {
            user: {
              select: { id: true, name: true, username: true, email: true, avatarUrl: true, image: true },
            },
          },
        },
        invites: roleCanManage(access.role)
          ? {
              where: { status: "INVITED" as any },
              orderBy: [{ createdAt: "desc" }],
              include: {
                invitedUser: {
                  select: { id: true, name: true, username: true, email: true },
                },
                invitedByUser: {
                  select: { id: true, name: true, username: true, email: true },
                },
              },
            }
          : false,
      },
    });

    if (!full) return err("NOT_FOUND", "Watchlist not found", 404);

    const summary = parseWatchlistSummary(full, me.id);
    const sortedItems = sortWatchlistItemsByRank(full.items);

    return ok({
      watchlist: {
        ...summary,
        visibility: full.visibility || (full.isPublic ? "SHARED" : "PRIVATE"),
        owner: full.owner,
        canEdit: access.role === "OWNER" || access.role === "EDITOR",
        canManage: roleCanManage(access.role),
        items: sortedItems.map(mapItem),
        members: full.members.map(mapMember),
        pendingInvites: Array.isArray(full.invites) ? full.invites.map(mapInvite) : [],
      },
    });
  } catch (error) {
    console.error("GET /api/watchlists/[id] error", error);
    return err("INTERNAL_ERROR", "Failed to load watchlist", 500);
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const me = await getCurrentUserOrNull();
    if (!me) return err("UNAUTHORIZED", "Unauthorized", 401);

    const access = await getAccessibleWatchlistForUser(params.id, me.id);
    if (!access) return err("NOT_FOUND", "Watchlist not found", 404);
    if (!roleCanManage(access.role)) return err("FORBIDDEN", "Owner access required", 403);

    if (
      access.watchlist.isSystemDefault ||
      access.watchlist.slug === DEFAULT_WATCHLIST_SLUG ||
      access.watchlist.slug === LEGACY_DEFAULT_WATCHLIST_SLUG
    ) {
      return err("FORBIDDEN", "Default watchlist cannot be deleted", 403);
    }

    await prisma.watchlist.delete({
      where: { id: access.watchlist.id },
    });

    return ok({ deleted: true, watchlistId: access.watchlist.id });
  } catch (error) {
    console.error("DELETE /api/watchlists/[id] error", error);
    return err("INTERNAL_ERROR", "Failed to delete watchlist", 500);
  }
}

export async function PATCH(
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
    const patch: Record<string, unknown> = {};
    let activityChanges: Prisma.InputJsonObject = {};

    if (typeof body?.name === "string") {
      const name = body.name.trim().slice(0, 60);
      if (!name || name.length < 2) {
        return err("VALIDATION_ERROR", "Watchlist name must be at least 2 characters.", 400);
      }
      if (access.watchlist.isSystemDefault || access.watchlist.slug === "all-watchlisted" || access.watchlist.slug === "my-watchlist") {
        return err("FORBIDDEN", "Default watchlist name cannot be changed.", 403);
      }
      patch.name = name;
      patch.slug = await buildUniqueWatchlistSlug(access.watchlist.ownerId, name);
      activityChanges = { ...activityChanges, name };
    }

    if (typeof body?.coverImage === "string" || body?.coverImage === null) {
      const coverImage =
        typeof body.coverImage === "string" && body.coverImage.trim()
          ? body.coverImage.trim().slice(0, 500)
          : null;
      patch.coverImage = coverImage;
      activityChanges = { ...activityChanges, coverImage };
    }

    if (typeof body?.visibility === "string") {
      const visibility = normalizeVisibility(body.visibility);
      patch.visibility = visibility as any;
      patch.isPublic = visibilityToLegacyIsPublic(visibility);
      activityChanges = { ...activityChanges, visibility };
    }

    if (!Object.keys(patch).length) {
      return err("VALIDATION_ERROR", "No valid updates provided.", 400);
    }

    const updated = await prisma.watchlist.update({
      where: { id: access.watchlist.id },
      data: patch,
      include: {
        _count: { select: { items: true } },
        members: { where: { userId: me.id, status: "ACTIVE" as any }, select: { userId: true, role: true } },
      },
    });

    await recordWatchlistActivity({
      watchlistId: access.watchlist.id,
      actorId: me.id,
      type: "WATCHLIST_UPDATED",
      metadata: activityChanges,
    });

    return ok({ watchlist: parseWatchlistSummary(updated, me.id) });
  } catch (error) {
    const maybe = error as { code?: string };
    if (maybe?.code === "P2002") {
      return err("CONFLICT", "A watchlist with that slug already exists.", 409);
    }
    console.error("PATCH /api/watchlists/[id] error", error);
    return err("INTERNAL_ERROR", "Failed to update watchlist", 500);
  }
}
