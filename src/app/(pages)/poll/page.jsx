'use client'
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Image from 'next/image';

const api_key='095ba7f7fba6c8e94aa5f385a319cea7'
const requests = {
  requestNowPlaying: `https://api.themoviedb.org/3/movie/popular?api_key=${api_key}&language=en-US&page=1`,
};

const Page = () => {
  const [recentMovies, setRecentMovies] = useState([]);
  const [loading, setLoading] = useState(true);

  // Helper function to calculate if a date is within the past 7 days
  const isWithinLast7Days = (releaseDate) => {
    const today = new Date();
    const release = new Date(releaseDate);
    const diffInDays = (today - release) / (1000 * 60 * 60 * 24);
    return diffInDays >= 0 && diffInDays <= 365; // Ensure the release date is not in the future
  };

  useEffect(() => {
    const fetchMovies = async () => {
      try {
        const response = await axios.get(requests.requestNowPlaying);
        const allMovies = response.data.results;
        // Filter movies released within the last 7 days
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
    <div className="p-2">
      <div>
        <h1 className="text-[1.6rem] font-bold text-center">Recently Released Movies</h1>
      </div>
      <div>
        {loading ? (
          <p className="text-center">Loading...</p>
        ) : recentMovies.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-4">
            {recentMovies.map((movie) => (
              <div
                key={movie.id}
                className="border p-2 rounded shadow-sm hover:shadow-lg transition"
              >
                <Image
                width={100}
                height={100}
                  src={`https://image.tmdb.org/t/p/w500${movie.poster_path}`}
                  alt={movie.title}
                  className="w-full h-[300px] object-cover rounded"
                />
                <h2 className="text-lg font-semibold mt-2">{movie.title}</h2>
                <p className="text-sm text-gray-600">
                  Released: {movie.release_date}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center">No movies released in the last 7 days.</p>
        )}
      </div>
    </div>
  );
};

export default Page;
