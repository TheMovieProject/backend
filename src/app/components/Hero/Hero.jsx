"use client"
import { useEffect, useState } from "react"
import requests from "@/app/helpers/Requests"
import Image from "next/image" 

const Home = () => {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchData = async () => {
    try {
      const request = await fetch(requests.requestPopular)
      const data = await request.json()
      setItems(data.results || [])
    } catch (error) {
      console.error("Error fetching data:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const item = items.length > 0 ? items[Math.floor(Math.random() * items.length)] : null

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-900">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-white"></div>
      </div>
    )
  }

  if (!item) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-900">
        <Image width={200} height={200} src="/img/NoImage.png" alt="No Image" className="mb-4" />
        <p className="text-white text-2xl font-semibold">No Movie Available</p>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen bg-gray-900">
      <div className="absolute inset-0">
        <Image
          className="w-full h-full object-cover opacity-50"
          width={1920}
          height={1080}
          src={`https://image.tmdb.org/t/p/original${item.backdrop_path}`}
          alt={item.title || "Movie Image"}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-gray-900 to-transparent"></div>
      </div>

      <div className="relative z-10 container mx-auto px-4 py-16">
        {/* <h1 className="text-white font-bold text-4xl md:text-5xl lg:text-6xl text-center mb-8">The Movies</h1> */}
        <div className="max-w-3xl mx-auto bg-gray-800 bg-opacity-75 rounded-lg overflow-hidden shadow-xl mt-20">
          <div className="p-8">
            <h2 className="text-white text-3xl md:text-4xl font-bold mb-4">{item.title}</h2>
            <p className="text-gray-300 text-lg mb-6">{item.overview}</p>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-yellow-500 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                <span className="text-white font-semibold">{item.vote_average.toFixed(1)}</span>
              </div>
              <span className="text-gray-300">{new Date(item.release_date).getFullYear()}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Home


