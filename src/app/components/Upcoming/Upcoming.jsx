"use client"

import React, { useEffect, useState } from "react"
import requests from "@/app/helpers/Requests"
import MovieBlock from "../MovieBlock/MovieBlock"
import Image from "next/image" 

const Upcoming = () => {
  const [items, setItems] = useState([])
  const [page, setPage] = useState(1)
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

  const ItemsPerPage = 20
  const firstIndex = (page - 1) * ItemsPerPage
  const lastIndex = page * ItemsPerPage
  const NumberofPages = Math.ceil(items.length / ItemsPerPage)
  const AllPages = Array.from({ length: NumberofPages }, (_, i) => i + 1)
  const currentItems = items.slice(firstIndex, lastIndex)

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-900">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-white"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-900">
        <p className="text-white text-xl">{error}</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white py-8">
      <h1 className="text-4xl font-bold text-center mb-8">Upcoming Movies</h1>

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center">
          <Image width={200} height={200} src="/img/NoImage.png" alt="No Image" className="mb-4" />
          <p className="text-white text-2xl font-semibold">No Upcoming Movies Available</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 gap-6 mx-auto max-w-7xl px-4">
            {currentItems.map((item, index) => (
              <MovieBlock item={item} key={index} />
            ))}
          </div>

          <div className="flex flex-wrap justify-center items-center mt-12 mb-8 gap-2">
            {AllPages.map((pageNum) => (
              <button
                key={pageNum}
                onClick={() => setPage(pageNum)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200 ease-in-out
                                    ${
                                      page === pageNum
                                        ? "bg-red-600 text-white"
                                        : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                                    }`}
              >
                {pageNum}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

export default Upcoming