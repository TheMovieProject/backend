"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Heart, Flame, MessageCircle, Clock, ExternalLink } from "lucide-react";
import { useSession } from "next-auth/react";
import { FaStar } from "react-icons/fa";
import { useEntity, useEntityStore } from "@/app/stores/entityStores";
import { htmlToPlainText } from "@/app/libs/textUtils";

function timeAgo(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const s = (Date.now() - d.getTime()) / 1000;
  if (s < 60) return `${Math.floor(s)}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}

function normalizeForModal(item) {
  const isReview = item?.type === "review";
  const user =
    item?.user ??
    (item?.author ? { username: item.author, image: item.authorAvatar, email: "" } : null);

  const title = isReview
    ? item?.movie?.title || item?.title || "Untitled movie"
    : item?.title || "Untitled";

  const thumbnail = isReview
    ? item?.movie?.posterUrl || item?.thumbnail || ""
    : item?.thumbnail || "";

  const createdAt = item?.createdAt || item?.created_at || item?.updatedAt || new Date().toISOString();
  const content = htmlToPlainText(item?.content ?? item?.text ?? item?.reviewText ?? item?.body ?? "");
  const excerpt = htmlToPlainText(item?.excerpt ?? "");

  return {
    id: item.id,
    type: isReview ? "review" : "blog",
    title,
    thumbnail,
    content,
    excerpt,
    createdAt,
    user,
    author: item?.author,
    authorAvatar: item?.authorAvatar,
    likes: item?.likes || 0,
    fire: item?.fire || 0,
    likedByMe: !!item?.likedByMe,
    firedByMe: !!item?.firedByMe,
    commentsCount: item?.commentsCount ?? 0,
    _raw: item,
  };
}

function safeImageSrc(src) {
  return typeof src === "string" && src.trim() ? src : "/img/logo.png";
}

function releaseYear(dateValue) {
  if (!dateValue) return null;
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return null;
  return date.getFullYear();
}

export default function PostCard({ item, onOpenPost }) {
  const { data: session } = useSession();
  const [busy, setBusy] = useState(false);

  const isReview = item?.type === "review";
  const entityType = isReview ? "review" : "blog";
  const itemId = item?.id ?? "";
  const itemHasReactionFlags =
    typeof item?.likedByMe === "boolean" && typeof item?.firedByMe === "boolean";

  const avatar = item?.user?.avatarUrl || item?.user?.image || "/img/profile.png";
  const profileHref = item?.userId ? `/profile/${item.userId}` : "#";

  const title = isReview ? item?.movie?.title || "Untitled movie" : item?.title || "Untitled";
  const thumbnail = isReview
    ? item?.movie?.posterUrl || item?.thumbnail || ""
    : item?.thumbnail || "";
  const safeThumb = safeImageSrc(thumbnail);
  const createdAtIso = item?.createdAt || item?.created_at;
  const href = isReview ? `/movies/${item?.movie?.tmdbId}` : `/blog/${item?.id}`;

  const upsert = useEntityStore((s) => s.upsert);

  useEffect(() => {
    upsert({
      id: itemId,
      entityType,
      likes: item.likes || 0,
      fire: item.fire || 0,
      likedByMe: typeof item.likedByMe === "boolean" ? item.likedByMe : undefined,
      firedByMe: typeof item.firedByMe === "boolean" ? item.firedByMe : undefined,
      commentsCount: item.commentsCount ?? 0,
    });
  }, [
    itemId,
    item.likes,
    item.fire,
    item.likedByMe,
    item.firedByMe,
    item.commentsCount,
    entityType,
    upsert,
  ]);

  const snap = useEntity(entityType, itemId);

  useEffect(() => {
    let cancelled = false;

    async function hydrateFlags() {
      if (!session?.user || !itemId) return;
      if (itemHasReactionFlags) return;
      if (typeof snap?.likedByMe === "boolean" || typeof snap?.firedByMe === "boolean") return;

      try {
        const res = await fetch(`/api/reaction?entityType=${entityType}&ids=${itemId}`, {
          cache: "no-store",
        });
        if (!res.ok) return;

        const data = await res.json();
        const flags = data[itemId];
        if (!cancelled && flags) {
          upsert({
            id: itemId,
            entityType,
            likedByMe: !!flags.likedByMe,
            firedByMe: !!flags.firedByMe,
          });
        }
      } catch (e) {
        console.error("hydrateFlags failed", e);
      }
    }

    hydrateFlags();
    return () => {
      cancelled = true;
    };
  }, [session?.user, entityType, itemId, itemHasReactionFlags, snap?.likedByMe, snap?.firedByMe, upsert]);

  async function react(type) {
    if (busy || !session?.user || !itemId) return;
    setBusy(true);

    const rollback = useEntityStore.getState().optimisticToggle(entityType, itemId, type);

    try {
      const res = await fetch("/api/reaction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entityId: itemId, entityType, type }),
      });
      if (!res.ok) throw new Error("Failed");

      const updated = await res.json();
      upsert({
        id: itemId,
        entityType,
        likes: updated.likes ?? snap.likes ?? 0,
        fire: updated.fire ?? snap.fire ?? 0,
        likedByMe: !!updated.likedByMe,
        firedByMe: !!updated.firedByMe,
        commentsCount: updated.commentsCount ?? snap.commentsCount ?? 0,
      });
    } catch (e) {
      console.error(e);
      rollback();
    } finally {
      setBusy(false);
    }
  }

  const likes = snap?.likes || 0;
  const fire = snap?.fire || 0;
  const likedByMe = !!snap?.likedByMe;
  const firedByMe = !!snap?.firedByMe;
  const commentsCount = snap?.commentsCount ?? 0;
  const authorLabel =
    item?.user?.username || item?.user?.name || item?.author || item?.user?.email?.split("@")[0] || "movie fan";

  const openAsModal = () => {
    onOpenPost?.(
      normalizeForModal({
        ...item,
        likes,
        fire,
        likedByMe,
        firedByMe,
        commentsCount,
      })
    );
  };

  if (!itemId) return null;

  if (!isReview) {
    const blogHasImage = typeof thumbnail === "string" && thumbnail.trim().length > 0;
    const articlePreview = htmlToPlainText(item?.excerpt || item?.content || "No article text available.");

    return (
      <article className="w-full overflow-hidden rounded-[24px] bg-black/10 shadow-[0_12px_28px_rgba(0,0,0,0.14)] backdrop-blur-[2px]">
        <div className="p-4 sm:p-4.5">
          <div className="flex items-start justify-between gap-3">
            <Link href={profileHref} className="flex min-w-0 items-center gap-3">
              <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full ring-1 ring-white/20">
                <Image src={avatar} alt="user avatar" fill className="object-cover" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white">@{authorLabel}</p>
                <p className="text-[11px] uppercase tracking-[0.14em] text-white/45">Article</p>
              </div>
            </Link>

            <div className="shrink-0 rounded-full bg-black/15 px-2.5 py-1 text-[11px] text-white/70">
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" /> {timeAgo(createdAtIso)}
              </span>
            </div>
          </div>

          <div
            className={`mt-4 grid min-h-[136px] gap-4 ${
              blogHasImage ? "grid-cols-[92px_minmax(0,1fr)] sm:grid-cols-[104px_minmax(0,1fr)]" : "grid-cols-1"
            }`}
          >
            {blogHasImage ? (
              <Link href={href} className="block">
                <div className="relative h-[124px] w-[92px] overflow-hidden rounded-[16px] shadow-[0_10px_22px_rgba(0,0,0,0.18)] sm:h-[140px] sm:w-[104px]">
                  <Image
                    src={safeThumb}
                    alt={title}
                    fill
                    className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                    sizes="(max-width: 640px) 92px, 104px"
                  />
                </div>
              </Link>
            ) : null}

            <div className="min-w-0 py-1">
              <Link href={href} className="block text-base font-semibold leading-snug text-white transition-colors hover:text-yellow-100 sm:text-[1.08rem]">
                <span className="line-clamp-2">{title}</span>
              </Link>
              <p className="mt-2 line-clamp-4 text-sm leading-5 text-white/76">
                {articlePreview}
              </p>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-3 text-xs text-white/70">
            <button
              onClick={() => react("like")}
              className={`inline-flex items-center gap-1 ${likedByMe ? "text-red-500" : "hover:text-white"}`}
            >
              <Heart className={`w-4 h-4 ${likedByMe ? "fill-current" : ""}`} />
              {likes}
            </button>

            <button
              onClick={() => react("fire")}
              className={`inline-flex items-center gap-1 ${firedByMe ? "text-orange-400" : "hover:text-white"}`}
            >
              <Flame className={`w-4 h-4 ${firedByMe ? "fill-current" : ""}`} />
              {fire}
            </button>

            <button onClick={openAsModal} className="inline-flex items-center gap-1 hover:text-white">
              <MessageCircle className="w-4 h-4" />
              {commentsCount}
            </button>

            <Link href={href} className="ml-auto inline-flex items-center gap-1 text-white/60 hover:text-white">
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </article>
    );
  }

  const authorRating =
    typeof item?.authorRating === "number" && !Number.isNaN(item.authorRating)
      ? item.authorRating
      : null;
  const movieReleaseYear = releaseYear(item?.movie?.releaseDate || item?.movie?.release_date);
  const reviewText = htmlToPlainText(item?.excerpt || item?.content || "No review text.");
  const hasPoster = typeof thumbnail === "string" && thumbnail.trim().length > 0;

  return (
    <article className="group w-full overflow-hidden rounded-[24px] bg-black/10 shadow-[0_12px_28px_rgba(0,0,0,0.14)] backdrop-blur-[2px]">
      <div className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <Link href={profileHref} className="flex min-w-0 items-center gap-3">
            <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full ring-1 ring-white/20">
              <Image src={avatar} alt="user avatar" fill className="object-cover" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white">@{authorLabel}</p>
              <p className="text-[11px] uppercase tracking-[0.14em] text-white/45">Review</p>
            </div>
          </Link>

          <div className="shrink-0 rounded-full bg-black/15 px-2.5 py-1 text-[11px] text-white/70">
            <span className="inline-flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" /> {timeAgo(createdAtIso)}
            </span>
          </div>
        </div>

        <div className="mt-4 grid min-h-[144px] grid-cols-[84px_minmax(0,1fr)] gap-4 sm:grid-cols-[96px_minmax(0,1fr)]">
          {hasPoster ? (
            <Link href={href} className="block">
              <div className="overflow-hidden rounded-[16px] shadow-[0_10px_22px_rgba(0,0,0,0.18)]">
                <Image
                  width={96}
                  height={144}
                  src={safeThumb}
                  alt={`${title} poster`}
                  className="h-[126px] w-[84px] object-cover transition-transform duration-300 group-hover:scale-[1.03] sm:h-[144px] sm:w-[96px]"
                />
              </div>
            </Link>
          ) : (
            <div className="h-[126px] w-[84px] rounded-[16px] bg-white/10 sm:h-[144px] sm:w-[96px]" />
          )}

          <div className="min-w-0 py-1">
            <Link href={href} className="block text-[1.1rem] font-semibold leading-tight text-white transition-colors hover:text-yellow-100 sm:text-[1.2rem]">
              <span className="line-clamp-2">{title}</span>
            </Link>

            {(movieReleaseYear || authorRating !== null) && (
              <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
                {movieReleaseYear ? (
                  <span className="rounded-full bg-white/6 px-2.5 py-1 text-white/60">
                    {movieReleaseYear}
                  </span>
                ) : null}
                {authorRating !== null ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-yellow-400/10 px-2.5 py-1 text-yellow-100">
                    <FaStar className="text-yellow-400" />
                    <span className="font-semibold">{authorRating}</span>
                  </span>
                ) : null}
              </div>
            )}

            <p className="mt-2.5 line-clamp-4 text-[13px] leading-5 text-white/76 sm:text-sm">
              {reviewText}
            </p>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between pt-2">
          <div className="flex items-center gap-5 text-sm">
            <button
              onClick={() => react("like")}
              className={`flex items-center gap-1 transition-transform ${
                likedByMe ? "scale-105 text-red-500" : "text-white/70 hover:text-white"
              }`}
            >
              <Heart className={`w-5 h-5 ${likedByMe ? "fill-current" : ""}`} /> {likes}
            </button>

            <button
              onClick={() => react("fire")}
              className={`flex items-center gap-1 transition-transform ${
                firedByMe ? "scale-105 text-orange-500" : "text-white/70 hover:text-white"
              }`}
            >
              <Flame className={`w-5 h-5 ${firedByMe ? "fill-current" : ""}`} /> {fire}
            </button>

            <button onClick={openAsModal} className="flex items-center gap-1 text-white/70 hover:text-white">
              <MessageCircle className="w-5 h-5" /> {commentsCount}
            </button>
          </div>

          <Link href={href} className="flex items-center gap-1 text-xs text-white/60 hover:text-white/90">
            Open <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </article>
  );
}
