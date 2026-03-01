import { NextRequest } from "next/server";
import prisma from "@/app/libs/prismaDB";
import { err, getCurrentUserOrNull, ok } from "@/app/libs/watchlists";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const maxDuration = 30;

type ContactUser = {
  id: string;
  username: string | null;
  name: string | null;
  avatarUrl: string | null;
  image: string | null;
  relation: {
    follower: boolean;
    following: boolean;
  };
};

function toContactUser(
  user: {
    id: string;
    username: string | null;
    name: string | null;
    avatarUrl: string | null;
    image: string | null;
  },
  relation: ContactUser["relation"]
): ContactUser {
  return {
    id: user.id,
    username: user.username ?? null,
    name: user.name ?? null,
    avatarUrl: user.avatarUrl ?? null,
    image: user.image ?? null,
    relation,
  };
}

export async function GET(req: NextRequest) {
  try {
    const me = await getCurrentUserOrNull();
    if (!me) return err("UNAUTHORIZED", "Unauthorized", 401);

    const q = String(req.nextUrl.searchParams.get("q") || "")
      .trim()
      .toLowerCase();

    const [followersRows, followingRows] = await Promise.all([
      prisma.follow.findMany({
        where: { followingId: me.id },
        select: { followerId: true },
        orderBy: { createdAt: "desc" },
        take: 500,
      }),
      prisma.follow.findMany({
        where: { followerId: me.id },
        select: { followingId: true },
        orderBy: { createdAt: "desc" },
        take: 500,
      }),
    ]);

    const relationMap = new Map<string, ContactUser["relation"]>();

    for (const row of followersRows) {
      const existing = relationMap.get(row.followerId);
      relationMap.set(row.followerId, {
        follower: true,
        following: existing?.following ?? false,
      });
    }

    for (const row of followingRows) {
      const existing = relationMap.get(row.followingId);
      relationMap.set(row.followingId, {
        follower: existing?.follower ?? false,
        following: true,
      });
    }

    const userIds = [...relationMap.keys()];
    if (!userIds.length) return ok({ contacts: [] });

    const users = await prisma.user.findMany({
      where: {
        id: { in: userIds },
      },
      select: {
        id: true,
        username: true,
        name: true,
        avatarUrl: true,
        image: true,
      },
    });

    const merged = new Map<string, ContactUser>();
    for (const user of users) {
      const relation = relationMap.get(user.id);
      if (!relation) continue;
      merged.set(user.id, toContactUser(user, relation));
    }

    let contacts = [...merged.values()];
    if (q) {
      contacts = contacts.filter((user) => {
        const haystack = [user.username, user.name].filter(Boolean).join(" ").toLowerCase();
        return haystack.includes(q);
      });
    }

    contacts.sort((a, b) => {
      const aLabel = (a.username || a.name || "").toLowerCase();
      const bLabel = (b.username || b.name || "").toLowerCase();
      return aLabel.localeCompare(bLabel);
    });

    return ok({ contacts });
  } catch (error) {
    console.error("GET /api/watchlists/contacts error", error);
    return err("INTERNAL_ERROR", "Failed to load contacts", 500);
  }
}
