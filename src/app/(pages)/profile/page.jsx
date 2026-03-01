'use client';
import { useEffect, useState, useCallback, useMemo, lazy, Suspense } from 'react';
import { useSession } from 'next-auth/react';
import Image from 'next/image';
import { MdLocalMovies, MdArticle, MdClose } from "react-icons/md";
import Link from 'next/link';

const UserBlogs = lazy(() => import('@/app/components/UserBlogs/UserBlogs'));
const UserReviews = lazy(() => import('@/app/components/UserReviews/UserReviews'));
const EditProfile = lazy(() => import('@/app/components/EditProfile/EditProfile'));

const FollowList = ({ type, data, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center p-4 z-50">
      <div className="bg-white/10 backdrop-blur-lg rounded-2xl w-full max-w-md p-6 shadow-2xl border border-white/20">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-white">{type}</h3>
          <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-full text-white">
            <MdClose size={24} />
          </button>
        </div>
        <div className="max-h-96 overflow-y-auto">
          {data.length === 0 ? (
            <p className="text-center text-gray-300 py-4">No {type.toLowerCase()} yet</p>
          ) : (
            data.map((user) => (
              <Link
                href={`/profile/${user.id}`}
                key={user.id}
                onClick={onClose}
                className="flex items-center gap-3 p-3 hover:bg-white/10 rounded-lg transition-colors"
              >
                <Image
                  src={user.avatarUrl || user.image || '/img/profile.png'}
                  width={32}
                  height={32}
                  alt={user.username || 'Profile'}
                  className="w-8 h-8 rounded-full object-cover border border-white/30"
                />
                <div>
                  <p className="font-medium text-white">{user.username || user.email}</p>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

const LoadingSkeleton = () => (
  <div className="min-h-screen bg-gradient-to-br from-black via-yellow-700 to-yellow-900 p-6 pt-20">
    <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-4 gap-8">
      <div className="lg:col-span-1">
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20 animate-pulse">
          <div className="flex justify-center mb-4">
            <div className="w-24 h-24 rounded-full bg-gray-700/50 border-4 border-white/30"></div>
          </div>
          <div className="h-6 w-3/4 mx-auto bg-gray-700/50 rounded mb-4"></div>
          <div className="h-4 w-full bg-gray-700/50 rounded mb-6"></div>
          <div className="h-10 w-full bg-gray-700/50 rounded-lg mb-6"></div>
          <div className="space-y-3 mb-6">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="h-12 bg-gray-700/50 rounded-lg"></div>
            ))}
          </div>
          <div className="space-y-4">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="p-4 bg-gray-700/30 rounded-xl">
                <div className="h-4 w-1/3 bg-gray-600/50 rounded mb-3"></div>
                <div className="flex -space-x-2">
                  {[...Array(3)].map((_, idx) => (
                    <div key={idx} className="w-8 h-8 rounded-full bg-gray-600/50 border-2 border-white/30"></div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="lg:col-span-3">
        <div className="flex gap-4 mb-8">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="h-12 w-32 bg-gray-700/50 rounded-full"></div>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-64 bg-gray-700/30 rounded-2xl border border-white/10"></div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

const ErrorState = ({ message, onRetry }) => (
  <div className="min-h-screen bg-gradient-to-br from-yellow-900 via-yellow-700 to-yellow-900 flex items-center justify-center">
    <div className="text-center text-white">
      <h2 className="text-2xl font-bold mb-4">Oops! Something went wrong</h2>
      <p className="mb-6">{message}</p>
      <button
        onClick={onRetry}
        className="px-6 py-3 bg-white text-black rounded-lg font-medium hover:bg-gray-100 transition-colors mr-4"
      >
        Try Again
      </button>
      <Link
        href="/"
        className="px-6 py-3 bg-gray-800 text-white rounded-lg font-medium hover:bg-gray-700 transition-colors"
      >
        Go Back Home
      </Link>
    </div>
  </div>
);

export default function Page() {
  const { data: session, status } = useSession();

  const [profileData, setProfileData] = useState(null);
  const [activeTab, setActiveTab] = useState('reviews');
  const [profile, setProfile] = useState(false);
  const [showFollowers, setShowFollowers] = useState(false);
  const [showFollowing, setShowFollowing] = useState(false);
  const [followers, setFollowers] = useState([]);
  const [following, setFollowing] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hasLoaded, setHasLoaded] = useState(false);

  const memoizedUserData = useMemo(() => profileData?.user || null, [profileData]);
  const memoizedStats = useMemo(() => profileData?.stats || {}, [profileData]);
  const memoizedFollowers = useMemo(
    () => (followers.length ? followers : profileData?.followers?.preview || []),
    [followers, profileData]
  );
  const memoizedFollowing = useMemo(
    () => (following.length ? following : profileData?.following?.preview || []),
    [following, profileData]
  );

  const fetchProfileData = useCallback(async () => {
    if (!session?.user?.id) return null;

    try {
      const response = await fetch(`/api/profile/${session.user.id}`, { cache: 'no-store' });
      if (!response.ok) throw new Error('Failed to fetch profile data');
      const data = await response.json();
      setProfileData(data);
      setFollowers(data?.followers?.preview || []);
      setFollowing(data?.following?.preview || []);
      return data;
    } catch (err) {
      console.error('Error fetching profile data:', err);
      throw err;
    }
  }, [session?.user?.id]);

  const fetchConnections = useCallback(
    async (type) => {
      if (!session?.user?.id) return;
      const response = await fetch(`/api/user/${session.user.id}/${type}?limit=50`, {
        cache: 'no-store',
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch ${type}`);
      }
      const data = await response.json();
      if (type === 'followers') {
        setFollowers(data.followersList || []);
      } else {
        setFollowing(data.followingList || []);
      }
    },
    [session?.user?.id]
  );

  useEffect(() => {
    const loadData = async () => {
      if (status === 'authenticated' && session?.user?.id) {
        setLoading(true);
        setError(null);

        try {
          await fetchProfileData();
          setHasLoaded(true);
        } catch (err) {
          setError(err.message || 'Failed to load profile data');
          console.error('Error loading profile data:', err);
        } finally {
          setLoading(false);
        }
      } else if (status === 'unauthenticated') {
        setLoading(false);
        setError('Please log in to view this page');
      } else if (status === 'loading') {
        setLoading(true);
      }
    };

    loadData();
  }, [status, session?.user?.id, fetchProfileData]);

  const openFollowers = async () => {
    setShowFollowers(true);
    if ((profileData?.followers?.count || 0) > memoizedFollowers.length) {
      try {
        await fetchConnections('followers');
      } catch (err) {
        console.error(err);
      }
    }
  };

  const openFollowing = async () => {
    setShowFollowing(true);
    if ((profileData?.following?.count || 0) > memoizedFollowing.length) {
      try {
        await fetchConnections('following');
      } catch (err) {
        console.error(err);
      }
    }
  };

  const retryProfileLoad = async () => {
    setError(null);
    setLoading(true);
    try {
      await fetchProfileData();
      setHasLoaded(true);
    } catch (err) {
      setError(err.message || 'Failed to load profile data');
    } finally {
      setLoading(false);
    }
  };

  if (status === 'unauthenticated' || error === 'Please log in to view this page') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-yellow-700 to-yellow-900 flex items-center justify-center">
        <div className="text-center text-white p-8 bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20">
          <h2 className="text-2xl font-bold mb-4">Authentication Required</h2>
          <p className="mb-6">Please log in to view your profile.</p>
          <Link
            href="/login"
            className="px-6 py-3 bg-white text-black rounded-lg font-medium hover:bg-gray-100 transition-colors"
          >
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  if ((loading && !hasLoaded) || status === 'loading') {
    return <LoadingSkeleton />;
  }

  if (error && !loading) {
    return <ErrorState message={error} onRetry={() => void retryProfileLoad()} />;
  }

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-black via-yellow-700 to-yellow-900 p-6 pt-20 font-sans">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-4 gap-8">
          <div className="lg:col-span-1">
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20 sticky top-6 shadow-2xl">
              <div className="text-center mb-6">
                <div className="relative inline-block mb-4">
                  <Image
                    className="rounded-full w-24 h-24 object-cover border-4 border-white/30 shadow-2xl"
                    src={memoizedUserData?.avatarUrl || memoizedUserData?.image || '/img/profile.png'}
                    width={96}
                    height={96}
                    alt="Profile Image"
                    priority
                  />
                </div>

                <h2 className="text-xl font-bold text-white mb-2">
                  {memoizedUserData?.username || session?.user?.email}
                </h2>

                <p className="text-gray-200 text-sm mb-4">
                  {memoizedUserData?.bio || 'Share your story with the world...'}
                </p>

                {memoizedUserData?.movieGenres?.length > 0 && (
                  <div className='flex flex-wrap justify-center gap-2 mb-4'>
                    {memoizedUserData.movieGenres.map((item, index) => (
                      <span
                        key={index}
                        className="px-2 py-1 bg-white/20 text-white rounded-full text-xs border border-white/30 font-medium"
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                )}

                <button
                  onClick={() => setProfile(true)}
                  className="w-full bg-white/20 hover:bg-white/30 text-white font-semibold py-2 rounded-lg transition-all border border-white/30 hover:border-white/40"
                >
                  Edit Profile
                </button>
              </div>

              <div className="space-y-3 mb-6">
                <div className="flex justify-between items-center p-3 bg-white/10 rounded-lg border border-white/20">
                  <span className="text-gray-200">Blogs</span>
                  <span className="text-white font-bold">{memoizedStats.blogCount || 0}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-white/10 rounded-lg border border-white/20">
                  <span className="text-gray-200">Reviews</span>
                  <span className="text-white font-bold">{memoizedStats.reviewCount || 0}</span>
                </div>
              </div>

              <div className="space-y-4">
                <div
                  className="p-4 bg-white/10 rounded-xl border border-white/20 hover:border-white/40 cursor-pointer transition-colors"
                  onClick={() => void openFollowers()}
                >
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-gray-200">Followers</span>
                    <span className="text-white font-bold">{memoizedStats.followerCounts || 0}</span>
                  </div>
                  <div className="flex -space-x-2">
                    {memoizedFollowers.slice(0, 5).map((follower, index) => (
                      <Image
                        key={follower.id}
                        src={follower.avatarUrl || follower.image || '/img/profile.png'}
                        width={32}
                        height={32}
                        alt={follower.username}
                        className="w-8 h-8 rounded-full border-2 border-white/30 object-cover"
                        style={{ zIndex: 5 - index }}
                      />
                    ))}
                    {memoizedStats.followerCounts > 5 && (
                      <div className="w-8 h-8 rounded-full bg-white/20 border-2 border-white/30 flex items-center justify-center text-xs text-white font-bold">
                        +{memoizedStats.followerCounts - 5}
                      </div>
                    )}
                  </div>
                </div>

                <div
                  className="p-4 bg-white/10 rounded-xl border border-white/20 hover:border-white/40 cursor-pointer transition-colors"
                  onClick={() => void openFollowing()}
                >
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-gray-200">Following</span>
                    <span className="text-white font-bold">{memoizedStats.followingCounts || 0}</span>
                  </div>
                  <div className="flex -space-x-2">
                    {memoizedFollowing.slice(0, 5).map((follow, index) => (
                      <Image
                        key={follow.id}
                        src={follow.avatarUrl || follow.image || '/img/profile.png'}
                        width={32}
                        height={32}
                        alt={follow.username}
                        className="w-8 h-8 rounded-full border-2 border-white/30 object-cover"
                        style={{ zIndex: 5 - index }}
                      />
                    ))}
                    {memoizedStats.followingCounts > 5 && (
                      <div className="w-8 h-8 rounded-full bg-white/20 border-2 border-white/30 flex items-center justify-center text-xs text-white font-bold">
                        +{memoizedStats.followingCounts - 5}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-3">
            <div className="flex gap-4 mb-8">
              <button
                onClick={() => setActiveTab('reviews')}
                className={`flex items-center gap-2 px-6 py-3 rounded-full transition-all border ${
                  activeTab === 'reviews'
                    ? 'bg-white text-black border-white shadow-lg font-medium'
                    : 'bg-transparent text-white border-white/30 hover:border-white/60 hover:bg-white/10'
                }`}
              >
                <MdLocalMovies size={20} />
                <span className="font-medium">Reviews</span>
              </button>
              <button
                onClick={() => setActiveTab('blogs')}
                className={`flex items-center gap-2 px-6 py-3 rounded-full transition-all border ${
                  activeTab === 'blogs'
                    ? 'bg-white text-black border-white shadow-lg font-medium'
                    : 'bg-transparent text-white border-white/30 hover:border-white/60 hover:bg-white/10'
                }`}
              >
                <MdArticle size={20} />
                <span className="font-medium">Stories</span>
              </button>
            </div>

            <div className="bg-transparent rounded-2xl">
              <Suspense
                fallback={
                  <div className="flex justify-center items-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
                  </div>
                }
              >
                {activeTab === 'blogs' ? <UserBlogs /> : <UserReviews />}
              </Suspense>
            </div>
          </div>
        </div>
      </div>

      <Suspense fallback={null}>
        {profile && (
          <div className='fixed inset-0 bg-black/90 p-3 z-50'>
            <EditProfile
              userId={session?.user?.id}
              setProfile={setProfile}
              onSuccess={() => {
                void fetchProfileData();
              }}
            />
          </div>
        )}
      </Suspense>

      {showFollowers && (
        <FollowList
          type="Followers"
          data={memoizedFollowers}
          onClose={() => setShowFollowers(false)}
        />
      )}

      {showFollowing && (
        <FollowList
          type="Following"
          data={memoizedFollowing}
          onClose={() => setShowFollowing(false)}
        />
      )}
    </>
  );
}
