// app/liked/LikedListClient.tsx
"use client";
import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { MdDelete, MdFavorite, MdPlayArrow } from "react-icons/md";
import { showToast } from "@/app/components/ui/toast";

export default function LikedListClient({ initialLikedList = [] }) {
  const [likedList, setLikedList] = useState(initialLikedList);

  async function removeByTmdbId(tmdbId) {
    const res = await fetch("/api/liked/remove", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ movieId: tmdbId }),
    });
    if (!res.ok) throw new Error("remove failed");
  }

  const unlike = async (tmdbId) => {
    // optimistic
    setLikedList(prev => prev.filter(x => x.movie.tmdbId !== tmdbId));
    try {
      await removeByTmdbId(tmdbId);
      showToast("Removed from Liked");
    } catch {
      showToast("Failed to remove", 1400);
      // rollback fetch could be added; for simplicity, refetch on page revisit
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-yellow-500 to-yellow-400 p-6 pt-20">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white">Liked Movies</h1>
        </div>

        {likedList.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-6 xl:grid-cols-6 gap-6">
            {likedList.map((item) => (
              <div key={item.id} className="group relative">
                <div className="bg-white shadow-lg hover:shadow-2xl transition-all duration-300 transform group-hover:-translate-y-2 p-4 border border-gray-200">
                  <Link href={`/movies/${item.movie.tmdbId}`} passHref>
                    <div className="aspect-[3/4] overflow-hidden mb-4 bg-gradient-to-br from-pink-400 to-red-500 relative">
                      <Image
                        src={item.movie.posterUrl || "/img/NoImage.png"}
                        alt={item.movie.title || "Movie"}
                        width={200}
                        height={300}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />

                      {/* Heart toggle to unlike */}
                      <button
                        onClick={(e) => { e.preventDefault(); unlike(item.movie.tmdbId); }}
                        className="absolute top-2 right-2 bg-red-500 text-white p-1.5 rounded-full shadow-lg hover:scale-110 transition-transform"
                        title="Unlike"
                        aria-label="Unlike"
                      >
                        <MdFavorite size={16} />
                      </button>

                      {/* Play overlay */}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors duration-300 flex items-center justify-center">
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 transform group-hover:scale-110">
                          <MdPlayArrow size={48} className="text-white drop-shadow-lg" />
                        </div>
                      </div>
                    </div>
                  </Link>

                  <div className="text-center space-y-3">
                    <h3 className="font-semibold text-gray-900 text-sm line-clamp-2 leading-tight min-h-[2.5rem] flex items-center justify-center">
                      {item.movie.title}
                    </h3>
                  </div>
                </div>

                {/* Optional explicit delete button */}
                <div className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10">
                  <button
                    onClick={() => unlike(item.movie.tmdbId)}
                    className="bg-gray-800 hover:bg-gray-900 text-white p-2 rounded-full shadow-lg transform hover:scale-110 transition-all duration-200"
                    title="Remove from liked list"
                  >
                    <MdDelete size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20 max-w-md">
              <h3 className="text-xl font-bold text-white mb-2">No Liked Movies Yet</h3>
              <p className="text-gray-300 mb-6">Start building your favorites collection by liking movies!</p>
              <Link
                href="/movies"
                className="bg-white/20 hover:bg-white/30 text-white font-semibold py-3 px-6 rounded-lg transition-all border border-white/30 hover:border-white/40 inline-flex items-center gap-2"
              >
                <MdPlayArrow size={20} />
                Discover Movies
              </Link>
            </div>
          </div>
        )}

        {likedList.length > 0 && (
          <div className="mt-12 text-center">
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20 inline-block">
              <h4 className="text-white font-semibold mb-2">Your Favorites Collection</h4>
              <div className="flex items-center justify-center gap-6 text-sm">
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">{likedList.length}</div>
                  <div className="text-white">Loved Movies</div>
                </div>
                <div className="w-px h-8 bg-white/30"></div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-200">
                    {Math.round((likedList.length / (likedList.length + 10)) * 100)}%
                  </div>
                  <div className="text-white">Taste Match</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
