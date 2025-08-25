"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import MovieInfo from "@/app/components/InfoComponents/MovieInfo/MovieInfo"
import Reviews from "@/app/components/Reviews/review"
import Hero from "@/app/components/InfoComponents/Hero/Hero"
import { Loader2 } from "lucide-react"
import SimilarMovies from '@/app/components/SimilarMovies/SimilarMovies'
const Info = () => {
  const [item, setItem] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [averageRating, setAverageRating] = useState(null)
  const [userRating, setUserRating] = useState(0)
  const [ratingCount, setRatingCount] = useState(0)

  const params = useParams()
  const movieId = params.id

  useEffect(() => {
    const getData = async () => {
      try {
        if (!movieId) return

        const [movieResponse, creditsResponse, ratingResponse] = await Promise.all([
          fetch(`https://api.themoviedb.org/3/movie/${movieId}?api_key=${process.env.NEXT_PUBLIC_API_KEY}`),
          fetch(`https://api.themoviedb.org/3/movie/${movieId}/credits?api_key=${process.env.NEXT_PUBLIC_API_KEY}`),
          fetch(`/api/userRating?movieId=${movieId}`),
        ])

        if (!movieResponse.ok || !creditsResponse.ok || !ratingResponse.ok) {
          throw new Error("Network response was not ok")
        }

        const [movieData, creditsData, ratingData] = await Promise.all([
          movieResponse.json(),
          creditsResponse.json(),
          ratingResponse.json(),
        ])

        setItem({ ...movieData, credits: creditsData })
        setAverageRating(ratingData.averageRating)
        setUserRating(ratingData.userRating)
        setRatingCount(ratingData.ratingCount)
      } catch (error) {
        setError(error.message)
      } finally {
        setLoading(false)
      }
    }

    getData()
  }, [movieId])

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-900">
        <Loader2 className="h-12 w-12 animate-spin text-red-500" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-900">
        <div className="bg-red-900 border-l-4 border-red-500 text-red-100 p-4 rounded" role="alert">
          <p className="font-bold">Error in loading </p>
          <p>{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <Hero item={item} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <MovieInfo
          item={item}
          averageRating={averageRating}
          userRating={userRating}
          ratingCount={ratingCount}
          onRatingChange={setUserRating}
        />

        <SimilarMovies movieId={movieId} />

        <div className="mt-16">
          <Reviews movieId={movieId} />
        </div>
      </div>
    </div>
  )
}

export default Info

 