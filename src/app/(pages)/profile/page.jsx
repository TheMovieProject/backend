'use client';
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import Image from 'next/image';
import { MdOutlineRateReview, MdClose } from "react-icons/md";
import { LiaBlogger } from "react-icons/lia";
import Link from 'next/link';
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
          {data.length === 0 ? (
            <p className="text-center text-gray-500 py-4">No {type.toLowerCase()} yet</p>
          ) : (
            data.map((user) => (
              <Link 
                href={`/profile/${user.id}`} 
                key={user.id}
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

export default function Page() {
  const { data: session, status } = useSession();
  const [userData, setUserData] = useState(null);
  const [component, setComponent] = useState(false);
  const [reviewCount, setReviewCount] = useState(0);
  const [blogCount, setBlogCount] = useState(0);
  const [profile, setProfile] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [showFollowers, setShowFollowers] = useState(false);
  const [showFollowing, setShowFollowing] = useState(false);
  const [followers, setFollowers] = useState([]);
  const [following, setFollowing] = useState([]);

  const fetchReviewCount = async () => {
    if (status !== 'authenticated' || !session?.user?.email) return;
    try {
      const response = await fetch(`/api/review?userId=${session.user.id}`);
      if (!response.ok) throw new Error('Failed to fetch review count');
      const data = await response.json();
      setReviewCount(data.length);
    } catch (err) {
      console.error('Error fetching review count:', err);
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
        fetchReviewCount(),
        fetchUserData(),
        fetchFollowData()
      ]);
    }
  }, [status, session?.user?.email]);

  if (status === 'unauthenticated') {
    return <div className="text-center p-4">Please log in to view this page.</div>;
  }

  if (status === 'loading') {
    return (
      <div className="flex justify-center items-center p-4">
        <div>Loading...</div>
      </div>
    );
  }

  return (
    <>
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <div className="flex flex-col md:flex-row items-center gap-8 md:gap-12">
            <div className="shrink-0">
              {userData ? (
                <Image
                  className="rounded-full w-[10rem] h-[10rem] object-cover ring-4 ring-blue-100 transition duration-300 hover:ring-blue-200"
                  src={userData.avatarUrl || userData.image}
                  width={120}
                  height={220}
                  alt="Profile Image"
                />
              ) : (
                <Image
                  className="rounded-full w-[2rem] h-[2rem] border-2 border-gray-200 p-2 transition duration-300 hover:border-blue-200"
                  src="/img/profile.png"
                  width={100}
                  height={200}
                  alt="Profile Image"
                />
              )}
            </div>

            <div className="flex-1 space-y-4">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="space-y-1 text-center md:text-left">
                  <h2 className="text-xl font-bold text-gray-900">
                    {userData ? userData.username : session?.user?.email + ' (Please make a username)'}
                  </h2>
                  <p className="text-gray-600">{userData?.bio || ''}</p>
                  {userData && userData.movieGenres.length > 0 && (
                    <div className='flex gap-2'>
                      Fav genres: {userData.movieGenres.map((item, index) => (
                        <div key={index}>{item}</div>
                      ))}
                    </div>
                  )}
                </div>
                <button 
                  onClick={() => setProfile(true)} 
                  className="bg-blue-500 hover:bg-blue-600 text-white font-semibold px-6 py-2 rounded-lg transition-colors shadow-md hover:shadow-lg"
                >
                  Edit Profile
                </button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-gray-100">
                <div className="text-center p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                  <p className="text-2xl font-bold text-gray-900">{blogCount}</p>
                  <p className="text-sm text-gray-600">Blogs</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                  <p className="text-2xl font-bold text-gray-900">{reviewCount}</p>
                  <p className="text-sm text-gray-600">Reviews</p>
                </div>
                <div 
                  className="text-center p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer"
                  onClick={() => setShowFollowers(true)}
                >
                  <p className="text-2xl font-bold text-gray-900">{followerCount}</p>
                  <p className="text-sm text-gray-600">Followers</p>
                </div>
                <div 
                  className="text-center p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer"
                  onClick={() => setShowFollowing(true)}
                >
                  <p className="text-2xl font-bold text-gray-900">{followingCount}</p>
                  <p className="text-sm text-gray-600">Following</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-center mb-8">
          <div className="bg-white rounded-lg shadow-md p-1 flex gap-2">
            <button
              onClick={() => setComponent(false)}
              className={`flex items-center gap-2 px-6 py-3 rounded-lg transition-colors ${
                !component
                  ? 'bg-blue-500 text-white'
                  : 'hover:bg-gray-100 text-gray-700'
              }`}
            >
              <MdOutlineRateReview size={24} />
              <span>Review</span>
            </button>
            <button
              onClick={() => setComponent(true)}
              className={`flex items-center gap-2 px-6 py-3 rounded-lg transition-colors ${
                component
                  ? 'bg-blue-500 text-white'
                  : 'hover:bg-gray-100 text-gray-700'
              }`}
            >
              <LiaBlogger size={24} />
              <span>Blog</span>
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          {component ? <UserBlogs /> : <UserReviews />}
        </div>
      </div>

      {profile && (
        <div className='fixed inset-0 bg-black/80 p-3 z-50'>
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