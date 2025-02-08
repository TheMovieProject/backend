'use client';
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import Image from 'next/image';
import Link from 'next/link';
import { MdOutlineRateReview } from "react-icons/md";
import { LiaBlogger } from "react-icons/lia";
import { formatDistanceToNow, subHours, isAfter } from 'date-fns';

const TMDB_API_KEY = '095ba7f7fba6c8e94aa5f385a319cea7';
const REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes
const ACTIVITY_LIMIT = 50;

const FollowerActivity = () => {
  const { data: session, status } = useSession();
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchMovieInfo = async (movieId) => {
    try {
      const response = await fetch(
        `https://api.themoviedb.org/3/movie/${movieId}?api_key=${TMDB_API_KEY}&language=en-US`
      );
      if (!response.ok) throw new Error('Failed to fetch movie info');
      const movieData = await response.json();
      return movieData;
    } catch (error) {
      console.error(`Error fetching movie info for ${movieId}:`, error);
      return null;
    }
  };

  const fetchFollowersActivities = async () => {
    try {
      if (!session?.user?.id) return;
      setError(null);

      const followersRes = await fetch(`/api/user/${session.user.id}/followers`);
      if (!followersRes.ok) throw new Error('Failed to fetch followers');
      const followersData = await followersRes.json();
      const followersList = followersData.followersList || [];

      const activitiesPromises = followersList.map(async (follower) => {
        try {
          const [reviewsRes, blogsRes] = await Promise.all([
            fetch(`/api/review?userId=${follower.id}&limit=10`),
            fetch(`/api/blog?userEmail=${follower.email}&limit=10`)
          ]);

          const [reviews, blogs] = await Promise.all([
            reviewsRes.ok ? reviewsRes.json() : [],
            blogsRes.ok ? blogsRes.json() : []
          ]);

          // Fetch movie info for each review
          const reviewActivities = await Promise.all(
            reviews.map(async (review) => {
              const movieInfo = review.movie?.tmdbId ? 
                await fetchMovieInfo(review.movie.tmdbId) : null;

              return {
                type: 'review',
                user: follower,
                data: {
                  ...review,
                  movieInfo
                },
                createdAt: review.createdAt,
                title: movieInfo?.title || review.title || 'Review',
                link: `/movies/${review.movie?.tmdbId || ''}`,
                posterPath: movieInfo?.poster_path ? 
                  `https://image.tmdb.org/t/p/w500${movieInfo.poster_path}` : 
                  '/img/NoImage.png'
              };
            })
          );

          const blogActivities = blogs.map(blog => ({
            type: 'blog',
            user: follower,
            data: blog,
            createdAt: blog.createdAt,
            title: blog.title,
            link: `/blog/${blog.id}`,
            posterPath: blog.thumbnail || '/img/NoImage.png'
          }));

          return [...reviewActivities, ...blogActivities];
        } catch (error) {
          console.error(`Error fetching activities for follower ${follower.id}:`, error);
          return [];
        }
      });

      const allActivities = await Promise.all(activitiesPromises);
      
      const twentyFourHoursAgo = subHours(new Date(), 24);

      const sortedActivities = allActivities
        .flat()
        .filter(activity => {
          if (!activity?.createdAt) return false;
          const activityDate = new Date(activity.createdAt);
          return isAfter(activityDate, twentyFourHoursAgo);
        })
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, ACTIVITY_LIMIT);

      setActivities(sortedActivities);
    } catch (error) {
      console.error('Error fetching follower activities:', error);
      setError('Failed to load activities. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === 'authenticated' && session?.user?.id) {
      fetchFollowersActivities();
      
      const refreshInterval = setInterval(fetchFollowersActivities, REFRESH_INTERVAL);
      return () => clearInterval(refreshInterval);
    }
  }, [status, session]);

  if (status === 'loading' || loading) {
    return (
      <div className="p-4 text-center text-white">
        <p>Loading your feed...</p>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return (
      <div className="p-4 text-center text-white">
        <p className="text-gray-300">Please sign in to view follower activities</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-center text-white">
        <p className="text-red-400">{error}</p>
      </div>
    );
  }

  if (!activities.length) {
    return (
      <div className="p-4 text-center text-white">
        <p className="text-gray-300">No activity from your followers in the past 24 hours</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 p-4">
      <h2 className="text-xl font-bold mb-4 text-white">Recent Activity By Your Friends</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {activities.map((activity, index) => (
          <div 
            key={`${activity.type}-${activity.data.id}-${index}`}
            className="bg-gray-800 rounded-lg shadow p-4 hover:bg-gray-700 transition-colors"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="relative w-10 h-10 bg-transparent">
                <Image
                  src={activity.user.avatarUrl || activity.user.image || '/img/profile.png'}
                  fill
                  sizes="40px"
                  alt={activity.user.username || 'Profile'}
                  className="rounded-full object-cover"
                  onError={(e) => {
                    e.currentTarget.src = '/img/profile.png';
                  }}
                />
              </div>
              <div className="flex-1">
                <Link 
                  href={`/profile/${activity.user.id}`}
                  className="font-medium text-white hover:underline"
                >
                  {activity.user.username || activity.user.email}
                </Link>
                <p className="text-sm text-gray-400">
                  {formatDistanceToNow(new Date(activity.createdAt))} ago
                </p>
              </div>
              {activity.type === 'review' ? (
                <MdOutlineRateReview className="text-blue-400" size={24} />
              ) : (
                <LiaBlogger className="text-green-400" size={24} />
              )}
            </div>
            
            <Link href={activity.link} className="block hover:bg-gray-600 rounded-lg p-2">
              {activity.type === 'review' ? (
                <>
                  <h3 className="font-medium text-white mb-2">
                    Reviewed: {activity.title}
                  </h3>
                  <p className="text-sm text-gray-300 mb-3">
                    {activity.data.content}
                  </p>
                  <div className="relative w-full h-48">
                    <Image
                      src={activity.posterPath}
                      fill
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      alt={`Poster for ${activity.title}`}
                      className="rounded-lg object-cover"
                      onError={(e) => {
                        e.currentTarget.src = '/img/NoImage.png';
                      }}
                    />
                  </div>
                </>
              ) : (
                <>
                  <h3 className="font-medium text-white mb-2">
                    Posted: {activity.title}
                  </h3>
                  <div className="relative w-full h-48">
                    <Image
                      src={activity.posterPath}
                      fill
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      alt={`Thumbnail for ${activity.title}`}
                      className="rounded-lg object-cover"
                      onError={(e) => {
                        e.currentTarget.src = '/img/NoImage.png';
                      }}
                    />
                  </div>
                </>
              )}
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FollowerActivity;