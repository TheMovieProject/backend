import prisma from "@/app/libs/prismaDB";
import { publishUserNotification } from "@/app/libs/notification_bus";

type NotificationInput = {
  userId: string;
  actorId?: string | null;
  type: "FOLLOW" | "REACTION_LIKE" | "REACTION_FIRE" | "SYSTEM";
  entityType?: string | null;
  entityId?: string | null;
  title: string;
  body?: string | null;
  link?: string | null;
};

export async function createNotification(input: NotificationInput) {
  if (!input.userId) return null;
  if (input.actorId && input.actorId === input.userId) return null;

  const notification = await prisma.notification.create({
    data: {
      userId: input.userId,
      actorId: input.actorId ?? null,
      type: input.type,
      entityType: input.entityType ?? null,
      entityId: input.entityId ?? null,
      title: input.title,
      body: input.body ?? null,
      link: input.link ?? null,
    },
    include: {
      actor: {
        select: {
          id: true,
          username: true,
          avatarUrl: true,
          image: true,
        },
      },
    },
  });

  const shaped = toClientNotification(notification);
  publishUserNotification(input.userId, shaped);
  return shaped;
}

export function toClientNotification(
  notification: {
    id: string;
    type: string;
    title: string;
    body: string | null;
    link: string | null;
    readAt: Date | null;
    createdAt: Date;
    actorId?: string | null;
    actor?: {
      id: string;
      username: string | null;
      avatarUrl: string | null;
      image: string | null;
    } | null;
  }
) {
  return {
    id: notification.id,
    type: notification.type,
    title: notification.title,
    body: notification.body,
    link: notification.link,
    read: !notification.readAt ? false : true,
    createdAt: notification.createdAt,
    actor: notification.actor
      ? {
          id: notification.actor.id,
          username: notification.actor.username,
          avatarUrl: notification.actor.avatarUrl || notification.actor.image || null,
        }
      : null,
  };
}
