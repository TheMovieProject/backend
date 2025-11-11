"use client";

import React, { memo, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useSession } from "next-auth/react";
import AuthorInfo from "@/app/components/AuthorInfo/author";
import { Heart, MessageCircle, Share2 } from "lucide-react";
import LoginGate from "@/app/components/auth/LoginGate";

/* ------------ small helpers ------------ */
function buildTree(flat = []) {
  const map = {};
  const roots = [];
  for (const c of flat) map[c.id] = { ...c, children: [] };
  for (const c of flat) {
    if (c.parentId && map[c.parentId]) map[c.parentId].children.push(map[c.id]);
    else roots.push(map[c.id]);
  }
  return roots;
}

/* ------------ reply box with local state ------------ */
const ReplyBox = memo(function ReplyBox({
  open,
  placeholder = "Reply…",
  onSubmit,
  className = "",
}) {
  const [val, setVal] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  if (!open) return null;

  return (
    <div className={`mt-3 flex items-center gap-2 ${className}`}>
      <input
        ref={inputRef}
        className="flex-1 p-3 bg-transparent border border-white/30 rounded-none text-white placeholder-white/60 font-light"
        placeholder={placeholder}
        value={val}
        onChange={(e) => setVal(e.target.value)}
      />
      <button
        className="px-5 py-3 bg-white text-yellow-600 hover:bg-white/90 rounded-none font-light text-sm"
        onClick={() => {
          const t = val.trim();
          if (!t) return;
          onSubmit(t);
          setVal("");
          requestAnimationFrame(() => inputRef.current?.focus());
        }}
      >
        Post
      </button>
    </div>
  );
});

/* ------------ Comment Node Component ------------ */
const CommentNode = memo(function CommentNode({
  node,
  depth = 0,
  onReply,
  replyOpen,
  setReplyOpen,
  myUserId,
}) {
  const avatar = node.user?.avatarUrl || node.user?.image || "/default-avatar.png";
  const canReply = !!myUserId;

  return (
    <div className="mt-6" style={{ marginLeft: depth ? 16 : 0 }}>
      <div className="flex items-start gap-4">
        <Image
          src={avatar}
          alt="avatar"
          width={40}
          height={40}
          className="w-10 h-10 rounded-full object-cover border border-white/20"
        />
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <span className="font-light text-white/90">
              {node.user?.username || "User"}
            </span>
            <span className="text-white/50 text-sm">
              {new Date(node.createdAt).toLocaleDateString()}
            </span>
          </div>
          <p className="text-white/90 leading-relaxed font-light mt-1">
            {node.content}
          </p>

          <div className="mt-3 flex items-center gap-4">
            {canReply && (
              <button
                className="text-white/70 hover:text-white text-sm font-light"
                onClick={() =>
                  setReplyOpen((p) => ({ ...p, [node.id]: !p[node.id] }))
                }
              >
                Reply
              </button>
            )}
          </div>

          <ReplyBox
            open={!!replyOpen[node.id]}
            onSubmit={(text) => onReply(node.id, text)}
          />

          {node.children?.length > 0 &&
            node.children.map((child) => (
              <CommentNode 
                key={child.id} 
                node={child} 
                depth={depth + 1}
                onReply={onReply}
                replyOpen={replyOpen}
                setReplyOpen={setReplyOpen}
                myUserId={myUserId}
              />
            ))}
        </div>
      </div>
    </div>
  );
});

