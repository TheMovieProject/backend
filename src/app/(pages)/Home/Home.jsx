import React from 'react'
import Hero from '@/app/components/Hero/Hero'
import TopRated from '@/app/components/TopRated/TopRated'
import Upcoming from '@/app/components/Upcoming/Upcoming'
import Blogs from '@/app/components/Blogs/blogs'
import RecentActivity from '@/app/components/RecentActivity/RecentActivity'
const HomePage = () => {
  return (
    <div>
      <Hero />
      <RecentActivity/>
      <TopRated />
      <Upcoming />
      <Blogs/>
    </div>
  )
}

export default HomePage
