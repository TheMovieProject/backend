"use client"
import React, { useEffect, useState } from "react"
import BlogCard from "@/app/components/BlogCard/BlogCard"
import { Loader2 } from "lucide-react"

const Blogs = () => {
  const [blogs, setBlogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null) 

  const getBlogs = async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/blog`)

      if (!res.ok) {
        throw new Error("Failed to fetch blogs")
      }

      const data = await res.json()
      setBlogs(data)
      setError(null)
    } catch (err) {
      console.error("Error fetching blogs:", err)
      setError("Failed to load blogs")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    getBlogs()
  }, [])

  return (
    <div className="min-h-screen bg-gray-900 text-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold mb-8 text-center">Blogs</h1>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-red-500" />
          </div>
        ) : error ? (
          <div className="bg-red-900 border-l-4 border-red-500 text-red-100 p-4 rounded" role="alert">
            <p className="font-bold">Error</p>
            <p>{error}</p>
          </div>
        ) : blogs.length > 0 ? (
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {blogs.map((item) => (
              <BlogCard key={item._id} item={item} />
            ))}
          </div>
        ) : (
          <div className="text-center text-gray-400 py-12">
            <p className="text-xl">No blogs available.</p>
            <p className="mt-2">Check back later for new content!</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default Blogs

