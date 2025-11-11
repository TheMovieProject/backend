'use client'
import { useEffect, useState, useRef } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
export default function SimilarMovies({ movieId }) {
  const [similar, setSimilar] = useState([]);
  const scrollRef = useRef(null);

  useEffect(() => {
    const fetchSimilar = async () => {
      try {
        const res = await fetch(`/api/movies/${movieId}/similar`);
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        const data = await res.json();
        setSimilar(data);
      } catch (err) {
        console.error("Failed to fetch similar movies:", err);
      } 
    };
    
    if (movieId) fetchSimilar();
  }, [movieId]);

  const scroll = (direction) => {
    if (scrollRef.current) {
      const scrollAmount = 300;
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  if (similar.length === 0) {
    return null;
  }

  return (
    <div className="mt-8">
      <h2 className="text-2xl font-semibold mb-4 text-white">Similar Films</h2>
      
      <div className="relative group">
        {/* Left Arrow */}
        <button
          onClick={() => scroll('left')}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          aria-label="Scroll left"
        >
          <ChevronLeft size={20} />
        </button>

        {/* Right Arrow */}
        <button
          onClick={() => scroll('right')}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          aria-label="Scroll right"
        >
          <ChevronRight size={20} />
        </button>

        {/* Scrollable Container */}
        <div
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto scrollbar-hide pb-2"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {similar.map((movie) => (
            <Link href={`/movies/${movie.id}`}
              key={movie.id}
              className="flex-shrink-0 w-32  p-2 rounded-lg bg-gray-600 bg-clip-padding backdrop-filter backdrop-blur-sm bg-opacity-20 border border-gray-100 transition-colors duration-200 cursor-pointer"
            >
              <div className="relative aspect-[2/3] mb-2">
                <Image
                  src={
                    movie.poster_path
                      ? `https://image.tmdb.org/t/p/w300${movie.poster_path}`
                      : '/img/no-poster.png'
                  }
                  alt={movie.title}
                  fill
                  className="rounded-md object-cover"
                  sizes="128px"
                />
              </div>
              <p className="text-xs font-medium text-white line-clamp-2 leading-tight">
                {movie.title}
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
