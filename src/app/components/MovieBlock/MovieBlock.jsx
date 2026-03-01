// app/components/MovieBlock/MovieBlock.jsx
"use client";
import React, { useRef, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { MdFavorite, MdStar } from "react-icons/md";
import { getGsap } from "@/app/libs/gsapClient";
import { showToast } from "@/app/components/ui/toast";
import { getLikedChannel } from "@/app/libs/likedBus";
import AddToWatchlistControl from "@/app/components/Watchlists/AddToWatchlistControlRevamp";
import { setLikedStatusCache, useLikedStatus } from "@/lib/liked-status-client";

function isAbsoluteUrl(value) {
  return typeof value === "string" && /^(https?:)?\/\//.test(value);
}

function getPosterSource(item) {
  const rawPoster = item?.posterUrl || item?.poster_path || item?.posterPath;
  if (!rawPoster) return "/img/logo.png";
  if (isAbsoluteUrl(rawPoster)) return rawPoster;
  return `https://image.tmdb.org/t/p/w500${rawPoster}`;
}

function getReleaseYear(item) {
  const rawDate = item?.release_date || item?.releaseDate;
  if (!rawDate) return null;
  const year = String(rawDate).split("-")[0];
  return year && year !== "undefined" ? year : null;
}

export default function MovieBlock({ 
  item, 
  index, 
  defaultLiked = false
}) {
  const [isLiked, setIsLiked] = useLikedStatus(item?.id, !!defaultLiked);

  const cardRef = useRef(null);
  const tapeRef = useRef(null);
  const likeButtonRef = useRef(null);
  const posterRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const card = cardRef.current;
      const gsap = await getGsap();
      if (cancelled || !card || !gsap) return;

      gsap.fromTo(
        card,
        { opacity: 0, y: 24, scale: 0.96 },
        { opacity: 1, y: 0, scale: 1, duration: 0.35, delay: index * 0.02, ease: "power2.out" }
      );
    })();

    return () => {
      cancelled = true;
    };
  }, [index]);

  const createFlyingPosterAnimation = (gsap, startX, startY, posterUrl, posterWidth, posterHeight) => {
    const flyingPoster = document.createElement("div");
    Object.assign(flyingPoster.style, {
      position: "fixed",
      left: `${startX}px`,
      top: `${startY}px`,
      width: `${posterWidth}px`,
      height: `${posterHeight}px`,
      zIndex: "2147483647",
      pointerEvents: "none",
      borderRadius: "8px",
      overflow: "hidden",
      boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
      opacity: "1",
    });

    const flyingImage = document.createElement("img");
    flyingImage.src = posterUrl;
    Object.assign(flyingImage.style, {
      width: "100%",
      height: "100%",
      objectFit: "cover",
      borderRadius: "8px",
    });

    flyingPoster.appendChild(flyingImage);
    document.body.appendChild(flyingPoster);

    const targetX = 28,
      targetY = 20;

    gsap.to(flyingPoster, {
      x: targetX - startX,
      y: targetY - startY,
      scale: 0.18,
      rotation: 120,
      duration: 0.5, // faster
      ease: "power2.in",
      onComplete: () => {
        document.body.removeChild(flyingPoster);
      },
    });
  };

  async function addToLiked() {
    const res = await fetch("/api/liked/add", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        movieId: String(item.id),
        title: item.title || item.original_title,
        posterUrl: getPosterSource(item) === "/img/logo.png" ? null : getPosterSource(item),
      }),
    });
    if (!res.ok) throw new Error("add failed");
  }

  async function removeFromLiked() {
    const res = await fetch("/api/liked/remove", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ movieId: String(item.id) }),
    });
    if (!res.ok) throw new Error("remove failed");
  }

  const handleLike = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    const likeButton = likeButtonRef.current;
    const poster = posterRef.current;
    const previousLiked = isLiked;
    const nextLiked = !isLiked;

    try {
      const gsap = await getGsap();
      setIsLiked(nextLiked);
      setLikedStatusCache(item.id, nextLiked);

      if (!isLiked) {
        if (gsap && likeButton) {
          gsap.fromTo(likeButton, { scale: 1 }, { scale: 1.18, duration: 0.12, yoyo: true, repeat: 1 });
        }

        await addToLiked();

        if (gsap && poster) {
          const rect = poster.getBoundingClientRect();
          createFlyingPosterAnimation(
            gsap,
            rect.left + rect.width / 2,
            rect.top + rect.height / 2,
            getPosterSource(item),
            rect.width,
            rect.height
          );
        }

        // Broadcast to everyone (Liked page listens)
        getLikedChannel().postMessage({
          type: "LIKED_ADD",
          payload: {
            tmdbId: String(item.id),
            title: item.title,
            posterUrl: getPosterSource(item) === "/img/logo.png" ? null : getPosterSource(item),
          },
        });

        showToast("Added to Liked ❤️");
      } else {
        if (gsap && likeButton) {
          gsap.fromTo(likeButton, { scale: 1 }, { scale: 0.92, duration: 0.12, yoyo: true, repeat: 1 });
        }

        await removeFromLiked();

        getLikedChannel().postMessage({
          type: "LIKED_REMOVE",
          payload: { tmdbId: String(item.id) },
        });

        showToast("Removed from Liked");
      }
    } catch {
      setIsLiked(previousLiked);
      setLikedStatusCache(item.id, previousLiked);
      showToast("Something went wrong", 1400);
    }
  };

  const handleHover = async () => {
    const gsap = await getGsap();
    if (!gsap) return;
    const tl = gsap.timeline();
    tl.to(cardRef.current, { y: -6, duration: 0.18, ease: "power2.out" })
      .to(cardRef.current, { rotation: 0.6, duration: 0.08 })
      .to(cardRef.current, { rotation: 0, duration: 0.08 });
    gsap.to(tapeRef.current, { rotation: 2, y: -2, duration: 0.12, yoyo: true, repeat: 1 });
  };

  const handleHoverExit = async () => {
    const gsap = await getGsap();
    if (!gsap) return;
    gsap.to(cardRef.current, { y: 0, rotation: 0, duration: 0.25, ease: "power2.out" });
    gsap.to(tapeRef.current, { rotation: 0, y: 0, duration: 0.2 });
  };

  const handleTap = async () => {
    const gsap = await getGsap();
    if (!gsap) return;
    const tl = gsap.timeline();
    tl.to(cardRef.current, { scale: 0.97, duration: 0.08 }).to(cardRef.current, { scale: 1, duration: 0.2, ease: "power2.out" });
  };

  return (
    <Link href={`/movies/${item.id}`} className="group block">
      <div
        ref={cardRef}
        className="relative bg-white shadow-2xl hover:shadow-3xl transition-all duration-300 p-4 border-2 border-white cursor-pointer"
        onMouseEnter={handleHover}
        onMouseLeave={handleHoverExit}
        onTouchStart={handleTap}
      >
        <div ref={tapeRef} className="absolute -top-8 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
          <Image src="/img/tape.png" alt="" width={104} height={44} className="w-[5rem] h-[3.3rem] object-contain drop-shadow-lg" />
        </div>

        <div className="absolute inset-0 border-8 border-white pointer-events-none" />

        <div className="aspect-[3/4] overflow-hidden mb-4 bg-gradient-to-br from-yellow-400 to-yellow-600 relative">
          <div ref={posterRef}>
            <Image
              src={getPosterSource(item)}
              alt={item.title}
              width={200}
              height={300}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 ease-out"
            />
          </div>

          <div className="absolute top-2 left-2 bg-black/90 text-white px-2 py-1 text-xs font-bold flex items-center gap-1 border border-white/20">
            <MdStar className="text-yellow-400" size={12} />
            {(item.vote_average ?? 0).toFixed(1)}
          </div>

          <div className="absolute top-2 right-2 flex flex-col gap-2">
            <button
              ref={likeButtonRef}
              onClick={handleLike}
              className={`p-2 rounded-full shadow-lg transition-all duration-200 transform hover:scale-110 border border-white/30 ${
                isLiked ? "bg-red-500 text-white" : "bg-white/95 text-gray-800 hover:bg-red-500 hover:text-white"
              }`}
              aria-label={isLiked ? "Unlike" : "Like"}
            >
              <MdFavorite size={16} />
            </button>

            <AddToWatchlistControl
              compact
              movie={{
                id: item.id,
                title: item.title || item.original_title,
                poster_path: item.poster_path,
                posterUrl: item.posterUrl || null,
              }}
            />
          </div>
        </div>

        <div className="text-center space-y-2 px-2">
          <h3
            className="font-bold text-gray-900 text-sm leading-tight min-h-[1.25rem] truncate tracking-tight"
            title={item.title}
          >
            {item.title}
          </h3>
          <div className="flex items-center justify-center gap-2 text-xs text-gray-600 font-medium">
            {getReleaseYear(item) ? (
              <span className="bg-gray-100 px-2 py-1 rounded-full border border-gray-200">
                {getReleaseYear(item)}
              </span>
            ) : null}
          </div>
        </div>

        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4/5 h-2 bg-black/15 blur-sm rounded-full group-hover:bg-black/25 transition-all duration-300" />
      </div>
    </Link>
  );
}
