"use client"
import React, { useEffect, useMemo, useState } from "react"
import requests from "@/app/helpers/Requests"
import MovieBlock from "../MovieBlock/MovieBlock"
import Image from "next/image"

const Upcoming = () => {
  const [categories , setCategories] = useState({
    trending:{data:[] , loading:true},
    nowplaying:{data:[] , loading:true},
    popular:{data:[] , loading:true},
    highestgrossing:{data:[] , loading:true},
    awardWinning:{data:[] , loading:true},
    topRated:{data:[] , loading:true},
    upcoming:{data:[] , loading:true},
  })

  const pageArray=useMemo(()=>
    [
    {index:'trending' , title:'Trending Now' , subTitle:'' , url:requests.requestTrendingWeek},
    {index:'nowplaying' , title:'Currently Playing in Theaters' , subTitle:'' , url:requests.requestNowPlaying},
    {index:'popular' , title:'Popular Movies' , subTitle:'' , url:requests.requestPopular},
    {index:'highestgrossing' , title:'Highest Grossing Films' , subTitle:'' , url:requests.requestHighestGrossing},
    {index:'awardWinning' , title:'Award Winning Films' , subTitle:'' , url:requests.requestAwardWinners},
    {index:'topRated' , title:'Top Rated Films' , subTitle:'' , url:requests.requestTopRated},
    {index:'upcoming' , title:'Upcoming Films' , subTitle:'' , url:requests.requestUpcoming},
  ],[])

  const fetchCategory=async(category)=>{
    try {
      const res = await fetch(category.url)
      const data = await res.json();
      setCategories(prev=> ({
  ...prev,  // Keep all other categories
  [category.index]: {data: data.results , loading:false}
})
      )
    } catch (error) {
      console.log(error)
    }
  }

  useEffect(() => {
    pageArray.forEach((category , index)=>{
      fetchCategory(category)
    })
  }, [pageArray])

  return (
    <div className="min-h-screen p-6 pt-20 font-sans">
     {pageArray.map((category , index)=>{
       return <div key={index} className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-4">
            {/* <div className="bg-green-500/20 p-3 rounded-full border border-green-500/30">
              <MdUpcoming size={32} className="text-green-400" />
            </div> */}
            <h1 className="text-4xl font-bold text-white">{category.title}</h1>
          </div>
          <p className="text-lg text-white">
            {category.subTitle}
          </p>
        </div>

        {/* Stats */}

        {/* Movies Grid */}
        {categories[category.index].data.length === 0 ? (
          <div className="text-center py-12">
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20 max-w-md mx-auto">
              <div className="text-6xl mb-4">🎬</div>
              <h3 className="text-xl font-bold text-white mb-2">No {category.title}</h3>
              <p className="text-gray-300">
                Check back later for new movie announcements.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
            {categories[category.index].data.map((item, index) => (
              <MovieBlock item={item} key={index} /> 
            ))}
          </div>
        )}
      </div>    
    })}
    </div>
  )
}

export default Upcoming