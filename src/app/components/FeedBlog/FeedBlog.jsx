"use client";

import { useState, useEffect } from "react";
import useSWR from "swr";
import Image from "next/image";
import Link from "next/link";
import { Clock, MessageCircle, Heart, Flame, Eye, X, ExternalLink } from "lucide-react";

const fetcher = (url) => fetch(url).then((res) => res.json());

function BlogTile({ blog, onOpen }) {
  const [imgOk, setImgOk] = useState(Boolean(blog?.thumbnail));
  const cover = blog?.thumbnail || null;

  // IMAGE TILE
  if (imgOk && cover) {
    return (
      <div
        className="aspect-square relative cursor-pointer overflow-hidden"
        onClick={() => onOpen(blog)}
      >
        <Image
          src={cover}
          alt={blog?.title || "Blog cover"}
          fill
          className="object-cover hover:scale-105 transition-transform duration-300"
          onError={() => setImgOk(false)}
          sizes="(max-width:768px) 33vw, (max-width:1024px) 25vw, 20vw"
        />
        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/60 opacity-0 hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-3 text-white">
          <div className="flex items-center gap-1">
            <Heart className="w-4 h-4" />
            <span className="text-sm">{blog?.likes || 0}</span>
          </div>
          <div className="flex items-center gap-1">
            <MessageCircle className="w-4 h-4" />
            <span className="text-sm">{blog?.comments?.length || 0}</span>
          </div>
        </div>
      </div>
    );
  }

  // TWEET-STYLE TILE (no image)
  return (
    <button
      onClick={() => onOpen(blog)}
      className="aspect-square w-full cursor-pointer overflow-hidden rounded-md border border-white/10 bg-white/5 p-3 text-left hover:bg-white/10"
    >
      <div className="mb-1 line-clamp-1 text-xs text-white/60">
        @{blog?.user?.username || blog?.user?.email?.split("@")[0] || "user"}
      </div>
      <div className="line-clamp-2 text-sm font-semibold text-white">
        {blog?.title || "Untitled"}
      </div>
      <div className="mt-1 line-clamp-4 text-xs text-white/80">
        {blog?.excerpt || blog?.content?.slice(0, 140) || "Read this trending article from our community…"}
      </div>
      <div className="mt-2 flex items-center gap-3 text-[11px] text-white/70">
        <span className="flex items-center gap-1">
          <Heart className="h-3 w-3" /> {blog?.likes || 0}
        </span>
        <span className="flex items-center gap-1">
          <MessageCircle className="h-3 w-3" /> {blog?.comments?.length || 0}
        </span>
      </div>
    </button>
  );
}

const FeedBlog = () => {
  const { data: blogs, error } = useSWR("/api/trending_blogs", fetcher, {
    refreshInterval: 60000,
  });

  const [selectedBlog, setSelectedBlog] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const handleEsc = (event) => {
      if (event.key === "Escape") setIsModalOpen(false);
    };
    window.addEventListener("keydown", handleEsc);
    document.body.style.overflow = isModalOpen ? "hidden" : "auto";
    return () => {
      window.removeEventListener("keydown", handleEsc);
      document.body.style.overflow = "auto";
    };
  }, [isModalOpen]);

  if (error) return <p className="text-red-500">Failed to load blogs.</p>;
  if (!blogs) return <p className="text-white">Loading trending blogs...</p>;

  const openBlogModal = (blog) => {
    setSelectedBlog(blog);
    setIsModalOpen(true);
  };

  const modalHasImage = Boolean(selectedBlog?.thumbnail);

  return (
    <div className="p-6 bg-gradient-to-br from-gray-900 to-black rounded-xl">
      <h2 className="text-2xl font-bold mb-6 text-white flex items-center gap-2 border-b border-gray-800 pb-4">
        <span className="bg-gradient-to-r from-orange-500 to-pink-500 text-transparent bg-clip-text">
          Trending Blogs
        </span>
      </h2>

      <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-1 md:gap-2">
        {blogs.map((blog) => (
          <BlogTile key={blog.id} blog={blog} onOpen={openBlogModal} />
        ))}
      </div>

      {/* Modal */}
      {isModalOpen && selectedBlog && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80"
          onClick={() => setIsModalOpen(false)}
        >
          <div
            className="relative max-w-4xl w-full max-h-[90vh] bg-gray-900 border border-gray-800 text-white rounded-lg overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className={modalHasImage ? "flex h-full flex-col md:flex-row" : "flex h-full flex-col"}>
              {/* Left image */}
              {modalHasImage && (
                <div className="relative w-full md:w-1/2 aspect-square md:aspect-auto">
                  <Image
                    src={selectedBlog.thumbnail}
                    alt={selectedBlog.title}
                    fill
                    className="object-cover"
                    sizes="(max-width: 1024px) 50vw, 480px"
                  />
                </div>
              )}

              {/* Right content */}
              <div className={modalHasImage ? "w-full md:w-1/2 flex flex-col max-h-[90vh] md:max-h-[600px]" : "w-full flex flex-col max-h-[90vh]"}>
                {/* Header */}
                <div className="flex items-center gap-3 p-4 border-b border-gray-800">
                  <div className="relative w-8 h-8 rounded-full overflow-hidden border-2 border-pink-500">
                    <Image
                      src={selectedBlog.user?.avatarUrl || "/img/profile.png"}
                      alt={selectedBlog.user?.username || "User"}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div className="flex-1">
                    <p className="text-white font-medium">
                      @{selectedBlog.user?.username || "anonymous"}
                    </p>
                    <div className="flex items-center text-gray-400 text-xs">
                      <Clock className="w-3 h-3 mr-1" />
                      <span>
                        {selectedBlog.createdAt
                          ? new Date(selectedBlog.createdAt).toLocaleDateString()
                          : "Recently"}
                      </span>
                    </div>
                  </div>
                  <button className="text-gray-400 hover:text-white" onClick={() => setIsModalOpen(false)}>
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Body */}
                <div className="p-4 flex-1 overflow-y-auto">
                  <h3 className="text-xl font-bold text-white mb-3">{selectedBlog.title}</h3>
                  <p className="text-gray-300 text-sm mb-6">
                    {selectedBlog.excerpt || selectedBlog.content?.slice(0, 500) || "Read this trending article from our community..."}
                  </p>

                  {selectedBlog.category && (
                    <div className="mb-4">
                      <span className="bg-gray-800 px-3 py-1 rounded-full text-xs font-medium text-white">
                        {selectedBlog.category}
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between text-sm border-t border-gray-800 pt-4 mt-auto">
                    <div className="flex items-center gap-4">
                      <span className="flex items-center gap-1 text-pink-400">
                        <Heart className="w-4 h-4" /> {selectedBlog.likes || 0}
                      </span>
                      <span className="flex items-center gap-1 text-orange-400">
                        <Flame className="w-4 h-4" /> {selectedBlog.fire || 0}
                      </span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="flex items-center gap-1 text-blue-400">
                        <MessageCircle className="w-4 h-4" /> {selectedBlog.comments?.length || 0}
                      </span>
                      <span className="flex items-center gap-1 text-gray-400">
                        <Eye className="w-4 h-4" /> {selectedBlog.views || 0}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-800">
                  <Link href={`/blog/${selectedBlog.id}`} passHref>
                    <button className="w-full py-2 px-4 rounded bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-white flex items-center justify-center">
                      Read Full Article <ExternalLink className="w-4 h-4 ml-2" />
                    </button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default FeedBlog;
