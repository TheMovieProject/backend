import React, { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { Heart, Plus } from "lucide-react"

const MovieBlock = ({ item }) => {
  const [isLiked, setIsLiked] = useState(false)
  const [isInWatchlist, setIsInWatchlist] = useState(false)
  const addToWatchlist = async () => {
    const response = await fetch('/api/watchlist/add', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            movieId: item.id.toString(),
            title: item.title,
            posterUrl: item.poster_path
                ? `https://image.tmdb.org/t/p/original${item.poster_path}`
                : null,
        }),
    });

    if (response.ok) {
        alert("Movie added to your watchlist!");
    } else {
        alert("Failed to add movie to watchlist.");
    }
};

const addToLikedlist = async () => {
    const response = await fetch('/api/liked/add', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            movieId: item.id.toString(),
            title: item.title,
            posterUrl: item.poster_path
                ? `https://image.tmdb.org/t/p/original${item.poster_path}`
                : null,
        }),
    });

    if (response.ok) {
        alert("Movie added to your liked list!");
    } else {
        alert("Failed to add movie to liked list.");
    }
};
  const handleLike = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsLiked(!isLiked)
    // Here you would typically update the liked status in your backend
    addToLikedlist();
  }
  const handleAddToWatchlist = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsInWatchlist(!isInWatchlist)
    addToWatchlist();
    // Here you would typically update the watchlist status in your backend
  }

  return (
    <Link href={`/movies/${item.id}`} className="group"> 
      <div className="relative overflow-hidden rounded-lg shadow-lg transition-transform duration-300 ease-in-out group-hover:scale-105">
        <Image
          src={`https://image.tmdb.org/t/p/w500${item.poster_path}`}
          alt={item.title}
          width={500}
          height={750}
          className="w-full h-auto"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent opacity-100 lg:opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4">
          <h2 className="text-white  opacity-0 lg:opacity-100 lg:text-lg font-bold mb-2">{item.title}</h2>
          <p className="text-gray-300 text-sm  opacity-0 lg:opacity-100 lg:text-lg font-bold mb-2">{item.release_date.split("-")[0]}</p>
          <div className="flex items-center justify-between w-full mx-auto gap-3">
            <div className="items-center hidden lg:flex lg:text-lg">
              <svg className="w-4 h-4  mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              <span className="text-white text-sm opacity-0 lg:opacity-100 lg:text-lg">{item.vote_average.toFixed(1)}</span>
            </div>
            <div className="flex justify-between lg:gap-2 w-full">
              <button
                onClick={handleLike}
                className={`p-1 rounded-full ${isLiked ? "bg-red-600" : "bg-gray-600"} hover:bg-red-700 transition-colors duration-200`}
              >
                <Heart size={14} className={`${isLiked ? "fill-current" : ""} text-white`} />
              </button>
              <button
                onClick={handleAddToWatchlist}
                className={`p-1 rounded-full ${isInWatchlist ? "bg-blue-600" : "bg-gray-600"} hover:bg-blue-700 transition-colors duration-200`}
              >
                <Plus size={14} className="text-white" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </Link>
  )
}

export default MovieBlock

