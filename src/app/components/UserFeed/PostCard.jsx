'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useMemo } from 'react';
import { Heart, Flame, MessageCircle, Clock, ExternalLink } from 'lucide-react';

function timeAgo(isoOrDate) {
  try {
    const d = typeof isoOrDate === 'string' ? new Date(isoOrDate) : isoOrDate;
    const diff = (Date.now() - d.getTime()) / 1000; // seconds
    if (diff < 60) return `${Math.floor(diff)}s`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    return `${Math.floor(diff / 86400)}d`;
  } catch {
    return '';
  }
}

export default function PostCard({ item }) {
  // Prefer movie poster (reviews) or blog thumbnail; if empty -> render text-only post
  const hasImage = useMemo(() => {
    if (item?.type === 'review') return Boolean(item?.movie?.posterUrl);
    return Boolean(item?.thumbnail);
  }, [item]);

  const imageSrc =
    item?.type === 'review'
      ? item?.movie?.posterUrl || ''
      : item?.thumbnail || '';

  const avatar =
    item?.user?.avatarUrl ||
    item?.user?.image ||
    '/img/profile.png';

  const username =
    item?.user?.username ||
    (item?.user?.email ? item.user.email.split('@')[0] : 'user');

  const title =
    item?.type === 'review'
      ? item?.movie?.title || 'Untitled movie'
      : item?.title || 'Untitled';

  const href =
    item?.type === 'review'
      ? `/movies/${item?.movie?.tmdbId ?? ''}`
      : `/blog/${item?.id}`;

  return (
    <article className="bg-[#0e131a] border border-white/10 rounded-2xl overflow-hidden shadow-sm">
      {/* Header */}
      <header className="flex items-center gap-3 px-4 py-3">
        <div className="relative w-9 h-9 overflow-hidden rounded-full ring-1 ring-white/10 shrink-0">
          <Image src={avatar} alt={username} fill className="object-cover" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Link
              href={`/profile/${item?.user?.id ?? '#'}`}
              className="text-white/90 font-medium truncate hover:underline"
            >
              @{username}
            </Link>
            <span className="text-white/40 text-sm">•</span>
            <span className="inline-flex items-center gap-1 text-white/50 text-xs">
              <Clock className="w-3.5 h-3.5" />
              {timeAgo(item?.createdAt)}
            </span>
          </div>
          <p className="text-white/60 text-xs capitalize">{item?.type}</p>
        </div>
      </header>

      {/* Media (if present) */}
      {hasImage ? (
        <div className="relative w-full aspect-[4/5] md:aspect-[16/9] overflow-hidden">
          <Image
            src={imageSrc}
            alt={title}
            fill
            className="object-cover transition-transform duration-300 hover:scale-[1.02]"
            onError={(e) => {
              // hide image area if the remote url fails
              e.currentTarget.style.display = 'none';
            }}
          />
        </div>
      ) : null}

      {/* Body */}
      <div className="px-4 py-4">
        <Link href={href} className="group">
          <h3 className="text-white font-semibold leading-snug">
            {title}
          </h3>
          {item?.excerpt ? (
            <p className="text-white/60 text-sm mt-2 line-clamp-3">
              {item.excerpt}
            </p>
          ) : null}
        </Link>

        {/* Footer */}
        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center gap-4 text-sm">
            <span className="inline-flex items-center gap-1 text-white/70">
              <Heart className="w-4 h-4" />
              {item?.likes ?? 0}
            </span>
            <span className="inline-flex items-center gap-1 text-white/70">
              <Flame className="w-4 h-4" />
              {item?.fire ?? 0}
            </span>
            <span className="inline-flex items-center gap-1 text-white/70">
              <MessageCircle className="w-4 h-4" />
              {item?.commentsCount ?? 0}
            </span>
          </div>
          <Link
            href={href}
            className="inline-flex items-center gap-1 text-xs text-white/60 hover:text-white/90"
          >
            Open
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </article>
  );
}
