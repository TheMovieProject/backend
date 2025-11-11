import React from 'react'
import TopRated from '@/app/components/TopRated/TopRated'
import Upcoming from '@/app/components/Upcoming/Upcoming'
const page = () => {
  return (
    <div className='bg-gradient-to-br from-gray-900 via-yellow-500 to-yellow-300'>
      <TopRated/>
      <Upcoming/>
    </div>
  )
}

export default page
