"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Heart, Flame, MessageCircle, Clock, ExternalLink } from "lucide-react";
import { useSession } from "next-auth/react";
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

/** Normalize any feed item for the modal */
function normalizeForModal(item) {
  const isReview = item?.type === "review";
  const user =
    item?.user ??
    (item?.author ? { username: item.author, image: item.authorAvatar, email: "" } : null);

  const title = isReview
    ? item?.movie?.title || item?.title || "Untitled movie"
    : item?.title || "Untitled";

  const thumbnail = isReview ? item?.movie?.posterUrl || item?.thumbnail || "" : item?.thumbnail || "";

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

export default function PostCard({ item, onOpenPost }) {
  const { data: session } = useSession();

  const isReview = item?.type === "review";
  const entityType = isReview ? "review" : "blog";
  const hasImage = isReview ? !!item?.movie?.posterUrl : !!item?.thumbnail;
  const imageSrc = isReview ? item?.movie?.posterUrl : item?.thumbnail;

  const avatar = item?.user?.avatarUrl || item?.user?.image || "/img/profile.png";
  const username = item?.user?.username || item?.user?.email?.split("@")[0] || "user";
  const title = isReview ? item?.movie?.title || "Untitled movie" : item?.title || "Untitled";
  const href = isReview ? `/movies/${item?.movie?.tmdbId}` : `/blog/${item?.id}`;

  // seed + read from global cache
  const upsert = useEntityStore((s) => s.upsert);

  useEffect(() => {
    // seed counts + any flags that might already be present on item
    upsert({
      id: item.id,
      entityType,
      likes: item.likes || 0,
      fire: item.fire || 0,
      likedByMe: typeof item.likedByMe === "boolean" ? item.likedByMe : undefined,
      firedByMe: typeof item.firedByMe === "boolean" ? item.firedByMe : undefined,
      commentsCount: item.commentsCount ?? 0,
    });
  }, [
    item.id,
    item.likes,
    item.fire,
    item.likedByMe,
    item.firedByMe,
    item.commentsCount,
    entityType,
    upsert,
  ]);

  const snap = useEntity(entityType, item.id);

  // hydrate flags after hard reload if they are missing
  useEffect(() => {
    let cancelled = false;

    async function hydrateFlags() {
      if (!session?.user) return;

      const haveFlags =
        typeof snap?.likedByMe === "boolean" || typeof snap?.firedByMe === "boolean";
      if (haveFlags) return;

      try {
        const res = await fetch(
          `/api/reaction?entityType=${entityType}&ids=${item.id}`,
          { cache: "no-store" }
        );
        if (!res.ok) return;
        const data = await res.json();
        const flags = data[item.id];
        if (!cancelled && flags) {
          upsert({
            id: item.id,
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
  }, [session?.user, entityType, item.id, upsert, snap?.likedByMe, snap?.firedByMe]);

  const [busy, setBusy] = useState(false);

  async function react(type) {
    if (busy || !session?.user) return;
    setBusy(true);

    const optimisticToggle = useEntityStore.getState().optimisticToggle;
    const rollback = optimisticToggle(entityType, item.id, type);

    try {
      const res = await fetch("/api/reaction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entityId: item.id, entityType, type }),
      });
      if (!res.ok) throw new Error("Failed");
      const u = await res.json();

      upsert({
        id: item.id,
        entityType,
        likes: u.likes ?? snap.likes ?? 0,
        fire: u.fire ?? snap.fire ?? 0,
        likedByMe: !!u.likedByMe,
        firedByMe: !!u.firedByMe,
        commentsCount: u.commentsCount ?? snap.commentsCount ?? 0,
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
    const normalized = normalizeForModal({
      ...item,
      likes,
      fire,
      likedByMe,
      firedByMe,
      commentsCount,
    });
    onOpenPost?.(normalized);
  };

  return (
    <article className="bg-gray-400 rounded-md bg-clip-padding backdrop-filter backdrop-blur-sm bg-opacity-10 overflow-hidden shadow-[0_2.8px_2.2px_rgba(0,_0,_0,_0.034),_0_6.7px_5.3px_rgba(0,_0,_0,_0.048),_0_12.5px_10px_rgba(0,_0,_0,_0.06),_0_22.3px_17.9px_rgba(0,_0,_0,_0.072),_0_41.8px_33.4px_rgba(0,_0,_0,_0.086),_0_100px_80px_rgba(0,_0,_0,_0.12)] transition-all">
      {/* Header */}
      <header className="flex items-center gap-3 px-4 py-3">
        <div className="relative w-9 h-9 overflow-hidden rounded-full ring-1 ring-white/10 shrink-0">
          <Image src={avatar} alt={username} fill className="object-cover" />
        </div>
        <div>
          <span className="text-white/90 font-medium">@{username}</span>
          <p className="text-white/50 text-xs flex items-center gap-1">
            <Clock className="w-3 h-3" /> {timeAgo(item?.createdAt || item?.created_at)}
          </p>
        </div>
      </header>

      {/* Image */}
      {hasImage && (
        <div className="relative w-full aspect-[4/5] md:aspect-[16/9] overflow-hidden">
          <Image src={imageSrc} alt={title} fill className="object-cover" />
        </div>
      )}

      {/* Body */}
      <div className="px-4 py-4">
        <h3 className="text-white font-semibold leading-snug">{title}</h3>
        {item.excerpt && <p className="text-white/60 text-sm mt-2 line-clamp-2">{item.excerpt}</p>}

        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center gap-5 text-sm">
            <button
              onClick={() => react("like")}
              className={`flex items-center gap-1 transition-transform ${
                likedByMe ? "text-red-500 scale-110" : "text-white/70 hover:text-white"
              }`}
            >
              <Heart className={`w-4 h-4 ${likedByMe ? "fill-current" : ""}`} /> {likes}
            </button>

            <button
              onClick={() => react("fire")}
              className={`flex items-center gap-1 transition-transform ${
                firedByMe ? "text-orange-500 scale-110" : "text-white/70 hover:text-white"
              }`}
            >
              <Flame className={`w-4 h-4 ${firedByMe ? "fill-current" : ""}`} /> {fire}
            </button>

            <button onClick={openAsModal} className="flex items-center gap-1 text-white/70 hover:text-white">
              <MessageCircle className="w-4 h-4" /> {commentsCount}
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