import React from 'react'
import RecentActivity from '@/app/components/RecentActivity/RecentActivity'
import FeedBlog from '@/app/components/FeedBlog/FeedBlog'
import FeedReview from '@/app/components/FeedReview/FeedReview'
const UserFeed = () => {
  return (
    <div>
      <RecentActivity/>
      <FeedBlog/>
      <FeedReview/>
    </div>
  )
}

export default UserFeed
