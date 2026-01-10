import { lazy } from "react"
const MovieComponent = lazy(()=> import("@/app/components/MoviesCoponent/MoviesComponent"))
const TrendingMovies = lazy(()=> import ("@/app/components/Weekly_Trending_Movies/TrendingMovies"))
const page = () => {
  return (
    <div className='bg-gradient-to-br from-gray-900 via-yellow-500 to-yellow-300'>
      <TrendingMovies/>
      <MovieComponent/>
    </div>
  )
}

export default page
