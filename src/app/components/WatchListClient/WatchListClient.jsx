"use client";
import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { MdDelete, MdPlayArrow } from "react-icons/md";
import NoImage from '../../../../public/img/NoImage.jpg'

export default function WatchlistClient({ initialWatchlist = [] }) {
    const [watchlist, setWatchlist] = useState(initialWatchlist);

    async function removeFromWatchlist(movieId) {
        try {
            const response = await fetch('/api/watchlist/remove', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({  movieId: String(movieId)  }),
            });

            if (response.ok) {
                setWatchlist(watchlist.filter(item => item.movieId !== movieId));
                console.log("Movie removed from watchlist");
            } else {
                console.error("Failed to remove movie from watchlist");
            }
        } catch (error) {
            console.error("Error:", error);
        }
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-yellow-700 to-yellow-500 p-6 pt-20 font-sans">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="text-center mb-8"> 
                    <h1 className="text-4xl font-bold text-white mb-4">Watchlist</h1>
                    {/* <p className="text-lg text-gray-300">
                        {watchlist.length > 0 
                            ? `You have ${watchlist.length} movies to watch! 🎬` 
                            : "Your watchlist is waiting for amazing movies..."}
                    </p> */}
                </div>

                {/* Watchlist Grid */}
                {watchlist.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-6 gap-6">
                        {watchlist.map((item) => (
                            <div 
                                key={item.id} 
                                className="group relative"
                            >
                                {/* Polaroid-style Movie Card */}
                                <div className="bg-white  shadow-lg hover:shadow-2xl transition-all duration-300 transform group-hover:-translate-y-2 p-4 border border-gray-200">
                                    {/* Movie Poster Polaroid */}
                                    <Link href={`/movies/${item.movie.tmdbId}`} passHref>
                                        <div className="aspect-[3/4] overflow-hidden mb-4 bg-gradient-to-br from-yellow-400 to-orange-500 relative">
                                            <Image
                                                src={item.movie.posterUrl ? `https://image.tmdb.org/t/p/w500${item.movie.posterUrl}` : NoImage}
                                                alt={item.movie.title || "Movie Image"}
                                                width={200}
                                                height={300}
                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                            />
                                            
                                        </div>
                                    </Link>
                                    
                                    {/* Movie Title & Remove Button */}
                                    <div className="text-center space-y-3">
                                        <h3 className="font-semibold text-gray-900 text-sm line-clamp-2 leading-tight min-h-[2.5rem] flex items-center justify-center">
                                            {item.movie.title}
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

                                {/* Hover Remove Button - Alternative Position */}
                                <div className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10">
                                    <button
                                        onClick={() => removeFromWatchlist(item.movieId)}
                                        className="bg-red-500 hover:bg-red-600 text-white p-2 rounded-full shadow-lg transform hover:scale-110 transition-all duration-200"
                                        title="Remove from watchlist"
                                    >
                                        <MdDelete size={16} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    /* Empty State */
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20 max-w-md">
                            <div className="text-6xl mb-4">🎬</div>
                            <h3 className="text-xl font-bold text-white mb-2">Your Watchlist is Empty</h3>
                            <p className="text-gray-300 mb-6">
                                Start building your must-watch collection by adding movies you are excited to see!
                            </p>
                            <Link 
                                href="/movies"
                                className="bg-white/20 hover:bg-white/30 text-white font-semibold py-3 px-6 rounded-lg transition-all border border-white/30 hover:border-white/40 inline-flex items-center gap-2"
                            >
                                <MdPlayArrow size={20} />
                                Explore Movies
                            </Link>
                        </div>
                    </div>
                )}

                {/* Stats Footer */}
                {watchlist.length > 0 && (
                    <div className="mt-12 text-center">
                        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20 inline-block">
                            <h4 className="text-white font-semibold mb-2">Watchlist Summary</h4>
                            <div className="flex items-center justify-center gap-6 text-sm">
                                <div className="text-center">
                                    <div className="text-2xl font-bold text-white">{watchlist.length}</div>
                                    <div className="text-gray-300">Total Movies</div>
                                </div>
                                <div className="w-px h-8 bg-white/30"></div>
                                <div className="text-center">
                                    <div className="text-2xl font-bold text-white">
                                        {Math.ceil(watchlist.length * 2.5)}h
                                    </div>
                                    <div className="text-gray-300">Estimated Time</div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}