import { NextRequest } from "next/server";
import prisma from "@/app/libs/prismaDB";
import { err, getCurrentUserOrNull, ok } from "@/app/libs/watchlists";

type ContactUser = {
  id: string;
  username: string | null;
  name: string | null;
  email: string | null;
  avatarUrl: string | null;
  image: string | null;
  relation: {
    follower: boolean;
    following: boolean;
  };
};

function mergeContact(map: Map<string, ContactUser>, user: any, relationKey: "follower" | "following") {
  if (!user?.id) return;
  const existing = map.get(user.id);
  if (existing) {
    existing.relation[relationKey] = true;
    return;
  }

  map.set(user.id, {
    id: user.id,
    username: user.username ?? null,
    name: user.name ?? null,
    email: user.email ?? null,
    avatarUrl: user.avatarUrl ?? null,
    image: user.image ?? null,
    relation: {
      follower: relationKey === "follower",
      following: relationKey === "following",
    },
  });
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
        include: {
          follower: {
            select: {
              id: true,
              username: true,
              name: true,
              email: true,
              avatarUrl: true,
              image: true,
            },
          },
        },
        take: 500,
      }),
      prisma.follow.findMany({
        where: { followerId: me.id },
        include: {
          following: {
            select: {
              id: true,
              username: true,
              name: true,
              email: true,
              avatarUrl: true,
              image: true,
            },
          },
        },
        take: 500,
      }),
    ]);

    const merged = new Map<string, ContactUser>();
    for (const row of followersRows) mergeContact(merged, row.follower, "follower");
    for (const row of followingRows) mergeContact(merged, row.following, "following");

    let contacts = [...merged.values()];
    if (q) {
      contacts = contacts.filter((user) => {
        const haystack = [user.username, user.name, user.email].filter(Boolean).join(" ").toLowerCase();
        return haystack.includes(q);
      });
    }

    contacts.sort((a, b) => {
      const aLabel = (a.username || a.name || a.email || "").toLowerCase();
      const bLabel = (b.username || b.name || b.email || "").toLowerCase();
      return aLabel.localeCompare(bLabel);
    });

    return ok({ contacts });
  } catch (error) {
    console.error("GET /api/watchlists/contacts error", error);
    return err("INTERNAL_ERROR", "Failed to load contacts", 500);
  }
}
