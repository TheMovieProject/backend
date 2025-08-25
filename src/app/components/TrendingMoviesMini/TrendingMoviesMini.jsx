'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Sparkles, Star, AlertCircle } from 'lucide-react';
import requests from '@/app/helpers/Requests';

const img = (path, size = 154) =>
  path ? `https://image.tmdb.org/t/p/w${size}${path}` : null;

export default function TrendingMoviesMini() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const getData = async () => {
    setLoading(true);
    setError(null);
    let all = [];
    let page = 1;

    try {
      // grab up to ~30 items (3 pages) but we’ll render top 8 in the widget
      while (all.length < 30 && page <= 3) {
        const res = await fetch(`${requests.requestTrendingWeek}&page=${page}`, { cache: 'no-store' });
        if (!res.ok) throw new Error(`TMDB error ${res.status}`);
        const data = await res.json();
        all = [...all, ...(data?.results || [])];
        page++;
      }
      setItems(all.slice(0, 20));
    } catch (e) {
      setError(e?.message || 'Failed to fetch trending movies. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getData();
  }, []);

  return (
    <section className="rounded-xl bg-neutral-900/60 border border-neutral-800 p-4">
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-neutral-100 font-semibold">
          <Sparkles className="h-5 w-5 text-amber-400" />
          Trending Movies
        </h3>
        {/* <Link
          href="/movies/trending"
          className="text-sm text-neutral-300 hover:text-white transition"
        >
          See all
        </Link> */}
      </div>

      {/* Loading skeleton */}
      {loading && (
        <ul className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <li key={i} className="flex items-center gap-3">
              <div className="h-12 w-9 rounded bg-neutral-800 animate-pulse" />
              <div className="flex-1">
                <div className="h-3 w-40 rounded bg-neutral-800 animate-pulse mb-2" />
                <div className="h-3 w-24 rounded bg-neutral-800 animate-pulse" />
              </div>
              <div className="h-7 w-16 rounded bg-neutral-800 animate-pulse" />
            </li>
          ))}
        </ul>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="flex items-center gap-2 text-sm text-neutral-300">
          <AlertCircle className="h-4 w-4 text-red-400" />
          {error}
        </div>
      )}

      {/* Empty */}
      {!loading && !error && items.length === 0 && (
        <p className="text-neutral-400 text-sm">No trending right now.</p>
      )}

      {/* List */}
      {!loading && !error && items.length > 0 && (
        <ul className="space-y-3">
          {items.slice(0, 8).map((m) => {
            const title = m.title || m.original_title || 'Untitled';
            const year = m.release_date ? new Date(m.release_date).getFullYear() : null;
            const poster = img(m.poster_path, 154);
            const rating = typeof m.vote_average === 'number' ? m.vote_average : 0;

            return (
              <li key={m.id} className="flex items-center gap-3">
                {/* Poster / Fallback */}
                <div className="h-12 w-9 overflow-hidden rounded bg-neutral-800 flex items-center justify-center">
                  {poster ? (
                    <Image
                      src={poster}
                      alt={title}
                      width={60}
                      height={90}
                      className="h-12 w-9 object-cover"
                    />
                  ) : (
                    <span className="text-[10px] px-1 text-neutral-300 text-center line-clamp-3">
                      {title}
                    </span>
                  )}
                </div>

                {/* Meta */}
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-white truncate">{title}</div>
                  <div className="mt-0.5 flex items-center gap-2 text-xs text-neutral-400">
                    {year && <span>{year}</span>}
                    <span className="flex items-center gap-1">
                      <Star className="h-3 w-3 text-yellow-400" />
                      {rating.toFixed(1)}
                    </span>
                  </div>
                </div>

                {/* Action */}
                <Link
                  href={`/movies/${m.id}`}
                  className="text-xs rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-1.5 text-white hover:border-amber-500/40 hover:bg-neutral-800/80 transition"
                >
                  Open
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
