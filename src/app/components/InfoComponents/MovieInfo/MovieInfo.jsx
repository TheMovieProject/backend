'use client';

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { MdFavorite } from "react-icons/md";
import { FaStar, FaHeart, FaImdb, FaYoutube } from "react-icons/fa";
import { SiRottentomatoes, SiNetflix, SiPrimevideo, SiAppletv, SiYoutube } from "react-icons/si";
import { getGsap } from "@/app/libs/gsapClient";
import StarRating from "@/app/components/StarRating/StarRating";
import { showToast } from "@/app/components/ui/toast";
import { getLikedChannel } from "@/app/libs/likedBus";
import AddToWatchlistControl from "@/app/components/Watchlists/AddToWatchlistControlRevamp";
import { setLikedStatusCache } from "@/lib/liked-status-client";
import ProfileImage from '../../../../../public/img/profile.png'
import Link from "next/link";
const tmdbImg = (path, size = "w185") =>
  path ? `https://image.tmdb.org/t/p/${size}${path}` : "/img/NoUser.png";

const tmdbPoster = (path) =>
  path ? `https://image.tmdb.org/t/p/original${path}` : `/img/logo.png`;

const isNewInTheaters = (release_date) => {
  if (!release_date) return false;
  const d = new Date(release_date);
  if (Number.isNaN(d.getTime())) return false;
  const days = (Date.now() - d.getTime()) / (1000 * 60 * 60 * 24);
  return days >= 0 && days <= 45;
};

const getDirectorPerson = (crew = []) => crew.find((m) => m.job === "Director");
const getTopCast = (cast = [], limit = 8) => (cast || []).slice(0, limit);

function providerIcon(providerName = "") {
  const n = providerName.toLowerCase();
  if (n.includes("netflix")) return <SiNetflix />;
  if (n.includes("amazon") || n.includes("prime video") || n.includes("primevideo")) return <SiPrimevideo />;
  if (n.includes("apple tv")) return <SiAppletv />;
  if (n.includes("youtube")) return <SiYoutube />;
  return null;
}

