'use client';
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import Image from 'next/image';
import { MdLocalMovies, MdArticle, MdClose } from "react-icons/md";
import Link from 'next/link';
import UserBlogs from '@/app/components/UserBlogs/UserBlogs';
import UserReviews from '@/app/components/UserReviews/UserReviews';
import EditProfile from '@/app/components/EditProfile/EditProfile';

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

// Polaroid-style Review Card Component
const ReviewCard = ({ review }) => {
  return (
    <div className="bg-white rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 p-4 border border-gray-200">
      <div className="aspect-[3/4] bg-gradient-to-br from-yellow-400 to-orange-500 rounded-md mb-3 overflow-hidden flex items-center justify-center">
        <div className="text-center text-white p-4">
          <h3 className="font-bold text-lg mb-2 line-clamp-2">{review.movieTitle}</h3>
          <p className="text-sm opacity-90">Reviewed on {new Date(review.createdAt).toLocaleDateString()}</p>
        </div>
      </div>
      <div className="text-center">
        <p className="text-gray-500 text-xs">
          {review.rating}/10 ⭐
        </p>
      </div>
    </div>
  );
};

export default function Page() {
  const { data: session, status } = useSession();
  const [userData, setUserData] = useState(null);
  const [activeTab, setActiveTab] = useState('reviews');
  const [reviewCount, setReviewCount] = useState(0);
  const [blogCount, setBlogCount] = useState(0);
  const [profile, setProfile] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [showFollowers, setShowFollowers] = useState(false);
  const [showFollowing, setShowFollowing] = useState(false);
  const [followers, setFollowers] = useState([]);
  const [following, setFollowing] = useState([]);
  const [reviews, setReviews] = useState([]);

  const fetchReviews = async () => {
    if (status !== 'authenticated' || !session?.user?.email) return;
    try {
      const response = await fetch(`/api/review?userId=${session.user.id}`);
      if (!response.ok) throw new Error('Failed to fetch reviews');
      const data = await response.json();
      setReviews(data);
      setReviewCount(data.length);
    } catch (err) {
      console.error('Error fetching reviews:', err);
    }
  };

  const fetchBlogCount = async () => {
    if (status !== 'authenticated' || !session?.user?.email) return;
    try {
      const response = await fetch(`/api/blog?userEmail=${session.user.email}`);
      if (!response.ok) throw new Error('Failed to fetch blog count');
      const data = await response.json();
      setBlogCount(data.length);
    } catch (err) {
      console.error('Error fetching blog count:', err);
    }
  };

  const fetchUserData = async () => {
    try {
      const response = await fetch(`/api/user/${session?.user?.id}`);
      if (!response.ok) throw new Error('Failed to fetch user data');
      const data = await response.json();
      setUserData(data);
    } catch (err) {
      console.error('Error fetching user data:', err);
    }
  };

  const fetchFollowData = async () => {
    if (!session?.user?.id) return;
    try {
      const [followersRes, followingRes] = await Promise.all([
        fetch(`/api/user/${session.user.id}/followers`),
        fetch(`/api/user/${session.user.id}/following`)
      ]);
      
      const followersData = await followersRes.json();
      const followingData = await followingRes.json();
      
      setFollowerCount(followersData.followers);
      setFollowingCount(followingData.following);
      setFollowers(followersData.followersList || []);
      setFollowing(followingData.followingList || []);
    } catch (error) {
      console.error('Error fetching follow data:', error);
    }
  };

  useEffect(() => {
    if (status === 'authenticated' && session?.user?.email) {
      Promise.all([
        fetchBlogCount(),
        fetchReviews(),
        fetchUserData(),
        fetchFollowData()
      ]);
    }
  }, [status, session?.user?.email]);

  if (status === 'unauthenticated') {
    return <div className="text-center p-4 text-white font-sans">Please log in to view this page.</div>;
  }

  if (status === 'loading') {
    return (
      <div className="flex justify-center items-center p-4 min-h-screen bg-gradient-to-br from-black via-yellow-700 to-yellow-900">
        <div className="text-white font-sans">Loading...</div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-black via-yellow-700 to-yellow-900 p-6 pt-20 font-sans">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-4 gap-8">
          
          {/* Left Sidebar - Glassmorphism Profile Section */}
          <div className="lg:col-span-1">
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20 sticky top-6 shadow-2xl">
              {/* Profile Header */}
              <div className="text-center mb-6">
                <div className="relative inline-block mb-4">
                  {userData ? (
                    <Image
                      className="rounded-full w-24 h-24 object-cover border-4 border-white/30 shadow-2xl"
                      src={userData.avatarUrl || userData.image}
                      width={96}
                      height={96}
                      alt="Profile Image"
                    />
                  ) : (
                    <Image
                      className="rounded-full w-24 h-24 object-cover border-4 border-white/30 shadow-2xl"
                      src="/img/profile.png"
                      width={96}
                      height={96}
                      alt="Profile Image"
                    />
                  )}
                </div>
                
                <h2 className="text-xl font-bold text-white mb-2">
                  {userData ? userData.username : session?.user?.email}
                </h2>
                
                <p className="text-gray-200 text-sm mb-4">
                  {userData?.bio || 'Share your story with the world...'}
                </p>

                {userData && userData.movieGenres.length > 0 && (
                  <div className='flex flex-wrap justify-center gap-2 mb-4'>
                    {userData.movieGenres.map((item, index) => (
                      <span key={index} className="px-2 py-1 bg-white/20 text-white rounded-full text-xs border border-white/30 font-medium">
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

              {/* Stats */}
              <div className="space-y-3 mb-6">
                <div className="flex justify-between items-center p-3 bg-white/10 rounded-lg border border-white/20">
                  <span className="text-gray-200">Blogs</span>
                  <span className="text-white font-bold">{blogCount}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-white/10 rounded-lg border border-white/20">
                  <span className="text-gray-200">Reviews</span>
                  <span className="text-white font-bold">{reviewCount}</span>
                </div>
              </div>

              {/* Follow Section */}
              <div className="space-y-4">
                {/* Followers */}
                <div 
                  className="p-4 bg-white/10 rounded-xl border border-white/20 hover:border-white/40 cursor-pointer transition-colors"
                  onClick={() => setShowFollowers(true)}
                >
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-gray-200">Followers</span>
                    <span className="text-white font-bold">{followerCount}</span>
                  </div>
                  <div className="flex -space-x-2">
                    {followers.slice(0, 5).map((follower, index) => (
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
                    {followers.length > 5 && (
                      <div className="w-8 h-8 rounded-full bg-white/20 border-2 border-white/30 flex items-center justify-center text-xs text-white font-bold">
                        +{followers.length - 5}
                      </div>
                    )}
                  </div>
                </div>

                {/* Following */}
                <div 
                  className="p-4 bg-white/10 rounded-xl border border-white/20 hover:border-white/40 cursor-pointer transition-colors"
                  onClick={() => setShowFollowing(true)}
                >
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-gray-200">Following</span>
                    <span className="text-white font-bold">{followingCount}</span>
                  </div>
                  <div className="flex -space-x-2">
                    {following.slice(0, 5).map((follow, index) => (
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
                    {following.length > 5 && (
                      <div className="w-8 h-8 rounded-full bg-white/20 border-2 border-white/30 flex items-center justify-center text-xs text-white font-bold">
                        +{following.length - 5}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Content - Polaroid Review Grid */}
          <div className="lg:col-span-3">
            {/* Sleek Tab Navigation */}
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

            {/* Content Area */}
            {activeTab === 'blogs' ? (
              <UserBlogs />
            ) : (
            <UserReviews/>
            )}
          </div>
        </div>
      </div>

      {profile && (
        <div className='fixed inset-0 bg-black/90 p-3 z-50'>
          <EditProfile userId={session.user.id} setProfile={setProfile}/>
        </div>
      )}

      {showFollowers && (
        <FollowList 
          type="Followers" 
          data={followers}
          onClose={() => setShowFollowers(false)} 
        />
      )}
      
      {showFollowing && (
        <FollowList 
          type="Following" 
          data={following}
          onClose={() => setShowFollowing(false)} 
        />
      )}
    </>
  );
}