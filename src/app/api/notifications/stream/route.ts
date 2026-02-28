import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import prisma from "@/app/libs/prismaDB";
import { subscribeUserNotifications } from "@/app/libs/notification_bus";

export const dynamic = "force-dynamic";

async function getCurrentUserId() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return null;

  const me = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  });

  return me?.id ?? null;
}

export async function GET(req: Request) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      const send = (payload: unknown) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
      };

      send({ type: "connected" });

      const unsubscribe = subscribeUserNotifications(userId, (payload) => {
        send({ type: "notification", payload });
      });

      const keepAlive = setInterval(() => {
        controller.enqueue(encoder.encode(`: ping\n\n`));
      }, 25000);

      req.signal.addEventListener("abort", () => {
        clearInterval(keepAlive);
        unsubscribe();
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
