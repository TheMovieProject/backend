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
      const response = await fetch(`/api/profile/${id}`);
      if (!response.ok) throw new Error('Failed to fetch user data');
      const data = await response.json();
      console.log(data)
      console.log(data.id)
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
      const response = await fetch(`/api/blog?userEmail=${userData.email}`);
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
      <div>
        <div className="flex items-center p-2 gap-[4rem] mx-auto w-[75%]">
          {userData?.image ? (
            <Image
              className="rounded-[100%] cursor-pointer"
              src={userData?.image}
              width={100}
              height={100}
              alt="Profile Image"
            />
          ) : (
            <Image
              className="border-2 border-black rounded-[100%] p-2"
              src="img/profile.png"
              width={50}
              height={50}
              alt="Profile Image"
            />
          )}
          <div className="profile-info flex items-center justify-between w-full p-2">
            <p>{userData?.name}</p>
            {/* <p>{userData?.email}</p> */}
            <div className='bg-blue-600 text-white py-2 px-4 rounded-md font-semibold'>
              <button>Follow</button>
            </div>
            <label className="flex flex-col items-center">
              <p className="text-[1.5rem]">{blogCount}</p>
              <p>Blogs or Posts</p>
            </label>
            <label className="flex flex-col items-center">
              <p className="text-[1.5rem]">{reviewCount}</p>
              <p>Reviews</p>
            </label>
            <div className="flex flex-col items-center">
              <p className="text-[1.5rem]">0</p>
              <p>Followers</p>
            </div>
            <div className="flex flex-col items-center">
              <p className="text-[1.5rem]">0</p>
              <p>Following</p>
            </div>
          </div>
        </div>

        <div className="bg-red-500 flex w-[13%] mt-20 mx-auto justify-between p-5">
          <div onClick={() => setComponent(false)} className="flex flex-col items-center cursor-pointer">
            <MdOutlineRateReview size={30} />
            <p>Review</p>
          </div>
          <div onClick={() => setComponent(true)} className="flex flex-col items-center cursor-pointer">
            <LiaBlogger size={30} />
            <p>Blog</p>
          </div>
        </div>

        {component ? (
          <div>
            <UserBlogs id={id} />
          </div>
        ) : (
          <div>
            <UserReviews id={id} />
          </div>
        )}
      </div>
    </>
  );
}

