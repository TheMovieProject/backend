"use client"
import React, { useState } from 'react'
import Link from 'next/link'
import axios from 'axios'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
const Page = () => {
  const router = useRouter();
  const [user , setUser] = useState({
    email:"",
    name:"",
    username:"",
    password:"",
  })

  const userSignUp = async(e)=>{
    e.preventDefault()
    
    try{
      const response = await axios.post("/api/signup" , user)
      console.log("Signup success" , response.data)
      toast.success("User has been registered");
      router.push("/login")
      
     }catch(error){
   
     console.log(error);
     toast.error("Something went wrong");
     }finally{
   
     }

  }
  return (
    <div>
      <div>Already have an account <Link href='/login'>Login</Link></div>
      <input value={user.email} onChange={(e)=>{setUser({...user , email:e.target.value})}} type="text" placeholder='Email' />
      <input value={user.name} onChange={(e)=>{setUser({...user , name:e.target.value})}} type="text" placeholder='Full Name' />
      <input value={user.username} onChange={(e)=>{setUser({...user , username:e.target.value})}} type="text" placeholder='Username' />
      <input value={user.password} onChange={(e)=>{setUser({...user , password:e.target.value})}} type="password" placeholder='Password' />
      <button onClick={userSignUp}>Signup</button>
    </div>
  )
}

export default Page

