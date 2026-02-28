"use client";

import { useEffect, useMemo, useState } from "react";
import PostCard from "./PostCard";
import PostModal from "./PostModal";

function FeedSkeleton() {
  return (
    <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 [column-gap:1rem]">
      {Array.from({ length: 12 }).map((_, i) => (
        <div key={i} className="mb-4 break-inside-avoid animate-pulse">
          <div className="rounded-2xl overflow-hidden bg-white/10 border border-white/10">
            <div className="h-[220px] bg-white/10" />
            <div className="p-3 space-y-2">
              <div className="h-3 w-4/5 bg-white/10 rounded" />
              <div className="h-3 w-2/3 bg-white/10 rounded" />
              <div className="flex gap-3 pt-1">
                <div className="h-3 w-10 bg-white/10 rounded" />
                <div className="h-3 w-10 bg-white/10 rounded" />
                <div className="h-3 w-10 bg-white/10 rounded" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function dedupeItems(items = []) {
  const seen = new Set();
  const out = [];
  for (const item of items) {
    const key = `${item.type}-${item.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

export default function UserFeed() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [activePost, setActivePost] = useState(null);
  const [mode, setMode] = useState("forYou");
  const [loadedModes, setLoadedModes] = useState(() => new Set());

  const [forYouItems, setForYouItems] = useState([]);
  const [followingItems, setFollowingItems] = useState([]);

  useEffect(() => {
    let alive = true;
    const controller = new AbortController();

    async function load(targetMode) {
      if (loadedModes.has(targetMode)) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setErr(null);

        const limit = targetMode === "following" ? 40 : 60;
        const response = await fetch(`/api/feed?mode=${targetMode}&limit=${limit}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        const json = await response.json();

        if (!response.ok) {
          throw new Error(
            json?.error ||
              (targetMode === "following" ? "Failed to load following feed" : "Failed to load feed")
          );
        }

        if (!alive) return;

        const items = dedupeItems(json?.items || []);
        if (targetMode === "following") {
          setFollowingItems(items);
        } else {
          setForYouItems(items);
        }

        setLoadedModes((prev) => {
          const next = new Set(prev);
          next.add(targetMode);
          return next;
        });
      } catch (e) {
        if (!alive || e?.name === "AbortError") return;
        setErr(e);
      } finally {
        if (alive) setLoading(false);
      }
    }

    void load(mode);
    return () => {
      alive = false;
      controller.abort();
    };
  }, [loadedModes, mode]);

  const visibleItems = useMemo(() => {
    if (mode === "following") return followingItems;
    return dedupeItems([...followingItems, ...forYouItems]);
  }, [mode, forYouItems, followingItems]);

  return (
    <>
      <div className="min-h-screen bg-yellow-600">
        <section className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-8 space-y-6">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-white">Community Feed</h1>
            <div className="inline-flex rounded-full border border-white/20 bg-black/20 p-1">
              <button
                onClick={() => setMode("forYou")}
                className={`px-4 py-1.5 text-sm rounded-full transition ${
                  mode === "forYou" ? "bg-white text-black" : "text-white/80 hover:text-white"
                }`}
              >
                For You
              </button>
              <button
                onClick={() => setMode("following")}
                className={`px-4 py-1.5 text-sm rounded-full transition ${
                  mode === "following" ? "bg-white text-black" : "text-white/80 hover:text-white"
                }`}
              >
                Following
              </button>
            </div>
          </div>

          {loading && <FeedSkeleton />}

          {err && (
            <div className="text-red-200 bg-red-900/30 border border-red-200/20 rounded-xl px-4 py-3">
              Failed to load feed.
            </div>
          )}

          {!loading && !err && visibleItems.length === 0 && (
            <div className="rounded-xl border border-white/20 bg-black/20 p-6 text-white/80">
              No posts yet in this feed.
            </div>
          )}

          {!loading && !err && visibleItems.length > 0 && (
            <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 [column-gap:1rem]">
              {visibleItems.map((item) => (
                <div key={`${item.type}-${item.id}`} className="mb-4 break-inside-avoid">
                  <PostCard item={item} onOpenPost={setActivePost} />
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {activePost && <PostModal post={activePost} onClose={() => setActivePost(null)} />}
    </>
  );
}
