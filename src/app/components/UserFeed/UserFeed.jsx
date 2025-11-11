"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import useSWRInfinite from "swr/infinite";
import PostCard from "./PostCard";
import PostModal from "./PostModal";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Compass, Users } from "lucide-react";

gsap.registerPlugin(ScrollTrigger);

const fetcher = (url) => fetch(url).then((r) => r.json());
const getKey =
  ({ mode }) =>
  (pageIndex, previousPageData) => {
    if (previousPageData?.meta && !previousPageData.meta.hasMore) return null;
    const cursor = pageIndex === 0 ? "" : `&cursor=${previousPageData?.nextCursor ?? ""}`;
    return `/api/feed?mode=${mode}&limit=12${cursor}`;
  };

export default function UserFeed() {
  const [mode, setMode] = useState("forYou");
  const [activePost, setActivePost] = useState(null);

  const { data, size, setSize, isValidating, error, mutate } = useSWRInfinite(
    getKey({ mode }),
    fetcher,
    { revalidateOnFocus: false }
  );

  const items = useMemo(() => (data ? data.flatMap((p) => p.items ?? []) : []), [data]);
  const hasMore = data?.[data.length - 1]?.meta?.hasMore ?? true;

  const sentinelRef = useRef(null);
  useEffect(() => {
    if (!sentinelRef.current || !hasMore) return;
    const el = sentinelRef.current;
    const io = new IntersectionObserver(
      (entries) => entries[0].isIntersecting && setSize((s) => s + 1),
      { rootMargin: "600px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [hasMore, setSize]);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.utils.toArray(".feed-card").forEach((card, idx) => {
        gsap.fromTo(
          card,
          { opacity: 0, y: 40, scale: 0.95 },
          {
            opacity: 1,
            y: 0,
            scale: 1,
            duration: 0.6,
            delay: idx * 0.08,
            ease: "power2.out",
            scrollTrigger: { trigger: card, start: "top 80%", toggleActions: "play none none reverse" },
          }
        );
      });
    });
    return () => ctx.revert();
  }, [items.length]);

  const switchMode = useCallback(
    (next) => {
      setMode(next);
      setActivePost(null);
      mutate([], { revalidate: false });
      setSize(1);
    },
    [mutate, setSize]
  );

  return (
    <>
      <div className="min-h-screen bg-yellow-600">
        <section className="max-w-4xl mx-auto px-4 md:px-6 lg:px-8 py-6">
          <div className="top-[64px] z-20 bg-gradient-to-b from-yellow-500 to-transparent pt-3 pb-6">
            <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-full p-1.5">
              <button
                onClick={() => switchMode("forYou")}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  mode === "forYou" ? "bg-white text-black shadow-lg" : "text-white/70 hover:text-white hover:bg-white/5"
                }`}
              >
                <Compass className="w-4 h-4" /> For You
              </button>
              <button
                onClick={() => switchMode("following")}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  mode === "following" ? "bg-white text-black shadow-lg" : "text-white/70 hover:text-white hover:bg-white/5"
                }`}
              >
                <Users className="w-4 h-4" /> Following
              </button>
            </div>
          </div>

          <div className="mx-auto max-w-2xl space-y-4">
            {error && <div className="text-red-400 text-center py-8">Failed to load feed.</div>}

            {!data && !error && (
              <div className="space-y-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-[420px] bg-white/5 border border-white/10 rounded-2xl animate-pulse" />
                ))}
              </div>
            )}

            {items.map((item) => (
              <div key={`${item.type}-${item.id}`} className="feed-card">
                <PostCard
                  item={item}
                  onOpenPost={(normalized) => setActivePost(normalized)}
                />
              </div>
            ))}

            {hasMore ? (
              <div ref={sentinelRef} className="h-10" />
            ) : (
              <div className="text-center text-white/50 py-6">You are all caught up</div>
            )}

            {isValidating && data && (
              <div className="h-8 flex items-center justify-center text-white/50">Loading...</div>
            )}
          </div>
        </section>
      </div>

      {activePost && (
        <PostModal
          post={activePost}
          onClose={() => setActivePost(null)}
          onReactionUpdate={() => {}}
        />
      )}
    </>
  );
}
