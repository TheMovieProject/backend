"use client";
import React, { useEffect, useState } from "react";
import MovieBlock from "@/app/components/MovieBlock/MovieBlock";

const SECTION_HEADING_CLASS = "text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white";
const SECTION_SUBTITLE_CLASS = "text-sm md:text-base text-yellow-100/80";

function toMovieBlockItem(item) {
  return {
    id: item?.tmdbId ?? item?.id,
    title: item?.title || item?.original_title || "Untitled",
    original_title: item?.original_title || item?.title || "Untitled",
    poster_path: item?.posterPath ?? null,
    posterUrl: item?.posterUrl ?? null,
    vote_average: Number(item?.avgRating7d ?? item?.tmdbVoteAverage ?? item?.vote_average ?? 0),
    release_date: item?.releaseDate ?? item?.release_date ?? null,
  };
}

const TrendingMovies = () => {
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    let alive = true;

    (async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch("/api/trending_movies_week", { signal: controller.signal });
        if (!res.ok) {
          throw new Error(`Failed to load trending movies (${res.status})`);
        }
        const data = await res.json();
        if (!alive) return;
        setMovies((data || []).slice(0, 15));
      } catch (err) {
        if (!alive || err?.name === "AbortError") return;
        console.log(err);
        setError(err?.message || "Failed to load trending movies.");
      } finally {
        if (alive) {
          setLoading(false);
        }
      }
    })();

    return () => {
      alive = false;
      controller.abort();
    };
  }, []);

  const SkeletonLoader = () => (
    <div
      className="grid grid-cols-2 gap-x-6 gap-y-10 pt-8 sm:grid-cols-3 lg:grid-cols-6"
    >
      {[...Array(6)].map((_, index) => (
        <div key={index} className="w-full max-w-[185px] justify-self-center animate-pulse pt-8">
          <div className="bg-gray-700/50 rounded-xl h-64 mb-2"></div>
          <div className="h-4 bg-gray-700/50 rounded w-3/4 mb-2"></div>
          <div className="h-3 bg-gray-700/50 rounded w-1/2"></div>
        </div>
      ))}
    </div>
  );

  return (
    <section className="px-4 pt-16 md:px-6 md:pt-20 font-sans">
      <div className="max-w-7xl mx-auto mb-12 space-y-6">
        <div className="text-center">
          <div className="inline-flex items-center gap-3 mb-2">
            <h1 className={SECTION_HEADING_CLASS}>
              This Week&apos;s Trending on TheMovieProject
            </h1>
          </div>
          <p className={`mx-auto max-w-3xl ${SECTION_SUBTITLE_CLASS}`}>
            Worldwide momentum ranked from the last 7 days of likes, ratings, watchlists, reviews, and movie-to-movie demand.
          </p>
        </div>

        {loading ? (
          <SkeletonLoader />
        ) : error ? (
          <div className="text-center py-8">
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20 max-w-md mx-auto">
              <div className="text-4xl mb-4">❌</div>
              <h3 className="text-lg font-bold text-white mb-2">
                Failed to load Trending
              </h3>
              <p className="text-gray-300 text-sm">{error}</p>
            </div>
          </div>
        ) : movies.length === 0 ? (
          <div className="text-center py-12">
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20 max-w-md mx-auto">
              <div className="text-6xl mb-4">🎬</div>
              <h3 className="text-xl font-bold text-white mb-2">No Trending</h3>
              <p className="text-gray-300">
                Check back later for new movie announcements.
              </p>
            </div>
          </div>
        ) : (
          <div
            className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 lg:grid-cols-6"
          >
            {movies.map((item, index) => (
              <div key={item.id || item.tmdbId || index} className="w-full max-w-[185px] justify-self-center pt-8">
                <MovieBlock item={toMovieBlockItem(item)} index={index} />
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default TrendingMovies;
