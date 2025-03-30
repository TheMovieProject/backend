"use client"
import useSWR from "swr"
import Image from "next/image"
import Link from "next/link"
import { Clock, MessageCircle, Heart, Flame, Eye } from "lucide-react"

const fetcher = (url) => fetch(url).then((res) => res.json())

const TrendingBlogs = () => {
  const { data: blogs, error } = useSWR("/api/trending_blogs", fetcher, {
    refreshInterval: 60000, // Auto-refresh every 60 seconds
  })

  if (error) return <p className="text-red-500">Failed to load blogs.</p>
  if (!blogs) return <p className="text-white">Loading trending blogs...</p>

  return (
    <div className="p-6 bg-gradient-to-br from-gray-900 to-black rounded-xl">
      <h2 className="text-2xl font-bold mb-8 text-white flex items-center gap-2 border-b border-gray-800 pb-4">
        <span className="bg-gradient-to-r from-orange-500 to-pink-500 text-transparent bg-clip-text">
          Trending Blogs
        </span>
      </h2>

      {/* Instagram-style grid layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {blogs.slice(0, 9).map((blog) => (
          <Link
            href={`/blog/${blog.id}`}
            key={blog.id}
            className="group flex flex-col bg-gray-800 rounded-xl overflow-hidden border border-gray-700 hover:border-gray-500 transition-all duration-300 hover:shadow-[0_0_15px_rgba(255,100,100,0.15)]"
          >
            {/* Image container - Instagram style */}
            <div className="relative w-full aspect-square">
              <Image
                src={blog.thumbnail || "/placeholder.svg?height=400&width=400"}
                alt={blog.title}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-700"
              />

              {/* Category badge */}
              <div className="absolute top-3 left-3 bg-black/70 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-medium text-white">
                {blog.category || "Article"}
              </div>
            </div>

            {/* User info header - Instagram style */}
            <div className="flex items-center gap-3 p-4 border-b border-gray-700">
              <div className="relative w-8 h-8 rounded-full overflow-hidden border-2 border-pink-500">
                <Image
                  src={blog.user?.avatarUrl || "/placeholder.svg?height=32&width=32"}
                  alt={blog.user?.username || "User"}
                  fill
                  className="object-cover"
                />
              </div>
              <div>
                <p className="text-white font-medium">@{blog.user?.username || "anonymous"}</p>
                <div className="flex items-center text-gray-400 text-xs">
                  <Clock className="w-3 h-3 mr-1" />
                  <span>{blog.createdAt ? new Date(blog.createdAt).toLocaleDateString() : "Recently"}</span>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-4 flex-1 flex flex-col">
              <h3 className="text-lg font-bold text-white mb-2 line-clamp-2">{blog.title}</h3>
              <p className="text-gray-400 text-sm line-clamp-2 mb-4">
                {blog.excerpt || "Read this trending article from our community..."}
              </p>

              {/* Engagement stats - Instagram style */}
              <div className="mt-auto flex justify-between text-sm border-t border-gray-700 pt-4">
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1 text-pink-400">
                    <Heart className="w-4 h-4" /> {blog.likes}
                  </span>
                  <span className="flex items-center gap-1 text-orange-400">
                    <Flame className="w-4 h-4" /> {blog.fire || 0}
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1 text-blue-400">
                    <MessageCircle className="w-4 h-4" /> {blog.comments?.length || 0}
                  </span>
                  <span className="flex items-center gap-1 text-gray-400">
                    <Eye className="w-4 h-4" /> {blog.views}
                  </span>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}

export default TrendingBlogs

