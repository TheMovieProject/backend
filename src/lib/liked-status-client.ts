"use client";

import { useEffect, useState } from "react";
import { getLikedChannel, type LikedEvent } from "@/app/libs/likedBus";

type Listener = (value: boolean) => void;

const likedCache = new Map<string, boolean>();
const pendingListeners = new Map<string, Set<Listener>>();
let flushTimer: number | null = null;

function normalizeMovieId(movieId: string | number | null | undefined) {
  return String(movieId ?? "").trim();
}

function resolvePending(movieIds: string[], likedMap: Record<string, boolean>) {
  for (const movieId of movieIds) {
    const nextValue = Boolean(likedMap[movieId]);
    likedCache.set(movieId, nextValue);

    const listeners = pendingListeners.get(movieId);
    pendingListeners.delete(movieId);
    listeners?.forEach((listener) => listener(nextValue));
  }
}

async function flushPendingRequests() {
  const movieIds = [...pendingListeners.keys()];
  if (!movieIds.length) return;

  try {
    const response = await fetch("/api/liked/status/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ movieIds }),
    });

    const payload = await response.json().catch(() => null);

    if (!response.ok || typeof payload?.liked !== "object") {
      throw new Error("Failed to load liked status");
    }

    resolvePending(movieIds, payload.liked);
  } catch (error) {
    console.error("Bulk liked status lookup failed", error);
    resolvePending(
      movieIds,
      Object.fromEntries(movieIds.map((movieId) => [movieId, likedCache.get(movieId) ?? false]))
    );
  }
}

function scheduleFlush() {
  if (flushTimer !== null || typeof window === "undefined") return;

  flushTimer = window.setTimeout(() => {
    flushTimer = null;
    void flushPendingRequests();
  }, 0);
}

function subscribeToPending(movieId: string, listener: Listener) {
  const listeners = pendingListeners.get(movieId) ?? new Set<Listener>();
  listeners.add(listener);
  pendingListeners.set(movieId, listeners);
  scheduleFlush();

  return () => {
    const activeListeners = pendingListeners.get(movieId);
    if (!activeListeners) return;
    activeListeners.delete(listener);
    if (!activeListeners.size) {
      pendingListeners.delete(movieId);
    }
  };
}

export function setLikedStatusCache(
  movieId: string | number | null | undefined,
  value: boolean
) {
  const normalizedMovieId = normalizeMovieId(movieId);
  if (!normalizedMovieId) return;
  likedCache.set(normalizedMovieId, Boolean(value));
}

export function invalidateLikedStatusCache(movieId?: string | number | null) {
  const normalizedMovieId = normalizeMovieId(movieId);
  if (normalizedMovieId) {
    likedCache.delete(normalizedMovieId);
    pendingListeners.delete(normalizedMovieId);
    return;
  }

  likedCache.clear();
  pendingListeners.clear();
}

export function useLikedStatus(
  movieId: string | number | null | undefined,
  initialValue = false
) {
  const normalizedMovieId = normalizeMovieId(movieId);
  const [isLiked, setIsLiked] = useState(() => {
    if (!normalizedMovieId) return false;
    return likedCache.get(normalizedMovieId) ?? initialValue;
  });

  useEffect(() => {
    if (!normalizedMovieId) {
      setIsLiked(false);
      return;
    }

    if (initialValue) {
      likedCache.set(normalizedMovieId, true);
      setIsLiked(true);
    }

    const cachedValue = likedCache.get(normalizedMovieId);
    if (typeof cachedValue === "boolean") {
      setIsLiked(cachedValue);
      if (!initialValue) {
        return;
      }
    }

    return subscribeToPending(normalizedMovieId, setIsLiked);
  }, [initialValue, normalizedMovieId]);

  useEffect(() => {
    if (!normalizedMovieId || typeof BroadcastChannel === "undefined") return;

    const channel = getLikedChannel();
    const handleMessage = (event: MessageEvent<LikedEvent>) => {
      if (String(event.data?.payload?.tmdbId ?? "") !== normalizedMovieId) return;
      const nextValue = event.data.type === "LIKED_ADD";
      likedCache.set(normalizedMovieId, nextValue);
      setIsLiked(nextValue);
    };

    channel.addEventListener("message", handleMessage as EventListener);
    return () => {
      channel.removeEventListener("message", handleMessage as EventListener);
    };
  }, [normalizedMovieId]);

  return [isLiked, setIsLiked] as const;
}
