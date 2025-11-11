"use client"
import React, { useEffect, useState } from "react"
import requests from "@/app/helpers/Requests"
import MovieBlock from "../MovieBlock/MovieBlock"
import Image from "next/image"
import { MdUpcoming, MdCalendarToday } from "react-icons/md"

const Upcoming = () => {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true) 
  const [error, setError] = useState(null)

  const getData = async () => {
    setLoading(true)
    setError(null)
    let AllItems = []
    let currentPage = 1
    try {
      while (AllItems.length < 100) {
        const response = await fetch(`${requests.requestUpcoming}&page=${currentPage}`)
        const data = await response.json()
        AllItems = [...AllItems, ...data.results]
        currentPage++
      }
      setItems(AllItems.slice(0, 100))
    } catch (err) {
      setError("Failed to fetch upcoming movies. Please try again later.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    getData()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white text-lg">Loading upcoming movies...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20 max-w-md text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <h3 className="text-xl font-bold text-white mb-2">Something went wrong</h3>
          <p className="text-gray-300 mb-4">{error}</p>
          <button
            onClick={getData}
            className="bg-white/20 hover:bg-white/30 text-white font-semibold py-2 px-6 rounded-lg transition-all border border-white/30 hover:border-white/40"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-6 pt-20 font-sans">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-4">
            {/* <div className="bg-green-500/20 p-3 rounded-full border border-green-500/30">
              <MdUpcoming size={32} className="text-green-400" />
            </div> */}
            <h1 className="text-4xl font-bold text-white">Upcoming Movies</h1>
          </div>
          <p className="text-lg text-white">
            Get ready for the most anticipated releases coming soon
          </p>
        </div>

        {/* Stats */}

        {/* Movies Grid */}
        {items.length === 0 ? (
          <div className="text-center py-12">
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20 max-w-md mx-auto">
              <div className="text-6xl mb-4">🎬</div>
              <h3 className="text-xl font-bold text-white mb-2">No Upcoming Movies</h3>
              <p className="text-gray-300">
                Check back later for new movie announcements.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
            {items.map((item, index) => (
              <MovieBlock item={item} key={index} /> 
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default Upcoming