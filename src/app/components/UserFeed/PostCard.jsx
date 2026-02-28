"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Heart, Flame, MessageCircle, Clock, ExternalLink } from "lucide-react";
import { useSession } from "next-auth/react";
import { FaStar } from "react-icons/fa";
import { useEntity, useEntityStore } from "@/app/stores/entityStores";

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
  const content = item?.content ?? item?.text ?? item?.reviewText ?? item?.body ?? "";
  const excerpt = item?.excerpt ?? "";

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

    return (
      <article className="w-full break-inside-avoid rounded-2xl overflow-hidden bg-white/5 border border-white/10 shadow-xl">
        {blogHasImage ? (
          <div className="relative w-full overflow-hidden">
            <Image
              src={safeThumb}
              alt={title}
              width={600}
              height={900}
              className="w-full h-auto object-cover"
            />

            <Link
              href={profileHref}
              className="absolute top-2 left-2 z-10 relative w-9 h-9 rounded-full overflow-hidden ring-1 ring-white/30 bg-black/40"
            >
              <Image src={avatar} alt="user avatar" fill className="object-cover" />
            </Link>

            <div className="absolute top-2 right-2 text-[11px] text-white/80 bg-black/40 px-2 py-1 rounded-full flex items-center gap-1">
              <Clock className="w-3 h-3" /> {timeAgo(createdAtIso)}
            </div>
          </div>
        ) : (
          <div className="pt-3 px-3 pb-2 border-b border-white/10">
            <div className="flex items-center justify-between">
              <Link
                href={profileHref}
                className="relative w-8 h-8 rounded-full overflow-hidden ring-1 ring-white/30 bg-black/40"
              >
                <Image src={avatar} alt="user avatar" fill className="object-cover" />
              </Link>
              <div className="text-[11px] text-white/80 bg-black/40 px-2 py-1 rounded-full flex items-center gap-1">
                <Clock className="w-3 h-3" /> {timeAgo(createdAtIso)}
              </div>
            </div>
          </div>
        )}

        <div className={`${blogHasImage ? "p-3" : "p-3 pt-2"}`}>
          <div className="text-white font-semibold text-sm leading-snug line-clamp-2 mb-2">{title}</div>

          <div className="flex items-center gap-3 text-xs text-white/70">
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

  return (
    <article className="w-full rounded-2xl bg-white/5 border border-white/10 shadow-xl overflow-hidden">
      <div className="p-4 sm:p-5">
        <div className="flex items-center justify-between">
          <Link href={profileHref} className="relative w-10 h-10 rounded-full overflow-hidden ring-1 ring-white/20">
            <Image src={avatar} alt="user avatar" fill className="object-cover" />
          </Link>

          <div className="text-xs text-white/60 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" /> {timeAgo(createdAtIso)}
          </div>
        </div>

        <div className="mt-3 ml-3 flex items-center gap-3">
          {thumbnail ? (
            <Image
              width={40}
              height={80}
              src={safeThumb}
              alt={`${title} poster`}
              className="rounded-md h-14 w-10 object-cover"
            />
          ) : null}
          <div className="text-white font-bold text-md leading-snug">{title}</div>
        </div>

        <div className="mt-5 text-white/80 flex items-center gap-2 text-[1.3] leading-relaxed line-clamp-3">
          {authorRating !== null && (
            <div className="shrink-0 px-3 py-1 text-xs text-white/80 flex items-center gap-1">
              <FaStar className="text-yellow-400" />
              <span className="font-semibold">{authorRating}</span>
            </div>
          )}
          {item?.excerpt || "No review text."}
        </div>

        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center gap-5 text-sm">
            <button
              onClick={() => react("like")}
              className={`flex items-center gap-1 transition-transform ${
                likedByMe ? "text-red-500 scale-105" : "text-white/70 hover:text-white"
              }`}
            >
              <Heart className={`w-5 h-5 ${likedByMe ? "fill-current" : ""}`} /> {likes}
            </button>

            <button
              onClick={() => react("fire")}
              className={`flex items-center gap-1 transition-transform ${
                firedByMe ? "text-orange-500 scale-105" : "text-white/70 hover:text-white"
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
