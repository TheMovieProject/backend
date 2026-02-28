"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Bell, Flame, Heart, UserPlus } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

function typeIcon(type) {
  switch (type) {
    case "FOLLOW":
      return <UserPlus className="w-4 h-4" />;
    case "REACTION_LIKE":
      return <Heart className="w-4 h-4 text-red-400" />;
    case "REACTION_FIRE":
      return <Flame className="w-4 h-4 text-orange-400" />;
    default:
      return <Bell className="w-4 h-4" />;
  }
}

function NotificationItem({ item, onNavigate }) {
  const link = item.link || (item.actor?.id ? `/profile/${item.actor.id}` : "#");
  const avatar = item.actor?.avatarUrl || "/img/profile.png";
  const label = item.actor?.username ? `@${item.actor.username}` : "Someone";

  return (
    <Link
      href={link}
      onClick={onNavigate}
      className={`grid grid-cols-[40px_1fr_auto] items-start gap-3 px-3 py-3 rounded-xl transition ${
        item.read ? "bg-white/5 hover:bg-white/10" : "bg-yellow-500/20 hover:bg-yellow-500/25"
      }`}
    >
      <div className="relative w-10 h-10 rounded-full overflow-hidden border border-white/20">
        <Image src={avatar} alt="actor" fill className="object-cover" />
      </div>

      <div className="min-w-0">
        <p className="text-sm text-white leading-snug">
          <span className="font-semibold">{label}</span> {item.title}
        </p>
        {item.body ? <p className="text-xs text-white/70 mt-1">{item.body}</p> : null}
        <p className="text-[11px] text-white/50 mt-1">
          {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
        </p>
      </div>

      <div className="pt-1 flex items-center gap-2 text-white/70">
        {!item.read ? (
          <span
            className="inline-block h-2 w-2 rounded-full bg-yellow-300 shadow-[0_0_10px_rgba(253,224,71,0.9)]"
            aria-label="Unread notification"
            title="Unread"
          />
        ) : null}
        {typeIcon(item.type)}
      </div>
    </Link>
  );
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const dropdownRef = useRef(null);
  const streamRef = useRef(null);
  const reconnectTimerRef = useRef(null);
  const preparedRef = useRef(false);

  const sorted = useMemo(
    () =>
      [...notifications].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ),
    [notifications]
  );

  const localUnreadCount = useMemo(
    () => notifications.reduce((count, item) => count + (item?.read ? 0 : 1), 0),
    [notifications]
  );

  const effectiveUnreadCount = unreadCount > 0 ? unreadCount : localUnreadCount;
  const shouldScrollList = sorted.length > 6;

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications?limit=40");
      if (!res.ok) return;
      const data = await res.json();
      const nextNotifications = Array.isArray(data?.notifications) ? data.notifications : [];
      const nextUnreadCount =
        typeof data?.unreadCount === "number"
          ? data.unreadCount
          : nextNotifications.reduce((count, item) => count + (item?.read ? 0 : 1), 0);

      setNotifications(nextNotifications);
      setUnreadCount(nextUnreadCount);
      setLoaded(true);
      preparedRef.current = true;
    } catch (error) {
      console.error("Failed to fetch notifications", error);
    }
  }, []);

  const startStream = () => {
    if (streamRef.current) return;

    const connect = () => {
      const source = new EventSource("/api/notifications/stream");
      streamRef.current = source;

      source.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data);
          if (parsed?.type !== "notification" || !parsed?.payload) return;
          const notification = parsed.payload;

          setNotifications((prev) => {
            const withoutDuplicate = prev.filter((item) => item.id !== notification.id);
            return [notification, ...withoutDuplicate].slice(0, 80);
          });
          setUnreadCount((prev) => prev + (notification?.read ? 0 : 1));
          setLoaded(true);
        } catch (error) {
          console.error("SSE parse error", error);
        }
      };

      source.onerror = () => {
        source.close();
        if (streamRef.current === source) {
          streamRef.current = null;
        }

        if (reconnectTimerRef.current) {
          window.clearTimeout(reconnectTimerRef.current);
        }

        reconnectTimerRef.current = window.setTimeout(() => {
          reconnectTimerRef.current = null;
          startStream();
        }, 2500);
      };
    };

    connect();
  };

  const prepareNotifications = useCallback(async () => {
    if (preparedRef.current) return;
    await fetchNotifications();
  }, [fetchNotifications]);

  useEffect(() => {
    const scheduleIdleWarmup = () => {
      if (typeof window.requestIdleCallback === "function") {
        const idleId = window.requestIdleCallback(() => {
          void prepareNotifications();
        }, { timeout: 2000 });

        return () => window.cancelIdleCallback(idleId);
      }

      const timeoutId = window.setTimeout(() => {
        void prepareNotifications();
      }, 1200);

      return () => window.clearTimeout(timeoutId);
    };

    const cleanupIdle = scheduleIdleWarmup();
    return () => {
      cleanupIdle();
      streamRef.current?.close();
      streamRef.current = null;
      if (reconnectTimerRef.current) {
        window.clearTimeout(reconnectTimerRef.current);
      }
    };
  }, [prepareNotifications]);

  useEffect(() => {
    function onClickOutside(event) {
      if (!dropdownRef.current) return;
      if (!dropdownRef.current.contains(event.target)) {
        setOpen(false);
      }
    }

    window.addEventListener("mousedown", onClickOutside);
    return () => window.removeEventListener("mousedown", onClickOutside);
  }, []);

  const markRead = async () => {
    if (!effectiveUnreadCount) return;
    try {
      const res = await fetch("/api/notifications/mark-read", { method: "POST" });
      if (!res.ok) {
        throw new Error(`mark-read failed (${res.status})`);
      }
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (error) {
      console.error("Failed to mark notifications as read", error);
    }
  };

  const toggle = () => {
    setOpen((prev) => {
      const next = !prev;
      if (next) {
        void prepareNotifications();
        startStream();
      }
      return next;
    });
  };

  const handleNavigate = () => {
    setOpen(false);
    void markRead();
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={toggle}
        onMouseEnter={() => void prepareNotifications()}
        onFocus={() => void prepareNotifications()}
        className="relative p-2 rounded-full border border-white/20 bg-white/10 hover:bg-white/20 transition"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5 text-white" />
        {effectiveUnreadCount > 0 && (
          <span className="absolute -top-1 -right-1 h-5 min-w-5 rounded-full bg-red-500 text-white text-[10px] font-bold grid place-items-center px-1">
            {effectiveUnreadCount > 99 ? "99+" : effectiveUnreadCount}
          </span>
        )}
        {effectiveUnreadCount === 0 && (
          <span className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-white/30" />
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-3 w-[360px] max-w-[92vw] rounded-2xl border border-white/20 bg-black/90 backdrop-blur-2xl shadow-2xl overflow-hidden z-[80]">
          <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-white">Notifications</h3>
            <div className="flex items-center gap-2">
              <span
                className={`text-xs ${
                  effectiveUnreadCount > 0 ? "text-yellow-300" : "text-white/60"
                }`}
              >
                {effectiveUnreadCount} unread
              </span>
              {effectiveUnreadCount > 0 ? (
                <button
                  type="button"
                  onClick={markRead}
                  className="text-[11px] text-white/80 hover:text-white px-2 py-1 rounded-md border border-white/15 bg-white/5 hover:bg-white/10 transition"
                >
                  Mark all read
                </button>
              ) : null}
            </div>
          </div>

          <div
            className={`p-2 space-y-2 ${
              shouldScrollList ? "max-h-[420px] overflow-y-auto" : ""
            }`}
          >
            {!loaded ? (
              <div className="p-4 text-sm text-white/60">Loading...</div>
            ) : sorted.length === 0 ? (
              <div className="p-8 text-center text-sm text-white/60">
                No notifications yet
              </div>
            ) : (
              sorted.map((item) => (
                <NotificationItem key={item.id} item={item} onNavigate={handleNavigate} />
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
