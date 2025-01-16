import React from 'react'
import Card from '@/Components/BlogCard/BlogCard'
import Pagination from '../Pagination/Pagination'
const getData=async(page , cat)=>{
  const res = await fetch(`${process.env.NEXTAUTH_URL}/api/posts?page=${page}&cat=${cat || ""}`,{
    cache:"no-store",
  })

  if(!res){
    throw new Error("Failed")
  }
  return res.json()
}
const CardList = async({page ,cat}) => {
  const {posts , count} = await getData(page ,cat);
  const POST_PER_PAGE = 2;

  const hasPrev=POST_PER_PAGE *(page-1)>0
  const hasNext=POST_PER_PAGE *(page-1) + POST_PER_PAGE < count

  return (
    <div className=''>
      <h1 className='font-bold text text-[1.6rem]'>Recent Post</h1>

      <div className='mt-[1.2rem] flex-col flex gap-12'>
        {posts.map((item)=>(
        <Card item={item} key={item._id}/>
        ))}
      </div>
      <Pagination page={page} hasPrev={hasPrev} hasNext={hasNext}/>
    </div>
  )
}

export default CardList