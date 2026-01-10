"use client";
import axios from "axios";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import NoImage from '../../../../public/img/NoImage.jpg'
import { MdPlayArrow } from "react-icons/md";
const TrendingMovies = () => {
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchTrendingMovies = async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await axios.get("/api/trending_movies_week");
      const top15 = (res.data || []).slice(0, 15);

      setMovies(top15);
    } catch (err) {
      console.log(err);
      setError(err?.response?.data?.message || "Failed to load trending movies.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrendingMovies();
  }, []);

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
  );

  return (
    <div className="min-h-screen p-6 pt-20 font-sans">
      <div className="max-w-7xl mx-auto mb-12">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-4">
            <h1 className="text-4xl font-bold text-white">
              This Week&apos;s Trending on TheMovieProject
            </h1>
          </div>
        </div>

        {loading ? (
          <SkeletonLoader />
        ) : error ? (
          <div className="text-center py-8">
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20 max-w-md mx-auto">
              <div className="text-4xl mb-4">❌</div>
              <h3 className="text-lg font-bold text-white mb-2">
                Failed to load Trending
              </h3>
              <p className="text-gray-300 text-sm">{error}</p>
            </div>
          </div>
        ) : movies.length === 0 ? (
          <div className="text-center py-12">
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20 max-w-md mx-auto">
              <div className="text-6xl mb-4">🎬</div>
              <h3 className="text-xl font-bold text-white mb-2">No Trending</h3>
              <p className="text-gray-300">
                Check back later for new movie announcements.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
            {movies.map((item, index) => (
              <div 
                                key={index} 
                                className="group relative"
                            >
                                {/* Polaroid-style Movie Card */}
                                <div className="bg-white  shadow-lg hover:shadow-2xl transition-all duration-300 transform group-hover:-translate-y-2 p-4 border border-gray-200">
                                    {/* Movie Poster Polaroid */}
                                    <Link href={`/movies/${item.tmdbId}`} passHref>
                                        <div className="aspect-[3/4] overflow-hidden mb-4 bg-gradient-to-br from-yellow-400 to-orange-500 relative">
                                            <Image
                                                src={item.posterUrl ? `https://image.tmdb.org/t/p/w500${item.posterUrl}` : NoImage}
                                                alt={item.title || "Movie Image"}
                                                width={200}
                                                height={300}
                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                            />
                                            
                                            {/* Play Overlay */}
                                            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-opacity duration-300 flex items-center justify-center">
                                                <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 transform group-hover:scale-110">
                                                    <MdPlayArrow size={48} className="text-white drop-shadow-lg" />
                                                </div>
                                            </div>
                                        </div>
                                    </Link>
                                    
                                    {/* Movie Title & Remove Button */}
                                    <div className="text-center space-y-3">
                                        <h3 className="font-semibold text-gray-900 text-sm line-clamp-2 leading-tight min-h-[2.5rem] flex items-center justify-center">
                                            {item.title}
                                        </h3>
                                        
                                        {/* <button
                                            onClick={() => removeFromWatchlist(item.movieId)}
                                            className="w-full bg-red-500 hover:bg-red-600 text-white font-medium py-2 px-3 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 group/btn transform hover:scale-105"
                                        >
                                            <MdDelete size={16} className="group-hover/btn:scale-110 transition-transform" />
                                            <span className="text-xs">Remove</span>
                                        </button> */}
                                    </div>
                                </div>
                                
                            </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TrendingMovies;
