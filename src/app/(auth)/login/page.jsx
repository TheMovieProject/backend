"use client"
import React from 'react'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { signIn, useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'

const Page = () => {
  const session = useSession();
  const router = useRouter();
  const [user, setUser] = useState({
    email: "",
    password: "",
  });

  useEffect(() => {
    if (session.status === "authenticated") {
      router.push('/profile');
    }
    if(session.status === "unauthenticated"){
      router.push('/login')
    }
  }, [session, router]);

  const userLogin = async (e) => {
    e.preventDefault();
    const result = await signIn('credentials', { ...user, redirect: false });
  
    if (result?.error) {
      toast.error("Login failed: " + result.error);
    } else {
      toast.success("Login is successful!!");
      router.push('/profile'); // Redirect to profile after successful login
    }
  }

  const googleLogin=async()=>{
    await signIn("google",{
       callbackUrl:"/profile",
       redirect:true
     })
   }

  return (
    <div className='bg-red-500 w-[50%] mx-auto flex items-center flex-col text-[1.1rem] gap-6'>
      <div>Dont have an account? <Link href='/signup'>Signup</Link></div>
      <input 
        value={user.email} 
        onChange={(e) => setUser({ ...user, email: e.target.value })} 
        type="text" 
        placeholder='Email' 
        className='w-[90%] p-2 rounded-l-md outline-none'
      />
      <input 
        value={user.password} 
        onChange={(e) => setUser({ ...user, password: e.target.value })} 
        type="password" 
        placeholder='Password' 
      />
      <button onClick={userLogin}>Login</button>
      <button onClick={googleLogin} className='border-2 mx-2'>Sign in with google</button>
    </div>
  );
}

export default Page;
