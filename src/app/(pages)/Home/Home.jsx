import React from 'react'
import Hero from '@/app/components/Hero/Hero'
import TopRated from '@/app/components/TopRated/TopRated'
import Upcoming from '@/app/components/Upcoming/Upcoming'
import Blogs from '@/app/components/Blogs/blogs'
const HomePage = () => {
  return (
    <div>
      <Hero />
      <TopRated />
      <Upcoming />
      <Blogs/>
    </div>
  )
}

export default HomePage
