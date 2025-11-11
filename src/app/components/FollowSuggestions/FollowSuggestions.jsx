"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { Users } from "lucide-react"

export default function FollowSuggestions() {
  const [users, setUsers] = useState([])

  useEffect(() => {
    const fetchSuggestions = async () => {
      try {
        const res = await fetch("/api/suggestions")
        if (!res.ok) throw new Error("Failed to fetch suggestions")
        const data = await res.json()
        setUsers(data)
      } catch (err) {
        console.error(err)
      }
    }
    fetchSuggestions()
  }, [])

  if (!users.length) return null

  return (
    <section className="bg-black border border-white/10 rounded-2xl p-6 backdrop-blur-sm">
      <div className="mb-5 flex items-center justify-between">
        <h3 className="flex items-center gap-3 text-white font-semibold text-lg">
          <Users className="h-5 w-5 text-purple-400" />
          Suggested for You 
        </h3>
      </div>

      <ul className="space-y-3">
        {users.map((u) => (
          <li key={u.id} className="group">
            <Link
              href={`/profile/${u.id}`}
              className="flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-all duration-300 border border-transparent hover:border-white/10"
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="h-12 w-12 rounded-full overflow-hidden bg-white/10 flex-shrink-0 border-2 border-white/20 group-hover:border-purple-400/60 transition-all duration-300">
                  <Image
                    src={u.avatarUrl || "/img/profile.png"}
                    alt={u.username}
                    width={48}
                    height={48}
                    className="object-cover w-full h-full group-hover:scale-110 transition-transform duration-300"
                  />
                </div>
                <div className="min-w-0">
                  <p className="text-sm text-white font-medium truncate group-hover:text-purple-300 transition-colors">
                    {u.username}
                  </p>
                  <p className="text-xs text-white/60 mt-1">{u.followersCount} followers</p>
                </div>
              </div>
              <button className="ml-2 text-xs font-medium px-4 py-2 rounded-full border border-purple-500/40 bg-purple-500/10 text-purple-300 hover:border-purple-500/80 hover:bg-purple-500/20 transition-all duration-300 whitespace-nowrap hover:scale-105">
                Follow
              </button>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}