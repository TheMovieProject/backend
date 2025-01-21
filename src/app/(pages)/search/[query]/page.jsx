"use client"
import React, { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import MovieBlock from "@/app/components/MovieBlock/MovieBlock"

const SearchedItems = () => {
  const { query } = useParams()
  const [items, setItems] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  const searchMovie = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch(
        `https://api.themoviedb.org/3/search/movie?api_key=${process.env.NEXT_PUBLIC_API_KEY}&query=${query}`,
      )
      if (!response.ok) {
        throw new Error("Failed to fetch data")
      }
      const data = await response.json()
      const filteredItems = data.results.filter((item) => item.backdrop_path)
      setItems(filteredItems)
    } catch (error) {
      console.error("Error:", error)
      setError("An error occurred while fetching data. Please try again later.")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    searchMovie()
  }, [query])

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-900">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-900 text-white">
        <p className="text-xl">{error}</p>
      </div>
    )
  }

  return (
    <div className="bg-gray-900 text-white p-4 md:p-6 lg:p-8 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-6 text-center lg:text-left">
          {items.length} {items.length === 1 ? "result" : "results"} for <span className="text-blue-500">{query}</span>
        </h1>
        {items.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {items.map((item) => (
              <div
                key={item.id}
                className="bg-gray-800 rounded-lg overflow-hidden hover:shadow-xl transition-shadow duration-300 ease-in-out"
              >
                <div className="relative aspect-video">
                  <MovieBlock item={item} />
                </div>
                <div className="p-4">
                  <h2 className="text-lg md:text-xl font-bold text-blue-400 mb-2 line-clamp-1">
                    {item.original_title}
                  </h2>
                  <p className="text-sm text-gray-300 mb-4 line-clamp-3">{item.overview}</p>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-400">Release: {item.release_date}</span>
                    <span className="text-sm bg-blue-600 px-2 py-1 rounded">
                      Rating: {item.vote_average.toFixed(1)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center">
            <p className="text-xl mt-8 mb-4">No results found for {query}.</p>
            <p className="text-lg">Try a different search term or check your spelling.</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default SearchedItems
