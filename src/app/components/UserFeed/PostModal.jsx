"use client";

import Image from "next/image";
import Link from "next/link";
import Portal from "../Portal/Portal";
import { useEffect, useMemo, useRef, useState } from "react";
import { X, Heart, Flame, MessageCircle, Clock, Smile, Send, ChevronDown, ChevronUp } from "lucide-react";
import { useSession } from "next-auth/react";
import { useEntity, useEntityStore } from "@/app/stores/entityStores";

/* ---------- time helper ---------- */
const timeAgo = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  const s = (Date.now() - d.getTime()) / 1000;
  if (s < 60) return `${Math.floor(s)}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
};

/* ---------- tree helpers ---------- */
const buildTree = (flat = []) => {
  const map = {};
  const roots = [];
  for (const c of flat) map[c.id] = { ...c, children: [] };
  for (const c of flat) {
    if (c.parentId && map[c.parentId]) map[c.parentId].children.push(map[c.id]);
    else roots.push(map[c.id]);
  }
  // sort children oldest→newest (like your pages)
  const sortRec = (nodes) => {
    nodes.sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt));
    nodes.forEach((n) => n.children?.length && sortRec(n.children));
  };
  sortRec(roots);
  return roots;
};
const countTree = (nodes) =>
  nodes.reduce((n, c) => n + 1 + (c.children?.length ? countTree(c.children) : 0), 0);

/* ---------- UI ---------- */
export default function PostModal({ post, onClose, onReactionUpdate }) {
  const { data: session } = useSession();
  const entityType = post.type === "review" ? "review" : "blog";
  const listEndpoint  = entityType === "review" ? "/api/reviewComments" : "/api/blogComment";
  const createEndpoint = listEndpoint;

  const snap = useEntity(entityType, post.id, {
    likes: post.likes,
    fire: post.fire,
    likedByMe: post.likedByMe,
    firedByMe: post.firedByMe,
    commentsCount: post.commentsCount,
  });
  const upsert = useEntityStore((s) => s.upsert);
  const bumpComments = useEntityStore((s) => s.bumpComments);

  useEffect(() => {
    upsert({
      id: post.id,
      entityType,
      likes: post.likes || 0,
      fire: post.fire || 0,
      likedByMe: !!post.likedByMe,
      firedByMe: !!post.firedByMe,
      commentsCount: post.commentsCount,
    });
  }, [post.id, entityType]);

  const [tree, setTree] = useState([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [loading, setLoading] = useState(true);
  const [openReplies, setOpenReplies] = useState({});
  const commentsEndRef = useRef(null);

  const avatar = post.user?.avatarUrl || post.user?.image || post.authorAvatar || "/img/profile.png";
  const username = post.user?.username || post.author || post.user?.email?.split("@")[0] || "user";
  const userId = post.user?.id;
  const createdAt = post.createdAt;
  const hasImage = !!post.thumbnail;
  const emojis = ["😂", "😍", "😮", "😢", "😡", "👍", "🔥", "✨", "🎯", "💯"];

  /* ---------- fetch comments as TREE ---------- */
  async function fetchComments() {
    try {
      setLoading(true);
      const qs = entityType === "review" ? `?reviewId=${post.id}` : `?blogId=${post.id}`;
      const res = await fetch(`${listEndpoint}${qs}`, { cache: "no-store" });
      if (!res.ok) throw new Error("failed");

      if (entityType === "review") {
        // review API already returns a shaped review object with commentsTree
        const shaped = await res.json();
        const roots = shaped.commentsTree || [];
        setTree(roots);
        upsert({
          id: post.id,
          entityType,
          commentsCount: shaped.commentsCount ?? countTree(roots),
        });
      } else {
        // blog API returns a flat list → build a tree here
        const flat = await res.json(); // flat array
        const roots = buildTree(Array.isArray(flat) ? flat : []);
        setTree(roots);
        upsert({
          id: post.id,
          entityType,
          commentsCount: Array.isArray(flat) ? flat.length : countTree(roots),
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchComments();
  }, [entityType, post.id]);

  useEffect(() => {
    commentsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [tree]);

/* ---------- reactions (merge) ---------- */
async function react(kind) {
  if (!session?.user || busy) return;
  setBusy(true);
  const rollback = useEntityStore.getState().optimisticToggle(entityType, post.id, kind);

  try {
    const r = await fetch("/api/reaction", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entityId: post.id, entityType, type: kind }),
    });

    if (!r.ok) throw new Error("reaction failed"); // ✅ fixed here
    const srv = await r.json();

    upsert({
      id: post.id,
      entityType,
      likes: srv.likes ?? snap.likes ?? 0,
      fire: srv.fire ?? snap.fire ?? 0,
      likedByMe: typeof srv.likedByMe === "boolean" ? srv.likedByMe : snap.likedByMe,
      firedByMe: typeof srv.firedByMe === "boolean" ? srv.firedByMe : snap.firedByMe,
      commentsCount: srv.commentsCount ?? snap.commentsCount,
    });

    onReactionUpdate?.(srv);
  } catch (e) {
    console.error(e);
    rollback();
  } finally {
    setBusy(false);
  }
}

  /* ---------- create ROOT comment (modal has only root input) ---------- */
  async function submitComment() {
    const content = text.trim();
    if (!content || !session?.user?.id) return;
    try {
      if (entityType === "review") {
        const res = await fetch(createEndpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reviewId: post.id, comment: content }),
        });
        if (!res.ok) throw new Error("comment failed");
        // server returns shaped review with commentsTree
        const shaped = await res.json();
        setTree(shaped.commentsTree || []);
      } else {
        const res = await fetch(createEndpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ blogId: post.id, content }),
        });
        if (!res.ok) throw new Error("comment failed");
        await fetchComments(); // re-fetch to keep tree in sync
      }
      setText("");
      setShowEmojiPicker(false);
      bumpComments(entityType, post.id, +1);
    } catch (e) {
      console.error(e);
    }
  }

  const handleEmojiClick = (emoji) => setText((t) => t + emoji);
  const onEnter = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submitComment();
    }
  };

  const likes = snap.likes || 0;
  const fire = snap.fire || 0;
  const likedByMe = !!snap.likedByMe;
  const firedByMe = !!snap.firedByMe;
  const commentsCount = snap.commentsCount ?? countTree(tree);

  /* ---------- comment item (recursive but collapsed by default) ---------- */
  function CommentItem({ node, depth = 0 }) {
    const cAvatar = node.user?.avatarUrl || node.user?.image || "/img/profile.png";
    const cName = node.user?.username || "user";
    const cUserId = node.user?.id;
    const hasChildren = node.children?.length > 0;
    const open = !!openReplies[node.id];

    return (
      <div className="flex gap-3" style={{ marginLeft: depth ? 16 : 0 }}>
        <Link
          href={cUserId ? `/profile/${cUserId}` : "#"}
          className="relative w-8 h-8 rounded-full overflow-hidden ring-1 ring-white/10 shrink-0"
        >
          <Image src={cAvatar} alt={cName} fill className="object-cover" />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Link
              href={cUserId ? `/profile/${cUserId}` : "#"}
              className="text-white font-semibold text-sm hover:underline"
            >
              @{cName}
            </Link>
            <span className="text-white/50 text-xs">{timeAgo(node.createdAt)}</span>
          </div>
          <p className="text-white/90 text-sm leading-relaxed break-words">
            {node.comment || node.content}
          </p>

          {hasChildren && (
            <button
              className="mt-2 inline-flex items-center gap-1 text-xs text-white/70 hover:text-white"
              onClick={() =>
                setOpenReplies((p) => ({ ...p, [node.id]: !p[node.id] }))
              }
            >
              {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              {open ? "Hide" : "View"} replies ({countTree(node.children)})
            </button>
          )}

          {open &&
            node.children.map((child) => (
              <div key={child.id} className="mt-3">
                <CommentItem node={child} depth={depth + 1} />
              </div>
            ))}
        </div>
      </div>
    );
  }

  return (
    <Portal>
      <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center">
        <div className="bg-black rounded-2xl border border-white/10 shadow-2xl w-full max-w-6xl h-[90vh] overflow-hidden flex">
          {/* LEFT: Image */}
          <div className="flex-1 bg-black flex items-center justify-center min-w-0">
  {hasImage ? (
    <div className="relative w-full h-full hidden lg:block"> {/* Hide on mobile, show on lg and up */}
      <Image
        src={post.thumbnail}
        alt={post.title}
        fill
        className="object-contain"
        sizes="(max-width: 768px) 100vw, 50vw"
      />
    </div>
  ) : (
    <div className="h-full w-full hidden lg:grid place-items-center text-white/40">
      No image
    </div>
  )}
</div>

          {/* RIGHT: Content */}
          <div className="flex flex-col w-96 min-w-96 border-l border-white/10">
            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10">
              <Link
                href={userId ? `/profile/${userId}` : "#"}
                className="relative w-8 h-8 overflow-hidden rounded-full ring-1 ring-white/10 shrink-0"
              >
                <Image src={avatar} alt={username} fill className="object-cover" />
              </Link>
              <div className="min-w-0 flex-1">
                <Link
                  href={userId ? `/profile/${userId}` : "#"}
                  className="text-white/90 font-semibold text-sm truncate hover:underline"
                >
                  @{username}
                </Link>
                <div className="text-white/50 text-xs flex items-center gap-1">
                  <Clock className="w-3 h-3" /> {timeAgo(createdAt)}
                </div>
              </div>
              <button onClick={onClose} className="text-white/70 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Post text */}
            <div className="px-4 py-3 border-b border-white/10"> 
              <p className="text-white/90 text-sm leading-relaxed whitespace-pre-wrap">
                {post.content || post.excerpt || post.title}
              </p>
            </div>

            {/* Comments list (ROOTS only; replies behind a toggle) */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-5">
              {loading ? (
                <div className="flex-1 flex items-center justify-center flex-col space-y-3">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-yellow-500"></div>
                  <p className="text-white/50 text-sm">Loading comments...</p>
                </div>
              ) : tree.length === 0 ? (
                <div className="flex-1 flex items-center justify-center">
                  <p className="text-white/50 text-center">No comments yet</p>
                </div>
              ) : (
                tree.map((root) => <CommentItem key={root.id} node={root} />)
              )}
              <div ref={commentsEndRef} />
            </div>

            {/* Actions + input */}
            <div className="border-t border-white/10 bg-black">
              <div className="flex items-center gap-4 px-4 py-3">
                <button
                  onClick={() => react("like")}
                  className={`flex items-center gap-2 transition-transform ${
                    likedByMe ? "text-red-500 scale-110" : "text-white/70 hover:text-white"
                  }`}
                >
                  <Heart className={`w-6 h-6 ${likedByMe ? "fill-current" : ""}`} />
                  {likes}
                </button>
                <button
                  onClick={() => react("fire")}
                  className={`flex items-center gap-2 transition-transform ${
                    firedByMe ? "text-orange-500 scale-110" : "text-white/70 hover:text-white"
                  }`}
                >
                  <Flame className={`w-6 h-6 ${firedByMe ? "fill-current" : ""}`} />
                  {fire}
                </button>
                <div className="flex items-center gap-2 text-white/60 ml-auto">
                  <MessageCircle className="w-5 h-5" />
                  <span className="text-sm">{commentsCount}</span>
                </div>
              </div>

              <div className="px-4 py-3 border-t border-white/10 relative">
                {showEmojiPicker && (
                  <div className="absolute bottom-16 left-4 bg-gray-800 rounded-lg p-3 mb-2 border border-gray-600 grid grid-cols-5 gap-2 w-64 z-10">
                    {emojis.map((e) => (
                      <button
                        key={e}
                        onClick={() => handleEmojiClick(e)}
                        className="text-xl hover:bg-gray-700 p-2 rounded transition"
                      >
                        {e}
                      </button>
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <input
                    className="flex-1 bg-transparent text-white placeholder-white/40 outline-none text-sm py-2 px-2"
                    placeholder="Add a comment..."
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={onEnter}
                    disabled={loading}
                  />
                  <button
                    onClick={() => setShowEmojiPicker((v) => !v)}
                    className="text-white/60 hover:text-white transition p-1"
                    disabled={loading}
                  >
                    <Smile className="w-5 h-5" />
                  </button>
                  <button
                    onClick={submitComment}
                    disabled={!text.trim() || loading}
                    className={`p-1.5 transition-all duration-200 ${
                      text.trim() && !loading
                        ? "text-yellow-500 hover:text-yellow-400 hover:scale-110"
                        : "text-white/30 cursor-not-allowed"
                    }`}
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Portal>
  );
}