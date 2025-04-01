"use client"

import { useState, useEffect } from "react"
import useSWR from "swr"
import Image from "next/image"
import Link from "next/link"
import { Clock, MessageCircle, Heart, Flame, X, ExternalLink } from "lucide-react"

const fetcher = (url) => fetch(url).then((res) => res.json())

const TrendingReviews = () => {
  const { data, error } = useSWR("/api/trending_reviews", fetcher, {
    refreshInterval: 60000, // Auto-refresh every 60 seconds
  })
  const [selectedReview, setSelectedReview] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  // Ensure `reviews` is an array or default to an empty array
  const reviews = Array.isArray(data) ? data : []

  // Close modal when pressing escape key
  useEffect(() => {
    const handleEsc = (event) => {
      if (event.key === "Escape") {
        setIsModalOpen(false)
      }
    }
    window.addEventListener("keydown", handleEsc)

    // Prevent scrolling when modal is open
    if (isModalOpen) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = "auto"
    }

    return () => {
      window.removeEventListener("keydown", handleEsc)
      document.body.style.overflow = "auto"
    }
  }, [isModalOpen])

  if (error) return <p className="text-red-500">Failed to load reviews.</p>
  if (!data) return <p className="text-gray-400">Loading trending reviews...</p>

  const openReviewModal = (review) => {
    setSelectedReview(review)
    setIsModalOpen(true)
  }

  return (
    <div className="p-6 bg-gradient-to-br from-gray-900 to-black rounded-xl">
      <h2 className="text-2xl font-bold mb-6 text-white flex items-center gap-2 border-b border-gray-800 pb-4">
        <span className="bg-gradient-to-r from-orange-500 to-pink-500 text-transparent bg-clip-text">
          Trending Reviews
        </span>
      </h2>

      {/* Instagram-style grid layout */}
      {reviews.length > 0 ? (
        <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-1 md:gap-2">
          {reviews.map((review) => (
            <div
              key={review.id}
              className="aspect-square relative cursor-pointer overflow-hidden"
              onClick={() => openReviewModal(review)}
            >
              <Image
                src={review.movie?.posterUrl || "/img/NoImage.png"}
                alt={review.movie?.title || "Movie Poster"}
                fill
                className="object-cover hover:scale-105 transition-transform duration-300"
              />

              {/* Hover overlay */}
              <div className="absolute inset-0 bg-black/60 opacity-0 hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-3 text-white">
                <div className="flex items-center gap-1">
                  <Heart className="w-4 h-4 text-white" />
                  <span className="text-sm">{review.likes || 0}</span>
                </div>
                <div className="flex items-center gap-1">
                  <MessageCircle className="w-4 h-4 text-white" />
                  <span className="text-sm">{review.reviewComments?.length || 0}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-gray-500 text-center">No trending reviews available.</p>
      )}

      {/* Custom modal implementation */}
      {isModalOpen && selectedReview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80"
          onClick={() => setIsModalOpen(false)}
        >
          <div
            className="relative max-w-4xl w-full max-h-[90vh] bg-gray-900 border border-gray-800 text-white rounded-lg overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col md:flex-row h-full">
              {/* Left side - Movie Poster */}
              <div className="relative w-full md:w-1/2 aspect-square md:aspect-auto">
                <Image
                  src={selectedReview.movie?.posterUrl || "/img/NoImage.png"}
                  alt={selectedReview.movie?.title || "Movie Poster"}
                  fill
                  className="object-cover"
                />
              </div>

              {/* Right side - Content */}
              <div className="w-full md:w-1/2 flex flex-col max-h-[90vh] md:max-h-[600px]">
                {/* User info header */}
                <div className="flex items-center gap-3 p-4 border-b border-gray-800">
                  <div className="relative w-8 h-8 rounded-full overflow-hidden border-2 border-pink-500">
                    <Image
                      src={selectedReview.user?.avatarUrl || "/placeholder.svg?height=32&width=32"}
                      alt={selectedReview.user?.name || "User"}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div className="flex-1">
                    <p className="text-white font-medium">{selectedReview.user?.name || "Anonymous"}</p>
                    <div className="flex items-center text-gray-400 text-xs">
                      <Clock className="w-3 h-3 mr-1" />
                      <span>
                        {selectedReview.createdAt
                          ? new Date(selectedReview.createdAt).toLocaleDateString()
                          : "Recently"}
                      </span>
                    </div>
                  </div>
                  <button className="text-gray-400 hover:text-white" onClick={() => setIsModalOpen(false)}>
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Content */}
                <div className="p-4 flex-1 overflow-y-auto">
                  <h3 className="text-xl font-bold text-white mb-3">
                    {selectedReview.movie?.title || "Untitled Movie"}
                  </h3>

                  {/* Movie details if available */}
                  {selectedReview.movie?.releaseDate && (
                    <div className="text-gray-400 text-sm mb-4">
                      Released: {new Date(selectedReview.movie.releaseDate).getFullYear()}
                    </div>
                  )}

                  {/* Review content */}
                  <div className="bg-gray-800/50 p-4 rounded-lg mb-6">
                    <p className="text-gray-300 text-sm">{selectedReview.content || "No review content available."}</p>
                  </div>

                  {/* Engagement stats */}
                  <div className="flex justify-between text-sm border-t border-gray-800 pt-4 mt-auto">
                    <div className="flex items-center gap-4">
                      <span className="flex items-center gap-1 text-pink-400">
                        <Heart className="w-4 h-4" /> {selectedReview.likes || 0}
                      </span>
                      <span className="flex items-center gap-1 text-orange-400">
                        <Flame className="w-4 h-4" /> {selectedReview.fire || 0}
                      </span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="flex items-center gap-1 text-blue-400">
                        <MessageCircle className="w-4 h-4" /> {selectedReview.reviewComments?.length || 0}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Footer with redirect button */}
                <div className="p-4 border-t border-gray-800">
                  <Link href={`/movies/${selectedReview.movie?.tmdbId || "#"}`} passHref>
                    <button className="w-full py-2 px-4 rounded bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-white flex items-center justify-center">
                      View Movie Details <ExternalLink className="w-4 h-4 ml-2" />
                    </button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default TrendingReviews

