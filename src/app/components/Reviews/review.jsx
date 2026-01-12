"use client";

import { memo, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { AiOutlineFire, AiFillFire, AiOutlineDelete, AiOutlineComment } from "react-icons/ai";
import { CiHeart } from "react-icons/ci";
import { FaHeart } from "react-icons/fa";

/* ---------- local reply input ---------- */
const ReplyBox = memo(function ReplyBox({ open, onSubmit, placeholder = "Reply…" }) {
  const [val, setVal] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  if (!open) return null;

  return (
    <div className="mt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
      <textarea
        ref={inputRef}
        className="flex-1 px-3 py-2 rounded-lg bg-gray-700/50 text-white border border-yellow-500/30 text-sm resize-none min-h-[60px] sm:min-h-0"
        placeholder={placeholder}
        value={val}
        onChange={(e) => setVal(e.target.value)}
        rows={2}
      />
      <button
        onClick={() => {
          const t = val.trim();
          if (!t) return;
          onSubmit(t);
          setVal("");
          requestAnimationFrame(() => inputRef.current?.focus());
        }}
        className="bg-yellow-500 hover:bg-yellow-600 text-gray-900 px-4 py-2 rounded-lg text-sm font-bold transition-colors self-end sm:self-auto"
      >
        Post
      </button>
    </div>
  );
});

export default function Review({ movieId, currentUserId, title, posterUrl }) {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reviewText, setReviewText] = useState("");
  const [error, setError] = useState(null);
  const [openComments, setOpenComments] = useState({});
  const [replyOpen, setReplyOpen] = useState({});

  const inflight = useRef(new Map());

  const engagementScore = (r) =>
    (r.likes || 0) + (r.fire || 0) + (r.commentsCount || 0);

  const sortByEngagement = (arr) =>
    [...arr].sort(
      (a, b) =>
        engagementScore(b) - engagementScore(a) ||
        +new Date(b.createdAt) - +new Date(a.createdAt)
    );

  const displayReviews = useMemo(() => {
    if (!currentUserId) return reviews;
    const mine = reviews.find((r) => r.user?.id === currentUserId);
    if (!mine) return reviews;
    const rest = reviews.filter((r) => r.id !== mine.id);
    return [mine, ...rest];
  }, [reviews, currentUserId]);

  /* ---------- initial load ---------- */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/review?movieId=${movieId}`, { cache: "no-store" });
        if (!res.ok) throw new Error("Failed to fetch reviews");
        const data = await res.json();
        if (cancelled) return;

        const ids = data.map((r) => r.id).join(",");
        let reactionMap = {};
        if (ids) {
          try {
            const rx = await fetch(`/api/reaction?entityType=review&ids=${ids}`, { cache: "no-store" });
            if (rx.ok) reactionMap = await rx.json();
          } catch (err) {
            console.warn("Reaction hydration failed", err);
          }
        }

        const hydrated = data.map((r) => ({
          ...r,
          likedByMe: reactionMap[r.id]?.likedByMe ?? false,
          firedByMe: reactionMap[r.id]?.firedByMe ?? false,
        }));

        setReviews(sortByEngagement(hydrated));
      } catch (e) {
        console.error(e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      for (const { controller } of inflight.current.values()) controller?.abort();
      inflight.current.clear();
    };
  }, [movieId]);

  /* ---------- tiny burst anim ---------- */
  const burst = (el) => {
    if (!el) return;
    const dot = document.createElement("span");
    Object.assign(dot.style, {
      position: "absolute",
      width: "8px",
      height: "8px",
      borderRadius: "50%",
      background: "#f59e0b",
      left: "50%",
      top: "50%",
      transform: "translate(-50%,-50%)",
      opacity: "0.9",
      pointerEvents: "none",
    });
    el.appendChild(dot);
    const a = dot.animate(
      [
        { transform: "translate(-50%,-50%) scale(1)", opacity: 0.9 },
        { transform: "translate(-50%,-90%) scale(0)", opacity: 0 },
      ],
      { duration: 260, easing: "ease-out" }
    );
    a.onfinish = () => dot.remove();
  };

  /* ---------- reactions ---------- */
  const toggleReaction = async (reviewId, kind, buttonEl) => {
    const field = kind === "like" ? "likes" : "fire";
    const activeField = kind === "like" ? "likedByMe" : "firedByMe";

    const prev = inflight.current.get(reviewId);
    if (prev?.pending) prev.controller?.abort();
    const controller = new AbortController();
    inflight.current.set(reviewId, { controller, pending: true, lastAction: kind });

    setReviews((prevList) =>
      prevList.map((r) =>
        r.id !== reviewId
          ? r
          : {
              ...r,
              [field]: r[activeField] ? Math.max(0, (r[field] || 0) - 1) : (r[field] || 0) + 1,
              [activeField]: !r[activeField],
            }
      )
    );

    if (buttonEl) {
      buttonEl.style.transform = "scale(1.06)";
      setTimeout(() => (buttonEl.style.transform = ""), 120);
      burst(buttonEl);
    }

    try {
      const res = await fetch("/api/reaction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          entityId: reviewId,
          entityType: "review",
          type: kind,
        }),
      });
      if (!res.ok) throw new Error("Reaction failed");

      const srv = await res.json();
      const cur = inflight.current.get(reviewId);
      if (!cur || cur.controller !== controller) return;

      setReviews((prevList) =>
        sortByEngagement(
          prevList.map((r) =>
            r.id === reviewId
              ? {
                  ...r,
                  likes: srv.likes ?? r.likes,
                  fire: srv.fire ?? r.fire,
                  likedByMe: typeof srv.likedByMe === "boolean" ? !!srv.likedByMe : r.likedByMe,
                  firedByMe: typeof srv.firedByMe === "boolean" ? !!srv.firedByMe : r.firedByMe,
                  commentsCount: srv.commentsCount ?? r.commentsCount,
                }
              : r
          )
        )
      );
    } catch (e) {
      if (e.name !== "AbortError") {
        console.error(e);
        const res = await fetch(`/api/review?movieId=${movieId}`, { cache: "no-store" });
        if (res.ok) setReviews(sortByEngagement(await res.json()));
      }
    } finally {
      const cur = inflight.current.get(reviewId);
      if (cur && cur.controller === controller) {
        inflight.current.set(reviewId, { ...cur, pending: false });
      }
    }
  };

  /* ---------- create review ---------- */
  const submitReview = async () => {
    if (!reviewText.trim()) return;
    setError(null);
    try {
      const res = await fetch("/api/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ movieId, reviewText, title, posterUrl }),
      });
      if (!res.ok) throw new Error(await res.text());
      const newR = await res.json();
      setReviews((prev) => sortByEngagement([newR, ...prev.filter((r) => r.id !== newR.id)]));
      setReviewText("");
    } catch (e) {
      console.error(e);
      setError(e.message || "Something went wrong");
    }
  };

  /* ---------- comments ---------- */
  const toggleComments = (reviewId) =>
    setOpenComments((p) => ({ ...p, [reviewId]: !p[reviewId] }));

  const toggleReplyBox = (id) => setReplyOpen((p) => ({ ...p, [id]: !p[id] }));

  const submitComment = async (reviewId, parentId, text) => {
    const content = (text ?? "").trim();
    if (!content) return;
    try {
      const res = await fetch("/api/reviewComments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewId, comment: content, parentId }),
      });
      if (!res.ok) throw new Error(await res.text());
      const shapedReview = await res.json();
      setReviews((prev) =>
        sortByEngagement(prev.map((r) => (r.id === reviewId ? shapedReview : r)))
      );
      if (parentId) setReplyOpen((p) => ({ ...p, [parentId]: false }));
    } catch (e) {
      console.error(e);
    }
  };

  /* ---------- delete ---------- */
  const deleteReview = async (reviewId) => {
    if (!confirm("Delete your review?")) return;
    try {
      const res = await fetch(`/api/review?reviewId=${reviewId}`, { method: "DELETE" });
      if (res.ok) setReviews((prev) => prev.filter((r) => r.id !== reviewId));
    } catch (e) {
      console.error(e);
    }
  };

  const deleteComment = async (commentId) => {
    if (!confirm("Delete this comment?")) return;
    try {
      const rs = await fetch(`/api/reviewComments?commentId=${commentId}`, { method: "DELETE" });
      if (rs.ok) {
        const rr = await fetch(`/api/review?movieId=${movieId}`, { cache: "no-store" });
        if (rr.ok) setReviews(sortByEngagement(await rr.json()));
      }
    } catch (e) {
      console.error(e);
    }
  };

  /* ---------- responsive comment node (Reddit-style) ---------- */
  const CommentNode = memo(function CommentNode({ node, reviewId, depth = 0 }) {
    const key = node.id;
    const avatarSrc = node.user?.avatarUrl || node.user?.image || "/default-avatar.png";
    const uid = node.user?.id;
    const isDeepNested = depth >= 3;

    return (
      <div className={`mt-3 ${depth > 0 ? 'pl-3 sm:pl-4' : ''}`}>
        <div className="flex">
          {/* Vertical connector line for nesting - hidden on very small screens */}
          {depth > 0 && (
            <div className="hidden xs:block w-6 sm:w-8 flex-shrink-0 relative">
              <div className="absolute left-1/2 top-0 bottom-0 w-px bg-gray-600 transform -translate-x-1/2"></div>
            </div>
          )}
          
          <div className="flex-1 min-w-0">
            <div className="flex items-start gap-2 sm:gap-3">
              {/* Avatar - smaller on mobile */}
              <Link href={uid ? `/profile/${uid}` : "#"} className="shrink-0">
                <Image
                  src={avatarSrc}
                  alt="avatar"
                  width={40}
                  height={40}
                  className="w-8 h-8 sm:w-10 sm:h-10 rounded-full border border-yellow-500/30 object-cover"
                />
              </Link>
              
              <div className="flex-1 min-w-0">
                {/* User info and comment */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 mb-1">
                  <Link
                    href={uid ? `/profile/${uid}` : "#"}
                    className="font-semibold text-yellow-400 hover:underline text-sm sm:text-base truncate"
                  >
                    {node.user?.username || "User"}
                  </Link>
                  <span className="text-gray-400 text-xs">
                    {/* You could add timestamp here */}
                  </span>
                </div>
                
                <div className="text-gray-300 text-sm sm:text-base break-words">
                  {node.comment || node.content}
                </div>

                {/* Action buttons - compact on mobile */}
                <div className="mt-2 flex items-center gap-3 flex-wrap">
                  <button
                    onClick={() => toggleReplyBox(key)}
                    className="text-xs text-gray-400 hover:text-yellow-400 flex items-center gap-1"
                  >
                    <AiOutlineComment size={14} />
                    <span className="hidden xs:inline">Reply</span>
                  </button>
                  {uid === currentUserId && (
                    <button
                      onClick={() => deleteComment(node.id)}
                      className="inline-flex items-center gap-1 text-xs text-red-400 hover:text-red-300"
                    >
                      <AiOutlineDelete size={14} />
                      <span className="hidden xs:inline">Delete</span>
                    </button>
                  )}
                </div>

                {/* Reply box */}
                <ReplyBox 
                  open={!!replyOpen[key]} 
                  onSubmit={(t) => submitComment(reviewId, key, t)}
                  placeholder="Write a reply…"
                />

                {/* Child comments - collapse if too deep */}
                {node.children?.length > 0 && !isDeepNested && (
                  <div className={`mt-3 ${depth > 0 ? 'border-l border-gray-700 pl-3 sm:pl-4' : ''}`}>
                    {node.children.map((child) => (
                      <CommentNode key={child.id} node={child} reviewId={reviewId} depth={depth + 1} />
                    ))}
                  </div>
                )}
                
                {isDeepNested && node.children?.length > 0 && (
                  <button
                    onClick={() => toggleReplyBox(key + '-more')}
                    className="mt-2 text-xs text-yellow-400 hover:text-yellow-300"
                  >
                    +{node.children.length} more {node.children.length === 1 ? 'reply' : 'replies'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-500"></div>
      </div>
    );
  }

  return (
    <div className="mx-auto rounded-2xl shadow-2xl py-4 sm:py-8 border border-yellow-500/20 overflow-hidden">
      {/* Header */}
      <div className="px-4 sm:px-6 lg:px-8">
        <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white mb-4 sm:mb-6 border-l-4 border-yellow-500 pl-3 sm:pl-4">
          Reviews &amp; Discussions
        </h2>

        {/* Create review - mobile optimized */}
        <div className="mb-6 sm:mb-8">
          <div className="bg-yellow-800/50 p-4 sm:p-6 rounded-xl border border-yellow-500">
            <textarea
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              placeholder="Share your thoughts about the movie…"
              className="w-full px-4 py-3 bg-gray-700/50 border border-yellow-500/30 text-white rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all placeholder-gray-400 resize-none min-h-[100px] sm:min-h-[80px]"
              rows={3}
            />
            <div className="mt-3 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-sm text-gray-400">
                {reviewText.length} characters
              </div>
              <button
                onClick={submitReview}
                disabled={!reviewText.trim()}
                className="bg-yellow-500 hover:bg-yellow-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-gray-900 px-6 py-2 rounded-lg font-bold transition-colors w-full sm:w-auto"
              >
                Post Review
              </button>
            </div>
            {error && <p className="mt-2 text-red-400 text-sm">{error}</p>}
          </div>
        </div>
      </div>

      {/* Reviews list */}
      <div className="space-y-4 sm:space-y-6">
        {displayReviews.map((r) => {
          const avatarSrc = r.user?.avatarUrl || r.user?.image || "/default-avatar.png";
          const likeActive = !!r.likedByMe;
          const fireActive = !!r.firedByMe;

          return (
            <div key={r.id} className="px-4 sm:px-6 lg:px-8 py-4 sm:py-6 border-b border-gray-700/50">
              {/* Review content */}
              <div className="flex gap-3 sm:gap-4">
                <Link href={`/profile/${r.user?.id}`} className="shrink-0">
                  <Image
                    className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover border-2 border-yellow-500/50"
                    src={avatarSrc}
                    width={48}
                    height={48}
                    alt="Profile Image"
                  />
                </Link>

                <div className="flex-1 min-w-0">
                  {/* User info and actions */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <Link href={`/profile/${r.user?.id}`} className="font-semibold text-yellow-400 hover:underline text-sm sm:text-base">
                        {r.user?.username || "Anonymous"}
                      </Link>
                      {r.user?.id === currentUserId && (
                        <button
                          onClick={() => deleteReview(r.id)}
                          className="inline-flex items-center gap-1 text-xs text-red-400 hover:text-red-300"
                          title="Delete review"
                        >
                          <AiOutlineDelete size={14} />
                          <span className="hidden sm:inline">Delete</span>
                        </button>
                      )}
                    </div>
                    {/* Timestamp would go here */}
                  </div>

                  {/* Review text */}
                  <p className="text-gray-300 mb-3 sm:mb-4 leading-relaxed text-sm sm:text-base break-words">
                    {r.content}
                  </p>

                  {/* Reactions - mobile optimized */}
                  <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
                    <MobileReactionButton
                      count={r.likes}
                      label="Like"
                      active={likeActive}
                      icon={likeActive ? <FaHeart size={16} /> : <CiHeart size={16} />}
                      onClick={(btn) => toggleReaction(r.id, "like", btn)}
                    />
                    <MobileReactionButton
                      count={r.fire}
                      label="Fire"
                      active={fireActive}
                      icon={fireActive ? <AiFillFire size={16} /> : <AiOutlineFire size={16} />}
                      onClick={(btn) => toggleReaction(r.id, "fire", btn)}
                    />

                    <button
                      onClick={() => toggleComments(r.id)}
                      className="text-sm text-gray-400 hover:text-yellow-400 transition flex items-center gap-1 px-2 py-1 rounded hover:bg-gray-700/50"
                    >
                      <AiOutlineComment size={16} />
                      <span>{r.commentsCount || 0}</span>
                      <span className="hidden xs:inline ml-1">
                        {openComments[r.id] ? "Hide" : "Comments"}
                      </span>
                    </button>
                  </div>

                  {/* Comments section */}
                  {openComments[r.id] && (
                    <div className="mt-4 sm:mt-6 space-y-4 pl-3 sm:pl-6 border-l-2 border-yellow-500/30">
                      <div className="mb-4">
                        <ReplyBox 
                          open={true} 
                          onSubmit={(text) => submitComment(r.id, undefined, text)}
                          placeholder="Write a comment…"
                        />
                      </div>

                      {r.commentsTree?.length > 0 ? (
                        r.commentsTree.map((n) => (
                          <CommentNode key={n.id} node={n} reviewId={r.id} />
                        ))
                      ) : (
                        <div className="text-gray-500 text-sm italic py-2">
                          No comments yet. Be the first!
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {displayReviews.length === 0 && (
          <div className="px-4 sm:px-8 text-gray-400 text-center py-12">
            <div className="text-lg mb-2">No reviews yet</div>
            <p className="text-gray-500">Be the first to share your thoughts!</p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------- mobile-friendly reaction button ---------- */
function MobileReactionButton({ count, label, active, icon, onClick }) {
  return (
    <button
      onClick={(e) => onClick(e.currentTarget)}
      className={`relative inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm transition
        ${
          active
            ? "bg-yellow-500 text-gray-900"
            : "bg-gray-800/50 text-gray-300 hover:bg-gray-700/70"
        }`}
      aria-label={label}
      title={label}
      style={{ position: "relative" }}
    >
      <span className="relative">{icon}</span>
      <span className="font-medium">{count || 0}</span>
    </button>
  );
}