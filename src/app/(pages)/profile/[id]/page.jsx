'use client';
import { useEffect, useState } from 'react';
import Image from 'next/image';
import { MdOutlineRateReview } from "react-icons/md";
import { LiaBlogger } from "react-icons/lia";
import UserBlogs from '@/app/components/UserBlogs/UserBlogs';
import UserReviews from '@/app/components/UserReviews/UserReviews';

export default function UserProfilePage({ params }) {
  const [userData, setUserData] = useState(null);
  const [component, setComponent] = useState(false);
  const [reviewCount, setReviewCount] = useState(0);
  const [blogCount, setBlogCount] = useState(0);

  const { id } = params; // Extract `id` from URL params

  const fetchUserData = async () => {
    try {
      const response = await fetch(`/api/user/${id}`);
      if (!response.ok) throw new Error('Failed to fetch user data'); 
      const data = await response.json();
      console.log(data)
      setUserData(data);
    } catch (err) {
      console.error('Error fetching user data:', err); 
    }
  };

  const fetchReviewCount = async () => {
    try {
      const response = await fetch(`/api/review?userId=${id}`);
      if (!response.ok) throw new Error('Failed to fetch review count');
      const data = await response.json();
      setReviewCount(data.length);
      console.log(data)
    } catch (err) {
      console.error('Error fetching review count:', err);
    }
  };

  const fetchBlogCount = async () => {
    try {
      const response = await fetch(`/api/blog?userEmail=${userData?.email}`);
      if (!response.ok) throw new Error('Failed to fetch blog count');
      const data = await response.json();
      setBlogCount(data.length);
    } catch (err) {
      console.error('Error fetching blog count:', err);
    }
  };

  useEffect(() => {
    fetchUserData();
    fetchReviewCount();
    fetchBlogCount();
  },);

  if (!userData) {
    return <div>Loading user profile...</div>;
  }

  return (
    <>
      <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Profile Header */}
      <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
        <div className="flex flex-col md:flex-row items-center gap-6 md:gap-8">
          {/* Profile Image */}
          <div className="shrink-0">
            {userData ? (
              <Image
                className="rounded-full w-[10rem] h-[10rem] object-cover ring-4 ring-blue-100 transition duration-300 hover:ring-blue-200"
                src={userData.avatarUrl ? `${userData.avatarUrl}` :`${userData.image}`}
                width={120}
                height={220}
                alt="Profile Image"
              />
            ) : (
              <Image
                className="rounded-full w-[10rem] h-[10rem] border-2 border-gray-200 p-2 transition duration-300 hover:border-blue-200"
                src="img/profile.png"
                width={200}
                height={200}
                alt="Profile Image"
              />
            )}
          </div>

          {/* User Info and Stats */}
          <div className="flex-1 w-full">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
              <div className='flex flex-col'>
              <h2 className="text-2xl font-bold text-gray-900 text-center md:text-left mb-4 md:mb-0">
                {userData.username ? userData.username : userData.email}
              </h2>
              <h3>
                {userData.bio ? userData.bio : ""}
              </h3>
              {userData? <div className='flex gap-2'>Fav genres :{userData.movieGenres.map((item)=>(
                    <>
                    <div>
                      {item}
                    </div>
                    </>
                  ))}</div> : ''}
              </div>
              <button className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-2.5 rounded-lg transition-colors shadow-md hover:shadow-lg">
                Follow
              </button>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gray-50 rounded-lg p-4 text-center hover:bg-gray-100 transition-colors">
                <p className="text-2xl font-bold text-gray-900">{blogCount}</p>
                <p className="text-sm text-gray-600 font-medium">Blogs</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 text-center hover:bg-gray-100 transition-colors">
                <p className="text-2xl font-bold text-gray-900">{reviewCount}</p>
                <p className="text-sm text-gray-600 font-medium">Reviews</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 text-center hover:bg-gray-100 transition-colors">
                <p className="text-2xl font-bold text-gray-900">0</p>
                <p className="text-sm text-gray-600 font-medium">Followers</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 text-center hover:bg-gray-100 transition-colors">
                <p className="text-2xl font-bold text-gray-900">0</p>
                <p className="text-sm text-gray-600 font-medium">Following</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Toggle Buttons */}
      <div className="flex justify-center mb-8">
        <div className="bg-gradient-to-r from-red-500 to-red-600 rounded-lg p-1.5 flex gap-3">
          <button
            onClick={() => setComponent(false)}
            className={`flex flex-col items-center px-6 py-3 rounded-lg transition-all ${
              !component
                ? 'bg-white text-red-500 shadow-md'
                : 'text-white hover:bg-white/10'
            }`}
          >
            <MdOutlineRateReview size={24} />
            <span className="mt-1 font-medium">Review</span>
          </button>
          <button
            onClick={() => setComponent(true)}
            className={`flex flex-col items-center px-6 py-3 rounded-lg transition-all ${
              component
                ? 'bg-white text-red-500 shadow-md'
                : 'text-white hover:bg-white/10'
            }`}
          >
            <LiaBlogger size={24} />
            <span className="mt-1 font-medium">Blog</span>
          </button>
        </div>
      </div>

      {/* Content Section */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        {component ? (
          <UserBlogs id={id} />
        ) : (
          <UserReviews id={id} />
        )}
      </div>
    </div>
    </>
  );
}