const MovieInfo = ({
  item,
  averageRating,
  userRating,
  ratingCount,
  onRatingChange,
  defaultInWatchlist = false,
  defaultLiked = false,
}) => {
  const [isLiked, setIsLiked] = useState(!!defaultLiked);
  const [isInWatchlist, setIsInWatchlist] = useState(!!defaultInWatchlist);

  const likeBtnRef = useRef(null);

  const director = useMemo(() => getDirectorPerson(item?.credits?.crew || []), [item]);
  const topCast = useMemo(() => getTopCast(item?.credits?.cast || [], 8), [item]);
  const inTheaters = useMemo(() => isNewInTheaters(item?.release_date), [item]);

  useEffect(() => {
    setIsLiked(!!defaultLiked);
    setLikedStatusCache(item?.id, !!defaultLiked);
  }, [defaultLiked, item?.id]);

  useEffect(() => {
    setIsInWatchlist(!!defaultInWatchlist);
  }, [defaultInWatchlist]);

  // --- API helpers ---
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

  // --- handlers ---
  const toggleLike = async () => {
    const previousLiked = isLiked;

    try {
      const gsap = await getGsap();
      if (!isLiked) {
        setIsLiked(true);
        if (gsap && likeBtnRef.current)
          gsap.fromTo(likeBtnRef.current, { scale: 1 }, { scale: 1.15, duration: 0.12, yoyo: true, repeat: 1 });

        await likeOnServer();
        setLikedStatusCache(item.id, true);

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
        setIsLiked(false);
        if (gsap && likeBtnRef.current)
          gsap.fromTo(likeBtnRef.current, { scale: 1 }, { scale: 0.92, duration: 0.12, yoyo: true, repeat: 1 });

        await unlikeOnServer();
        setLikedStatusCache(item.id, false);

        getLikedChannel().postMessage({ type: "LIKED_REMOVE", payload: { tmdbId: String(item.id) } });
        showToast("Removed from Liked");
      }
    } catch {
      setIsLiked(previousLiked);
      setLikedStatusCache(item.id, previousLiked);
      showToast("Something went wrong", 1400);
    }
  };

  const year = item?.release_date ? new Date(item.release_date).getFullYear() : null;

  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4">
        <div className="bg-gray-400 bg-clip-padding backdrop-filter backdrop-blur-sm bg-opacity-20 border-gray-100 rounded-2xl shadow-2xl overflow-visible border border-yellow-500/20">
          <div className="flex flex-col lg:flex-row lg:space-x-8 p-8">
            {/* Poster */}
            <div className="flex-shrink-0 mb-8 lg:mb-0 lg:w-1/3">
              <div className="relative w-full max-w-sm mx-auto lg:max-w-none h-[500px] rounded-xl overflow-hidden shadow-2xl border-2 border-yellow-500/30">
                <Image
                  src={tmdbPoster(item?.poster_path)}
                  alt={item?.title || "Movie Image"}
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 400px"
                  priority
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />

                {/* Badges */}
                <div className="absolute top-3 left-3 flex flex-wrap gap-2">
                  {inTheaters && (
                    <span className="px-2 py-1 rounded-lg text-xs bg-emerald-500/20 text-emerald-200 border border-emerald-500/30">
                      In Theaters
                    </span>
                  )}
                  {item?.certification && (
                    <span className="px-2 py-1 rounded-lg text-xs bg-white/10 text-white border border-white/10">
                      {item.certification}
                    </span>
                  )}
                  {item?.runtime ? (
                    <span className="px-2 py-1 rounded-lg text-xs bg-white/10 text-white border border-white/10">
                      ⏱ {item.runtime} min
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="mt-2 flex flex-col items-center gap-3">
                {/* Writers */}
                  <InfoRow label="Writers" value={getWriters(item?.credits?.crew || [])} />

                  {/* Production */}
                  <InfoRow label="Production" value={getProductionCompanies(item?.production_companies || [])} />
              </div>
            </div>

            

            {/* Details */}
            <div className="flex-grow lg:w-2/3">
              <div className="space-y-6">
                {/* Title */}
                <div>
                  <h1 className="text-4xl lg:text-5xl font-bold text-white mb-2 leading-tight">
                    {item?.title}{" "}
                    <span className="text-[1rem] text-white/70">
                      {item?.title !== item?.original_title && item?.original_title}
                    </span>
                  </h1>

                  <div className="flex flex-wrap items-center gap-3 text-yellow-400">
                    {year && <span className="text-lg font-medium">{year}</span>}
                    {item?.runtime ? (
                      <>
                        <span className="w-1.5 h-1.5 bg-yellow-500 rounded-full" />
                        <span className="text-lg font-medium">{item.runtime} mins</span>
                      </>
                    ) : null}

                    {/* Trailer */}
                    {item?.trailerUrl ? (
                      <>
                        <span className="w-1.5 h-1.5 bg-yellow-500 rounded-full" />
                        <a
                          href={item.trailerUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium bg-white/90 text-gray-800 border-gray-300 hover:bg-red-600 hover:text-white transition"
                          title="Watch trailer"
                        >
                          <FaYoutube />
                          Trailer
                        </a>
                      </>
                    ) : null}
                  </div>
                </div>

                {/* IMDb / Rotten Tomatoes */}
                <div className="flex flex-wrap items-center gap-3">
                  {typeof item?.imdbRating === "number" && (
                    <span className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white">
                      <FaImdb className="text-yellow-400" />
                      <span className="font-semibold">{item.imdbRating.toFixed(1)}</span>
                      <span className="text-white/60">IMDb</span>
                    </span>
                  )}
                  {item?.rottenTomatoes && (
                    <span className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white">
                      <SiRottentomatoes className="text-red-500" />
                      <span className="font-semibold">{item.rottenTomatoes}</span>
                      <span className="text-white/60">Rotten Tomatoes</span>
                    </span>
                  )}
                  {/* your platform rating */}
                  {typeof averageRating === "number" && (
                    <span className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white">
                      <FaStar className="text-yellow-400" />
                      <span className="font-semibold">{averageRating.toFixed(1)}</span>
                      <span className="text-white/60">Platform</span>
                      <span className="text-white/40">({ratingCount || 0})</span>
                    </span>
                  )}
                </div>

                {/* Genres */}
                {item?.genres?.length > 0 && (
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
                {item?.overview && (
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold text-yellow-400">Synopsis</h3>
                    <p className="text-gray-300 text-sm leading-relaxed">{item.overview}</p>
                  </div>
                )}

                {/* Director + Cast photos */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                  {/* Director card */}
                  <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3">
                    <Link href={`/people/${director.id}`} className="relative h-12 w-12 overflow-hidden rounded-full border border-yellow-500/30">
                      <Image
                        src={ director?.profile_path ? tmdbImg(director?.profile_path, "w185") : ProfileImage}
                        alt={director?.name || "Director"}
                        fill
                        className="object-cover"
                      />
                    </Link>
                    <div className="min-w-0">
                      <div className="text-xs text-yellow-400 uppercase tracking-wide">Director</div>
                      <div className="text-white font-medium truncate">{director?.name || "Unknown"}</div>
                    </div>
                  </div>

                  {/* Top cast headshots */}
                  <div className="rounded-xl border border-white/10 bg-white/5 p-3 md:p-4">
  <div className="text-xs md:text-sm text-yellow-400 uppercase tracking-wide mb-2 md:mb-3">
    Top Cast
  </div>
  
  {/* Mobile & Tablet: New responsive design */}
  <div className="md:hidden">
    <div className="grid grid-cols-3 gap-3">
      {topCast.map((p) => (
        <Link 
          href={`/people/${p.id}`}
          key={p.cast_id || p.id}
          className="relative group"
          title={`${p.name}${p.character ? ` as ${p.character}` : ""}`}
        >
          <div className="relative h-20 w-20 rounded-full overflow-hidden border-2 border-white/20 group-hover:border-yellow-400/60 transition-all duration-300 group-hover:scale-110">
            <Image 
              src={p.profile_path ? tmdbImg(p.profile_path, "w185") : ProfileImage} 
              alt={p.name} 
              fill 
              className="object-cover transition-transform duration-300 group-hover:scale-110"
              sizes="80px"
            />
          </div>
        </Link>
      ))}
    </div>
  </div>
  
  {/* Laptop/Desktop: Your original design */}
  <div className="hidden md:flex -space-x-3">
    {topCast.map((p) => (
      <Link
        href={`/people/${p.id}`}
        key={p.cast_id || p.id}
        className="relative h-10 w-10 rounded-full overflow-hidden border border-white/20 hover:z-10 hover:scale-200 transition"
        title={`${p.name}${p.character ? ` as ${p.character}` : ""}`}
      >
        <Image 
          src={p.profile_path ? tmdbImg(p.profile_path, "w185") : ProfileImage} 
          alt={p.name} 
          fill 
          className="object-cover cursor-pointer hover:scale-250" 
          sizes="40px"
        />
      </Link>
    ))}
  </div>
  
  {/* Names text - responsive styling */}
  <div className="mt-2 md:mt-3 text-xs md:text-sm text-gray-300 line-clamp-1 md:line-clamp-2">
    {topCast.map((p) => p.name).join(", ")}
  </div>
</div>

                </div>

                {/* Where to watch */}
                {item?.providers?.length > 0 && (
                  <div className="mt-2 rounded-xl border border-white/10 bg-white/5 p-4">
                    <div className="text-xs text-yellow-400 uppercase tracking-wide mb-3">Where to watch</div>
                    <div className="flex flex-wrap gap-2">
                      {item.providers.slice(0, 12).map((p) => (
                        <div
                          key={p.provider_id}
                          className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-2.5 py-1.5"
                          title={p.provider_name}
                        >
                          <div className="relative h-6 w-6 rounded overflow-hidden border border-white/10">
                            <Image src={tmdbImg(p.logo_path, "w92")} alt={p.provider_name} fill className="object-cover" />
                          </div>
                          <span className="text-xs text-gray-200">{p.provider_name}</span>
                          <span className="text-white/60">{providerIcon(p.provider_name)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Rating + Actions */}
                <div className="mt-6 p-4 sm:p-6 bg-gradient-to-r from-yellow-500/10 to-yellow-600/10 rounded-xl border border-yellow-500/20">
  {/* Header row - responsive stacking */}
  <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
    <h3 className="text-lg sm:text-xl font-semibold text-yellow-400">Your Rating</h3>

    <div className="flex flex-wrap items-center gap-2">
      {/* Like button */}
      <button
        ref={likeBtnRef}
        onClick={toggleLike}
        className={`inline-flex items-center gap-1.5 sm:gap-2 rounded-full border px-3 sm:px-4 py-1.5 sm:py-2 text-sm font-medium transition flex-shrink-0
          ${
            isLiked
              ? "bg-red-500 text-white border-red-400 hover:bg-red-600"
              : "bg-white/90 text-gray-800 border-gray-300 hover:bg-red-500 hover:text-white"
          }`}
        aria-label={isLiked ? "Unlike" : "Like"}
        title={isLiked ? "Unlike" : "Like"}
      >
        <MdFavorite size={16} className="sm:size-[18px]" />
        <span className="hidden sm:inline">{isLiked ? "Liked" : "Like"}</span>
      </button>

      <AddToWatchlistControl
        movie={{
          id: item.id,
          title: item.title || item.original_title,
          poster_path: item.poster_path,
          posterUrl: item.posterUrl || null,
        }}
        className="relative z-[80]"
        defaultInWatchlist={isInWatchlist}
        onStatusChange={({ inDefault }) => setIsInWatchlist(inDefault)}
      />
    </div>
  </div>

  {/* Stars - centered on mobile, left-aligned on larger screens */}
  <div className="mb-4 flex justify-center sm:justify-start">
    <div className="max-w-full overflow-x-auto">
      <StarRating 
        movieId={item.id} 
        initialRating={userRating} 
        onRatingChange={onRatingChange} 
        size="responsive"
      />
    </div>
  </div>

  {/* Aggregate rating - responsive text */}
  <div className="text-sm text-gray-300">
    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
      <span className="font-medium text-yellow-400 whitespace-nowrap">Platform Rating:</span>
      <span className="flex items-center flex-wrap gap-1 sm:gap-2">
        {typeof averageRating === "number" ? (
          <>
            <span className="text-lg sm:text-xl font-bold text-yellow-500">
              {averageRating.toFixed(1)}
            </span>
            <span className="text-gray-400 text-sm">
              ({ratingCount} {ratingCount === 1 ? "rating" : "ratings"})
            </span>
          </>
        ) : (
          <span className="text-gray-400 italic">No ratings yet</span>
        )}
      </span>
    </div>
  </div>

  {/* Mobile-only button labels */}
  <div className="mt-3 sm:hidden flex justify-between text-xs text-gray-400">
    <span className={`${isLiked ? 'text-red-300' : ''}`}>
      {isLiked ? '✓ Liked' : 'Tap to like'}
    </span>
    <span className={`${isInWatchlist ? 'text-blue-300' : ''}`}>
      {isInWatchlist ? '✓ In Watchlist' : 'Add to Watchlist'}
    </span>
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
const getWriters = (crew) =>
  crew.filter((m) => m.department === "Writing").slice(0,3).map((w) => w.name).join(", ") || "Unknown";

const getProductionCompanies = (companies) =>
  (companies || []).map((c) => c.name).join(", ") || "Unknown";

const InfoRow = ({ label, value }) => (
  <div className="space-y-1 rounded-xl border border-white/10 bg-white/5 p-3 w-[20rem] lg:w-[25rem]">
    <dt className="text-xs font-medium text-yellow-400 uppercase tracking-wide">{label}</dt>
    <dd className="text-base text-white font-light">{value}</dd>
  </div>
);

export default MovieInfo;
