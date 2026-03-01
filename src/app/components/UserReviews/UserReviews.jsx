'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import Image from 'next/image';
import Link from 'next/link';
import { HiOutlineDotsVertical } from 'react-icons/hi';
import { AiOutlineDelete, AiOutlineLike, AiOutlineFire } from 'react-icons/ai';

const FALLBACK_POSTER = "/img/logo.png";

export default function UserReviews({ id }) {
  const { data: session, status } = useSession();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [menuOpen, setMenuOpen] = useState({}); // reviewId -> boolean

  const userId = useMemo(() => {
    // prefer explicit id, then session user id
    return id || session?.user?.id || null;
  }, [id, session?.user?.id]);

  useEffect(() => {
    let cancelled = false;

    async function fetchUserReviews() {
      if (status === 'loading') return;
      if (!userId) {
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/review?userId=${userId}&limit=60`, { cache: 'no-store' });
        if (!res.ok) throw new Error('Failed to fetch reviews');
        const data = await res.json();

        if (!cancelled) {
          // newest first
          const sorted = [...data].sort(
            (a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)
          );
          setReviews(sorted);
        }
      } catch (e) {
        if (!cancelled) setError(e.message || 'Something went wrong');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchUserReviews();
    return () => {
      cancelled = true;
    };
  }, [status, userId]);

  const toggleMenu = (rid) =>
    setMenuOpen((p) => ({ ...p, [rid]: !p[rid] }));

  const closeMenu = (rid) =>
    setMenuOpen((p) => ({ ...p, [rid]: false }));

  const deleteReview = async (reviewId) => {
    closeMenu(reviewId);
    if (!confirm('Delete this review?')) return;

    // optimistic remove
    const prev = reviews;
    setReviews((p) => p.filter((r) => r.id !== reviewId));

    try {
      const res = await fetch(`/api/review?reviewId=${reviewId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(await res.text());
    } catch (e) {
      // rollback on failure
      setReviews(prev);
      alert('Failed to delete review.');
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="animate-pulse grid grid-cols-2 md:grid-cols-3 gap-6 w-full">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-64 rounded-xl bg-gray-700/50 border border-white/10" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <p className="text-red-400">Error: {error}</p>
      </div>
    );
  }

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold text-white mb-8">
        {id && id !== session?.user?.id ? "User's Movie Reviews" : 'Your Movie Reviews'}
      </h1>

      {reviews.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-400 text-lg">No reviews yet</p>
          <p className="text-gray-500 text-sm mt-2">Start sharing your thoughts on movies</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-6">
          {reviews.map((review) => {
            const movie = review.movie || {};
            const title = movie.title || 'Unknown Movie';
            const tmdbId = movie.tmdbId || review.movieId || '';
            const poster = movie.posterUrl || FALLBACK_POSTER;

            return (
              <div
                key={review.id}
                className="relative group rounded-xl border border-white/10 bg-white/5 backdrop-blur p-3 hover:-translate-y-1 hover:shadow-xl transition"
              >
                {/* Card actions */}
                {(!id || id === session?.user?.id) && (
                  <div className="absolute top-2 right-2 z-10">
                    <button
                      onClick={() => toggleMenu(review.id)}
                      className="p-1.5 rounded hover:bg-white/10 text-gray-200"
                      aria-label="More"
                    >
                      <HiOutlineDotsVertical />
                    </button>
                    {menuOpen[review.id] && (
                      <div
                        className="absolute right-0 mt-1 min-w-[160px] rounded-lg border border-white/10 bg-black/80 backdrop-blur p-1 shadow-xl"
                        onMouseLeave={() => closeMenu(review.id)}
                      >
                        <Link
                          href={`/movies/${tmdbId}`}
                          className="flex items-center gap-2 px-3 py-2 rounded-md text-gray-200 hover:bg-white/10"
                          onClick={() => closeMenu(review.id)}
                        >
                          Open movie
                        </Link>
                        <button
                          className="flex w-full items-center gap-2 px-3 py-2 rounded-md text-red-400 hover:bg-white/10"
                          onClick={() => deleteReview(review.id)}
                        >
                          <AiOutlineDelete /> Delete
                        </button>
                      </div>
                    )}
                  </div>
                )}

                <Link href={`/movies/${tmdbId}`} className="block">
                  <div className="aspect-[3/4] overflow-hidden rounded-lg mb-3 bg-black/30">
                    <SafePoster src={poster} alt={title} />
                  </div>
                </Link>

                <div className="px-1">
                  <Link href={`/movies/${tmdbId}`}>
                    <h3 className="font-semibold text-white/90 text-sm line-clamp-2 min-h-[2.5rem]">
                      {title}
                    </h3>
                  </Link>

                  <div className="mt-1 flex items-center justify-between text-[11px] text-gray-400">
                    <span>{new Date(review.createdAt).toLocaleDateString()}</span>
                    {/* <div className="flex items-center gap-3">
                      <span className="inline-flex items-center gap-1">
                        <AiOutlineLike /> {review.likes || 0}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <AiOutlineFire /> {review.fire || 0}
                      </span>
                    </div> */}
                  </div>

                  {review.content && (
                    <p className="mt-2 text-xs text-gray-300/90 line-clamp-3">
                      “{review.content}”
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* Next/Image fallback helper */
function SafePoster({ src, alt }) {
  const [imgSrc, setImgSrc] = useState(src || FALLBACK_POSTER);
  return (
    <Image
      src={imgSrc || `https://image.tmdb.org/t/p/original${src}` || FALLBACK_POSTER}
      alt={alt}
      width={300}
      height={400}
      className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
      onError={() => setImgSrc(FALLBACK_POSTER)}
      // if your poster URLs are remote and not in next.config images.domains, add unoptimized
      unoptimized
    />
  );
}
