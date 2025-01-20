'use client'
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Image from 'next/image';

const api_key = '095ba7f7fba6c8e94aa5f385a319cea7'
const requests = {
  requestNowPlaying: `https://api.themoviedb.org/3/movie/popular?api_key=${api_key}&language=en-US&page=1`,
};

const Page = () => {
  const [recentMovies, setRecentMovies] = useState([]);
  const [loading, setLoading] = useState(true);

  const isWithinLast7Days = (releaseDate) => {
    const today = new Date();
    const release = new Date(releaseDate);
    const diffInDays = (today - release) / (1000 * 60 * 60 * 24);
    return diffInDays >= 0 && diffInDays <= 365;
  };

  useEffect(() => {
    const fetchMovies = async () => {
      try {
        const response = await axios.get(requests.requestNowPlaying);
        const allMovies = response.data.results;
        const recent = allMovies.filter((movie) =>
          isWithinLast7Days(movie.release_date)
        );
        setRecentMovies(recent);
      } catch (error) {
        console.error('Error fetching movies:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMovies();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl md:text-4xl font-bold text-center mb-8 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-600">
          Recently Released Movies
        </h1>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : recentMovies.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {recentMovies.map((movie) => (
              <div
                key={movie.id}
                className="group relative bg-gray-800 rounded-xl overflow-hidden transform transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-blue-500/20"
              >
                <div className="aspect-[2/3] relative">
                  <Image
                    width={500}
                    height={750}
                    src={`https://image.tmdb.org/t/p/w500${movie.poster_path}`}
                    alt={movie.title}
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                </div>
                
                <div className="p-4">
                  <h2 className="text-lg font-semibold mb-2 line-clamp-2 group-hover:text-blue-400 transition-colors">
                    {movie.title}
                  </h2>
                  <p className="text-sm text-gray-400">
                    Released: {new Date(movie.release_date).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>

                <div className="absolute top-2 right-2 bg-blue-600 text-white text-sm px-2 py-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  {movie.vote_average.toFixed(1)} ★
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center text-gray-400 py-12">
            <p className="text-xl">No movies released in the last 7 days.</p>
            <p className="mt-2">Check back soon for new releases!</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Page;