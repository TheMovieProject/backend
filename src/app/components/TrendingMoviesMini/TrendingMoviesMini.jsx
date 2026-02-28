"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { FaStar , FaHeart } from "react-icons/fa";
import { Sparkles } from "lucide-react";
import { FaEye } from "react-icons/fa6";
import Link from "next/link"


const img = (path, size = 154) => {
  if (!path) return null
  if (/^(https?:)?\/\//.test(path)) return path
  return `https://image.tmdb.org/t/p/w${size}${path}`
}

export default function TrendingMoviesMini() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const controller = new AbortController()
    let alive = true

    ;(async () => {
      setLoading(true)
      setError(null)

      try {
        const res = await fetch("/api/trending_movies_week", { signal: controller.signal })
        if (!res.ok) {
          throw new Error(`Failed to fetch trending movies (${res.status})`)
        }
        const data = await res.json()
        if (!alive) return
        setItems(data.slice(0, 20))
      } catch (e) {
        if (!alive || e?.name === "AbortError") return
        setError(e?.message || "Failed to fetch trending movies.")
      } finally {
        if (alive) {
          setLoading(false)
        }
      }
    })()

    return () => {
      alive = false
      controller.abort()
    }
  }, [])

  return (
    <section className="border p-2 border-white/10 bg-gray-300 rounded-md bg-clip-padding backdrop-filter backdrop-blur-md bg-opacity-20">
      <div className="mb-5 flex items-center justify-between">
        <h3 className="flex items-center gap-3 text-white font-semibold text-lg">
          <Sparkles className="h-5 w-5 text-amber-400" />
          Trending Now
        </h3>
      </div>

      {/* Loading skeleton */}
      {loading && (
        <ul className="space-y-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <li key={i} className="flex items-center gap-4 p-2">
              <div className="h-14 w-10 rounded-lg bg-white/10 animate-pulse" />
              <div className="flex-1">
                <div className="h-4 w-32 rounded bg-white/10 animate-pulse mb-2" />
                <div className="h-3 w-20 rounded bg-white/10 animate-pulse" />
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Error */}
      {!loading && error && <p className="text-red-400/80 text-sm p-2">{error}</p>}

      {/* Empty */}
      {!loading && !error && items.length === 0 && <p className="text-white/50 text-sm p-2">No trending right now.</p>}

      {!loading && !error && items.length > 0 && (
        <ul className="space-y-3">
          {items.slice(0, 8).map((m, idx) => {
            const title = m.title || m.original_title || "Untitled"
            // const year = m.release_date ? new Date(m.release_date).getFullYear() : null
            const poster = img(m.posterPath || m.posterUrl, 154)
            const rating = m.avgRating7d ?? 0;
            const liked= m.likes7d ?? 0;
            const watchlisted = m.watchlist7d ?? 0;

            return (
              <Link href={`/movies/${m.tmdbId}`}
                key={m.id}
                className="group flex items-center gap-4 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-all duration-300 cursor-pointer border border-transparent hover:border-white/10"
              >
                {/* Poster */}
                <div className="h-14 w-10 overflow-hidden rounded-lg bg-white/10 flex-shrink-0 border border-white/10 group-hover:border-amber-400/40 transition-all duration-300">
                  {poster ? (
                    <Image
                      src={poster || "/img/logo.png"}
                      alt={title}
                      width={40}
                      height={56}
                      className="h-14 w-10 object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <span className="text-[8px] px-1 text-white/40 text-center line-clamp-3 flex items-center justify-center h-full">
                      {title}
                    </span>
                  )}
                </div>

                {/* Meta */}
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-white font-medium truncate group-hover:text-amber-300 transition-colors">
                    {title}
                  </div>
                  <div className="mt-1 flex items-center gap-3 text-xs text-white/60">
                    {/* {year && <span>{year}</span>} */}
                    <span className="flex items-center gap-1">
                      <FaStar className="h-3 w-3 text-amber-400" />
                      {rating.toFixed(1)}
                    </span>
                    <span className="flex items-center gap-1">
                      <FaHeart className="h-3 w-3 text-red-500" />
                      {liked}
                    </span>
                     <span className="flex items-center gap-1">
                      <FaEye className="h-3 w-3 text-blue-500" />
                      {watchlisted}
                    </span>
                  </div>
                </div>
              </Link>
            )
          })}
        </ul>
      )}
    </section>
  )
}
