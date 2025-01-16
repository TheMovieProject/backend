"use client"
import { useState } from 'react'
import { useSession } from 'next-auth/react'
import Logout from '@/app/components/Logout/Logout'
import Image from 'next/image'
import { MdOutlineRateReview } from "react-icons/md";
import { LiaBlogger } from "react-icons/lia";
import UserBlogs from '@/app/components/UserBlogs/UserBlogs'
import UserReviews from '@/app/components/UserReviews/UserReviews'
export default function Page() {
  const { data: session , status } = useSession()
  const [component , setComponent] = useState(false)

  if(status === "unauthenticated"){
    return <div>Login first!!!</div>
  }

  if(status === "loading"){
    return(
        <>
        <div>Loading....</div>
        </>
    )
   }

  return (
    <>
    <div>
    <div className='flex items-center bg-red-300'>
       {session?.user?.image ?<Image className='rounded-[100%] cursor-pointer' src={session?.user?.image} width={50} height={50} alt='Profile Image' /> : <Image className='border-2 border-black rounded-[100%] p-2' src='img/profile.png' width={50} height={50} alt='Profile Image' />}
       <div className="profile-info flex items-center">
        <p>{session?.user?.name}</p>
        <button>Edit Profile</button>
        <label htmlFor="">Blogs or Posts</label>
        <div>Followers</div>
        <div>Following</div>
        <p>{session?.user?.email}</p>
      </div>
      {/* <Logout /> */}
    </div>

    <div className='bg-red-500 flex w-[13%] mx-auto justify-between p-5'>
    <div onClick={()=>setComponent(false)} className='flex flex-col items-center cursor-pointer'>
      <MdOutlineRateReview size={30}/>
      <p>Review</p>
    </div>
    <div onClick={()=>setComponent(true)} className='flex flex-col items-center cursor-pointer'>
      <LiaBlogger size={30}/>
      <p>Blog</p>
    </div>
    </div>

    {!component?(
      <div>
      <UserReviews/>
      </div>
    ):(
      <div>
      <UserBlogs/>
      </div>
    )}

    </div>
    </>
   
  );
}

