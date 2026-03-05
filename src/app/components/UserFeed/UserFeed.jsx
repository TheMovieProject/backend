"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import PostCard from "./PostCard";
import PostModal from "./PostModal";

function FeedSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="animate-pulse rounded-[24px] bg-black/10 p-5 shadow-[0_12px_28px_rgba(0,0,0,0.14)]">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-white/10" />
              <div className="space-y-2">
                <div className="h-4 w-24 rounded bg-white/10" />
                <div className="h-3 w-16 rounded bg-white/10" />
              </div>
            </div>
            <div className="h-7 w-16 rounded-full bg-white/10" />
          </div>
          <div className="mt-4 grid min-h-[144px] grid-cols-[84px_minmax(0,1fr)] gap-4 sm:grid-cols-[96px_minmax(0,1fr)]">
            <div className="h-[126px] w-[84px] rounded-[16px] bg-white/10 sm:h-[144px] sm:w-[96px]" />
            <div className="py-1">
              <div className="h-6 w-36 rounded bg-white/10" />
              <div className="mt-3 h-5 w-16 rounded-full bg-white/10" />
              <div className="mt-3 h-4 w-full rounded bg-white/10" />
              <div className="mt-2 h-4 w-5/6 rounded bg-white/10" />
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between pt-3">
            <div className="flex gap-5">
              <div className="h-5 w-10 rounded bg-white/10" />
              <div className="h-5 w-10 rounded bg-white/10" />
              <div className="h-5 w-10 rounded bg-white/10" />
            </div>
            <div className="h-4 w-12 rounded bg-white/10" />
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

const INITIAL_LIMITS = {
  forYou: 8,
  following: 12,
};

export default function UserFeed() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [activePost, setActivePost] = useState(null);
  const [mode, setMode] = useState("forYou");
  const [forYouItems, setForYouItems] = useState([]);
  const [forYouCursor, setForYouCursor] = useState(null);
  const [forYouHasMore, setForYouHasMore] = useState(true);
  const [forYouLoaded, setForYouLoaded] = useState(false);
  const [forYouLoadingMore, setForYouLoadingMore] = useState(false);
  const [followingItems, setFollowingItems] = useState([]);
  const [followingLoaded, setFollowingLoaded] = useState(false);
  const loadMoreRef = useRef(null);
  const requestControllersRef = useRef({
    forYou: null,
    following: null,
  });

  const loadFeed = useCallback(async (targetMode, options = {}) => {
    const { cursor = 0, append = false } = options;
    const controller = new AbortController();
    const previousController = requestControllersRef.current[targetMode];
    if (append && previousController) {
      return;
    }
    if (!append && previousController) {
      previousController.abort();
    }
    requestControllersRef.current[targetMode] = controller;

    const isForYou = targetMode === "forYou";
    const limit = INITIAL_LIMITS[targetMode] || INITIAL_LIMITS.forYou;

    try {
      if (append) {
        if (isForYou) setForYouLoadingMore(true);
      } else {
        setLoading(true);
      }
      setErr(null);

      const response = await fetch(`/api/feed?mode=${targetMode}&limit=${limit}&cursor=${cursor}`, {
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

      const incomingItems = json?.items || [];

      if (isForYou) {
        setForYouItems((prev) => dedupeItems(append ? [...prev, ...incomingItems] : incomingItems));
        setForYouCursor(json?.nextCursor ?? null);
        setForYouHasMore(Boolean(json?.meta?.hasMore));
        setForYouLoaded(true);
      } else {
        setFollowingItems(dedupeItems(incomingItems));
        setFollowingLoaded(true);
      }
    } catch (e) {
      if (e?.name === "AbortError") return;
      setErr(e);
    } finally {
      if (requestControllersRef.current[targetMode] === controller) {
        requestControllersRef.current[targetMode] = null;
      }
      if (append) {
        if (isForYou) setForYouLoadingMore(false);
      } else {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    if (mode === "forYou" && !forYouLoaded) {
      void loadFeed("forYou");
      return;
    }
    if (mode === "following" && !followingLoaded) {
      void loadFeed("following");
      return;
    }
    setLoading(false);
  }, [followingLoaded, forYouLoaded, loadFeed, mode]);

  useEffect(() => {
    const controllers = requestControllersRef.current;
    return () => {
      Object.values(controllers).forEach((controller) => controller?.abort());
    };
  }, []);

  useEffect(() => {
    if (mode !== "forYou" || !forYouLoaded || !forYouHasMore || forYouLoadingMore) return;
    if (typeof IntersectionObserver === "undefined") return;

    const node = loadMoreRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) return;
        if (forYouCursor == null) return;
        void loadFeed("forYou", { cursor: forYouCursor, append: true });
      },
      { rootMargin: "900px 0px" }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [forYouCursor, forYouHasMore, forYouLoaded, forYouLoadingMore, loadFeed, mode]);

  const visibleItems = mode === "following" ? followingItems : forYouItems;
  const showInitialSkeleton = loading && visibleItems.length === 0;
  const showForYouLoadMore = mode === "forYou" && forYouItems.length > 0 && forYouHasMore;

  return (
    <>
      <div className="min-h-screen">
        <section className="mx-auto max-w-[760px] space-y-4">
          <div className="space-y-2 px-1 md:px-0">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h1 className="text-[2rem] font-bold tracking-tight text-white sm:text-[2.2rem]">Community Feed</h1>
              </div>
              <div className="inline-flex rounded-full bg-black/15 p-1">
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
          </div>

          {showInitialSkeleton && <FeedSkeleton />}

          {err && (
            <div className="text-red-200 bg-red-900/30 border border-red-200/20 rounded-xl px-4 py-3">
              Failed to load feed.
            </div>
          )}

          {!showInitialSkeleton && !err && visibleItems.length === 0 && (
            <div className="rounded-[24px] bg-black/10 p-6 text-white/80 shadow-[0_12px_28px_rgba(0,0,0,0.14)]">
              {mode === "following" ? "No posts yet from people you follow." : "No posts yet in this feed."}
            </div>
          )}

          {!showInitialSkeleton && !err && visibleItems.length > 0 && (
            <div className="space-y-4">
              {visibleItems.map((item) => (
                <PostCard key={`${item.type}-${item.id}`} item={item} onOpenPost={setActivePost} />
              ))}

              {showForYouLoadMore ? (
                <div ref={loadMoreRef} className="flex h-16 items-center justify-center" aria-hidden="true">
                  {forYouLoadingMore ? (
                    <div className="flex items-center gap-3 text-sm text-white/70">
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/20 border-t-white" />
                      Loading more posts...
                    </div>
                  ) : (
                    <div className="h-6 w-6 rounded-full border border-white/15 bg-white/5" />
                  )}
                </div>
              ) : null}

              {mode === "forYou" && forYouLoaded && !forYouHasMore ? (
                <div className="rounded-full border border-white/10 bg-black/10 px-4 py-2 text-center text-xs uppercase tracking-[0.14em] text-white/45">
                  You&apos;re caught up
                </div>
              ) : null}
            </div>
          )}
        </section>
      </div>

      {activePost && <PostModal post={activePost} onClose={() => setActivePost(null)} />}
    </>
  );
}
