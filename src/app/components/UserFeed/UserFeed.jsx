"use client";

import { useEffect, useState } from "react";
import PostCard from "./PostCard";
import PostModal from "./PostModal";

/* ---------------- Skeleton ---------------- */

function FeedSkeleton() {
  const BlogCard = () => (
    <div className="w-[170px] sm:w-[190px] md:w-[210px] animate-pulse">
      <div className="rounded-xl overflow-hidden bg-white/10 border border-white/10">
        <div className="h-[240px] bg-white/10" />
        <div className="p-3 space-y-2">
          <div className="h-3 w-4/5 bg-white/10 rounded" />
          <div className="flex gap-3">
            <div className="h-3 w-10 bg-white/10 rounded" />
            <div className="h-3 w-10 bg-white/10 rounded" />
            <div className="h-3 w-10 bg-white/10 rounded" />
          </div>
        </div>
      </div>
    </div>
  );

  const ReviewCard = () => (
    <div className="rounded-xl bg-white/10 border border-white/10 p-4 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-full bg-white/10" />
        <div className="space-y-2">
          <div className="h-3 w-40 bg-white/10 rounded" />
          <div className="h-2 w-24 bg-white/10 rounded" />
        </div>
      </div>

      <div className="mt-4 space-y-2">
        <div className="h-3 w-56 bg-white/10 rounded" />
        <div className="h-3 w-full bg-white/10 rounded" />
        <div className="h-3 w-4/5 bg-white/10 rounded" />
      </div>

      <div className="mt-4 flex gap-4">
        <div className="h-4 w-12 bg-white/10 rounded" />
        <div className="h-4 w-12 bg-white/10 rounded" />
        <div className="h-4 w-12 bg-white/10 rounded" />
      </div>
    </div>
  );

  const Section = ({ grid }) => (
    <div className="space-y-3">
      <div className="h-4 w-72 bg-white/10 rounded" />
      {grid ? (
        <div className="flex flex-wrap gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <BlogCard key={i} />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <ReviewCard key={i} />
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-10">
      <Section />
      <Section grid />
      <Section />
      <Section grid />
    </div>
  );
}

/* ---------------- Section Wrapper ---------------- */

function Section({ title, items, variant = "list", onOpenPost }) {
  if (!items || items.length === 0) return null;

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold text-white">{title}</h2>

      {variant === "grid" ? (
        <div className="flex flex-wrap gap-4">
          {items.map((item) => (
            <PostCard
              key={`${item.type}-${item.id}`}
              item={item}
              onOpenPost={onOpenPost}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((item) => (
            <PostCard
              key={`${item.type}-${item.id}`}
              item={item}
              onOpenPost={onOpenPost}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------------- Main Feed ---------------- */

export default function UserFeed() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [activePost, setActivePost] = useState(null);

  const [followingReviews, setFollowingReviews] = useState([]);
  const [followingBlogs, setFollowingBlogs] = useState([]);
  const [topReviews, setTopReviews] = useState([]);
  const [topBlogs, setTopBlogs] = useState([]);

  useEffect(() => {
    let alive = true;

    async function load() {
      try {
        setLoading(true);
        setErr(null);

        const urls = [
          "/api/feed?mode=following&limit=15",
          "/api/feed?mode=forYou&limit=30",
        ];

        const [following, forYou] = await Promise.all(
          urls.map((u) =>
            fetch(u, { cache: "no-store" }).then(async (r) => {
              const json = await r.json();
              if (!r.ok) throw new Error(json?.error || "Feed failed");
              return json;
            })
          )
        );

        if (!alive) return;

        const fItems = following.items || [];
        const fyItems = forYou.items || [];

        setFollowingReviews(fItems.filter((i) => i.type === "review"));
        setFollowingBlogs(fItems.filter((i) => i.type === "blog"));

        setTopReviews(fyItems.filter((i) => i.type === "review"));
        setTopBlogs(fyItems.filter((i) => i.type === "blog"));
      } catch (e) {
        if (!alive) return;
        setErr(e);
      } finally {
        if (alive) setLoading(false);
      }
    }

    load();
    return () => {
      alive = false;
    };
  }, []);

  return (
    <>
      <div className="min-h-screen bg-yellow-600">
        <section className="max-w-6xl mx-auto px-4 md:px-6 lg:px-8 py-8 space-y-10">
          {loading && <FeedSkeleton />}

          {err && (
            <div className="text-red-200 text-center py-12">
              Failed to load feed.
            </div>
          )}

          {!loading && !err && (
            <>
              <Section
                title="Top Reviews from People You Follow"
                items={followingReviews}
                variant="list"
                onOpenPost={setActivePost}
              />

              <Section
                title="Top Blogs from People You Follow"
                items={followingBlogs}
                variant="grid"
                onOpenPost={setActivePost}
              />

              <Section
                title="Top Reviews"
                items={topReviews}
                variant="list"
                onOpenPost={setActivePost}
              />

              <Section
                title="Top Blogs"
                items={topBlogs}
                variant="grid"
                onOpenPost={setActivePost}
              />
            </>
          )}
        </section>
      </div>

      {activePost && (
        <PostModal post={activePost} onClose={() => setActivePost(null)} />
      )}
    </>
  );
}
