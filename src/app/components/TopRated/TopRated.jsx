"use client"

import React, { useEffect, useState } from "react"
import requests from "@/app/helpers/Requests"
import MovieBlock from "../MovieBlock/MovieBlock"
import Image from "next/image"

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
    setItems(allItems.slice(0, 100)) // Limit to 100 movies
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
      <div className="flex justify-center items-center h-screen bg-gray-900">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-white"></div>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-900">
        <Image width={200} height={200} src="/img/NoImage.png" alt="No Image" className="mb-4" />
        <p className="text-white text-2xl font-semibold">No Movies Available</p>
      </div>
    )
  }

  const handleGenreSelect = (genreId) => {
    setSelectedGenres((prev) => (prev.includes(genreId) ? prev.filter((id) => id !== genreId) : [...prev, genreId]))
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white py-8">
      <h1 className="text-4xl font-bold text-center mb-8">Top Rated Movies</h1>

      {/* Genre Filters */}
      <div className="flex flex-wrap gap-2 justify-center mb-8 px-4">
        {genresList.map((genre) => (
          <button
            key={genre.id}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors duration-200 ease-in-out
                            ${
                              selectedGenres.includes(genre.id)
                                ? "bg-red-600 text-white"
                                : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                            }`}
            onClick={() => handleGenreSelect(genre.id)}
          >
            {genre.name}
          </button>
        ))}
      </div>

      {/* Movies Grid */}
      <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-8 gap-6 mx-auto max-w-7xl px-4">
        {filteredItems.map((item, index) => (
          <MovieBlock item={item} key={index} />
        ))}
      </div>
    </div>
  )
}

export default TopRated
