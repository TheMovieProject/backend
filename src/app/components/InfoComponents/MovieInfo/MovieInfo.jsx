'use client';

import Image from "next/image";
import { useEffect, useState, useRef } from "react";
import { MdFavorite, MdAdd, MdCheck } from "react-icons/md";
import { gsap } from "gsap";
import StarRating from "@/app/components/StarRating/StarRating";
import { showToast } from "@/app/components/ui/toast";
import { getLikedChannel } from "@/app/libs/likedBus";

const MovieInfo = ({
  item,
  averageRating,
  userRating,
  ratingCount,
  onRatingChange,
  defaultLiked = false,        
  defaultInWatchlist = false, 
}) => {
  const [isLiked, setIsLiked] = useState(!!defaultLiked);
  const [isInWatchlist, setIsInWatchlist] = useState(!!defaultInWatchlist);

  const likeBtnRef = useRef(null);
  const watchBtnRef = useRef(null);

  // --- helpers (API) ---
  async function likeOnServer() {
    const res = await fetch("/api/liked/add", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        movieId: String(item.id),
        title: item.title || item.original_title,
        posterUrl: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : null,
      }),
    });
    if (!res.ok) throw new Error("like failed");
  }
  
  async function unlikeOnServer() {
    const res = await fetch("/api/liked/remove", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ movieId: String(item.id) }),
    });
    if (!res.ok) throw new Error("unlike failed");
  }
  
  async function addWatchlistOnServer() {
    const res = await fetch("/api/watchlist/add", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        movieId: String(item.id),
        title: item.title || item.original_title,
        posterUrl: item.poster_path ? `https://image.tmdb.org/t/p/original${item.poster_path}` : null,
      }),
    });
    if (!res.ok) throw new Error("watch add failed");
  }
  
  async function removeWatchlistOnServer() {
    const res = await fetch("/api/watchlist/remove", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ movieId: String(item.id) }),
    });
    if (!res.ok) throw new Error("watch remove failed");
  }

  // --- handlers ---
  const toggleLike = async () => {
    try {
      if (!isLiked) {
        setIsLiked(true); // optimistic
        if (likeBtnRef.current) gsap.fromTo(likeBtnRef.current, { scale: 1 }, { scale: 1.15, duration: 0.12, yoyo: true, repeat: 1 });
        await likeOnServer();
        getLikedChannel().postMessage({
          type: "LIKED_ADD",
          payload: {
            tmdbId: String(item.id),
            title: item.title || item.original_title,
            posterUrl: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : null,
          },
        });
        showToast("Added to Liked ❤️");
      } else {
        setIsLiked(false); // optimistic
        if (likeBtnRef.current) gsap.fromTo(likeBtnRef.current, { scale: 1 }, { scale: 0.92, duration: 0.12, yoyo: true, repeat: 1 });
        await unlikeOnServer();
        getLikedChannel().postMessage({ type: "LIKED_REMOVE", payload: { tmdbId: String(item.id) } });
        showToast("Removed from Liked");
      }
    } catch {
      setIsLiked((p) => !p); // rollback
      showToast("Something went wrong", 1400);
    }
  };

  const toggleWatchlist = async () => {
    try {
      if (!isInWatchlist) {
        setIsInWatchlist(true); // optimistic
        if (watchBtnRef.current) gsap.fromTo(watchBtnRef.current, { scale: 1 }, { scale: 1.12, duration: 0.12, yoyo: true, repeat: 1 });
        await addWatchlistOnServer();
        showToast("Added to Watchlist");
      } else {
        setIsInWatchlist(false); // optimistic
        if (watchBtnRef.current) gsap.fromTo(watchBtnRef.current, { scale: 1 }, { scale: 0.92, duration: 0.12, yoyo: true, repeat: 1 });
        await removeWatchlistOnServer();
        showToast("Removed from Watchlist");
      }
    } catch {
      setIsInWatchlist((p) => !p); // rollback
      showToast("Action failed", 1400);
    }
  };

  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4">
        <div className="bg-gray-400 bg-clip-padding backdrop-filter backdrop-blur-sm bg-opacity-20 border-gray-100 rounded-2xl shadow-2xl overflow-hidden border border-yellow-500/20">
          <div className="flex flex-col lg:flex-row lg:space-x-8 p-8">
            {/* Poster */}
            <div className="flex-shrink-0 mb-8 lg:mb-0 lg:w-1/3">
              <div className="relative w-full max-w-sm mx-auto lg:max-w-none h-[500px] rounded-xl overflow-hidden shadow-2xl border-2 border-yellow-500/30">
                <Image
                  src={item.poster_path ? `https://image.tmdb.org/t/p/original${item.poster_path}` : `/img/NoImage.jpg`}
                  alt={item.title || "Movie Image"}
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 400px"
                  priority
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
              </div>
            </div>

            {/* Details */}
            <div className="flex-grow lg:w-2/3">
              <div className="space-y-6">
                {/* Title */}
                <div>
                  <h1 className="text-4xl lg:text-5xl font-bold text-white mb-2 leading-tight">
                    {item.original_title}
                  </h1>
                  <div className="flex items-center space-x-4 text-yellow-400">
                    <span className="text-lg font-medium">{new Date(item.release_date).getFullYear()}</span>
                    <span className="w-1.5 h-1.5 bg-yellow-500 rounded-full"></span>
                    <span className="text-lg font-medium">{item.runtime} mins</span>
                  </div>
                </div>

                {/* Genres */}
                {item.genres?.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {item.genres.map((genre) => (
                      <span
                        key={genre.id}
                        className="px-3 py-1 bg-yellow-500/20 text-yellow-300 rounded-full text-sm border border-yellow-500/30"
                      >
                        {genre.name}
                      </span>
                    ))}
                  </div>
                )}

                {/* Overview */}
                {item.overview && (
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold text-yellow-400">Synopsis</h3>
                    <p className="text-gray-300 text-lg leading-relaxed">{item.overview}</p>
                  </div>
                )}

                {/* Info grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                  <InfoRow label="Director" value={getDirector(item.credits?.crew || [])} />
                  <InfoRow label="Writers" value={getWriters(item.credits?.crew || [])} />
                  <InfoRow label="Cast" value={getCast(item.credits?.cast || [])} />
                  <InfoRow label="Production" value={getProductionCompanies(item.production_companies || [])} />
                </div>

                {/* Rating + Actions */}
                <div className="mt-8 p-6 bg-gradient-to-r from-yellow-500/10 to-yellow-600/10 rounded-xl border border-yellow-500/20">
                  {/* header row: title + action buttons */}
                  <div className="mb-4 flex items-center justify-between gap-4">
                    <h3 className="text-lg font-semibold text-yellow-400">Your Rating</h3>

                    <div className="flex items-center gap-2">
                      {/* Like */}
                      <button
                        ref={likeBtnRef}
                        onClick={toggleLike}
                        className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium transition
                          ${isLiked
                            ? "bg-red-500 text-white border-red-400 hover:bg-red-600"
                            : "bg-white/90 text-gray-800 border-gray-300 hover:bg-red-500 hover:text-white"
                          }`}
                        aria-label={isLiked ? "Unlike" : "Like"}
                        title={isLiked ? "Unlike" : "Like"}
                      >
                        <MdFavorite size={16} />
                        {isLiked ? "Liked" : "Like"}
                      </button>

                      {/* Watchlist */}
                      <button
                        ref={watchBtnRef}
                        onClick={toggleWatchlist}
                        className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium transition
                          ${isInWatchlist
                            ? "bg-blue-600 text-white border-blue-500 hover:bg-blue-700"
                            : "bg-white/90 text-gray-800 border-gray-300 hover:bg-blue-600 hover:text-white"
                          }`}
                        aria-label={isInWatchlist ? "Remove from Watchlist" : "Add to Watchlist"}
                        title={isInWatchlist ? "Remove from Watchlist" : "Add to Watchlist"}
                      >
                        {isInWatchlist ? <MdCheck size={16} /> : <MdAdd size={16} />}
                        {isInWatchlist ? "In Watchlist" : "Watchlist"}
                      </button>
                    </div>
                  </div>

                  {/* stars */}
                  <div className="mb-4">
                    <StarRating
                      movieId={item.id}
                      initialRating={userRating}
                      onRatingChange={onRatingChange}
                    />
                  </div>

                  {/* aggregate */}
                  <div className="text-sm text-gray-300">
                    <p className="flex items-center">
                      <span className="font-medium text-yellow-400">Platform Rating:</span>
                      <span className="ml-2">
                        {averageRating ? (
                          <>
                            <span className="text-xl font-bold text-yellow-500">{averageRating.toFixed(1)}</span>
                            <span className="ml-1 text-gray-400">({ratingCount} {ratingCount === 1 ? "rating" : "ratings"})</span>
                          </>
                        ) : (
                          "No ratings yet"
                        )}
                      </span>
                    </p>
                  </div>
                </div>
                {/* /Rating + Actions */}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/* helpers */
const getDirector = (crew) =>
  crew.find((m) => m.job === "Director")?.name || "Unknown";

const getWriters = (crew) =>
  crew.filter((m) => m.department === "Writing").map((w) => w.name).join(", ") || "Unknown";

const getCast = (cast, limit = 5) =>
  (cast || []).slice(0, limit).map((a) => a.name).join(", ");

const getProductionCompanies = (companies) =>
  (companies || []).map((c) => c.name).join(", ");

const InfoRow = ({ label, value }) => (
  <div className="space-y-1">
    <dt className="text-sm font-medium text-yellow-400 uppercase tracking-wide">{label}</dt>
    <dd className="text-base text-white font-light">{value}</dd>
  </div>
);

export default MovieInfo;