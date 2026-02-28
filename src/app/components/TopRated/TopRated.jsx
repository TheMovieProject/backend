"use client"
import React, { useEffect, useState } from "react"
import requests from "@/app/helpers/Requests"
import MovieBlock from "../MovieBlock/MovieBlock"
import Image from "next/image"
import { MdLocalMovies, MdFilterList } from "react-icons/md"

const genresList = [
  { id: 28, name: "Action" },
  { id: 12, name: "Adventure" },
  { id: 16, name: "Animation" },
  { id: 35, name: "Comedy" },
  { id: 80, name: "Crime" },
  { id: 99, name: "Documentary" },
  { id: 18, name: "Drama" },
  { id: 10751, name: "Family" },
  { id: 14, name: "Fantasy" },
  { id: 36, name: "History" },
  { id: 27, name: "Horror" },
  { id: 10402, name: "Music" },
  { id: 9648, name: "Mystery" },
  { id: 10749, name: "Romance" },
  { id: 878, name: "Science Fiction" },
  { id: 53, name: "Thriller" },
  { id: 10770, name: "TV Movie" },
  { id: 10752, name: "War" },
  { id: 37, name: "Western" },
]
 
const TopRated = () => {
  const [items, setItems] = useState([])
  const [selectedGenres, setSelectedGenres] = useState([])
  const [loading, setLoading] = useState(true)
  const [showFilters, setShowFilters] = useState(false)

  const fetchData = async () => {
    setLoading(true)
    let allItems = []
    let currentPage = 1
    while (allItems.length <= 100) {
      const request = await fetch(`${requests.requestTopRated}&page=${currentPage}`) 
      const data = await request.json()
      allItems = [...allItems, ...data.results]
      currentPage++
    }
    setItems(allItems.slice(0, 100))
    setLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [])

  const filteredItems =
    selectedGenres.length > 0
      ? items.filter((item) => item.genre_ids.some((genre) => selectedGenres.includes(genre)))
      : items

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white text-lg">Loading top rated movies...</p>
        </div>
      </div>
    )
  }

  const handleGenreSelect = (genreId) => {
    setSelectedGenres((prev) => (prev.includes(genreId) ? prev.filter((id) => id !== genreId) : [...prev, genreId]))
  }

  const clearFilters = () => {
    setSelectedGenres([])
  }

  return (
    <div className="min-h-screen  p-6 pt-20 font-sans">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="bg-yellow-500/20 p-3 rounded-full border border-yellow-500/30">
              <MdLocalMovies size={32} className="text-yellow-400" />
            </div>
            <h1 className="text-4xl font-bold text-white">Top Rated Movies</h1>
          </div>
          {/* <p className="text-lg text-gray-300">
            Discover the highest rated films of all time
          </p> */}
        </div>

        {/* Filter Toggle */}
        <div className="flex justify-center mb-8">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="bg-white/10 hover:bg-white/20 text-white font-medium py-3 px-6 rounded-full transition-all border border-white/30 hover:border-white/40 flex items-center gap-2"
          >
            <MdFilterList size={20} />
            {showFilters ? 'Hide Filters' : 'Show Filters'}
            {selectedGenres.length > 0 && (
              <span className="bg-yellow-500 text-black text-xs px-2 py-1 rounded-full">
                {selectedGenres.length}
              </span>
            )}
          </button>
        </div>

        {/* Genre Filters */}
        {showFilters && (
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20 mb-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold">Filter by Genre</h3>
              {selectedGenres.length > 0 && (
                <button
                  onClick={clearFilters}
                  className="text-yellow-400 hover:text-yellow-300 text-sm font-medium"
                >
                  Clear All
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {genresList.map((genre) => (
                <button
                  key={genre.id}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ease-in-out border
                    ${
                      selectedGenres.includes(genre.id)
                        ? "bg-yellow-500 text-black border-yellow-500 shadow-lg"
                        : "bg-white/10 text-white border-white/20 hover:bg-white/20 hover:border-white/30"
                    }`}
                  onClick={() => handleGenreSelect(genre.id)}
                >
                  {genre.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Results Count */}
        <div className="text-center mb-6">
          <p className="text-gray-300">
            Showing <span className="text-white font-bold">{filteredItems.length}</span> movies
            {selectedGenres.length > 0 && ` in ${selectedGenres.length} genre${selectedGenres.length > 1 ? 's' : ''}`}
          </p>
        </div>

        {/* Movies Grid */}
        <div
          className="grid justify-center gap-x-6 gap-y-10 pt-8"
          style={{ gridTemplateColumns: "repeat(auto-fit, minmax(165px, 185px))" }}
        >
          {filteredItems.map((item, index) => (
            <div key={item.id || index} className="w-[165px] sm:w-[185px] pt-8">
              <MovieBlock item={item} index={index} />
            </div>
          ))}
        </div>

        {/* Empty State */}
        {filteredItems.length === 0 && (
          <div className="text-center py-12">
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20 max-w-md mx-auto">
              <div className="text-6xl mb-4">ðŸŽ¬</div>
              <h3 className="text-xl font-bold text-white mb-2">No Movies Found</h3>
              <p className="text-gray-300 mb-4">
                Try adjusting your genre filters to see more results.
              </p>
              <button
                onClick={clearFilters}
                className="bg-yellow-500 hover:bg-yellow-600 text-black font-semibold py-2 px-6 rounded-lg transition-all"
              >
                Clear Filters
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default TopRated

