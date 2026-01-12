"use client";

import { memo, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { AiOutlineFire, AiFillFire, AiOutlineDelete } from "react-icons/ai";
import { CiHeart } from "react-icons/ci";
import { FaHeart } from "react-icons/fa";

/* ---------- local reply input ---------- */
const ReplyBox = memo(function ReplyBox({ open, onSubmit }) {
  const [val, setVal] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  if (!open) return null;

  return (
    <div className="mt-2 flex items-center gap-2">
      <input
        ref={inputRef}
        className="flex-1 px-3 py-2 rounded-lg bg-gray-600/50 text-white border border-yellow-500/30 text-sm"
        placeholder="Reply…"
        value={val}
        onChange={(e) => setVal(e.target.value)}
      />
      <button
        onClick={() => {
          const t = val.trim();
          if (!t) return;
          onSubmit(t);
          setVal("");
          requestAnimationFrame(() => inputRef.current?.focus());
        }}
        className="bg-yellow-500 hover:bg-yellow-600 text-gray-900 px-3 py-2 rounded-lg text-sm font-bold"
      >
        Post
      </button>
    </div>
  );
});

export default function Review({ movieId, currentUserId , title , posterUrl }) {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reviewText, setReviewText] = useState("");
  const [error, setError] = useState(null);

  const [openComments, setOpenComments] = useState({});
  const [replyOpen, setReplyOpen] = useState({});

  const inflight = useRef(new Map()); // reviewId -> { controller, pending, lastAction }

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

      // Get IDs to hydrate reactions for logged-in user
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

      // Merge reactions
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

  /* ---------- reactions (spam-safe + MERGE ONLY) ---------- */
  const toggleReaction = async (reviewId, kind, buttonEl) => {
    const field = kind === "like" ? "likes" : "fire";
    const activeField = kind === "like" ? "likedByMe" : "firedByMe";

    const prev = inflight.current.get(reviewId);
    if (prev?.pending) prev.controller?.abort();
    const controller = new AbortController();
    inflight.current.set(reviewId, { controller, pending: true, lastAction: kind });

    // optimistic flip
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

      // IMPORTANT: merge just the counters/flags so user/avatar fields are preserved
      setReviews((prevList) =>
        sortByEngagement(
          prevList.map((r) =>
            r.id === reviewId
              ? {
                  ...r,
                  likes: srv.likes ?? r.likes,
                  fire: srv.fire ?? r.fire,
                  likedByMe:
                    typeof srv.likedByMe === "boolean" ? !!srv.likedByMe : r.likedByMe,
                  firedByMe:
                    typeof srv.firedByMe === "boolean" ? !!srv.firedByMe : r.firedByMe,
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
        body: JSON.stringify({ movieId, reviewText , title , posterUrl }),
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
      const shapedReview = await res.json(); // full shaped review with commentsTree
      setReviews((prev) =>
        sortByEngagement(prev.map((r) => (r.id === reviewId ? shapedReview : r)))
      );
      if (parentId) setReplyOpen((p) => ({ ...p, [parentId]: false }));
    } catch (e) {
      console.error(e);
    }
  };

  /* ---------- delete review/comment (unchanged) ---------- */
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

  /* ---------- recursive comment node ---------- */
  const CommentNode = memo(function CommentNode({
    node,
    reviewId,
    depth = 0,
  }) {
    const key = node.id;
    const avatarSrc = node.user?.avatarUrl || node.user?.image || "/default-avatar.png";
    const uid = node.user?.id;

    return (
      <div className="mt-3" style={{ marginLeft: depth ? 16 : 0 }}>
        <div className="flex items-start gap-2">
          <Link href={uid ? `/profile/${uid}` : "#"} className="shrink-0">
            <Image
              src={avatarSrc}
              alt="avatar"
              width={48}
              height={48}
              className="w-12 h-12 rounded-full border border-yellow-500/30 object-cover"
            />
          </Link>
          <div className="flex-1">
            <div className="text-sm">
              <Link
                href={uid ? `/profile/${uid}` : "#"}
                className="font-semibold text-yellow-400 mr-2 hover:underline"
              >
                {node.user?.username || "User"}
              </Link>
              <span className="text-gray-300">{node.comment || node.content}</span>
            </div>

            <div className="mt-1 flex items-center gap-3">
              <button
                onClick={() => toggleReplyBox(key)}
                className="text-xs text-gray-400 hover:text-yellow-400"
              >
                Reply
              </button>
              {uid === currentUserId && (
                <button
                  onClick={() => deleteComment(node.id)}
                  className="inline-flex items-center gap-1 text-xs text-red-400 hover:text-red-300"
                >
                  <AiOutlineDelete /> Delete
                </button>
              )}
            </div>

            <ReplyBox open={!!replyOpen[key]} onSubmit={(t) => submitComment(reviewId, key, t)} />

            {node.children?.length > 0 &&
              node.children.map((child) => (
                <CommentNode key={child.id} node={child} reviewId={reviewId} depth={depth + 1} />
              ))}
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
    <div className="mx-auto rounded-2xl shadow-2xl py-8 border border-yellow-500/20">
      <h2 className="text-4xl font-bold text-white mb-8 px-8 border-l-4 border-yellow-500 pl-4">
        Reviews &amp; Discussions
      </h2>

      {/* create review */}
      <div className="mb-8 px-8">
        <div className="flex flex-col sm:flex-row items-center gap-4 bg-gray-700/50 p-6 rounded-xl w-full border border-yellow-500/20">
          <input
            value={reviewText}
            onChange={(e) => setReviewText(e.target.value)}
            placeholder="Share your thoughts about the movie…"
            className="flex-1 px-4 py-3 w-full bg-gray-600/50 border border-yellow-500/30 text-white rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all placeholder-gray-400"
          />
          <button
            onClick={submitReview}
            className="bg-yellow-500 hover:bg-yellow-600 text-gray-900 px-8 py-3 rounded-lg font-bold transition duration-200 w-full sm:w-auto"
          >
            Post Review
          </button>
        </div>
        {error && <p className="mt-2 text-red-400 text-sm">{error}</p>}
      </div>

      {/* reviews */}
      <div className="space-y-6">
        {displayReviews.map((r) => {
          const avatarSrc = r.user?.avatarUrl || r.user?.image || "/default-avatar.png";
          const likeActive = !!r.likedByMe;
          const fireActive = !!r.firedByMe;

          return (
            <div key={r.id} className="px-8 py-6 hover:bg-gray-700/30 transition duration-200 border-b border-yellow-500/10">
              <div className="flex gap-4">
                <Link href={`/profile/${r.user?.id}`} className="shrink-0">
                  <Image
                    className="w-12 h-12 rounded-full object-cover border-2 border-yellow-500/50"
                    src={avatarSrc}
                    width={48}
                    height={48}
                    alt="Profile Image"
                  />
                </Link>

                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <Link href={`/profile/${r.user?.id}`} className="font-semibold text-yellow-400 hover:underline">
                      {r.user?.username || "Anonymous"}
                    </Link>

                    {r.user?.id === currentUserId && (
                      <button
                        onClick={() => deleteReview(r.id)}
                        className="inline-flex items-center gap-1 text-xs text-red-400 hover:text-red-300"
                      >
                        <AiOutlineDelete /> Delete
                      </button>
                    )}
                  </div>

                  <p className="text-gray-300 mb-4 leading-relaxed">{r.content}</p>

                  {/* reactions */}
                  <div className="flex items-center gap-4">
                    <ReactionButton
                      count={r.likes}
                      label="Like"
                      active={likeActive}
                      outlineIcon={<CiHeart size={18} />}
                      fillIcon={<FaHeart size={18} />}
                      onClick={(btn) => toggleReaction(r.id, "like", btn)}
                    />
                    <ReactionButton
                      count={r.fire}
                      label="Fire"
                      active={fireActive}
                      outlineIcon={<AiOutlineFire size={18} />}
                      fillIcon={<AiFillFire size={18} />}
                      onClick={(btn) => toggleReaction(r.id, "fire", btn)}
                    />

                    <button
                      onClick={() => toggleComments(r.id)}
                      className="text-sm text-gray-400 hover:text-yellow-400 transition duration-200 flex items-center gap-2"
                    >
                      <span className="inline-block">{openComments[r.id] ? "▴" : "▾"}</span>
                      {r.commentsCount} {r.commentsCount === 1 ? "comment" : "comments"}
                    </button>
                  </div>

                  {/* comments */}
                  {openComments[r.id] && (
                    <div className="mt-4 space-y-4 pl-6 border-l-2 border-yellow-500/30">
                      <ReplyBox open={true} onSubmit={(text) => submitComment(r.id, undefined, text)} />

                      {r.commentsTree?.length > 0 &&
                        r.commentsTree.map((n) => (
                          <CommentNode key={n.id} node={n} reviewId={r.id} />
                        ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {displayReviews.length === 0 && (
          <div className="px-8 text-gray-300">No reviews yet. Be the first!</div>
        )}
      </div>
    </div>
  );
}

/* ---------- generic reaction button ---------- */
function ReactionButton({ count, label, active, outlineIcon, fillIcon, onClick }) {
  return (
    <button
      onClick={(e) => onClick(e.currentTarget)}
      className={`relative inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition
        ${
          active
            ? "bg-yellow-500 text-gray-900 border-yellow-400"
            : "bg-white/10 border-yellow-500/30 hover:bg-white/20 text-gray-200"
        }`}
      aria-label={label}
      title={label}
      style={{ position: "relative" }}
    >
      <span className="relative top-[1px]">{active ? fillIcon : outlineIcon}</span>
      <span>{count}</span>
    </button>
  );
}