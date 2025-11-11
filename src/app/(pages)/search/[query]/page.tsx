"use client"

import React, { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import MovieBlock from "@/app/components/MovieBlock/MovieBlock"
import { Users, Film, Search, User } from "lucide-react"

const PERSON_FALLBACK =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 400'><rect width='100%' height='100%' fill='#1f2937'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='#9ca3af' font-family='sans-serif' font-size='16'>No Avatar</text></svg>`
  )

type SiteUser = {
  id: string
  username: string
  name?: string | null
  avatarUrl?: string | null
  image?: string | null
}

export default function SearchedItems() {
  const { query } = useParams()
  const q = Array.isArray(query) ? query.join(" ") : (query ?? "")

  const [movies, setMovies] = useState<any[]>([])
  const [users, setUsers] = useState<SiteUser[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!q) return
    const fetchAll = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const movieReq = fetch(
          `https://api.themoviedb.org/3/search/movie?api_key=${process.env.NEXT_PUBLIC_API_KEY}&query=${encodeURIComponent(
            q
          )}&include_adult=false`
        )
        const userReq = fetch(
          `/api/user/lookup?query=${encodeURIComponent(q)}&limit=24`
        )

        const [mr, ur] = await Promise.all([movieReq, userReq])

        if (!mr.ok) throw new Error("Failed to fetch movies")
        const movieData = await mr.json()
        const filteredMovies = (movieData?.results ?? []).filter((m: any) => m.backdrop_path)
        setMovies(filteredMovies)

        if (ur.ok) {
          const usersData: SiteUser[] = await ur.json()
          setUsers(Array.isArray(usersData) ? usersData : [])
        } else {
          setUsers([])
        }
      } catch (e) {
        console.error(e)
        setError("An error occurred while fetching results. Please try again.")
      } finally {
        setIsLoading(false)
      }
    }
    fetchAll()
  }, [q])

  if (isLoading) {
    return ( 
      <div className="flex justify-center items-center h-screen bg-gradient-to-br from-yellow-700 to-yellow-500">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-yellow-500 mx-auto mb-4" />
          <p className="text-yellow-400 text-lg">Searching for {q}...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-screen bg-gradient-to-br from-yellow-700 to-yellow-500 text-white">
        <div className="text-center p-8 bg-gradient-to-r from-red-500/10 to-red-600/10 rounded-2xl border border-red-500/20 max-w-md">
          <p className="text-xl text-red-400 mb-2">Search Error</p>
          <p className="text-gray-300">{error}</p>
        </div>
      </div>
    )
  }

  const total = movies.length + users.length

  return (
    <div className="bg-gradient-to-br from-yellow-700 to-yellow-500 text-white min-h-screen p-6 pt-20">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex flex-row gap-2 rounded-2xl w-full">
            <p className="text-md text-gray-300">
              {total} {total === 1 ? "result" : "results"} for
            </p>
            <p className="text-md md:text-md font-bold text-yellow-400 break-words">
              &quot;{q}&quot;
            </p>
          </div>
        </div>

        {/* Users Section */}
        {users.length > 0 && (
          <section className="mb-16">
            <div className="flex items-center gap-3 mb-8">
              <div className="p-2 bg-yellow-500/20 rounded-lg">
                <Users className="h-6 w-6 text-yellow-400" />
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-white">
                Users <span className="text-yellow-400 ml-2">({users.length})</span>
              </h2>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
              {users.map((u) => {
                const avatar = u.avatarUrl || u.image || PERSON_FALLBACK
                return (
                  <Link
                    key={u.id}
                    href={`/profile/${u.id}`}
                    className="group bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl overflow-hidden hover:from-yellow-500/10 hover:to-yellow-600/10 transition-all duration-300 border border-yellow-500/20 hover:border-yellow-500/40 hover:shadow-2xl hover:shadow-yellow-500/10"
                  >
                    <div className="relative aspect-square">
                      <Image
                        src={avatar}
                        alt={u.username || u.name || "User"}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                        sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 16vw"
                        unoptimized={avatar === PERSON_FALLBACK}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <User className="h-5 w-5 text-yellow-400" />
                      </div>
                    </div>
                    <div className="p-4 text-center">
                      <h3 className="font-bold text-white group-hover:text-yellow-400 transition-colors duration-300 line-clamp-1 text-sm md:text-base">
                        {u.username || u.name || "User"}
                      </h3>
                      {u.name && u.username && (
                        <p className="text-xs text-gray-400 mt-1">@{u.username}</p>
                      )}
                    </div>
                  </Link>
                )
              })}
            </div>
          </section>
        )}

        {/* Movies Section */}
        {movies.length > 0 && (
          <section className="mb-16">
            <div className="flex items-center gap-3 mb-8">
              <div className="p-2 bg-yellow-500/20 rounded-lg">
                <Film className="h-6 w-6 text-yellow-400" />
              </div>
              <h2 className="text-md md:text-md font-bold text-white">
                Movies <span className="text-yellow-400 ml-2">({movies.length})</span>
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 xl:grid-cols-5 gap-8">
              {movies.map((item, index) => (
                <MovieBlock key={item.id} item={item} index={index} />
              ))}
            </div>
          </section>
        )}

        {/* Empty State */}
        {total === 0 && (
          <div className="text-center py-20">
            <div className="bg-gradient-to-r from-yellow-500/10 to-yellow-600/10 border border-yellow-500/20 rounded-2xl p-12 max-w-2xl mx-auto">
              <Search className="h-16 w-16 text-yellow-400 mx-auto mb-6" />
              <h3 className="text-2xl md:text-3xl font-bold text-white mb-4">
                No Results Found
              </h3>
              <p className="text-gray-300 text-lg mb-2">
                We could not find any matches for <span className="text-yellow-400">&quot;{q}&quot;</span>
              </p>
              <p className="text-gray-400">
                Try adjusting your search terms or explore different keywords.
              </p>
            </div>
          </div>
        )}

        {/* Results Summary */}
        {/* {total > 0 && (
          <div className="text-center mt-12">
            <div className="bg-gradient-to-r from-yellow-500/10 to-yellow-600/10 border border-yellow-500/20 rounded-2xl p-6 inline-block">
              <p className="text-gray-300">
                Found <span className="text-yellow-400 font-bold">{total}</span> total results
                {users.length > 0 && (
                  <span className="mx-2">•</span>
                )}
                {users.length > 0 && (
                  <span>{users.length} user{users.length !== 1 ? 's' : ''}</span>
                )}
                {movies.length > 0 && users.length > 0 && (
                  <span className="mx-2">•</span>
                )}
                {movies.length > 0 && (
                  <span>{movies.length} movie{movies.length !== 1 ? 's' : ''}</span>
                )}
              </p>
            </div>
          </div>
        )} */}
      </div>
    </div>
  )
}