'use client';
import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { MdOutlineRateReview, MdClose } from "react-icons/md";
import { LiaBlogger } from "react-icons/lia";
import { useSession } from 'next-auth/react';
import toast from 'react-hot-toast';
import UserBlogs from '@/app/components/UserBlogs/UserBlogs';
import UserReviews from '@/app/components/UserReviews/UserReviews';
import EditProfile from '@/app/components/EditProfile/EditProfile';

const FollowList = ({ type, data, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg w-full max-w-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold">{type}</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full">
            <MdClose size={24} />
          </button>
        </div>
        <div className="max-h-96 overflow-y-auto">
          {!data || data.length === 0 ? (
            <p className="text-center text-gray-500 py-4">No {type.toLowerCase()} yet</p>
          ) : (
            data.map((user) => (
              <Link 
                href={`/profile/${user.id}`} 
                key={user.id}
                onClick={onClose}
                className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg"
              >
                <Image
                  src={user.avatarUrl || user.image || '/img/profile.png'}
                  width={40}
                  height={40}
                  alt={user.username || 'Profile'}
                  className="rounded-full"
                />
                <div>
                  <p className="font-medium">{user.username || user.email}</p>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default function UserProfilePage({ params }) {
  const { data: session, status } = useSession();
  const [userData, setUserData] = useState(null);
  const [component, setComponent] = useState('reviews');
  const [reviewCount, setReviewCount] = useState(0);
  const [blogCount, setBlogCount] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [followers, setFollowers] = useState([]);
  const [following, setFollowing] = useState([]);
  const [showFollowers, setShowFollowers] = useState(false);
  const [showFollowing, setShowFollowing] = useState(false);
  const [profile, setProfile] = useState(false);

  const { id } = params;
  const isOwnProfile = session?.user?.id === id;

  const fetchUserData = async () => {
    try {
      const response = await fetch(`/api/user/${id}`);
      if (!response.ok) throw new Error('Failed to fetch user data');
      const data = await response.json();
      setUserData(data);
    } catch (err) {
      console.error('Error fetching user data:', err);
      toast.error('Failed to load user data');
    }
  };

  const fetchReviewCount = async () => {
    try {
      const response = await fetch(`/api/review?userId=${id}`);
      if (!response.ok) throw new Error('Failed to fetch review count');
      const data = await response.json();
      setReviewCount(data.length);
    } catch (err) {
      console.error('Error fetching review count:', err);
    }
  };

  const fetchBlogCount = async () => {
    try {
      const response = await fetch(`/api/blog?userId=${id}`);
      if (!response.ok) throw new Error('Failed to fetch blog count');
      const data = await response.json();
      setBlogCount(data.length);
    } catch (err) {
      console.error('Error fetching blog count:', err);
    }
  };

  const fetchFollowData = async () => {
    try {
      const [followersRes, followingRes, statusRes] = await Promise.all([
        fetch(`/api/user/${id}/followers`),
        fetch(`/api/user/${id}/following`),
        !isOwnProfile ? fetch(`/api/follow/${id}`) : Promise.resolve(null)
      ]);
      
      const followersData = await followersRes.json();
      const followingData = await followingRes.json();
      
      setFollowerCount(followersData.followers);
      setFollowingCount(followingData.following);
      setFollowers(followersData.followersList || []);
      setFollowing(followingData.followingList || []);
      
      if (!isOwnProfile && statusRes) {
        const statusData = await statusRes.json();
        setIsFollowing(statusData.isFollowing);
      }
    } catch (error) {
      console.error('Error fetching follow data:', error);
    }
  };

  const handleFollow = async () => {
    if (!session) {
      toast.error('Please login to follow users');
      return;
    }
  
    try {
      const method = isFollowing ? 'DELETE' : 'POST';
      const response = await fetch('/api/follow', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserId: id })
      });
  
      if (!response.ok) throw new Error('Failed to update follow status');
  
      // If we're following (not unfollowing), create a notification
      if (!isFollowing) {
        await fetch('/api/notifications', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'FOLLOW',
            toUserId: id,
          })
        });
      }
  
      setIsFollowing(!isFollowing);
      await fetchFollowData();
      toast.success(isFollowing ? 'Unfollowed successfully' : 'Followed successfully');
    } catch (error) {
      console.error('Error updating follow status:', error);
      toast.error('Something went wrong');
    }
  };

  useEffect(() => {
    if (id && status !== 'loading') {
      Promise.all([
        fetchUserData(),
        fetchReviewCount(),
        fetchBlogCount(),
        fetchFollowData()
      ]);
    }
  }, [id, status]);

  if (status === 'loading' || !userData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-lg text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <div className="flex flex-col md:flex-row items-center gap-6 md:gap-8">
            <div className="shrink-0">
              <Image
                className="rounded-full w-[10rem] h-[10rem] object-cover ring-4 ring-blue-100 transition duration-300 hover:ring-blue-200"
                src={userData.avatarUrl || userData.image || '/img/profile.png'}
                width={120}
                height={120}
                alt="Profile Image"
              />
            </div>

            <div className="flex-1 w-full">
              <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
                <div className='flex flex-col'>
                  <h2 className="text-2xl font-bold text-gray-900 text-center md:text-left mb-4 md:mb-0">
                    {userData.username || userData.email}
                  </h2>
                  <h3 className="text-gray-600">{userData.bio || ""}</h3>
                  {userData.movieGenres?.length > 0 && (
                    <div className='flex flex-wrap gap-2 mt-2'>
                      <span className="text-gray-600">Fav genres:</span>
                      {userData.movieGenres.map((genre, index) => (
                        <span 
                          key={index}
                          className="bg-gray-100 text-gray-700 px-2 py-1 rounded-full text-sm"
                        >
                          {genre}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                {isOwnProfile ? (
                  <button 
                    onClick={() => setProfile(true)}
                    className="bg-blue-500 hover:bg-blue-600 text-white font-semibold px-6 py-2 rounded-lg transition-colors shadow-md hover:shadow-lg"
                  >
                    Edit Profile
                  </button>
                ) : session && (
                  <button
                    onClick={handleFollow}
                    className={`font-semibold px-8 py-2.5 rounded-lg transition-colors shadow-md hover:shadow-lg
                      ${isFollowing 
                        ? 'bg-gray-200 hover:bg-gray-300 text-gray-800' 
                        : 'bg-blue-600 hover:bg-blue-700 text-white'}`
                    }
                  >
                    {isFollowing ? 'Unfollow' : 'Follow'}
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <button 
                  onClick={() => setComponent('blogs')}
                  className="bg-gray-50 rounded-lg p-4 text-center hover:bg-gray-100 transition-colors"
                >
                  <p className="text-2xl font-bold text-gray-900">{blogCount}</p>
                  <p className="text-sm text-gray-600 font-medium">Blogs</p>
                </button>
                <button 
                  onClick={() => setComponent('reviews')}
                  className="bg-gray-50 rounded-lg p-4 text-center hover:bg-gray-100 transition-colors"
                >
                  <p className="text-2xl font-bold text-gray-900">{reviewCount}</p>
                  <p className="text-sm text-gray-600 font-medium">Reviews</p>
                </button>
                <button 
                  onClick={() => isOwnProfile || isFollowing ? setShowFollowers(true) : toast.error('Follow to see followers')}
                  className="bg-gray-50 rounded-lg p-4 text-center hover:bg-gray-100 transition-colors"
                >
                  <p className="text-2xl font-bold text-gray-900">{followerCount}</p>
                  <p className="text-sm text-gray-600 font-medium">Followers</p>
                </button>
                <button 
                  onClick={() => isOwnProfile || isFollowing ? setShowFollowing(true) : toast.error('Follow to see following')}
                  className="bg-gray-50 rounded-lg p-4 text-center hover:bg-gray-100 transition-colors"
                >
                  <p className="text-2xl font-bold text-gray-900">{followingCount}</p>
                  <p className="text-sm text-gray-600 font-medium">Following</p>
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-center mb-8">
          <div className="bg-gradient-to-r from-red-500 to-red-600 rounded-lg p-1.5 flex gap-3">
            <button
              onClick={() => setComponent('reviews')}
              className={`flex flex-col items-center px-6 py-3 rounded-lg transition-all ${
                component === 'reviews'
                  ? 'bg-white text-red-500 shadow-md'
                  : 'text-white hover:bg-white/10'
              }`}
            >
              <MdOutlineRateReview size={24} />
              <span className="mt-1 font-medium">Review</span>
            </button>
            <button
              onClick={() => setComponent('blogs')}
              className={`flex flex-col items-center px-6 py-3 rounded-lg transition-all ${
                component === 'blogs'
                  ? 'bg-white text-red-500 shadow-md'
                  : 'text-white hover:bg-white/10'
              }`}
            >
              <LiaBlogger size={24} />
              <span className="mt-1 font-medium">Blog</span>
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6">
          {component === 'blogs' ? <UserBlogs id={id} /> : <UserReviews id={id} />}
        </div>
      </div>

      {profile && (
        <div className='fixed inset-0 bg-black/80 p-3 z-50'>
          <EditProfile userId={id} setProfile={setProfile} />
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