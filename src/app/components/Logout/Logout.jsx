"use client"
import React from 'react'
import { signOut } from 'next-auth/react'
const logout = () => {
  return (
    <div>
      <button className='text-white bg-yellow-600 font-bold py-2 px-3 w-full' onClick={()=>signOut({callbackUrl:"/login" , redirect:true})}>Logout</button>
    </div>
  )
}

export default logout