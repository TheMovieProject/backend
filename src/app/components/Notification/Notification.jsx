"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Flame, Heart, UserPlus } from "lucide-react";
import { formatRelativeTime } from "@/app/libs/dateUtils";

const NOTIFICATION_POLL_INTERVAL = 30000;

function typeIcon(type) {
  switch (type) {
    case "FOLLOW":
      return <UserPlus className="w-4 h-4" />;
    case "REACTION_LIKE":
      return <Heart className="w-4 h-4 text-red-400" />;
    case "REACTION_FIRE":
      return <Flame className="w-4 h-4 text-orange-400" />;
    default:
      return <span className="text-sm leading-none">🔥</span>;
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
          {formatRelativeTime(item.createdAt, { addSuffix: true })}
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

export default function NotificationBell({ docked = false }) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [markingRead, setMarkingRead] = useState(false);
  const dropdownRef = useRef(null);
  const preparedRef = useRef(false);
  const latestFetchIdRef = useRef(0);

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

  const fetchNotifications = useCallback(async () => {
    const fetchId = ++latestFetchIdRef.current;
    try {
      const res = await fetch("/api/notifications?limit=40", {
        cache: "no-store",
        credentials: "same-origin",
      });
      if (!res.ok) return;
      const data = await res.json();
      if (fetchId !== latestFetchIdRef.current) return;
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

    return scheduleIdleWarmup();
  }, [prepareNotifications]);

  useEffect(() => {
    function onClickOutside(event) {
      if (!dropdownRef.current) return;
      if (!dropdownRef.current.contains(event.target)) {
        setOpen(false);
      }
    }

    window.addEventListener("pointerdown", onClickOutside);
    return () => window.removeEventListener("pointerdown", onClickOutside);
  }, []);

  useEffect(() => {
    if (!open) return undefined;

    void fetchNotifications();

    const intervalId = window.setInterval(() => {
      void fetchNotifications();
    }, NOTIFICATION_POLL_INTERVAL);

    return () => window.clearInterval(intervalId);
  }, [open, fetchNotifications]);

  const markRead = async () => {
    if (!effectiveUnreadCount || markingRead) return;
    setMarkingRead(true);
    latestFetchIdRef.current += 1;
    try {
      const res = await fetch("/api/notifications/mark-read", {
        method: "POST",
        cache: "no-store",
        credentials: "same-origin",
      });
      if (!res.ok) {
        throw new Error(`mark-read failed (${res.status})`);
      }
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      await fetchNotifications();
    } catch (error) {
      console.error("Failed to mark notifications as read", error);
    } finally {
      setMarkingRead(false);
    }
  };

  const toggle = () => {
    setOpen((prev) => !prev);
  };

  const handleNavigate = () => {
    setOpen(false);
    void markRead();
  };

  const triggerClassName = docked
    ? "relative h-10 w-10 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 transition grid place-items-center"
    : "relative p-2 rounded-full border border-white/20 bg-white/10 hover:bg-white/20 transition";
  const triggerEmojiClassName = docked ? "text-lg leading-none" : "text-base leading-none";

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={toggle}
        onMouseEnter={() => void prepareNotifications()}
        onFocus={() => void prepareNotifications()}
        className={triggerClassName}
        aria-label="Notifications"
      >
        <span aria-hidden="true" className={triggerEmojiClassName}>
          🔥
        </span>
        {effectiveUnreadCount > 0 && (
          <span className="absolute -top-1 -right-1 h-5 min-w-5 rounded-full bg-red-500 text-white text-[10px] font-bold grid place-items-center px-1">
            {effectiveUnreadCount > 99 ? "99+" : effectiveUnreadCount}
          </span>
        )}
        {!docked && effectiveUnreadCount === 0 && (
          <span className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-white/30" />
        )}
      </button>

      {open && (
        <div className="fixed left-2 right-2 bottom-[5.25rem] mt-0 rounded-2xl border border-white/20 bg-black/90 backdrop-blur-2xl shadow-2xl overflow-hidden z-[90] sm:absolute sm:right-0 sm:left-auto sm:top-full sm:bottom-auto sm:mt-3 sm:w-[360px] sm:max-w-[92vw]">
          <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between gap-2 flex-wrap">
            <h3 className="text-sm font-semibold text-white">Notifications</h3>
            <div className="flex items-center gap-2 min-w-0">
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
                  disabled={markingRead}
                  className="text-[11px] text-white/80 hover:text-white px-2 py-1 rounded-md border border-white/15 bg-white/5 hover:bg-white/10 disabled:opacity-60 disabled:cursor-not-allowed transition"
                >
                  {markingRead ? "Marking..." : "Mark all read"}
                </button>
              ) : null}
            </div>
          </div>

          <div className="p-2 space-y-2 max-h-[min(65vh,420px)] overflow-y-auto">
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
