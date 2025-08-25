// import React from 'react'
// import RecentActivity from '@/app/components/RecentActivity/RecentActivity'
// import FeedBlog from '@/app/components/FeedBlog/FeedBlog'
// import FeedReview from '@/app/components/FeedReview/FeedReview'
// const UserFeed = () => {
//   return (
//     <div>
//       <RecentActivity/>
//       <FeedBlog/>
//       <FeedReview/>
//     </div>
//   )
// }

'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import useSWRInfinite from 'swr/infinite';
import PostCard from './PostCard';
import Link from 'next/link';
import { Compass, Users } from 'lucide-react'; 

const fetcher = (url) => fetch(url).then((r) => r.json());

/** Build the key for SWRInfinite */
const getKey =
  ({ mode }) =>
  (pageIndex, previousPageData) => {
    if (previousPageData && previousPageData.meta && !previousPageData.meta.hasMore) {
      return null; // reached the end
    }
    const cursor =
      pageIndex === 0 ? '' : `&cursor=${previousPageData?.nextCursor ?? ''}`;
    return `/api/feed?mode=${mode}&limit=12${cursor}`;
  };

export default function UserFeed() {
  const [mode, setMode] = useState('forYou'); // 'forYou' | 'following'
  const { data, size, setSize, isValidating, error, mutate } = useSWRInfinite(
    getKey({ mode }),
    fetcher,
    { revalidateOnFocus: false }
  );

  // Flatten pages
  const items = useMemo(
    () => (data ? data.flatMap((p) => p.items ?? []) : []),
    [data]
  );
  const hasMore = data?.[data.length - 1]?.meta?.hasMore ?? true;

  // Intersection observer for infinite scroll
  const sentinelRef = useRef(null);
  useEffect(() => {
    if (!sentinelRef.current || !hasMore) return;
    const el = sentinelRef.current;

    const io = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) setSize((s) => s + 1);
    }, { rootMargin: '600px' });

    io.observe(el);
    return () => io.disconnect();
  }, [hasMore, setSize]);

  // Switch mode handler
  const switchMode = useCallback((next) => {
    setMode(next);
    // Reset the list by revalidating from page 0
    mutate([], { revalidate: false });
    setSize(1);
  }, [mutate, setSize]);

  return (
    <section className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-6">
      {/* Tabs */}
      <div className="sticky top-[64px] z-20 bg-gradient-to-b from-[#0b0f14] to-transparent pt-3 pb-4">
        <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-full p-1">
          <button
            onClick={() => switchMode('forYou')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm transition ${
              mode === 'forYou'
                ? 'bg-white text-black'
                : 'text-white/70 hover:text-white'
            }`}
          >
            <Compass className="w-4 h-4" />
            For You
          </button>
          <button
            onClick={() => switchMode('following')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm transition ${
              mode === 'following'
                ? 'bg-white text-black'
                : 'text-white/70 hover:text-white'
            }`}
          >
            <Users className="w-4 h-4" />
            Following
          </button>
        </div>
      </div>

      {/* Content grid (single column on mobile, two on xl only if you want; but IG feel -> single column) */}
      <div className="mx-auto max-w-2xl space-y-4">
        {/* States */}
        {error ? (
          <div className="text-red-400 text-center py-8">
            Failed to load feed.
          </div>
        ) : null}

        {!data && !error ? (
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-[420px] bg-white/5 border border-white/10 rounded-2xl animate-pulse"
              />
            ))}
          </div>
        ) : null}

        {/* Posts */}
        {items.map((item) => (
          <PostCard key={`${item.type}-${item.id}`} item={item} />
        ))}

        {/* End / sentinel */}
        {hasMore ? (
          <div ref={sentinelRef} className="h-10" />
        ) : (
          <div className="text-center text-white/50 py-6">
            You’re all caught up 🎬
          </div>
        )}

        {/* Subtle loading indicator while fetching the next page */}
        {isValidating && data ? (
          <div className="h-8 flex items-center justify-center text-white/50">
            Loading…
          </div>
        ) : null}
      </div>

      {/* Optional right rail slots you already have */}
      {/* 
        <aside className="hidden xl:block sticky top-24 w-80 ml-10">
          <RightRail />
        </aside>
      */}
    </section>
  );
}
