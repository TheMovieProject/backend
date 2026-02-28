import { EventEmitter } from "events";

type NotificationListener = (payload: unknown) => void;

type GlobalWithBus = typeof globalThis & {
  __notification_bus__?: EventEmitter;
};

function getBus(): EventEmitter {
  const g = globalThis as GlobalWithBus;
  if (!g.__notification_bus__) {
    g.__notification_bus__ = new EventEmitter();
    g.__notification_bus__.setMaxListeners(500);
  }
  return g.__notification_bus__;
}

function channel(userId: string): string {
  return `user:${userId}`;
}

export function publishUserNotification(userId: string, payload: unknown): void {
  getBus().emit(channel(userId), payload);
}

export function subscribeUserNotifications(
  userId: string,
  listener: NotificationListener
): () => void {
  const bus = getBus();
  const ch = channel(userId);
  bus.on(ch, listener);
  return () => bus.off(ch, listener);
}
