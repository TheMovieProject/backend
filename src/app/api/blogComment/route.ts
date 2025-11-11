import { getServerSession } from "next-auth";
import type { NextAuthOptions } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import prisma from "@/app/libs/prismaDB";

const toClient = (c: any) => ({
  id: c.id,
  content: c.content,
  parentId: c.parentId ?? null,
  createdAt: c.createdAt,
  user: {
    id: c.user.id,
    username: c.user.username,
    avatarUrl: c.user.avatarUrl,
    image: c.user.image,
  },
});

/** GET /api/blogComment?blogId=...  → flat list (client builds tree) */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const blogId = url.searchParams.get("blogId");
    if (!blogId) return new Response("Missing blogId", { status: 400 });

    const rows = await prisma.blogComment.findMany({
      where: { blogId },
      include: { user: { select: { id: true, username: true, avatarUrl: true, image: true } } },
      orderBy: { createdAt: "desc" },
    });

    return new Response(JSON.stringify(rows.map(toClient)), {
      status: 200,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    });
  } catch (e: any) {
    console.error("[blogComment GET]", e);
    return new Response(e.message || "Server error", { status: 500 });
  }
}

/** POST /api/blogComment  { blogId, content, parentId? } */
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions as unknown as NextAuthOptions);
    if (!session?.user?.email) return new Response("Unauthorized", { status: 401 });

    const me = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!me) return new Response("User not found", { status: 404 });

    const { blogId, content, parentId } = await req.json();
    if (!blogId || !content?.trim()) return new Response("Invalid data", { status: 400 });

    // blog must exist
    const blog = await prisma.blog.findUnique({ where: { id: blogId } });
    if (!blog) return new Response("Blog not found", { status: 404 });

    // if replying, parent must exist and belong to same blog
    if (parentId) {
      const parent = await prisma.blogComment.findUnique({ where: { id: parentId } });
      if (!parent || parent.blogId !== blogId) {
        return new Response("Parent comment not found", { status: 404 });
      }
    }

    const created = await prisma.blogComment.create({
      data: {
        content: content.trim(),
        userId: me.id,
        blogId,
        parentId: parentId ?? null,
      },
      include: { user: { select: { id: true, username: true, avatarUrl: true, image: true } } },
    });

    return new Response(JSON.stringify(toClient(created)), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("[blogComment POST]", e);
    return new Response(e.message || "Server error", { status: 500 });
  }
}

/** DELETE /api/blogComment?commentId=...  (author-only, cascades) */
export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions as unknown as NextAuthOptions);
    if (!session?.user?.email) return new Response("Unauthorized", { status: 401 });

    const me = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!me) return new Response("User not found", { status: 404 });

    const url = new URL(req.url);
    const commentId = url.searchParams.get("commentId");
    if (!commentId) return new Response("Missing commentId", { status: 400 });

    const c = await prisma.blogComment.findUnique({ where: { id: commentId } });
    if (!c || c.userId !== me.id) return new Response("Forbidden", { status: 403 });

    // collect descendants
    const toDelete = new Set<string>([commentId]);
    const queue = [commentId];
    while (queue.length) {
      const id = queue.shift()!;
      const kids = await prisma.blogComment.findMany({
        where: { parentId: id },
        select: { id: true },
      });
      for (const k of kids) if (!toDelete.has(k.id)) {
        toDelete.add(k.id);
        queue.push(k.id);
      }
    }
    await prisma.blogComment.deleteMany({ where: { id: { in: Array.from(toDelete) } } });

    return new Response("Deleted", { status: 200 });
  } catch (e: any) {
    console.error("[blogComment DELETE]", e);
    return new Response("Server error", { status: 500 });
  }
}
