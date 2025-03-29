"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import Reaction from "../Reactions/Reactions"
import Link from "next/link"
import { IoIosArrowDown } from "react-icons/io";
import { IoIosArrowUp } from "react-icons/io";

const Review = ({ movieId }) => {
  const [reviews, setReviews] = useState([])
  const [reviewText, setReviewText] = useState("")
  const [loading, setLoading] = useState(true)
  const [commentSectionVisibility, setCommentSectionVisibility] = useState({})
  const [commentInputVisibility, setCommentInputVisibility] = useState({})
  const [commentText, setCommentText] = useState({})
  const [error, setError] = useState(null)
  const [arrow , setArrow] = useState(true)

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        const response = await fetch(`/api/review?movieId=${movieId}`)
        if (!response.ok) throw new Error("Failed to fetch reviews")
        const data = await response.json()

        const formattedReviews = data.map((review) => ({
          ...review,
          comments: review.reviewComments || [],
        }))

        // Sort by trending score (likes + fire + comments)
        formattedReviews.sort((a, b) => {
          const aScore = (a.likes || 0) + (a.fire || 0) + ((a.comments || []).length)
          const bScore = (b.likes || 0) + (b.fire || 0) + ((b.comments || []).length)
          return bScore - aScore
        })
        

        setReviews(formattedReviews)
      } catch (error) {
        console.error(error)
      } finally {
        setLoading(false)
      }
    }

    movieId && fetchReviews()
  }, [movieId])

  const toggleCommentSection = (reviewId) => {
    setCommentSectionVisibility((prev) => ({
      ...prev,
      [reviewId]: !prev[reviewId],
    }))
    setArrow(!arrow)
  }

  const toggleCommentInput = (reviewId) => {
    setCommentInputVisibility((prev) => ({
      ...prev,
      [reviewId]: !prev[reviewId],
    }))

    // If we're opening the comment input, also make sure the comment section is visible
    if (!commentSectionVisibility[reviewId]) {
      setCommentSectionVisibility((prev) => ({
        ...prev,
        [reviewId]: true,
      }))
    }
  }

  const handleReaction = async (reviewId, type) => {
    window.location.reload()
    try {
      const payload = { 
        entityId: reviewId,
        entityType: 'review',
        type: type
      };
      
      const response = await fetch('/api/reaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) throw new Error(`Failed to update reaction`)

      // Get updated review from backend
      const updatedReview = await response.json()

      // Update reviews list with proper sorting
      setReviews(prevReviews => {
        const updated = prevReviews.map(review => 
          review.id === reviewId ? { ...updatedReview, comments: updatedReview.comments || [] } : review
        )
        return updated.sort((a, b) => {
          const aScore = (a.likes || 0) + (a.fire || 0) + ((a.comments || []).length)
          const bScore = (b.likes || 0) + (b.fire || 0) + ((b.comments || []).length)
          return bScore - aScore
        })
      })
    } catch (error) {
      console.error("Reaction error:", error)
    }
  }

  const handleSubmit = async () => {
    window.location.reload()
    if (!reviewText.trim()) return
    setError(null) // Clear previous errors

    try {
      const response = await fetch("/api/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ movieId, reviewText }),
      })

      if (!response.ok) throw new Error("Failed to submit review")

      const newReview = await response.json()
      setReviews([...reviews, { ...newReview, comments: [] }])
      setReviewText("")
    } catch (error) {
      setError(error.message)
      console.error(error)
    }
  }

  const handleCommentSubmit = async (reviewId) => {
    const comment = commentText[reviewId]?.trim()

    if (!comment) {
      console.error("Comment is empty")
      return
    }

    try {
      const response = await fetch("/api/reviewComments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          reviewId,
          comment,
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error("Comment Submission Error:", errorText)
        return
      }

      // Completely refetch reviews to ensure latest data
      const reviewsResponse = await fetch(`/api/review?movieId=${movieId}`)
      if (!reviewsResponse.ok) {
        console.error("Failed to fetch updated reviews")
        return
      }

      const updatedReviews = await reviewsResponse.json()
      const formattedReviews = updatedReviews.map((review) => ({
        ...review,
        comments: review.reviewComments || [],
      }))

      setReviews(formattedReviews)

      // Clear comment input
      setCommentText((prev) => ({
        ...prev,
        [reviewId]: "",
      }))
    } catch (error) {
      console.error("Comprehensive Comment Submission Error:", error)
    }
  }

  if (loading) return <p>Loading...</p>

  return (
    <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-sm py-8">
      <h2 className="text-3xl font-bold text-gray-800 mb-6 px-6">Reviews</h2>

      {/* Review Input Section */}
      <div className="mb-8 px-6">
        <div className="flex items-center gap-3 bg-gray-50 p-4 rounded-lg w-full">
          <input
            type="text"
            value={reviewText}
            onChange={(e) => setReviewText(e.target.value)}
            placeholder="Share your thoughts about the movie..."
            className="flex-1 px-4 py-3 w-[65%] lg:w-[80%] border border-gray-200 text-black rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          />
          <button
            onClick={handleSubmit}
            className="bg-blue-600 text-[0.8rem] md:text-lg w-[35%] lg:w-[20%] hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition duration-200"
          >
            Post Review
          </button>
        </div>
        {error && <p className="mt-2 text-red-500 text-sm">{error}</p>}
      </div>

      {/* Reviews List */}
      <div className="space-y-6">
        {reviews.map((review) => (
          <div key={review.id} className="px-6 py-4 hover:bg-gray-50 transition duration-200 border-b border-gray-100">
            <div className="flex gap-4">
              {/* User Avatar */}
              <Link href={`/profile/${review.user?.id}`}>
                <Image
                  className="w-12 h-12 rounded-full object-cover border-2 border-gray-200"
                  src={review.user?.avatarUrl || "/default-avatar.png"}
                  width={48}
                  height={48}
                  alt="Profile Image"
                />
              </Link>

              {/* Review Content */}
              <div className="flex-1">
                <p className="font-semibold text-gray-900">{review.user?.username || "Anonymous"}</p>
                <p className="text-gray-700 mb-4 leading-relaxed">{review.content}</p>

                {/* Reactions and Comment Button */}
                <div className="flex items-center gap-6 text-black">
                <Reaction
                reviewId={review.id}
                emojis={review.emojis}
                likes={review.likes || 0} // Ensure default value
                fire={review.fire || 0}   // Ensure default value
                onReact={handleReaction}
                />

                  <button
                    onClick={() => toggleCommentInput(review.id)}
                    className="text-sm text-gray-600 hover:text-blue-600 transition duration-200 flex items-center gap-2"
                  >
                    💬 Comment
                  </button>

                  {/* Comment Counter Button - YouTube Style */}
                </div>

                <div className="mt-5">
                {review.comments?.length > 0 && (
                    <button
                      onClick={() => toggleCommentSection(review.id)}
                      className="text-sm text-gray-600 hover:text-blue-600 transition duration-200 flex items-center gap-2"
                    >
                      <div>{arrow ? <IoIosArrowDown/>: <IoIosArrowUp/>}</div>
                      {review.comments.length} {review.comments.length === 1 ? "comment" : "comments"}
                    </button>
                  )}
                </div>

                {/* Comment Input */}
                {commentInputVisibility[review.id] && (
                  <div className="mt-4 flex items-center gap-2">
                    <input
                      type="text"
                      value={commentText[review.id] || ""}
                      onChange={(e) =>
                        setCommentText((prev) => ({
                          ...prev,
                          [review.id]: e.target.value,
                        }))
                      }
                      placeholder="Add a comment..."
                      className="flex-1 px-4 py-2 border text-black border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition-all"
                    />
                    <button
                      onClick={() => handleCommentSubmit(review.id)}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition duration-200"
                    >
                      Post
                    </button>
                  </div>
                )}

                {/* Comments Section */}
                {commentSectionVisibility[review.id] && review.comments?.length > 0 && (
                  <div className="mt-4 space-y-7 pl-6 border-l-2 border-gray-200">
                    {review.comments.map((comment) => (
                      <div key={comment.id} className="comment">
                        <div className="flex items-start gap-2">
                          <Image
                            src={comment.user?.avatarUrl || "/default-avatar.png"}
                            alt="Commenter Avatar"
                            className="w-8 h-8 rounded-full object-cover"
                            width={32}
                            height={32}
                          />
                          <div>
                            <span className="font-semibold text-black text-sm">{comment.user?.username}</span>
                            <p className="text-gray-700 text-sm">{comment.comment}</p>
                          </div>
                        </div>

                        {/* Nested Comments (if applicable) */}
                        {comment.childComments && comment.childComments.length > 0 && (
                          <div className="ml-10 mt-2 space-y-6">
                            {comment.childComments.map((childComment) => (
                              <div key={childComment.id} className="flex items-start gap-2">
                                <Image
                                  src={childComment.user?.image || "/default-avatar.png"}
                                  alt="Child Commenter Avatar"
                                  className="w-6 h-6 rounded-full object-cover"
                                  width={24}
                                  height={24}
                                />
                                <div>
                                  <span className="font-semibold text-black text-xs">{childComment.user?.name}</span>
                                  <p className="text-gray-700 text-xs">{childComment.comment}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default Review

