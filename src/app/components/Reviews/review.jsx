import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Reaction from '../Reactions/Reactions'; // Import the Reaction component

const Review = ({ movieId }) => {
  const [reviews, setReviews] = useState([]);
  const [reviewText, setReviewText] = useState('');
  const [loading, setLoading] = useState(true);
  const [commentVisibility, setCommentVisibility] = useState({});
  const [commentText, setCommentText] = useState({});
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        const response = await fetch(`/api/review?movieId=${movieId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch reviews');
        }
        const data = await response.json();
        setReviews(data);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    if (movieId) {
      fetchReviews();
    }
  }, [movieId]);

  const toggleCommentVisibility = (reviewId) => {
    setCommentVisibility(prevState => ({
      ...prevState,
      [reviewId]: !prevState[reviewId]
    }));
  };

  const handleReaction = async (reviewId, type) => {
    // window.location.reload()
    try {
        const response = await fetch('/api/reaction', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                reviewId,
                type,
                action: 'reaction'
            }),
        });

        if (!response.ok) {
            throw new Error('Failed to update reaction');
        }

        const updatedReview = await response.json();
        setReviews((prevReviews) =>
            prevReviews.map((review) =>
                review.id === reviewId ? updatedReview : review
            )
        );
    } catch (error) {
        console.error(error);
    }
};

const handleSubmit = async () => {
  if (!reviewText.trim()) return;

  try {
      const response = await fetch('/api/review', {
          method: 'POST',
          headers: {
              'Content-Type': 'application/json',
          },
          body: JSON.stringify({ movieId, reviewText }),
      });

      if (!response.ok) {
          throw new Error('Failed to submit review');
      }

      const newReview = await response.json();
      console.log("New Review:", newReview); // Log the new review data
      setReviews([...reviews, newReview]);
      setReviewText('');
      setError(null);
  } catch (error) {
      setError(error.message);
      console.error(error);
  }
};


const handleCommentSubmit = async (reviewId, commentText) => {
  if (!commentText.trim()) return;

  try {
      const response = await fetch('/api/reviewComments', {
          method: 'POST',
          headers: {
              'Content-Type': 'application/json',
          },
          body: JSON.stringify({ reviewId, comment: commentText }),
      });

      if (!response.ok) {
          throw new Error('Failed to submit comment');
      }

      const updatedReview = await response.json();
      console.log("Updated Review:", updatedReview); // Log the updated review data

      setReviews(prevReviews =>
          prevReviews.map(review =>
              review.id === reviewId ? updatedReview : review
          )
      );

      setCommentText(prev => ({ ...prev, [reviewId]: '' }));
  } catch (error) {
      console.error(error);
  }
};



  if (loading) return <p>Loading...</p>;

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
          <div className="flex-shrink-0 w-12 h-12">
            {review.user?.image ? (
              <Image 
                className="w-full h-full rounded-full object-cover border-2 border-gray-200"
                src={review.user.image}
                width={100}
                height={100}
                alt="Profile Image"
              />
            ) : (
              <Image 
                className="w-full h-full rounded-full object-cover border-2 border-gray-200"
                src="/img/profile.png"
                width={100}
                height={100}
                alt="Default Profile Image"
              />
            )}
          </div>

          {/* Review Content */}
          <div className="flex-1">
            <div className="mb-2">
              <p className="font-semibold text-gray-900">{review.user?.name || 'Anonymous'}</p>
            </div>
            <p className="text-gray-700 mb-4 leading-relaxed">{review.content}</p>

            {/* Reactions and Comment Button */}
            <div className="flex items-center gap-6">
              <Reaction 
                reviewId={review.id}
                emojis={review.emojis}
                likes={review.likes}
                fire={review.fire}
                onReact={handleReaction}
              />
              <button 
                onClick={() => toggleCommentVisibility(review.id)}
                className="text-sm text-gray-600 hover:text-blue-600 transition duration-200 flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                Comment
              </button>
            </div>

            {/* Comment Input */}
            {commentVisibility[review.id] && (
              <div className="mt-4 flex items-center gap-2">
                <input 
                  type="text"
                  value={commentText[review.id] || ''}
                  onChange={(e) => setCommentText(prev => ({ ...prev, [review.id]: e.target.value }))}
                  placeholder="Add a comment..."
                  className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition-all"
                />
                <button 
                  onClick={() => handleCommentSubmit(review.id, commentText[review.id])}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition duration-200"
                >
                  Post
                </button>
              </div>
            )}

            {/* Comments List */}
            {review.comments && review.comments.length > 0 && (
              <div className="mt-4 space-y-3 pl-12 border-l-2 border-gray-100">
                {review.comments.map(comment => (
                  <div key={comment.id} className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm text-gray-900">
                        {comment.user.name}
                      </span>
                      <span className="text-xs text-gray-500">•</span>
                    </div>
                    <p className="text-sm text-gray-700">{comment.comment}</p>
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
  );
};

export default Review;