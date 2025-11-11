'use client';
import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { MdLocalMovies, MdArticle, MdClose, MdEdit } from "react-icons/md";
import { useSession } from 'next-auth/react';
import toast from 'react-hot-toast'; 
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
          {!data || data.length === 0 ? (
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

export default function UserProfilePage({ params }) {
  const { data: session, status } = useSession();
  const [userData, setUserData] = useState(null);
  const [activeTab, setActiveTab] = useState('reviews');
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
      if (!userData?.email) {
        console.log('Waiting for user email data...');
        return;
      }
  
      const response = await fetch(`/api/blog?userEmail=${userData.email}`);
      if (!response.ok) throw new Error('Failed to fetch blog count'); 
      const data = await response.json();
      setBlogCount(data.length);
    } catch (err) {
      console.error('Error fetching blog count:', err);
      toast.error('Failed to load blog count');
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
        fetchFollowData()
      ]);
    }
  }, [id, status]);

  useEffect(() => {
    if (userData?.email) {
      fetchBlogCount();
    }
  }, [userData]);

  if (status === 'loading' || !userData) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-yellow-900 via-yellow-500 to-yellow-600">
        <div className="text-center">
          <p className="text-lg text-white">Loading profile...</p>
        </div>
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
                  <Image
                    className="rounded-full w-24 h-24 object-cover border-4 border-white/30 shadow-2xl"
                    src={userData.avatarUrl || userData.image || '/img/profile.png'}
                    width={96}
                    height={96}
                    alt="Profile Image"
                  />
                </div>
                
                <h2 className="text-xl font-bold text-white mb-2">
                  {userData.username || userData.email}
                </h2>
                
                <p className="text-gray-200 text-sm mb-4">
                  {userData.bio || "Share your cinematic journey..."}
                </p>

                {userData.movieGenres?.length > 0 && (
                  <div className='flex flex-wrap justify-center gap-2 mb-4'>
                    {userData.movieGenres.map((genre, index) => (
                      <span 
                        key={index}
                        className="px-2 py-1 bg-white/20 text-white rounded-full text-xs border border-white/30 font-medium"
                      >
                        {genre}
                      </span>
                    ))}
                  </div>
                )}

                {isOwnProfile ? (
                  <button 
                    onClick={() => setProfile(true)}
                    className="w-full bg-white/20 hover:bg-white/30 text-white font-semibold py-2 rounded-lg transition-all border border-white/30 hover:border-white/40 flex items-center justify-center gap-2"
                  >
                    <MdEdit size={18} />
                    Edit Profile
                  </button>
                ) : session && (
                  <button
                    onClick={handleFollow}
                    className={`w-full font-semibold py-2 rounded-lg transition-all border flex items-center justify-center gap-2
                      ${isFollowing 
                        ? 'bg-white/10 hover:bg-white/20 text-white border-white/30' 
                        : 'bg-white hover:bg-white/90 text-black border-white'}`
                    }
                  >
                    {isFollowing ? 'Unfollow' : 'Follow'}
                  </button>
                )}
              </div>

              {/* Stats */}
              <div className="space-y-3 mb-6">
                <div className="flex justify-between items-center p-3 bg-white/10 rounded-lg border border-white/20">
                  <span className="text-gray-200">Stories</span>
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
                  onClick={() => isOwnProfile || isFollowing ? setShowFollowers(true) : toast.error('Follow to see followers')}
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
                  onClick={() => isOwnProfile || isFollowing ? setShowFollowing(true) : toast.error('Follow to see following')}
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

          {/* Right Content - Polaroid Grid */}
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
            <div className="bg-transparent rounded-2xl">
              {activeTab === 'blogs' ? <UserBlogs id={id} /> : <UserReviews id={id} />}
            </div>
          </div>
        </div>
      </div>

      {profile && (
        <div className='fixed inset-0 bg-black/90 p-3 z-50'>
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