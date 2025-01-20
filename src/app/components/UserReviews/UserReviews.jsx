'use client';
import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Image from 'next/image';
const UserReviews = ({id}) => {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { data: session, status } = useSession();

  useEffect(() => {
    const fetchUserReviews = async () => {
      if (status !== 'authenticated' || !session?.user?.email) {
        setLoading(false);
        return;
      }
      try {
        const response = id ? await fetch(`/api/review?userId=${id}`) : await fetch(`/api/review?userEmail=${session?.user?.email}`) ;
        if (!response.ok) throw new Error('Failed to fetch reviews');
        const data = await response.json();
        console.log(data)
        setReviews(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    // console.log(reviews[0].movie.posterUrl)

    fetchUserReviews();
  }, [session, status]);

  if (status === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <p className="text-gray-500">Loading your reviews...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <p className="text-red-500">Error: {error}</p>
      </div>
    );
  }
  

  return (
    <div className="space-y-6 p-4">
      <h1 className="text-2xl font-bold mb-6">Your Movie Reviews</h1>
      
      {reviews.length === 0 ? (
        <p className="text-gray-500">You havent written any reviews yet.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {reviews.map((review) => (
            <div key={review.id} className="flex flex-col bg-white rounded-lg shadow-md p-4">
              {/* Movie Poster */}
              { review.movie.posterUrl?
              <Image
                src={review.movie.posterUrl}
                alt={review.movie.title}
                className="w-full h-48 object-cover rounded-md mb-4"
                width={200}
                height={200}
              />:
              <Image
              src='/img/NoImage.jpg'
              alt='no image'
              width={200}
              height={200}
              />
            }
              
              {/* Movie Title */}
              <h3 className="text-lg font-semibold mb-2">{review.movie.title}</h3>
              
              {/* Review Date */}
              <p className="text-sm text-gray-500 mb-2">
                Reviewed on: {new Date(review.createdAt).toLocaleDateString()}
              </p>
              
              {/* Review Content */}
              <p className="text-gray-700">{review.content}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default UserReviews;

