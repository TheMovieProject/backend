"use client";
import React, { useState, useEffect } from "react";
import Image from "next/image";
import { useSession } from "next-auth/react";
import AuthorInfo from "@/app/components/AuthorInfo/author";

const BlogPostPage = ({ params }) => {
  const { id } = params;
  const { data: session } = useSession();
  const [data, setData] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [likes, setLikes] = useState(0);
  const [fire, setFire] = useState(0);
  const [userReaction, setUserReaction] = useState(null);
  const [taggedUsernames, setTaggedUsernames] = useState([]);
  const [usersMap, setUsersMap] = useState({});

  // Fetch user data for tagged users
  useEffect(() => {
    const fetchTaggedUsers = async () => {
      try {
        const allUserIds = comments
          .flatMap(comment => comment.taggedUsers)
          .filter((v, i, a) => a.indexOf(v) === i); // Get unique IDs

        if (allUserIds.length > 0) {
          const res = await fetch(`/api/users?ids=${allUserIds.join(',')}`);
          const users = await res.json();
          setUsersMap(prev => ({
            ...prev,
            ...Object.fromEntries(users.map(u => [u.id, u]))
          }));
        }
      } catch (error) {
        console.error("Error fetching tagged users:", error);
      }
    };

    fetchTaggedUsers();
  }, [comments]);

  // Fetch blog data and comments
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [blogRes, commentsRes] = await Promise.all([
          fetch(`/api/blog/${id}`),
          fetch(`/api/blogComment?blogId=${id}`)
        ]);

        if (!blogRes.ok || !commentsRes.ok) throw new Error("Failed to fetch data");
        
        const blogData = await blogRes.json();
        const commentsData = await commentsRes.json();

        setData(blogData);
        setLikes(blogData.likes);
        setFire(blogData.fire);
        setComments(commentsData);
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };

    fetchData();
  }, [id]);

  const handleCommentSubmit = async () => {
    if (!newComment.trim() || !session?.user?.id) return;

    try {
      const res = await fetch("/api/blogComment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: newComment,
          blogId: id,
          userId: session.user.id,
          taggedUsernames // Send usernames to be converted to IDs in API
        }),
      });

      if (!res.ok) throw new Error("Failed to post comment");

      const result = await res.json();
      setComments(prev => [result, ...prev]);
      setNewComment("");
      setTaggedUsernames([]);
    } catch (error) {
      console.error("Error posting comment:", error);
    }
  };

  const handleReaction = async (type) => {
    if (!data || !session?.user?.id) return;

    try {
      const res = await fetch("/api/reaction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entityId: data.id,
          entityType: "blog",
          type,
          userId: session.user.id
        }),
      });

      if (!res.ok) throw new Error("Failed to update reaction");

      const responseData = await res.json();
      setLikes(responseData.likes || 0);
      setFire(responseData.fire || 0);
      setUserReaction(type);
    } catch (error) {
      console.error("Error updating reaction:", error);
    }
  };

  const handleTagging = (e) => {
    const text = e.target.value;
    setNewComment(text);
    
    // Extract tagged usernames without @
    const matches = text.match(/@(\w+)/g) || [];
    setTaggedUsernames(matches.map(tag => tag.substring(1)));
  };

  if (!data) return <div className="min-h-screen bg-gray-900 p-8">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-900 text-white py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">{data.title}</h1>
        
        {data.thumbnail && (
          <div className="relative w-full h-96 mb-8 rounded-lg overflow-hidden">
            <Image
              src={data.thumbnail}
              alt={data.title}
              fill
              className="object-cover"
              priority
            />
          </div>
        )}

        <article className="prose prose-invert max-w-none mb-12">
          <div dangerouslySetInnerHTML={{ __html: data.content }} />
        </article>

        <AuthorInfo data={data} />

        <div className="flex gap-4 mt-8 mb-12">
          <button
            className={`flex items-center gap-2 px-6 py-3 rounded-lg transition-colors ${
              userReaction === "like" ? "bg-blue-600" : "bg-gray-800 hover:bg-gray-700"
            }`}
            onClick={() => handleReaction("like")}
          >
            👍 <span className="font-medium">{likes}</span>
          </button>
          <button
            className={`flex items-center gap-2 px-6 py-3 rounded-lg transition-colors ${
              userReaction === "fire" ? "bg-red-600" : "bg-gray-800 hover:bg-gray-700"
            }`}
            onClick={() => handleReaction("fire")}
          >
            🔥 <span className="font-medium">{fire}</span>
          </button>
        </div>

        <section className="border-t border-gray-800 pt-12">
          <h2 className="text-3xl font-bold mb-8">Comments ({comments.length})</h2>

          <div className="mb-8">
            <div className="flex gap-4">
              <input
                className="flex-1 p-4 bg-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={newComment}
                onChange={handleTagging}
                placeholder="Share your thoughts... (use @ to mention others)"
              />
              <button
                className="px-6 py-4 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors"
                onClick={handleCommentSubmit}
              >
                Post Comment
              </button>
            </div>
            
            {taggedUsernames.length > 0 && (
              <div className="mt-4 text-gray-400 text-sm">
                Tagging: {taggedUsernames.map(username => (
                  <span key={username} className="mr-2">@{username}</span>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-6">
            {comments.map(comment => (
              <div key={comment.id} className="bg-gray-800 rounded-lg p-6">
                <div className="flex items-start gap-4 mb-4">
                  <Image
                    src={comment.user?.avatarUrl || "/default-avatar.png"}
                    width={48}
                    height={48}
                    className="rounded-full"
                    alt="User avatar"
                  />
                  <div>
                    <h3 className="font-medium">{comment.user?.username || "Anonymous"}</h3>
                    <p className="text-gray-400 text-sm">
                      {new Date(comment.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                
                <p className="text-gray-100 whitespace-pre-wrap">{comment.content}</p>

                {comment.taggedUsers?.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-700">
                    <span className="text-sm text-gray-400">Mentioned: </span>
                    {comment.taggedUsers.map(userId => (
                      <span
                        key={userId}
                        className="text-blue-400 text-sm mr-3"
                      >
                        @{usersMap[userId]?.username || "unknown"}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

export default BlogPostPage;