/* ------------ Main Blog Post Component ------------ */
export default function BlogPostPage({ params }) {
  const { id } = params;
  const { data: session } = useSession();

  const [blog, setBlog] = useState(null);
  const [likes, setLikes] = useState(0);
  const [fire, setFire] = useState(0);
  const [likedByMe, setLikedByMe] = useState(undefined);
  const [firedByMe, setFiredByMe] = useState(undefined);
  const [shareCount, setShareCount] = useState(0);

  const [flatComments, setFlatComments] = useState([]);
  const [commentsTree, setCommentsTree] = useState([]);
  const [rootInput, setRootInput] = useState("");

  // visibility map for reply boxes
  const [replyOpen, setReplyOpen] = useState({});

  // prevent reaction spam
  const inflight = useRef({ like: false, fire: false, share: false });

  const myUserId = session?.user?.id;

  /* ------------ load blog + comments ------------ */
  useEffect(() => {
    (async () => {
      const [bRes, cRes] = await Promise.all([
        fetch(`/api/blog/${id}`, { cache: "no-store" }),
        fetch(`/api/blogComment?blogId=${id}`, { cache: "no-store" }),
      ]);
      if (!bRes.ok || !cRes.ok) return;

      const bData = await bRes.json();
      const cData = await cRes.json();

      setBlog(bData);
      setLikes(bData.likes || 0);
      setFire(bData.fire || 0);
      setShareCount(bData.shares || 0);

      if (typeof bData.likedByMe === "boolean") setLikedByMe(!!bData.likedByMe);
      if (typeof bData.firedByMe === "boolean") setFiredByMe(!!bData.firedByMe);

      const sorted = [...cData].sort(
        (a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)
      );
      setFlatComments(sorted);
      setCommentsTree(buildTree(sorted));
    })();
  }, [id]);

  /* ------------ hydrate per-user flags after hard reload (if missing) ------------ */
  useEffect(() => {
    let cancelled = false;
    async function hydrateFlags() {
      if (!session?.user || !blog) return;

      const haveFlags =
        typeof likedByMe === "boolean" || typeof firedByMe === "boolean";
      if (haveFlags) return;

      try {
        const res = await fetch(`/api/reaction?entityType=blog&ids=${blog.id}`, {
          cache: "no-store",
        });
        if (!res.ok) return;
        const map = await res.json();
        const flags = map?.[blog.id];
        if (!cancelled && flags) {
          setLikedByMe(!!flags.likedByMe);
          setFiredByMe(!!flags.firedByMe);
        }
      } catch {}
    }
    hydrateFlags();
    return () => {
      cancelled = true;
    };
  }, [session?.user, blog, likedByMe, firedByMe]);

  const postComment = async (content, parentId = null) => {
    if (!content.trim() || !myUserId) return;

    const payload = { content, blogId: id, parentId };

    // optimistic add
    const tempId = `temp-${Math.random().toString(36).slice(2)}`;
    const temp = {
      id: tempId,
      content,
      createdAt: new Date().toISOString(),
      user: {
        id: myUserId,
        username: session?.user?.username || session?.user?.name || "You",
        avatarUrl: session?.user?.avatarUrl || session?.user?.image || null,
      },
      parentId,
      blogId: id,
    };

    setFlatComments((prev) => {
      const next = [temp, ...prev];
      setCommentsTree(buildTree(next));
      return next;
    });

    if (!parentId) setRootInput("");
    setReplyOpen((p) => ({ ...p, [parentId ?? ""]: false }));

    try {
      const res = await fetch("/api/blogComment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await res.text());
      const saved = await res.json();

      setFlatComments((prev) => {
        const next = [saved, ...prev.filter((x) => x.id !== tempId)];
        setCommentsTree(buildTree(next));
        return next;
      });
    } catch {
      // rollback
      setFlatComments((prev) => {
        const next = prev.filter((x) => x.id !== tempId);
        setCommentsTree(buildTree(next));
        return next;
      });
    }
  };

  /* ------------ reactions (like/fire) ------------ */
  const toggleReaction = async (kind) => {
    if (!blog || !myUserId || inflight.current[kind]) return;
    inflight.current[kind] = true;

    if (kind === "like") {
      setLikedByMe((prev) => {
        const next = !prev;
        setLikes((n) => (next ? n + 1 : Math.max(0, n - 1)));
        return next;
      });
    } else {
      setFiredByMe((prev) => {
        const next = !prev;
        setFire((n) => (next ? n + 1 : Math.max(0, n - 1)));
        return next;
      });
    }

    try {
      const res = await fetch("/api/reaction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entityId: blog.id,
          entityType: "blog",
          type: kind,
        }),
      });
      if (!res.ok) throw new Error("failed");
      const updated = await res.json();
      setLikes(updated.likes || 0);
      setFire(updated.fire || 0);
      setLikedByMe(
        typeof updated.likedByMe === "boolean" ? updated.likedByMe : undefined
      );
      setFiredByMe(
        typeof updated.firedByMe === "boolean" ? updated.firedByMe : undefined
      );
    } catch {
      // rollback
      if (kind === "like") {
        setLikedByMe((prev) => {
          const next = !prev;
          setLikes((n) => (next ? n + 1 : Math.max(0, n - 1)));
          return next;
        });
      } else {
        setFiredByMe((prev) => {
          const next = !prev;
          setFire((n) => (next ? n + 1 : Math.max(0, n - 1)));
          return next;
        });
      }
    } finally {
      inflight.current[kind] = false;
    }
  };

  /* ------------ share ------------ */
  const doShare = async () => {
    if (inflight.current.share) return;
    inflight.current.share = true;

    try {
      if (navigator.share) {
        await navigator.share({
          title: blog?.title,
          text: blog?.title,
          url: typeof window !== "undefined" ? window.location.href : "",
        });
      } else {
        await navigator.clipboard.writeText(
          typeof window !== "undefined" ? window.location.href : ""
        );
      }

      const res = await fetch("/api/blog/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blogId: id }),
      });
      const data = res.ok ? await res.json() : null;
      setShareCount((prev) => data?.shares ?? prev + 1);
    } catch {
    } finally {
      inflight.current.share = false;
    }
  };

  const handleReply = (commentId, text) => {
    postComment(text, commentId);
  };

  if (!blog) {
    return <div className="min-h-screen bg-black p-8 text-white">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-yellow-600 text-white">
      {blog.thumbnail && (
        <div className="relative w-full h-screen">
          <Image src={blog.thumbnail} alt={blog.title} fill className="object-cover" priority />
        </div>
      )}

      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="mb-16">
          <h1 className="text-5xl font-serif font-light mb-6 leading-tight tracking-tight">
            {blog.title}
          </h1>
          <div className="flex items-center gap-4 text-white/80 text-sm font-light">
            <span>
              {new Date(blog.createdAt).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </span>
          </div>
        </div>

        {blog.thumbnail && (
          <div className="relative w-full aspect-[16/9] mb-16 overflow-hidden">
            <Image
              src={blog.thumbnail}
              alt={blog.title}
              fill
              className="object-cover grayscale hover:grayscale-0 transition-all duration-700"
            />
          </div>
        )}

        <article className="max-w-none mb-16">
          <div className="prose prose-invert prose-lg max-w-none font-serif leading-relaxed">
            <div
              className="text-white/90 text-lg leading-8 space-y-6"
              dangerouslySetInnerHTML={{ __html: blog.content }}
            />
          </div>
        </article>

        <div className="mb-16 border-t border-white/20 pt-8">
          <AuthorInfo data={blog} />
        </div>

        <div className="border-t border-b border-white/20 py-8 mb-16">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                className={`flex items-center gap-2 px-4 py-2 rounded-sm transition-all border ${
                  likedByMe
                    ? "bg-white text-red-400 border-white"
                    : "bg-transparent text-white border-white/40 hover:border-white"
                }`}
                onClick={() => toggleReaction("like")}
              >
                <Heart className={`w-4 h-4 ${likedByMe ? "fill-current" : ""}`} />
                <span className="text-sm font-light">{likes}</span>
              </button>

              <button
                className={`flex items-center gap-2 px-4 py-2 rounded-sm transition-all border ${
                  firedByMe
                    ? "bg-white text-yellow-600 border-white"
                    : "bg-transparent text-white border-white/40 hover:border-white"
                }`}
                onClick={() => toggleReaction("fire")}
              >
                <span className={`text-sm ${firedByMe ? "opacity-100" : "opacity-90"}`}>🔥</span>
                <span className="text-sm font-light">{fire}</span>
              </button>

              <button className="flex items-center gap-2 px-4 py-2 rounded-sm border border-white/40 hover:border-white transition-colors text-white">
                <MessageCircle className="w-4 h-4" />
                <span className="text-sm font-light">{flatComments.length}</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={doShare}
                className="p-2 flex items-center gap-2 border border-white/40 hover:border-white transition-colors rounded-sm"
              >
                <Share2 className="w-4 h-4" />
                <span className="text-sm font-light">{shareCount}</span>
              </button>
            </div>
          </div>
        </div>

        {/* comments */}
        <section className="mb-16">
          <h2 className="text-2xl font-serif font-light mb-8 tracking-wide">
            COMMENTS ({flatComments.length})
          </h2>

          {/* root input */}
          <div className="mb-12">
            <div className="flex gap-4 items-start">
              <div className="flex-1">
                <input
                  className="w-full p-4 bg-transparent border border-white/30 focus:border-white transition-colors rounded-none focus:outline-none placeholder-white/60 font-light"
                  value={rootInput}
                  onChange={(e) => setRootInput(e.target.value)}
                  placeholder="Share your thoughts…"
                />
              </div>
              <button
                className="px-8 py-4 bg-white text-yellow-600 hover:bg-white/90 transition-colors rounded-none font-light text-sm tracking-wide uppercase"
                onClick={() => postComment(rootInput)}
              >
                Post
              </button>
            </div>
          </div>

          {/* thread */}
          <div className="space-y-6">
            {commentsTree.map((n) => (
              <CommentNode 
                key={n.id} 
                node={n} 
                onReply={handleReply}
                replyOpen={replyOpen}
                setReplyOpen={setReplyOpen}
                myUserId={myUserId}
              />
            ))}
            {commentsTree.length === 0 && (
              <div className="text-white/70 font-light">Be the first to comment.</div>
            )}
          </div>
        </section>
        <LoginGate threshold={0.2} />
      </div>
    </div>
  );
}