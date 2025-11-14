"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Image from "next/image";
import { Menu, X, Search } from "lucide-react";
import Logout from "../Logout/Logout";
import logo from '../../../../public/img/logo.png'
import gsap from "gsap";

export default function Navbar() {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const router = useRouter();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [scrolled, setScrolled] = useState(false);

  const searchOverlayRef = useRef(null);
  const searchInputRef = useRef(null);
  const navbarRef = useRef(null);

  // Scroll effect for glassmorphism
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // GSAP Animation for Search Overlay
  useEffect(() => {
    if (!searchOverlayRef.current) return;

    if (searchOpen) {
      // Animate in
      gsap.fromTo(searchOverlayRef.current,
        { 
          y: -100,
          opacity: 0,
          scale: 0.95
        },
        { 
          y: 0,
          opacity: 1,
          scale: 1,
          duration: 0.4,
          ease: "power2.out"
        }
      );
      
      // Focus input after animation
      setTimeout(() => {
        if (searchInputRef.current) {
          searchInputRef.current.focus();
        }
      }, 400);
    } else {
      // Animate out
      gsap.to(searchOverlayRef.current, {
        y: -100,
        opacity: 0,
        scale: 0.95,
        duration: 0.3,
        ease: "power2.in"
      });
    }
  }, [searchOpen]);

  const openSearch = () => {
    setSearchOpen(true);
  };

  const closeSearch = () => {
    setSearchOpen(false);
    setQuery("");
  };

  async function submitSearch(e) {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;

    router.push(`/search/${encodeURIComponent(q)}`);
    setQuery("");
    setSearchOpen(false);
    setMobileOpen(false);
  }

  const handleSearchKeyDown = (e) => {
    if (e.key === 'Escape') {
      closeSearch();
    }
  };

  // if (status === "loading") {
  //   return (
  //     <div className="fixed top-0 left-0 right-0 z-50 flex h-16 items-center justify-center bg-yellow-600 text-white">
  //       Loading…
  //     </div>
  //   );
  // }

  const mainLinks = [
    { href: "/", label: "Home" },
    { href: "/movies", label: "Movies" },
    { href: "/write", label: "Write" },
    { href: "/theater", label: "Theater" }
  ];

  return (
    <>
      {/* Top Bar with Glassmorphism on Scroll */}
      <div 
        ref={navbarRef}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          scrolled 
            ? 'bg-white/10 backdrop-blur-xl shadow-lg' 
            : 'bg-transparent'
        }`}
      >
        <div className="flex justify-between items-center h-16 px-6">
          {/* Left: Hamburger Menu */}
          <div className="flex-1 flex justify-start">
            <button
              onClick={() => setMobileOpen(true)}
              className={`transition-colors duration-300 ${
                scrolled 
                  ? 'text-white hover:text-gray-200' 
                  : 'text-white hover:opacity-80'
              }`}
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>

          {/* Center: Small Logo */}
          <div className="flex-1 flex justify-center">
            <Link 
              href="/" 
              className="flex items-center gap-2 text-white hover:opacity-80 transition-opacity duration-300"
            >
              <Image 
                src={logo} 
                alt="Movie Project Logo" 
                width={16} 
                height={16} 
              />
              <span className="text-xs font-light tracking-widest text-white">
                MOVIE PROJECT
              </span>
            </Link>
          </div>

          {/* Right: Search Button */}
          <div className="flex-1 flex justify-end">
            <button
              onClick={openSearch}
              className={`transition-colors duration-300 group ${
                scrolled 
                  ? 'text-white hover:text-gray-200' 
                  : 'text-white hover:opacity-80'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className={`text-xs font-light tracking-widest transition-all duration-300 ${
                  scrolled 
                    ? 'text-white opacity-0 group-hover:opacity-70' 
                    : 'text-white opacity-0 group-hover:opacity-100'
                }`}>
                  SEARCH
                </span>
                <Search className="h-5 w-5" />
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Search Overlay - Glassmorphism */}
      {searchOpen && (
        <div 
          ref={searchOverlayRef}
          className="fixed top-0 left-0 right-0 z-[60] bg-white/10 backdrop-blur-xl border-b border-white/20 h-[20%]"
        >
          <div className="flex items-center h-16 px-6">
            {/* Close Button */}
            <button
              onClick={closeSearch}
              className="text-white hover:text-gray-200 transition-colors mr-4"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Search Form */}
            <form onSubmit={submitSearch} className="flex-1 outline-none">
              <input
                ref={searchInputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                placeholder="Search movies or users..."
                className="w-full bg-transparent border-b border-white/30 px-2 py-2 text-white placeholder:text-white/50 outline-none focus:outline-none focus:border-white/60 transition-colors text-lg"
              />
            </form>

            {/* Search Button in Overlay */}
            <button
              onClick={submitSearch}
              className="text-white hover:text-gray-200 transition-colors ml-4"
            >
              <Search className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}

      {/* Mobile Menu - Glassmorphism */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xl">
          {/* Close Button */}
          <button
            onClick={() => setMobileOpen(false)}
            className="absolute top-4 right-6 text-white hover:text-gray-200 z-50 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>

          {/* Menu Content */}
          <div className="flex flex-col items-center justify-center h-full px-6">
            {/* Navigation Links */}
            {session? <div className="flex flex-col items-center gap-8 mb-16">
              {mainLinks.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={() => setMobileOpen(false)}
                  className="text-2xl text-white/80 hover:text-white transition-colors font-light"
                >
                  {l.label}
                </Link>
              ))}
            </div>:(<>
            <Image width={70} height={70} src={logo} className="mb-20"/>
            </>)}

            {/* User Section */}
            {session ? (
              <div className="flex flex-col items-center gap-6 border-t border-white/20 pt-8">
                <Link
                  href={`/profile/${session.user.id}`}
                  onClick={() => setMobileOpen(false)}
                  className="text-white/80 hover:text-white transition-colors"
                >
                  Profile
                </Link>
                <Link
                  href="/watchlist"
                  onClick={() => setMobileOpen(false)}
                  className="text-white/80 hover:text-white transition-colors"
                >
                  Watchlist
                </Link>
                <Link
                  href="/liked"
                  onClick={() => setMobileOpen(false)}
                  className="text-white/80 hover:text-white transition-colors"
                >
                  Liked
                </Link>
                <div className="mt-4">
                  <Logout />
                </div>
              </div>
            ) : (
              <div className="flex gap-8 border-t border-white/20 pt-8">
                <Link
                  href="/login"
                  onClick={() => setMobileOpen(false)}
                  className="text-white/80 hover:text-white transition-colors"
                >
                  Log in
                </Link>
                <Link
                  href="/signup"
                  onClick={() => setMobileOpen(false)}
                  className="text-white/80 hover:text-white transition-colors"
                >
                  Sign up
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}