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
        <div>
            <h1 className="text-white text-2xl mb-4">Your Liked List</h1>
            <p>You have {likedList.length} movies you liked!!!</p>
            <p className="text-lg text-gray-300 text-center mb-8">
            {likedList.length > 0 
            ? `You liked ${likedList.length} movies!!!` 
               : "Your liked list is empty."}
            </p>
            {likedList.length > 0 && (<div className="grid grid-cols-5 gap-2 p-5">
                {likedList.length > 0 ? (
                    likedList.map((item) => (
                        <div key={item.id} className="relative">
                            <Link href={`/movies/${item.movie.tmdbId}`}>
                                <div className="relative h-[18rem] w-[12rem]">
                                    <Image
                                        width={100}
                                        height={100}
                                        className="absolute inset-0 h-full w-full object-cover"
                                        src={item.movie.posterUrl}
                                        alt={item.movie.title || "Movie Image"}
                                    />
                                    <div className="absolute inset-0 hover:bg-black hover:bg-opacity-50 flex items-end justify-center p-2">
                                        <button 
                                            onClick={(e) => {
                                                e.preventDefault(); // Prevent navigation
                                                removeFromLikedList(item.movieId);
                                            }} 
                                            className="bg-red-500 text-white px-2 py-1">
                                            Remove From Liked List
                                        </button>
                                    </div>
                                </div>
                            </Link>
                        </div>
                    ))
                ) : (
                    <p className="text-white">Your liked list is empty.</p>
                )}
            </div>)}
        </div>
    );
}
