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
      <div>
        <div className="flex items-center p-2 gap-[10rem] mx-auto w-[75%]">
          {session?.user?.image ? (
            <Image
              className="rounded-[100%] cursor-pointer"
              src={session?.user?.image}
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
            <p>{session?.user?.name}</p>
            <p>{session?.user?.email}</p>
            <button className="text-white font-semibold bg-blue-500 rounded-md p-2">Edit Profile</button>
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
           <UserBlogs /> 
          </div>
        ) : (
          <div>
            <UserReviews />
          </div>
        )}
      </div>
    </>
  );
}

