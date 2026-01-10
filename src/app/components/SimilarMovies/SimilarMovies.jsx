'use client'
import { useEffect, useState, useRef } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

export default function SimilarMovies({ movieId, item }) {
  const [similar, setSimilar] = useState([]);
  const [directorId, setDirectorId] = useState("");
  const [error, setError] = useState(null);
  const scrollRef = useRef(null);
  const [loading , setLoading] = useState(false)

  const fetchRecommendedMovies = async () => {
    
    setLoading(true);
    setError(null);
    
    try {
      const res = await fetch(
        `https://api.themoviedb.org/3/movie/${movieId}/recommendations?api_key=${process.env.NEXT_PUBLIC_API_KEY}`
      );
      
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      
      const data = await res.json();
      
      console.log(data)
      
      setSimilar(data.results); // Limit to 20 movies

    } catch (err) {
      console.error("Failed to fetch director movies:", err);
      setError("Failed to load similar movies");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecommendedMovies();
  }, [item, movieId]);

  const scroll = (direction) => {
    if (scrollRef.current) {
      const scrollAmount = 300;
      scrollRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

  if (loading) {
    return (
      <div className="mt-8">
        <h2 className="text-2xl font-semibold mb-4 text-white">Similar Films</h2>
        <div className="flex gap-4 overflow-x-hidden">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="flex-shrink-0 w-32 h-48 rounded-lg bg-gray-700 animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  if (error || similar.length === 0) {
    // Optionally, you can return null to hide the section if no similar movies
    // return null;
    
    // Or show a fallback message:
    return (
      <div className="mt-8">
        <h2 className="text-2xl font-semibold mb-4 text-white">Similar Films</h2>
        <p className="text-gray-400">No similar movies found.</p>
      </div>
    );
  }

  return (
    <div className="mt-8">
      <h2 className="text-2xl font-bold mb-4 text-white">Similar Recommended Films</h2>

      <div className="relative group">
        {/* Left Arrow */}
        <button
          onClick={() => scroll("left")}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          aria-label="Scroll left"
        >
          <ChevronLeft size={20} />
        </button>

        {/* Right Arrow */}
        <button
          onClick={() => scroll("right")}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          aria-label="Scroll right"
        >
          <ChevronRight size={20} />
        </button>

        {/* Scrollable Container */}
        <div
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto scrollbar-hide pb-2"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {similar.map((movie) => (
            <Link
              href={`/movies/${movie.id}`}
              key={movie.id}
              className="flex-shrink-0 w-32 p-2 rounded-lg bg-gray-600 bg-clip-padding backdrop-filter backdrop-blur-sm bg-opacity-20 border border-gray-100 transition-colors duration-200 cursor-pointer hover:bg-opacity-30"
            >
              <div className="relative aspect-[2/3] mb-2">
                <Image
                  src={
                    `https://image.tmdb.org/t/p/w300${movie.poster_path}`
                  }
                  alt={movie.title || movie.name}
                  fill
                  className="rounded-md object-cover"
                  sizes="128px"
                />
              </div>
              <p className="text-xs font-medium text-white line-clamp-2 leading-tight">
                {movie.title || movie.name}
              </p>
            </Link>
          ))}
        </div>
      </div>

      {/* Custom CSS for hiding scrollbar */}
      <style jsx>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
}