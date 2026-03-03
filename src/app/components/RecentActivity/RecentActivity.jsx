"use client"

import { useState, useEffect, useCallback } from "react"
import { useSession } from "next-auth/react"
import Image from "next/image"
import Link from "next/link"
import { Clock, MessageCircle, Heart, Eye, X, ExternalLink, Flame } from "lucide-react"
import { formatRelativeTime, subtractHours, isAfterDate } from "@/app/libs/dateUtils"
import { useIncrementalList } from "@/app/hooks/useIncrementalList"

const REFRESH_INTERVAL = 5 * 60 * 1000 // 5 minutes
const ACTIVITY_LIMIT = 50
const FOLLOWER_FETCH_LIMIT = 12
const FOLLOWER_ITEM_LIMIT = 5

const FollowerActivity = () => {
  const { data: session, status } = useSession()
  const [activities, setActivities] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedActivity, setSelectedActivity] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const {
    hasMore,
    loadMoreRef,
    visibleItems: visibleActivities,
  } = useIncrementalList(activities, {
    initialCount: 20,
    increment: 15,
    enabled: activities.length > 20,
  })

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

  const fetchFollowersActivities = useCallback(async () => {
    try {
      if (!session?.user?.id) return
      setError(null)

      const followersRes = await fetch(
        `/api/user/${session.user.id}/followers?limit=${FOLLOWER_FETCH_LIMIT}`
      )
      if (!followersRes.ok) throw new Error("Failed to fetch followers")
      const followersData = await followersRes.json()
      const followersList = followersData.followersList || []

      const activitiesPromises = followersList.map(async (follower) => {
        try {
          const [reviewsRes, blogsRes] = await Promise.all([
            fetch(`/api/review?userId=${follower.id}&limit=${FOLLOWER_ITEM_LIMIT}`),
            fetch(`/api/blog?userId=${follower.id}&limit=${FOLLOWER_ITEM_LIMIT}`),
          ])

          const [reviews, blogs] = await Promise.all([
            reviewsRes.ok ? reviewsRes.json() : [],
            blogsRes.ok ? blogsRes.json() : [],
          ])

          const reviewActivities = reviews
            .filter((review) => review?.movie?.tmdbId)
            .map((review) => ({
              type: "review",
              user: follower,
              data: review,
              createdAt: review.createdAt,
              title: review.movie?.title || review.title || "Review",
              link: `/movies/${review.movie.tmdbId}`,
              posterPath: review.movie?.posterUrl || "/img/logo.png",
              likes: review.likes || 0,
              comments: review.commentsCount || 0,
              views: review.views || 0,
              fire: review.fire || 0,
            }))

          const blogActivities = blogs.map((blog) => ({
            type: "blog",
            user: follower,
            data: blog,
            createdAt: blog.createdAt,
            title: blog.title,
            link: `/blog/${blog.id}`,
            posterPath: blog.thumbnail || "/img/logo.png",
            likes: blog.likes || 0,
            comments: blog.comments?.length || 0,
            views: blog.views || 0,
            fire: blog.fire || 0,
          }))

          return [...reviewActivities, ...blogActivities]
        } catch (error) {
          console.error(`Error fetching activities for follower ${follower.id}:`, error)
          return []
        }
      })

      const allActivities = await Promise.all(activitiesPromises)

      const twentyFourHoursAgo = subtractHours(new Date(), 24)

      const sortedActivities = allActivities
        .flat()
        .filter((activity) => {
          if (!activity?.createdAt) return false
          const activityDate = new Date(activity.createdAt)
          return isAfterDate(activityDate, twentyFourHoursAgo)
        })
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, ACTIVITY_LIMIT)

      setActivities(sortedActivities)
    } catch (error) {
      console.error("Error fetching follower activities:", error)
      setError("Failed to load activities. Please try again later.")
    } finally {
      setLoading(false)
    }
  }, [session?.user?.id])

  useEffect(() => {
    if (status === "authenticated" && session?.user?.id) {
      void fetchFollowersActivities()

      const refreshInterval = setInterval(fetchFollowersActivities, REFRESH_INTERVAL)
      return () => clearInterval(refreshInterval)
    }
  }, [status, session?.user?.id, fetchFollowersActivities])

  const openActivityModal = (activity) => {
    setSelectedActivity(activity)
    setIsModalOpen(true)
  }

  if (status === "loading" || loading) {
    return (
      <div className="p-6 bg-gradient-to-br from-gray-900 to-black rounded-xl">
        <p className="text-white text-center">Loading your feed...</p>
      </div>
    )
  }

  if (status === "unauthenticated") {
    return (
      <div className="p-6 bg-gradient-to-br from-gray-900 to-black rounded-xl">
        <p className="text-gray-300 text-center">Please sign in to view follower activities</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6 bg-gradient-to-br from-gray-900 to-black rounded-xl">
        <p className="text-red-400 text-center">{error}</p>
      </div>
    )
  }

  if (!activities.length) {
    return (
      <div className="p-6 bg-gradient-to-br from-gray-900 to-black rounded-xl">
        <p className="text-gray-300 text-center">No activity from your followers in the past 24 hours</p>
      </div>
    )
  }

  return (
    <div className="p-6 bg-gradient-to-br from-gray-900 to-black rounded-xl">
      <h2 className="text-2xl font-bold mb-6 text-white flex items-center gap-2 border-b border-gray-800 pb-4">
        <span className="bg-gradient-to-r from-orange-500 to-pink-500 text-transparent bg-clip-text">
          Friends Activity
        </span>
      </h2>

      {/* Instagram-style grid layout */}
      <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-1 md:gap-2">
        {visibleActivities.map((activity, index) => (
          <div
            key={`${activity.type}-${activity.data.id}-${index}`}
            className="aspect-square relative cursor-pointer overflow-hidden"
            onClick={() => openActivityModal(activity)}
          >
            <Image
              src={activity.posterPath || "/img/logo.png"}
              alt={activity.title}
              fill
              className="object-cover hover:scale-105 transition-transform duration-300"
              onError={(e) => {
                e.currentTarget.src = "/img/logo.png"
              }}
            />

            {/* Hover overlay */}
            <div className="absolute inset-0 bg-black/60 opacity-0 hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-3 text-white">
              <div className="flex items-center gap-1">
                <Heart className="w-4 h-4 text-white" />
                <span className="text-sm">{activity.likes}</span>
              </div>
              <div className="flex items-center gap-1">
                <MessageCircle className="w-4 h-4 text-white" />
                <span className="text-sm">{activity.comments}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
      {hasMore ? <div ref={loadMoreRef} className="h-6 w-full" aria-hidden="true" /> : null}

      {/* Custom modal implementation */}
      {isModalOpen && selectedActivity && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80"
          onClick={() => setIsModalOpen(false)}
        >
          <div
            className="relative max-w-4xl w-full max-h-[90vh] bg-gray-900 border border-gray-800 text-white rounded-lg overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col md:flex-row h-full">
              {/* Left side - Image */}
              <div className="relative w-full md:w-1/2 aspect-square md:aspect-auto">
                <Image
                  src={selectedActivity.posterPath || "/img/logo.png"}
                  alt={selectedActivity.title}
                  fill
                  className="object-cover"
                  onError={(e) => {
                    e.currentTarget.src = "/img/logo.png"
                  }}
                />
              </div>

              {/* Right side - Content */}
              <div className="w-full md:w-1/2 flex flex-col max-h-[90vh] md:max-h-[600px]">
                {/* User info header */}
                <div className="flex items-center gap-3 p-4 border-b border-gray-800">
                  <div className="relative w-8 h-8 rounded-full overflow-hidden border-2 border-pink-500">
                    <Image
                      src={selectedActivity.user.avatarUrl || selectedActivity.user.image || "/img/profile.png"}
                      alt={selectedActivity.user.username || "User"}
                      fill
                      className="object-cover"
                      onError={(e) => {
                        e.currentTarget.src = "/img/profile.png"
                      }}
                    />
                  </div>
                  <div className="flex-1">
                    <Link
                      href={`/profile/${selectedActivity.user.id}`}
                      className="text-white font-medium hover:underline"
                    >
                      @{selectedActivity.user.username || "anonymous"}
                    </Link>
                    <div className="flex items-center text-gray-400 text-xs">
                      <Clock className="w-3 h-3 mr-1" />
                      <span>{formatRelativeTime(selectedActivity.createdAt)} ago</span>
                    </div>
                  </div>
                  <button className="text-gray-400 hover:text-white" onClick={() => setIsModalOpen(false)}>
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Content */}
                <div className="p-4 flex-1 overflow-y-auto">
                  <h3 className="text-xl font-bold text-white mb-3">
                    {selectedActivity.type === "review"
                      ? `Reviewed: ${selectedActivity.title}`
                      : selectedActivity.title}
                  </h3>

                  {selectedActivity.type === "review" && selectedActivity.data.content && (
                    <p className="text-gray-300 text-sm mb-6">{selectedActivity.data.content}</p>
                  )}

                  {/* Category */}
                  <div className="mb-4">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium text-white ${
                        selectedActivity.type === "review" ? "bg-blue-800" : "bg-green-800"
                      }`}
                    >
                      {selectedActivity.type === "review" ? "Review" : "Blog Post"}
                    </span>
                  </div>

                  {/* Engagement stats */}
                  <div className="flex justify-between text-sm border-t border-gray-800 pt-4 mt-auto">
                    <div className="flex items-center gap-4">
                      <span className="flex items-center gap-1 text-pink-400">
                        <Heart className="w-4 h-4" /> {selectedActivity.likes}
                      </span>
                      <span className="flex items-center gap-1 text-orange-400">
                        <Flame className="w-4 h-4" /> {selectedActivity.fire}
                      </span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="flex items-center gap-1 text-blue-400">
                        <MessageCircle className="w-4 h-4" /> {selectedActivity.comments}
                      </span>
                      <span className="flex items-center gap-1 text-gray-400">
                        <Eye className="w-4 h-4" /> {selectedActivity.views}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Footer with redirect button */}
                <div className="p-4 border-t border-gray-800">
                  <Link href={selectedActivity.link} passHref>
                    <button className="w-full py-2 px-4 rounded bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-white flex items-center justify-center">
                      {selectedActivity.type === "review" ? "View Full Review" : "Read Full Article"}{" "}
                      <ExternalLink className="w-4 h-4 ml-2" />
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

export default FollowerActivity

