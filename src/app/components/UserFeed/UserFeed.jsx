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

// Popcorn Loading Component
const PopcornLoading = () => {
  const containerRef = useRef(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Popcorn bucket animation
      gsap.to(".popcorn-bucket", {
        y: -10,
        duration: 1,
        yoyo: true,
        repeat: -1,
        ease: "power2.inOut"
      });

      // Popcorn pieces animation
      gsap.to(".popcorn-piece", {
        y: -15,
        opacity: 1,
        duration: 0.8,
        stagger: {
          each: 0.2,
          from: "random"
        },
        yoyo: true,
        repeat: -1,
        ease: "power2.out"
      });
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <div ref={containerRef} className="flex flex-col items-center justify-center py-16 space-y-6">
      {/* Popcorn Bucket */}
      <div className="popcorn-bucket relative">
        <svg width="80" height="80" viewBox="0 0 80 80" className="text-yellow-400">
          {/* Bucket */}
          <rect x="20" y="30" width="40" height="35" rx="6" fill="currentColor" stroke="#B45309" strokeWidth="2"/>
          <path d="M24 32h32" stroke="#B45309" strokeWidth="2"/>
          
          {/* Bucket top curve */}
          <path d="M24 30c0-4 8-6 16-6s16 2 16 6" fill="none" stroke="#FBBF24" strokeWidth="3"/>
          
          {/* Bucket stripes */}
          <path d="M26 38h28M26 44h28M26 50h28" stroke="#B45309" strokeWidth="1.5"/>
        </svg>

        {/* Floating popcorn pieces */}
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-full flex justify-center space-x-1">
          <div className="popcorn-piece opacity-0">
            <svg width="12" height="12" viewBox="0 0 12 12" className="text-yellow-200">
              <path d="M6 2c1 0 2 1 2 2s-1 2-2 2-2-1-2-2 1-2 2-2z" fill="currentColor"/>
            </svg>
          </div>
          <div className="popcorn-piece opacity-0">
            <svg width="10" height="10" viewBox="0 0 10 10" className="text-yellow-300">
              <path d="M5 1c1 0 2 1 2 2s-1 2-2 2-2-1-2-2 1-2 2-2z" fill="currentColor"/>
            </svg>
          </div>
          <div className="popcorn-piece opacity-0">
            <svg width="14" height="14" viewBox="0 0 14 14" className="text-yellow-100">
              <path d="M7 2c1 0 2 1 2 2s-1 2-2 2-2-1-2-2 1-2 2-2z" fill="currentColor"/>
            </svg>
          </div>
        </div>
      </div>

      {/* Loading Text */}
      <div className="text-center space-y-2">
        <div className="text-yellow-200 text-lg font-semibold">Loading...</div>
        <div className="text-yellow-300 text-sm">Preparing your cinematic experience...</div>
      </div>

      {/* Dots Animation */}
      <div className="flex space-x-1">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="w-2 h-2 bg-yellow-400 rounded-full animate-bounce"
            style={{ animationDelay: `${i * 0.2}s` }}
          />
        ))}
      </div>
    </div>
  );
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

  // Show loading state when no data and not errored
  const isLoading = !data && !error;

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

            {isLoading && <PopcornLoading />}

            {!isLoading && items.length === 0 && !error && (
              <div className="text-center text-white/70 py-16">
                <div className="text-lg mb-2">No posts yet</div>
                <div className="text-sm">Be the first to share something!</div>
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
              items.length > 0 && (
                <div className="text-center text-white/50 py-6">You are all caught up</div>
              )
            )}

            {isValidating && data && (
              <div className="flex items-center justify-center py-4">
                <div className="flex space-x-1">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="w-2 h-2 bg-yellow-300 rounded-full animate-bounce"
                      style={{ animationDelay: `${i * 0.2}s` }}
                    />
                  ))}
                </div>
              </div>
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