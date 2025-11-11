// app/lib/likedBus.ts
"use client";

// One global broadcast channel (works across tabs + pages)
let channel: BroadcastChannel | null = null;

export function getLikedChannel() {
  if (!channel) channel = new BroadcastChannel("liked-events");
  return channel;
}

// Event shapes
export type LikedAddEvent = {
  type: "LIKED_ADD";
  payload: { tmdbId: string; title: string; posterUrl?: string | null };
};
export type LikedRemoveEvent = { type: "LIKED_REMOVE"; payload: { tmdbId: string } };
export type LikedEvent = LikedAddEvent | LikedRemoveEvent;
