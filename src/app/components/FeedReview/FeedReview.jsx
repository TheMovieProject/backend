"use client";

import useSWR from "swr";
import Image from "next/image";
import Link from "next/link";
import { Clock, MessageCircle, Heart, Flame } from "lucide-react";

const fetcher = (url) => fetch(url).then((res) => res.json());

const TrendingReviews = () => {
  const { data, error } = useSWR("/api/trending_reviews", fetcher, {
    refreshInterval: 60000, // Auto-refresh every 60 seconds
  });

  // Ensure `reviews` is an array or default to an empty array
  const reviews = Array.isArray(data) ? data : [];

  if (error) return <p className="text-red-500">Failed to load reviews.</p>;
  if (!data) return <p className="text-gray-400">Loading trending reviews...</p>;

  return (
    <div className="p-6 bg-gradient-to-br from-gray-900 to-black rounded-xl">
      <h2 className="text-2xl font-bold mb-8 text-white flex items-center gap-2 border-b border-gray-800 pb-4">
        <span className="bg-gradient-to-r from-orange-500 to-pink-500 text-transparent bg-clip-text">
          Trending Reviews
        </span>
      </h2>

      {/* Grid layout */}
      {reviews.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {reviews.slice(0, 9).map((review) => (
            <Link
              href={`/movies/${review.movie?.tmdbId || "#"}`}
              key={review.id}
              className="group flex flex-col bg-gray-800 rounded-xl overflow-hidden border border-gray-700 hover:border-gray-500 transition-all duration-300 hover:shadow-[0_0_15px_rgba(255,100,100,0.15)]"
            >
              {/* Movie Poster */}
              <div className="relative w-full aspect-square">
                <Image
                  src={review.movie?.posterUrl || "/img/NoImage.png"}
                  alt={review.movie?.title || "Movie Poster"}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-700"
                />
              </div>

              {/* User info */}
              <div className="flex items-center gap-3 p-4 border-b border-gray-700">
                <div className="relative w-8 h-8 rounded-full overflow-hidden border-2 border-pink-500">
                  <Image
                    src={review.user?.avatarUrl || "/placeholder.svg?height=32&width=32"}
                    alt={review.user?.name || "User"}
                    fill
                    className="object-cover"
                  />
                </div>
                <div>
                  <p className="text-white font-medium">{review.user?.name || "Anonymous"}</p>
                  <div className="flex items-center text-gray-400 text-xs">
                    <Clock className="w-3 h-3 mr-1" />
                    <span>{review.createdAt ? new Date(review.createdAt).toLocaleDateString() : "Recently"}</span>
                  </div>
                </div>
              </div>

              {/* Review Content */}
              <div className="p-4 flex-1 flex flex-col">
                <h3 className="text-lg font-bold text-white mb-2 line-clamp-2">
                  {review.movie?.title || "Untitled Movie"}
                </h3>
                <p className="text-gray-400 text-sm line-clamp-2 mb-4">
                  {review.content ? review.content.slice(0, 100) + "..." : "No review content available."}
                </p>

                {/* Engagement stats */}
                <div className="mt-auto flex justify-between text-sm border-t border-gray-700 pt-4">
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1 text-pink-400">
                      <Heart className="w-4 h-4" /> {review.likes || 0}
                    </span>
                    <span className="flex items-center gap-1 text-orange-400">
                      <Flame className="w-4 h-4" /> {review.fire || 0}
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1 text-blue-400">
                      <MessageCircle className="w-4 h-4" /> {review.reviewComments?.length || 0}
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <p className="text-gray-500 text-center">No trending reviews available.</p>
      )}
    </div>
  );
};

export default TrendingReviews;
