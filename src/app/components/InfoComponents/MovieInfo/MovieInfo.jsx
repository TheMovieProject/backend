'use client';

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { MdFavorite } from "react-icons/md";
import { FaStar, FaImdb, FaYoutube } from "react-icons/fa";
import { SiRottentomatoes, SiNetflix, SiPrimevideo, SiAppletv, SiYoutube } from "react-icons/si";
import { getGsap } from "@/app/libs/gsapClient";
import StarRating from "@/app/components/StarRating/StarRating";
import { showToast } from "@/app/components/ui/toast";
import { getLikedChannel } from "@/app/libs/likedBus";
import AddToWatchlistControl from "@/app/components/Watchlists/AddToWatchlistControlRevamp";
import { setLikedStatusCache } from "@/lib/liked-status-client";
import ProfileImage from "../../../../../public/img/profile.png";

const tmdbImg = (path, size = "w185") =>
  path ? `https://image.tmdb.org/t/p/${size}${path}` : "/img/NoUser.png";

const tmdbPoster = (path) =>
  path ? `https://image.tmdb.org/t/p/original${path}` : "/img/logo.png";

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

function ScorePill({ icon, value, label, accentClass = "text-yellow-300", trailing = null }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-white sm:text-sm">
      <span className={accentClass}>{icon}</span>
      <span className="font-semibold text-white">{value}</span>
      <span className="text-white/60">{label}</span>
      {trailing ? <span className="text-white/40">{trailing}</span> : null}
    </span>
  );
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
  const [isCastModalOpen, setIsCastModalOpen] = useState(false);

  const likeBtnRef = useRef(null);

  const director = useMemo(() => getDirectorPerson(item?.credits?.crew || []), [item]);
  const allCast = useMemo(() => item?.credits?.cast || [], [item]);
  const topCast = useMemo(() => getTopCast(allCast, 8), [allCast]);
  const inTheaters = useMemo(() => isNewInTheaters(item?.release_date), [item]);

  useEffect(() => {
    setIsLiked(!!defaultLiked);
    setLikedStatusCache(item?.id, !!defaultLiked);
  }, [defaultLiked, item?.id]);

  useEffect(() => {
    setIsInWatchlist(!!defaultInWatchlist);
  }, [defaultInWatchlist]);

  useEffect(() => {
    setIsCastModalOpen(false);
  }, [item?.id]);

  useEffect(() => {
    if (!isCastModalOpen) return;
    const onKeyDown = (event) => {
      if (event.key === "Escape") setIsCastModalOpen(false);
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isCastModalOpen]);

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

  const toggleLike = async () => {
    const previousLiked = isLiked;

    try {
      const gsap = await getGsap();
      if (!isLiked) {
        setIsLiked(true);
        if (gsap && likeBtnRef.current) {
          gsap.fromTo(likeBtnRef.current, { scale: 1 }, { scale: 1.15, duration: 0.12, yoyo: true, repeat: 1 });
        }

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

        showToast("Added to Liked");
      } else {
        setIsLiked(false);
        if (gsap && likeBtnRef.current) {
          gsap.fromTo(likeBtnRef.current, { scale: 1 }, { scale: 0.92, duration: 0.12, yoyo: true, repeat: 1 });
        }

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
  const displayTitle = item?.title || item?.original_title || "Untitled";
  const originalTitle =
    item?.original_title && item.original_title !== displayTitle ? item.original_title : null;
  const directorHref = director?.id ? `/people/${director.id}` : null;

  const titleBlock = (
    <div className="space-y-4">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-yellow-100/80 sm:text-xs">
          {year ? (
            <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-white/80">
              {year}
            </span>
          ) : null}
          {item?.runtime ? (
            <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-white/80">
              {item.runtime} min
            </span>
          ) : null}
          {item?.certification ? (
            <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-white/80">
              {item.certification}
            </span>
          ) : null}
          {inTheaters ? (
            <span className="rounded-full border border-emerald-400/30 bg-emerald-500/10 px-2.5 py-1 text-emerald-200">
              Now showing
            </span>
          ) : null}
        </div>

        <div>
          <h1 className="text-2xl font-black leading-tight text-white sm:text-3xl lg:text-5xl">
            {displayTitle}
          </h1>
          {originalTitle ? (
            <p className="mt-1 text-sm text-white/60 sm:text-base">{originalTitle}</p>
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {typeof item?.imdbRating === "number" ? (
          <ScorePill
            icon={<FaImdb />}
            value={item.imdbRating.toFixed(1)}
            label="IMDb"
            accentClass="text-yellow-400"
          />
        ) : null}
        {item?.rottenTomatoes ? (
          <ScorePill
            icon={<SiRottentomatoes />}
            value={item.rottenTomatoes}
            label="Rotten"
            accentClass="text-red-500"
          />
        ) : null}
        {typeof averageRating === "number" ? (
          <ScorePill
            icon={<FaStar />}
            value={averageRating.toFixed(1)}
            label="Platform"
            accentClass="text-yellow-400"
            trailing={`(${ratingCount || 0})`}
          />
        ) : null}
      </div>

      {item?.genres?.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {item.genres.map((genre) => (
            <span
              key={genre.id ?? genre.name}
              className="rounded-full border border-yellow-500/30 bg-yellow-500/15 px-3 py-1 text-xs font-medium text-yellow-200 sm:text-sm"
            >
              {genre.name}
            </span>
          ))}
        </div>
      ) : null}

      {item?.trailerUrl ? (
        <a
          href={item.trailerUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex w-fit items-center gap-2 rounded-full border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm font-medium text-red-100 transition hover:bg-red-500/20"
          title="Watch trailer"
        >
          <FaYoutube className="text-red-400" />
          Watch trailer
        </a>
      ) : null}
    </div>
  );

  const creditFacts = (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-1">
      <InfoRow label="Writers" value={getWriters(item?.credits?.crew || [])} />
      <InfoRow label="Production" value={getProductionCompanies(item?.production_companies || [])} />
    </div>
  );

  const directorCardContent = (
    <>
      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full border border-yellow-500/30 bg-black/20">
        <Image
          src={director?.profile_path ? tmdbImg(director.profile_path, "w185") : ProfileImage}
          alt={director?.name || "Director"}
          fill
          className="object-cover"
          sizes="56px"
        />
      </div>

      <div className="min-w-0">
        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-yellow-400">
          Director
        </div>
        <div className="truncate text-sm font-semibold text-white sm:text-base">
          {director?.name || "Unknown"}
        </div>
      </div>
    </>
  );

  return (
    <div className="py-0 sm:py-2 md:py-4">
      <div className="overflow-visible rounded-[28px] border border-yellow-500/20 bg-[#161109]/78 shadow-[0_24px_80px_rgba(0,0,0,0.38)] backdrop-blur-xl">
        <div className="flex flex-col gap-6 p-4 sm:gap-7 sm:p-6 lg:flex-row lg:items-start lg:gap-8 lg:p-8">
          <div className="lg:w-[280px] xl:w-[320px]">
            <div className="flex items-start gap-4 sm:gap-5 lg:block">
              <div className="w-28 shrink-0 sm:w-36 lg:w-full">
                <div className="relative aspect-[2/3] overflow-hidden rounded-[22px] border border-yellow-500/25 bg-black/30 shadow-[0_18px_50px_rgba(0,0,0,0.38)]">
                  <Image
                    src={tmdbPoster(item?.poster_path)}
                    alt={item?.title || "Movie poster"}
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 112px, (max-width: 1024px) 144px, 320px"
                    priority
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />

                  <div className="absolute left-3 top-3 flex flex-wrap gap-2">
                    {inTheaters ? (
                      <span className="rounded-full border border-emerald-400/35 bg-emerald-500/15 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-100">
                        In theaters
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="min-w-0 flex-1 space-y-4 lg:hidden">{titleBlock}</div>
            </div>

            <div className="mt-4 hidden lg:grid">{creditFacts}</div>
          </div>

          <div className="min-w-0 flex-1 space-y-5 sm:space-y-6">
            <div className="hidden lg:block">{titleBlock}</div>

            {item?.overview ? (
              <div className="space-y-2">
                <h3 className="text-base font-semibold uppercase tracking-[0.16em] text-yellow-400 sm:text-lg">
                  Synopsis
                </h3>
                <p className="text-sm leading-7 text-gray-200 sm:text-base">{item.overview}</p>
              </div>
            ) : null}

            <div className="lg:hidden">{creditFacts}</div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4">
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 sm:p-4">
                {directorHref ? (
                  <Link href={directorHref} className="flex items-center gap-3">
                    {directorCardContent}
                  </Link>
                ) : (
                  <div className="flex items-center gap-3">{directorCardContent}</div>
                )}
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 sm:p-4">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-yellow-400 sm:text-xs">
                    Top Cast
                  </div>
                  {allCast.length > 0 ? (
                    <button
                      type="button"
                      onClick={() => setIsCastModalOpen(true)}
                      className="rounded-full border border-yellow-500/35 bg-yellow-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-yellow-200 transition hover:bg-yellow-500/20"
                    >
                      More
                    </button>
                  ) : null}
                </div>

                {topCast.length > 0 ? (
                  <>
                    <div className="flex gap-3 overflow-x-auto pb-1 md:hidden">
                      {topCast.map((person) => (
                        <Link
                          href={`/people/${person.id}`}
                          key={person.cast_id || person.id}
                          className="min-w-[150px] rounded-2xl border border-white/10 bg-black/15 p-2.5 transition hover:border-yellow-500/35"
                          title={`${person.name}${person.character ? ` as ${person.character}` : ""}`}
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full border border-yellow-500/25">
                              <Image
                                src={person.profile_path ? tmdbImg(person.profile_path, "w185") : ProfileImage}
                                alt={person.name}
                                fill
                                className="object-cover"
                                sizes="48px"
                              />
                            </div>
                            <div className="min-w-0">
                              <div className="truncate text-sm font-semibold text-white">{person.name}</div>
                              <div className="truncate text-xs text-white/60">
                                {person.character || "Cast"}
                              </div>
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>

                    <div className="hidden md:flex -space-x-3">
                      {topCast.map((person) => (
                        <Link
                          href={`/people/${person.id}`}
                          key={person.cast_id || person.id}
                          className="relative h-11 w-11 overflow-hidden rounded-full border border-white/20 transition hover:z-10 hover:scale-110"
                          title={`${person.name}${person.character ? ` as ${person.character}` : ""}`}
                        >
                          <Image
                            src={person.profile_path ? tmdbImg(person.profile_path, "w185") : ProfileImage}
                            alt={person.name}
                            fill
                            className="object-cover"
                            sizes="44px"
                          />
                        </Link>
                      ))}
                    </div>

                    <div className="mt-3 text-sm text-white/70 line-clamp-2">
                      {topCast.map((person) => person.name).join(", ")}
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-white/60">Cast information is not available yet.</p>
                )}
              </div>
            </div>

            {item?.providers?.length > 0 ? (
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-yellow-400 sm:text-xs">
                  Where to watch
                </div>
                <div className="flex flex-wrap gap-2">
                  {item.providers.slice(0, 10).map((provider) => (
                    <div
                      key={provider.provider_id}
                      className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/20 px-2.5 py-1.5"
                      title={provider.provider_name}
                    >
                      <div className="relative h-6 w-6 overflow-hidden rounded-md border border-white/10">
                        <Image
                          src={tmdbImg(provider.logo_path, "w92")}
                          alt={provider.provider_name}
                          fill
                          className="object-cover"
                          sizes="24px"
                        />
                      </div>
                      <span className="text-xs text-gray-200">{provider.provider_name}</span>
                      <span className="text-white/60">{providerIcon(provider.provider_name)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="rounded-2xl border border-yellow-500/20 bg-gradient-to-r from-yellow-500/10 to-yellow-600/10 p-4 sm:p-5">
              <div className="flex flex-col gap-4 sm:gap-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-yellow-300 sm:text-xl">Rate this movie</h3>
                    <p className="text-sm text-white/60">Your score helps shape the platform average.</p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      ref={likeBtnRef}
                      onClick={toggleLike}
                      className={`inline-flex min-w-[110px] items-center justify-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition ${
                        isLiked
                          ? "border-red-400 bg-red-500 text-white hover:bg-red-600"
                          : "border-gray-300 bg-white/90 text-gray-800 hover:bg-red-500 hover:text-white"
                      }`}
                      aria-label={isLiked ? "Unlike" : "Like"}
                      title={isLiked ? "Unlike" : "Like"}
                    >
                      <MdFavorite size={18} />
                      <span>{isLiked ? "Liked" : "Like"}</span>
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

                <div className="flex justify-center sm:justify-start">
                  <div className="max-w-full overflow-x-auto">
                    <StarRating
                      movieId={item.id}
                      initialRating={userRating}
                      onRatingChange={onRatingChange}
                      size="responsive"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-sm text-gray-300">
                  <span className="font-medium text-yellow-300">Platform rating</span>
                  {typeof averageRating === "number" ? (
                    <>
                      <span className="text-lg font-bold text-yellow-400">{averageRating.toFixed(1)}</span>
                      <span className="text-gray-400">
                        ({ratingCount} {ratingCount === 1 ? "rating" : "ratings"})
                      </span>
                    </>
                  ) : (
                    <span className="italic text-gray-400">No ratings yet</span>
                  )}
                </div>

                <div className="flex items-center justify-between text-xs text-white/55 sm:hidden">
                  <span className={isLiked ? "text-red-300" : ""}>
                    {isLiked ? "Saved in liked" : "Tap heart to like"}
                  </span>
                  <span className={isInWatchlist ? "text-blue-300" : ""}>
                    {isInWatchlist ? "Saved to watchlist" : "Save to watchlist"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {isCastModalOpen ? (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center p-4 sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-label="All cast members"
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setIsCastModalOpen(false)}
            aria-label="Close cast list"
          />

          <div className="relative z-10 w-full max-w-2xl overflow-hidden rounded-2xl border border-yellow-500/25 bg-[#16120a]/95 shadow-[0_24px_80px_rgba(0,0,0,0.5)]">
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 sm:px-6 sm:py-4">
              <div>
                <h3 className="text-lg font-semibold text-yellow-300">All Cast Members</h3>
                <p className="text-xs text-white/60">{allCast.length} people</p>
              </div>
              <button
                type="button"
                onClick={() => setIsCastModalOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-white/20 text-sm font-semibold text-white/80 transition hover:bg-white/10 hover:text-white"
                aria-label="Close cast list"
              >
                X
              </button>
            </div>

            <div className="max-h-[70vh] overflow-y-auto px-3 py-3 sm:px-4 sm:py-4">
              <div className="space-y-2">
                {allCast.map((person, idx) => (
                  <Link
                    href={`/people/${person.id}`}
                    key={person.cast_id || person.credit_id || person.id || idx}
                    className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 transition hover:border-yellow-500/35 hover:bg-white/[0.08]"
                    title={`${person.name}${person.character ? ` as ${person.character}` : ""}`}
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full border border-yellow-500/30">
                        <Image
                          src={person.profile_path ? tmdbImg(person.profile_path, "w185") : ProfileImage}
                          alt={person.name || "Cast member"}
                          fill
                          className="object-cover"
                          sizes="48px"
                        />
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-white">{person.name}</div>
                      </div>
                    </div>

                    <div className="max-w-[48%] truncate text-right text-xs text-yellow-100/80 sm:text-sm">
                      {person.character || "Unknown role"}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

const getWriters = (crew) =>
  crew.filter((m) => m.department === "Writing").slice(0, 3).map((writer) => writer.name).join(", ") || "Unknown";

const getProductionCompanies = (companies) =>
  (companies || []).slice(0, 3).map((company) => company.name).join(", ") || "Unknown";

const InfoRow = ({ label, value }) => (
  <div className="w-full rounded-2xl border border-white/10 bg-white/[0.04] p-3">
    <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-yellow-400">{label}</div>
    <div className="mt-1 text-sm leading-6 text-white/90">{value}</div>
  </div>
);

export default MovieInfo;
