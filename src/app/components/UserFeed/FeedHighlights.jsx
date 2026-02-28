"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Flame, MessageCircle, Users, Vote } from "lucide-react";

function poster(movie) {
  if (!movie?.posterUrl) return "/img/logo.png";
  if (movie.posterUrl.startsWith("http")) return movie.posterUrl;
  return `https://image.tmdb.org/t/p/w500${movie.posterUrl}`;
}

function avatarSrc(user) {
  return user?.avatarUrl || "/img/profile.png";
}

export default function FeedHighlights() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({ friendsWatching: [], mostDiscussed: [], weeklyPoll: [] });

  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        const res = await fetch("/api/feed/highlights", { cache: "no-store" });
        if (!alive || !res.ok) return;
        const json = await res.json();
        if (!alive) return;
        setData({
          friendsWatching: json?.friendsWatching || [],
          mostDiscussed: json?.mostDiscussed || [],
          weeklyPoll: json?.weeklyPoll || [],
        });
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
    <section className="rounded-2xl border border-white/10 bg-black/25 p-3 md:p-4 space-y-5">
      <header>
        <h3 className="text-white text-lg font-semibold">Social Pulse</h3>
        <p className="text-xs text-white/60">Friends, buzz meter, and poll activity.</p>
      </header>

      {loading ? (
        <div className="space-y-2 animate-pulse">
          <div className="h-16 rounded-xl bg-white/10" />
          <div className="h-16 rounded-xl bg-white/10" />
          <div className="h-16 rounded-xl bg-white/10" />
        </div>
      ) : (
        <>
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-yellow-200 flex items-center gap-2">
              <Users className="h-4 w-4" /> What Friends Are Watching
            </h4>
            {data.friendsWatching.length ? (
              data.friendsWatching.slice(0, 4).map((item) => (
                <Link
                  href={`/movies/${item.tmdbId}`}
                  key={`fw-${item.movieId}`}
                  className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-2.5 py-2 hover:bg-white/10"
                >
                  <div className="relative h-12 w-9 rounded overflow-hidden shrink-0">
                    <Image src={poster(item)} alt={item.title} fill className="object-cover" sizes="36px" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm text-white truncate">{item.title}</p>
                    <p className="text-xs text-white/70">
                      {item.count} recent reviews by friends
                    </p>
                    <div className="mt-1 flex -space-x-2">
                      {item.users.slice(0, 4).map((u) => (
                        <div
                          key={`fw-user-${item.movieId}-${u.id}`}
                          className="relative h-5 w-5 rounded-full overflow-hidden ring-1 ring-black"
                        >
                          <Image src={avatarSrc(u)} alt={u.username || "user"} fill className="object-cover" sizes="20px" />
                        </div>
                      ))}
                    </div>
                  </div>
                </Link>
              ))
            ) : (
              <p className="text-xs text-white/60">No friends activity yet.</p>
            )}
          </div>

          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-orange-200 flex items-center gap-2">
              <Flame className="h-4 w-4" /> Most Discussed
            </h4>
            {data.mostDiscussed.length ? (
              data.mostDiscussed.slice(0, 5).map((item, idx) => (
                <Link
                  href={item.href}
                  key={`buzz-${item.type}-${item.id}`}
                  className="block rounded-xl border border-white/10 bg-white/5 p-2.5 hover:bg-white/10"
                >
                  <p className="text-xs text-white/60">#{idx + 1} {item.type.toUpperCase()}</p>
                  <p className="text-sm text-white font-medium line-clamp-1">{item.title}</p>
                  <div className="mt-1 flex items-center gap-3 text-xs text-white/70">
                    <span className="inline-flex items-center gap-1">
                      <Flame className="h-3.5 w-3.5 text-orange-400" /> Buzz {item.buzz}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <MessageCircle className="h-3.5 w-3.5" /> {item.comments}
                    </span>
                  </div>
                </Link>
              ))
            ) : (
              <p className="text-xs text-white/60">No discussions to rank yet.</p>
            )}
          </div>

          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-cyan-200 flex items-center gap-2">
              <Vote className="h-4 w-4" /> Weekly Poll
            </h4>
            {data.weeklyPoll.length ? (
              data.weeklyPoll.slice(0, 4).map((item, idx) => (
                <Link
                  href={item.href}
                  key={`poll-${item.id}`}
                  className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-2.5 py-2 hover:bg-white/10"
                >
                  <div className="min-w-0">
                    <p className="text-xs text-white/60">#{idx + 1}</p>
                    <p className="text-sm text-white truncate">{item.title}</p>
                  </div>
                  <span className="text-xs font-semibold text-cyan-100 rounded-full bg-cyan-500/20 px-2 py-1">
                    {item.votes} votes
                  </span>
                </Link>
              ))
            ) : (
              <p className="text-xs text-white/60">No poll votes yet.</p>
            )}
            <Link
              href="/poll"
              className="inline-block text-xs text-cyan-200 hover:text-cyan-100 underline underline-offset-4"
            >
              Open full weekly poll
            </Link>
          </div>
        </>
      )}
    </section>
  );
}
