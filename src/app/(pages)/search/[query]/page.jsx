"use client"
import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import MovieBlock from '@/app/components/MovieBlock/MovieBlock'

const SearchedItems = () => {
    const { query } = useParams();
    const [items, setItems] = useState([]);

    const searchMovie = async () => {
        try {
            const response = await fetch(`https://api.themoviedb.org/3/search/movie?api_key=${process.env.NEXT_PUBLIC_API_KEY}&query=${query}`);
            if (!response.ok) {
                console.log("Error fetching data");
                return;
            }
            const data = await response.json();
            // Filter out movies without a backdrop_path
            const filteredItems = data.results.filter(item => item.backdrop_path);
            setItems(filteredItems);
        } catch (error) {
            console.error("Error:", error);
            alert("An error occurred while fetching data.");
        }
    };

    useEffect(() => {
        searchMovie();
    }, [query]);

    return (
<div className="bg-gray-900 text-white p-6 shadow-lg w-full mx-auto">
  <h1 className="text-2xl font-bold mb-6">
    There are {items.length} results for <span className="text-blue-500">{query}</span>
  </h1>
  <div className="flex flex-col gap-6">
    {items.map((item, index) => (
      <div
        key={item.id}
        className="flex items-start gap-6 bg-gray-800 p-4 rounded-lg hover:shadow-xl transition-shadow"
      >
        <div className="flex-shrink-0">
          <MovieBlock item={item} key={index} />
        </div>
        <div className="flex flex-col gap-2">
          <h1 className="text-lg font-bold text-blue-400">{item.original_title}</h1>
          <p className="text-sm text-gray-300 line-clamp-3">{item.overview}</p>
        </div>
      </div>
    ))}
  </div>
</div>

    );
};

export default SearchedItems;
