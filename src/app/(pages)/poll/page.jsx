'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { useDebouncedValue } from '@/app/hooks/useDebouncedValue';
import { useIncrementalList } from '@/app/hooks/useIncrementalList';
import { useRafThrottledCallback } from '@/app/hooks/useRafThrottledCallback';

const PLACEHOLDER =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 600'><rect width='100%' height='100%' fill='#1f2937'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='#9ca3af' font-family='sans-serif' font-size='16'>No Poster</text></svg>`
  );

export default function PollPage() {
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [error, setError] = useState(null);
  const [scrolled, setScrolled] = useState(false);
  const debouncedQuery = useDebouncedValue(query, 180);
  const handleScroll = useRafThrottledCallback(() => {
    setScrolled(window.scrollY > 20);
  });

  // Scroll effect for header
  useEffect(() => {
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  // Fetch ranked list from your backend
  const fetchPollList = async () => {
    try {
      setError(null);
      const res = await fetch('/api/poll/list', { cache: 'no-store' });
      if (!res.ok) throw new Error(`Failed: ${res.status}`);
      const data = await res.json();
      setMovies(data.movies ?? []);
    } catch (e) {
      console.error(e);
      setError('Could not load poll list');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPollList();
  }, []);

  // Optimistic vote toggle
  const onVote = async (movieId) => {
    setMovies(prev =>
      prev.map(m =>
        m.id !== movieId
          ? m
          : m.userVoted
          ? { ...m, userVoted: false, votes: Math.max(0, (m.votes ?? 0) - 1) }
          : { ...m, userVoted: true, votes: (m.votes ?? 0) + 1 }
      )
    );

    try {
      const res = await fetch('/api/poll/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ movieId }),
      });

      if (res.status === 401) {
        // revert if unauthorized
        setMovies(prev =>
          prev.map(m =>
            m.id !== movieId
              ? m
              : m.userVoted
              ? { ...m, userVoted: false, votes: Math.max(0, (m.votes ?? 0) - 1) }
              : { ...m, userVoted: true, votes: (m.votes ?? 0) + 1 }
          )
        );
        setError('Please sign in to vote');
        return;
      }

      if (!res.ok) throw new Error('Vote failed');

      const data = await res.json(); // { ok, voted, votes, movieId }
      // snap to server truth (in case of races)
      setMovies(prev =>
        prev.map(m =>
          m.id === data.movieId ? { ...m, userVoted: data.voted, votes: data.votes } : m
        )
      );
    } catch (e) {
      // hard rollback on any other error
      setMovies(prev =>
        prev.map(m =>
          m.id !== movieId
            ? m
            : m.userVoted
            ? { ...m, userVoted: false, votes: Math.max(0, (m.votes ?? 0) - 1) }
            : { ...m, userVoted: true, votes: (m.votes ?? 0) + 1 }
        )
      );
      setError('Something went wrong while voting');
    }
  };

  // filter + rank (server already returns in rank order, but keep client sort as a safety)
  const ranked = useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase();
    const filtered = q
      ? movies.filter((m) => (m.title || '').toLowerCase().includes(q))
      : movies.slice();

    return filtered.sort((a, b) => {
      if ((b.votes ?? 0) !== (a.votes ?? 0)) return (b.votes ?? 0) - (a.votes ?? 0);
      return (a.title || '').localeCompare(b.title || '');
    });
  }, [debouncedQuery, movies]);
  const maxVotes = useMemo(
    () => Math.max(...ranked.map((movie) => movie.votes ?? 0), 1),
    [ranked]
  );
  const {
    hasMore,
    loadMoreRef,
    visibleItems: visibleRanked,
  } = useIncrementalList(ranked, {
    initialCount: 20,
    increment: 12,
    enabled: ranked.length > 20,
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 text-white pt-20">
      {/* Sticky header with glassmorphism */}
      <header className={`sticky top-0 z-10 transition-all duration-500 ${
        scrolled 
          ? 'bg-white/10 backdrop-blur-xl border-b border-white/20 shadow-lg' 
          : 'bg-transparent border-b border-white/10'
      }`}>
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-4">
          <div className="flex-1">
            <h1 className={`text-xl font-semibold transition-colors duration-300 ${
              scrolled ? 'text-gray-800' : 'text-white'
            } md:text-2xl`}>
              Weekly Movie Poll
            </h1>
            <p className={`text-xs transition-colors duration-300 ${
              scrolled ? 'text-gray-600' : 'text-zinc-400'
            } md:text-sm`}>
              Vote your favorites. Most votes rise to the top.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search title…"
              className={`w-40 rounded-xl border transition-all duration-300 px-3 py-2 text-sm outline-none md:w-64 ${
                scrolled
                  ? 'border-gray-300 bg-white/20 text-gray-800 placeholder-gray-600 focus:border-gray-500'
                  : 'border-zinc-700 bg-zinc-800/60 text-white placeholder-zinc-400 focus:border-zinc-500'
              }`}
              aria-label="Search movies by title"
            />
            <button
              onClick={fetchPollList}
              className={`rounded-xl border px-3 py-2 text-sm transition-all duration-300 ${
                scrolled
                  ? 'border-gray-300 bg-white/20 text-gray-800 hover:border-gray-500 hover:bg-white/30'
                  : 'border-zinc-700 bg-zinc-800/60 text-white hover:border-zinc-500'
              }`}
              aria-label="Refresh list"
              title="Refresh from server"
            >
              Refresh
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-7xl px-4 py-6 md:py-10">
        {error && (
          <div className="mb-4 rounded-xl border border-red-400/30 bg-red-500/10 backdrop-blur-sm px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}

        {loading ? (
          <LoaderGrid />
        ) : ranked.length ? (
          <>
            <div className="mb-6 flex items-center justify-between">
              <span className="text-sm text-zinc-400">
                Showing <b className="text-white">{visibleRanked.length}</b>
                {visibleRanked.length !== ranked.length ? ` of ${ranked.length}` : ''} movies
              </span>
              <span className="text-sm text-zinc-400">Most votes → top</span>
            </div>

            <ul className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-4" role="list">
              {visibleRanked.map((m, idx) => {
                const poster = m.posterUrl || PLACEHOLDER;
                const pct = Math.round(((m.votes ?? 0) / maxVotes) * 100);

                return (
                  <li
                    key={m.id}
                    className="group relative rounded-3xl bg-white/5 backdrop-blur-sm border border-white/10 shadow-lg transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl hover:bg-white/10"
                  >
                    {/* rank badge with glassmorphism */}
                    <div className="absolute left-3 top-3 z-10 rounded-2xl bg-white/10 backdrop-blur-md px-3 py-1.5 text-xs font-medium text-white ring-1 ring-white/20">
                      #{idx + 1}
                    </div>

                    <div className="relative aspect-[2/3] overflow-hidden rounded-t-3xl">
                      <Image
                        src={poster}
                        alt={m.title}
                        fill
                        className="object-cover transition duration-500 group-hover:scale-110"
                        sizes="(max-width: 768px) 50vw, (max-width: 1200px) 25vw, 20vw"
                        priority={idx < 4}
                        unoptimized={poster === PLACEHOLDER}
                      />
                      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                    </div>

                    <div className="space-y-4 p-4">
                      <h3 className="line-clamp-2 text-sm font-medium text-white leading-tight">
                        {m.title}
                      </h3>

                      {/* vote bar with glassmorphism */}
                      <div className="mt-3">
                        <div className="mb-2 flex items-center justify-between text-xs">
                          <span className="text-zinc-300">Votes</span>
                          <span className="font-medium text-white">{m.votes ?? 0}</span>
                        </div>
                        <div
                          className="h-2 w-full overflow-hidden rounded-full bg-white/10 backdrop-blur-sm"
                          role="progressbar"
                          aria-valuenow={m.votes ?? 0}
                          aria-valuemin={0}
                          aria-valuemax={maxVotes}
                          aria-label={`Votes for ${m.title}`}
                          title={`${pct}% of top`}
                        >
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-400 transition-all duration-700 ease-out"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>

                      {/* vote button with glassmorphism */}
                      <button
                        onClick={() => onVote(m.id)}
                        className={`mt-4 w-full rounded-2xl border px-4 py-3 text-sm font-medium transition-all duration-300 ${
                          m.userVoted
                            ? 'border-blue-400 bg-gradient-to-r from-blue-600/20 to-cyan-600/20 text-white shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40'
                            : 'border-white/20 bg-white/5 text-white hover:bg-white/10 hover:border-white/30 hover:shadow-lg'
                        }`}
                        aria-pressed={!!m.userVoted}
                        aria-label={m.userVoted ? `Remove vote for ${m.title}` : `Vote for ${m.title}`}
                      >
                        {m.userVoted ? 'Voted ✓' : 'Vote'}
                      </button>
                    </div>

                    {/* subtle glow effect for voted items */}
                    {m.userVoted && (
                      <div className="absolute inset-0 rounded-3xl ring-2 ring-blue-400/30 pointer-events-none" />
                    )}
                  </li>
                );
              })}
            </ul>
            {hasMore ? <div ref={loadMoreRef} className="h-8 w-full" aria-hidden="true" /> : null}
          </>
        ) : (
          <div className="flex h-[60vh] items-center justify-center">
            <div className="text-center">
              <p className="text-xl font-medium text-white">No movies in poll.</p>
              <p className="mt-2 text-sm text-zinc-400">Try refreshing.</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

/** skeleton while loading with glassmorphism */
function LoaderGrid() {
  return (
    <ul className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <li 
          key={i} 
          className="rounded-3xl bg-white/5 backdrop-blur-sm border border-white/10 p-4 animate-pulse"
        >
          <div className="mb-4 h-[260px] w-full rounded-2xl bg-white/10" />
          <div className="mb-3 h-4 w-3/4 rounded bg-white/10" />
          <div className="mb-4 h-3 w-1/2 rounded bg-white/10" />
          <div className="h-12 w-full rounded-2xl bg-white/10" />
        </li>
      ))}
    </ul>
  );
}
