"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Heart, Flame, MessageCircle, Clock, ExternalLink } from "lucide-react";
import { useSession } from "next-auth/react";
import { useEntity, useEntityStore } from "@/app/stores/entityStores";
import { FaStar } from "react-icons/fa";

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

export default function PostCard({ item, onOpenPost }) {
  const { data: session } = useSession();

  const isReview = item?.type === "review"; 
  const entityType = isReview ? "review" : "blog";

  // ✅ rules you asked:
  // - blogs show image (small box)
  // - reviews show NO image (wide text card)
  const blogHasImage = !isReview && !!item?.thumbnail;
  const blogImageSrc = item?.thumbnail;

  const avatar = item?.user?.avatarUrl || item?.user?.image || "/img/profile.png";
  const profileHref = item?.userId ? `/profile/${item.userId}` : "#";

  const title = isReview
    ? item?.movie?.title || "Untitled movie"
    : item?.title || "Untitled";

  const createdAtIso = item?.createdAt || item?.created_at;

  const href = isReview ? `/movies/${item?.movie?.tmdbId}` : `/blog/${item?.id}`;

  // seed + read from global cache
  const upsert = useEntityStore((s) => s.upsert);

  useEffect(() => {
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

      const haveFlags = typeof snap?.likedByMe === "boolean" || typeof snap?.firedByMe === "boolean";
      if (haveFlags) return;

      try {
        const res = await fetch(`/api/reaction?entityType=${entityType}&ids=${item.id}`, { cache: "no-store" });
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

  /* ---------------- BLOG CARD (small box) ---------------- */
  if (!isReview) {
    return (
      <>
     <article className="w-[190px] sm:w-[210px] rounded-xl overflow-hidden bg-white/5 border border-white/10 shadow-xl">
  {/* Image section - only when image exists */}
  {blogHasImage ? (
    <div className="relative w-full aspect-[2/3] overflow-hidden">
      <Image src={blogImageSrc} alt={title} fill className="object-cover" />

      {/* Avatar and time overlays on image */}
      <Link
        href={profileHref}
        className="absolute top-2 left-2 z-10 relative w-9 h-9 rounded-full overflow-hidden ring-1 ring-white/30 bg-black/40"
      >
        <Image src={avatar} alt="user" fill className="object-cover" />
      </Link>

      <div className="absolute top-2 right-2 text-[11px] text-white/80 bg-black/40 px-2 py-1 rounded-full flex items-center gap-1">
        <Clock className="w-3 h-3" /> {timeAgo(createdAtIso)}
      </div>
    </div>
  ) : (
    // When no image, show avatar and time in header without aspect ratio
    <div className="pt-3 px-3 pb-2 border-b border-white/10">
      <div className="flex items-center justify-between">
        <Link
          href={profileHref}
          className="relative w-8 h-8 rounded-full overflow-hidden ring-1 ring-white/30 bg-black/40"
        >
          <Image src={avatar} alt="user" fill className="object-cover" />
        </Link>
        <div className="text-[11px] text-white/80 bg-black/40 px-2 py-1 rounded-full flex items-center gap-1">
          <Clock className="w-3 h-3" /> {timeAgo(createdAtIso)}
        </div>
      </div>
    </div>
  )}

  {/* Content section */}
  <div className={`${blogHasImage ? 'p-3' : 'p-3 pt-2'}`}>
    <div className="text-white font-semibold text-sm leading-snug line-clamp-2 mb-2">
      {title}
    </div>

    {/* Icons row */}
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

      <button
        onClick={openAsModal}
        className="inline-flex items-center gap-1 hover:text-white"
        title="Open comments"
      >
        <MessageCircle className="w-4 h-4" />
        {commentsCount}
      </button>

      <Link
        href={href}
        className="ml-auto inline-flex items-center gap-1 text-white/60 hover:text-white"
        title="Open"
      >
        <ExternalLink className="w-3.5 h-3.5" />
      </Link>
    </div>
  </div>
</article>
      </>
    );
  }

  const myRating =
  typeof item?.myRating === "number" && !Number.isNaN(item.myRating)
    ? item.myRating
    : null;


  /* ---------------- REVIEW CARD (wide, NO image) ---------------- */
  return (
    <article className="w-full rounded-2xl bg-white/5 border border-white/10 shadow-xl overflow-hidden">
      <div className="p-4 sm:p-5">
        {/* top row: avatar only + time */}
        <div className="flex items-center justify-between">
          <Link href={profileHref} className="relative w-10 h-10 rounded-full overflow-hidden ring-1 ring-white/20">
            <Image src={avatar} alt="user" fill className="object-cover" />
          </Link>

          <div className="text-xs text-white/60 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" /> {timeAgo(createdAtIso)}
          </div>
        </div>

        {/* movie title */}
        <div className="mt-3 flex items-start justify-between gap-3">
  <div className="text-white font-bold text-lg sm:text-xl leading-snug">
    {title}
  </div>

  
  {myRating !== null && (
    <div className="shrink-0 rounded-full bg-white/10 border border-white/15 px-3 py-1 text-xs text-white/80 flex items-center gap-1">
      <FaStar className="text-yellow-400" />
      <span className="font-semibold">{myRating}</span>
    </div>
  )}
</div>


        {/* review text (NO image) */}
        <div className="mt-2 text-white/70 text-sm leading-relaxed line-clamp-3">
          {item?.excerpt ? item.excerpt : "No review text."}
        </div>

        {/* icons row */}
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
