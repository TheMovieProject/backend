"use client"
import React, { useState } from "react"
import Link from "next/link"
import { useSession } from "next-auth/react"
import { Menu, X, Search } from "lucide-react"
import Logout from "../Logout/Logout"
import NotificationBell from '../Notification/Notification'

const Navbar = () => {
  const [query, setQuery] = useState("")
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const { data: session, status } = useSession()

  if (status === "loading") {
    return <div className="flex justify-center items-center h-16 bg-gray-800 text-white">Loading...</div>
  }

  const navItems = [
    { href: "/", label: "Home" },
    { href: "/watchlist", label: "Watchlist" },
    { href: "/liked", label: "Liked/Film Collection" },
    {href: "", label: <NotificationBell/> },
    { href: "/poll", label: "Poll" },
    { href: "/profile", label: "Profile" },
    { href: "/write", label: "Write" },
  ]

  return (
    <nav className="bg-gray-800 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <Link href="/" className="flex-shrink-0 text-xl font-bold">
              MovieApp
            </Link>
          </div>
          {session ? (
            <>
              <div className="hidden lg:block">
                <div className="ml-10 flex items-baseline space-x-4">
                  {navItems.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="hover:bg-gray-700 px-3 py-2 rounded-md text-sm font-medium"
                      onClick={(e) => {
                        e.preventDefault()
                        window.location.href = item.href
                      }}
                    >
                      {item.label}
                    </Link>
                  ))}
                  <Logout />
                </div>
              </div>
              <div className="hidden lg:block">
                <div className="ml-4 flex items-center md:ml-6">
                  <div className="relative">
                    <input
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      type="text"
                      placeholder="Search a Movie..."
                      className="bg-gray-700 text-white rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-white"
                    />
                    <Link href={`/search/${query}`}>
                      <button className="absolute right-0 top-0 mt-2 mr-2">
                        <Search className="h-5 w-5 text-gray-400" />
                      </button>
                    </Link>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="hidden lg:block">
              <div className="ml-10 flex items-baseline space-x-4">
                <Link href="/login" className="hover:bg-gray-700 px-3 py-2 rounded-md text-sm font-medium">
                  Login
                </Link>
                <Link href="/signup" className="hover:bg-gray-700 px-3 py-2 rounded-md text-sm font-medium">
                  Signup
                </Link>
              </div>
            </div>
          )}
          <div className="-mr-2 flex lg:hidden">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-white hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-white"
            >
              <span className="sr-only">Open main menu</span>
              {isMenuOpen ? <X className="block h-6 w-6" /> : <Menu className="block h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {isMenuOpen && (
        <div className="lg:hidden">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            {session ? (
              <>
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="hover:bg-gray-700 block px-3 py-2 rounded-md text-base font-medium"
                    onClick={(e) => {
                      e.preventDefault()
                      window.location.href = item.href
                      setIsMenuOpen(false)
                    }}
                  >
                    {item.label}
                  </Link>
                ))}
                <div className="mt-4">
                  <Logout />
                </div>
                <div className="mt-4 relative">
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    type="text"
                    placeholder="Search a Movie..."
                    className="w-full bg-gray-700 text-white rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-white"
                  />
                  <Link href={`/search/${query}`}>
                    <button className="absolute right-0 top-0 mt-2 mr-2" onClick={() => setIsMenuOpen(false)}>
                      <Search className="h-5 w-5 text-gray-400" />
                    </button>
                  </Link>
                </div>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="hover:bg-gray-700 block px-3 py-2 rounded-md text-base font-medium"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Login
                </Link>
                <Link
                  href="/signup"
                  className="hover:bg-gray-700 block px-3 py-2 rounded-md text-base font-medium"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Signup
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  )
}

export default Navbar