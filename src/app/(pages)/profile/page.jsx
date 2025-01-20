'use client';
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import Image from 'next/image';
import { MdOutlineRateReview } from "react-icons/md";
import { LiaBlogger } from "react-icons/lia";
import UserBlogs from '@/app/components/UserBlogs/UserBlogs';
import UserReviews from '@/app/components/UserReviews/UserReviews';

export default function Page() {
  const { data: session, status } = useSession();
  const [component, setComponent] = useState(false);
  const [reviewCount, setReviewCount] = useState(0);
  const [blogCount , setBlogCount]=useState(0);
  const fetchReviewCount = async () => {
    if (status !== 'authenticated' || !session?.user?.email) return;

    try {
      const response = await fetch(`/api/review?userEmail=${session?.user?.email}`);
      if (!response.ok) throw new Error('Failed to fetch review count');
      const data = await response.json();
      setReviewCount(data.length);
    } catch (err) {
      console.error('Error fetching review count:', err);
    }
  };
  const fetchBlogCount=async()=>{
    if (status !== 'authenticated' || !session?.user?.email) return;

    try {
      const response = await fetch(`/api/blog?userEmail=${session?.user?.email}`);
      if (!response.ok) throw new Error('Failed to fetch review count');
      const data = await response.json();
      setBlogCount(data.length);
    } catch (err) {
      console.error('Error fetching review count:', err);
    }
  }
  useEffect(() => {
    fetchBlogCount();
    fetchReviewCount();
  });

  if (status === 'unauthenticated') {
    return <div>Login first!!!</div>;
  }

  if (status === 'loading') {
    return (
      <div>
        <div>Loading....</div>
      </div>
    );
  }

  return (
    <>
      <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Profile Header Section */}
      <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
        <div className="flex flex-col md:flex-row items-center gap-8 md:gap-12">
          {/* Profile Image */}
          <div className="relative">
            {session?.user?.image ? (
              <Image
                className="rounded-full object-cover ring-4 ring-blue-100 transition-transform hover:scale-105"
                src={session.user.image}
                width={120}
                height={120}
                alt="Profile Image"
              />
            ) : (
              <Image
                className="rounded-full border-2 border-gray-200 p-2 transition-transform hover:scale-105"
                src="img/profile.png"
                width={120}
                height={120}
                alt="Profile Image"
              />
            )}
          </div>

          {/* Profile Info */}
          <div className="flex-1 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="space-y-1 text-center md:text-left">
                <h2 className="text-xl font-bold text-gray-900">
                  {session?.user?.name || 'Guest User'}
                </h2>
                <p className="text-gray-600">{session?.user?.email}</p>
              </div>
              <button className="bg-blue-500 hover:bg-blue-600 text-white font-semibold px-6 py-2 rounded-lg transition-colors shadow-md hover:shadow-lg">
                Edit Profile
              </button>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-gray-100">
              <div className="text-center p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                <p className="text-2xl font-bold text-gray-900">{blogCount}</p>
                <p className="text-sm text-gray-600">Blogs or Posts</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                <p className="text-2xl font-bold text-gray-900">{reviewCount}</p>
                <p className="text-sm text-gray-600">Reviews</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                <p className="text-2xl font-bold text-gray-900">0</p>
                <p className="text-sm text-gray-600">Followers</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                <p className="text-2xl font-bold text-gray-900">0</p>
                <p className="text-sm text-gray-600">Following</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Toggle Buttons */}
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

      {/* Content Section */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        {component ? <UserBlogs /> : <UserReviews />}
      </div>
    </div>
    </>
  );
}

