"use client"
import React, { useEffect, useMemo, useState } from "react"
import requests from "@/app/helpers/Requests"
import MovieBlock from "../MovieBlock/MovieBlock"

const MoviesComponent = () => {
  const [categories, setCategories] = useState({
    seasonal:{data:[] , loading:true , error:null},
    trending: { data: [], loading: true, error: null },
    nowplaying: { data: [], loading: true, error: null },
    popular: { data: [], loading: true, error: null },
    highestgrossing: { data: [], loading: true, error: null },
    awardWinning: { data: [], loading: true, error: null },
    topRated: { data: [], loading: true, error: null },
    upcoming: { data: [], loading: true, error: null },
  })

  const [overallLoading, setOverallLoading] = useState(true)
  const [overallError, setOverallError] = useState(null)

  const pageArray = useMemo(() => [
    { index: 'trending', title: 'Trending Worldwide', subTitle: '', url: requests.requestTrendingWeek },
    { index: 'nowplaying', title: 'Currently Playing in Theaters', subTitle: '', url: requests.requestNowPlaying },
    // {index:'seasonal' , title:'In the Mood' , subTitle:'' , url: requests.requestSeason(1)},
    { index: 'popular', title: 'Popular Movies', subTitle: '', url: requests.requestPopular },
    { index: 'highestgrossing', title: 'Highest Grossing Films', subTitle: '', url: requests.requestHighestGrossing },
    { index: 'awardWinning', title: 'Award Winning Films', subTitle: '', url: requests.requestAwardWinners },
    { index: 'topRated', title: 'Top Rated Films', subTitle: '', url: requests.requestTopRated },
    { index: 'upcoming', title: 'Upcoming Films', subTitle: '', url: requests.requestUpcoming },
  ], [])

  // Skeleton loader component
  const SkeletonLoader = () => (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
      {[...Array(6)].map((_, index) => (
        <div key={index} className="animate-pulse">
          <div className="bg-gray-700/50 rounded-xl h-64 mb-2"></div>
          <div className="h-4 bg-gray-700/50 rounded w-3/4 mb-2"></div>
          <div className="h-3 bg-gray-700/50 rounded w-1/2"></div>
        </div>
      ))}
    </div>
  )

  const fetchCategory = async (category) => {
    try {
      const res = await fetch(category.url)
      if (!res.ok) {
        throw new Error(`Failed to fetch ${category.title}: ${res.status}`)
      }
      const data = await res.json()
      setCategories(prev => ({
        ...prev,
        [category.index]: { data: data.results, loading: false, error: null }
      }))
    } catch (error) {
      console.error(`Error fetching ${category.title}:`, error)
      setCategories(prev => ({
        ...prev,
        [category.index]: { data: [], loading: false, error: error.message }
      }))
    }
  }

  useEffect(() => {
    let isMounted = true
    const fetchAllCategories = async () => {
      setOverallLoading(true)
      setOverallError(null)

      try {
        // Fetch all categories in parallel
        const fetchPromises = pageArray.map(category => fetchCategory(category))
        await Promise.all(fetchPromises)
        
        if (isMounted) {
          setOverallLoading(false)
        }
      } catch (error) {
        if (isMounted) {
          setOverallError("Failed to load movie categories")
          setOverallLoading(false)
        }
      }
    }

    fetchAllCategories()

    return () => {
      isMounted = false
    }
  }, [pageArray])

  // Overall error state
  if (overallError) {
    return (
      <div className="min-h-screen p-6 pt-20 font-sans flex items-center justify-center">
        <div className="text-center max-w-md mx-auto">
          <div className="bg-red-500/20 backdrop-blur-lg rounded-2xl p-8 border border-red-500/30">
            <div className="text-6xl mb-4">⚠️</div>
            <h3 className="text-2xl font-bold text-white mb-4">Failed to Load Movies</h3>
            <p className="text-gray-300 mb-6">{overallError}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-red-500 hover:bg-red-600 text-white font-medium rounded-lg transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-6 pt-20 font-sans">
      {overallLoading ? (
        // Show skeleton loaders for all categories during initial load
        pageArray.map((category, index) => (
          <div key={index} className="max-w-7xl mx-auto mb-12">
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-3 mb-4">
                <div className="h-10 w-48 bg-gray-700/50 rounded-lg animate-pulse mx-auto"></div>
              </div>
            </div>
            <SkeletonLoader />
          </div>
        ))
      ) : (
        pageArray.map((category, index) => {
          const categoryData = categories[category.index]

          // Individual category error state
          if (categoryData.error) {
            return (
              <div key={index} className="max-w-7xl mx-auto mb-12">
                <div className="text-center mb-8">
                  <h1 className="text-4xl font-bold text-white">{category.title}</h1>
                </div>
                <div className="text-center py-8">
                  <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20 max-w-md mx-auto">
                    <div className="text-4xl mb-4">❌</div>
                    <h3 className="text-lg font-bold text-white mb-2">Failed to load {category.title}</h3>
                    <p className="text-gray-300 text-sm">{categoryData.error}</p>
                  </div>
                </div>
              </div>
            )
          }

          // Individual category loading state
          if (categoryData.loading) {
            return (
              <div key={index} className="max-w-7xl mx-auto mb-12">
                <div className="text-center mb-8">
                  <div className="inline-flex items-center gap-3 mb-4">
                    <div className="h-10 w-48 bg-gray-700/50 rounded-lg animate-pulse mx-auto"></div>
                  </div>
                </div>
                <SkeletonLoader />
              </div>
            )
          }

          // Individual category success state
          return (
            <div key={index} className="max-w-7xl mx-auto mb-12">
              <div className="text-center mb-8">
                <div className="inline-flex items-center gap-3 mb-4">
                  <h1 className="text-4xl font-bold text-white">{category.title}</h1>
                </div>
                <p className="text-lg text-white">
                  {category.subTitle}
                </p>
              </div>

              {categoryData.data.length === 0 ? (
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
                  {categoryData.data.map((item, itemIndex) => (
                    <MovieBlock item={item} key={itemIndex} />
                  ))}
                </div>
              )}
            </div>
          )
        })
      )}
    </div>
  )
}

export default MoviesComponent