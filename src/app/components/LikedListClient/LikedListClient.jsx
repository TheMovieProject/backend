"use client";
import { useState } from "react";
import Image from "next/image";
import Link from "next/link";

export default function LikedListClient({ initialLikedList = [] }) {
    const [likedList, setLikedList] = useState(initialLikedList);

    async function removeFromLikedList(movieId) {
        try {
            const response = await fetch('/api/liked/remove', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ movieId }),
            });

            if (response.ok) {
                setLikedList(likedList.filter(item => item.movieId !== movieId));
                console.log("Movie removed from liked list");
            } else {
                console.error("Failed to remove movie from liked list");
            }
        } catch (error) {
            console.error("Error:", error);
        }
    }

    return (
        <div className="bg-gray-900 h-screen text-white p-6 shadow-md w-full mx-auto">
            <h1 className="text-3xl font-bold mb-6 text-center">Your Liked List</h1>
            <p className="text-lg text-gray-300 text-center mb-8">
                {likedList.length > 0 
                    ? `You liked ${likedList.length} movies!!!` 
                    : "Your liked list is empty."}
            </p>

            {likedList.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-6">
                    {likedList.map((item) => (
                        <div 
                            key={item.id} 
                            className="relative group rounded-lg overflow-hidden shadow-lg transform transition-transform duration-200 hover:scale-105"
                        >
                            <Link href={`/movies/${item.movie.tmdbId}`} passHref>
                                <div className="relative h-[18rem] w-full">
                                    <Image
                                        width={300}
                                        height={200}
                                        className="absolute inset-0 h-full w-full object-cover rounded-lg"
                                        src={item.movie.posterUrl}
                                        alt={item.movie.title || "Movie Image"}
                                    />
                                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-opacity duration-200 flex items-end justify-center p-4">
                                        <button
                                            onClick={(e) => {
                                                e.preventDefault(); // Prevent navigation
                                                removeFromLikedList(item.movieId);
                                            }}
                                            className="bg-red-500 hover:bg-red-600 text-white px-3 py-2 rounded-md shadow-md"
                                        >
                                            Remove From Liked List
                                        </button>
                                    </div>
                                </div>
                            </Link>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
