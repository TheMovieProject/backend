"use client";

import React, { useDeferredValue, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Image from "next/image";
import { Menu, Search, X } from "lucide-react";
import gsap from "gsap";
import Logout from "../Logout/Logout";
import NotificationBell from "../Notification/Notification";
import logo from "../../../../public/img/logo.png";

const PROJECT_ICON = "/img/logo.png";

export default function Navbar() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const router = useRouter();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [scrolled, setScrolled] = useState(false);
  const [searchRec, setSearchRec] = useState([]);
  const deferredQuery = useDeferredValue(query);

  const searchOverlayRef = useRef(null);
  const searchInputRef = useRef(null);
  const navbarRef = useRef(null);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (!searchOverlayRef.current) return;

    if (searchOpen) {
      gsap.fromTo(
        searchOverlayRef.current,
        {
          y: -100,
          opacity: 0,
          scale: 0.95,
        },
        {
          y: 0,
          opacity: 1,
          scale: 1,
          duration: 0.4,
          ease: "power2.out",
        }
      );

      const focusTimer = setTimeout(() => {
        searchInputRef.current?.focus();
      }, 400);

      return () => clearTimeout(focusTimer);
    }

    gsap.to(searchOverlayRef.current, {
      y: -100,
      opacity: 0,
      scale: 0.95,
      duration: 0.3,
      ease: "power2.in",
    });
  }, [searchOpen]);

  useEffect(() => {
    const targets = session?.user?.id
      ? [
          "/",
          "/movies",
          "/write",
          `/profile/${session.user.id}`,
          "/watchlist",
          "/liked",
          "/watchlists",
        ]
      : ["/", "/login"];

    for (const href of targets) {
      if (href !== pathname) {
        router.prefetch(href);
      }
    }
  }, [pathname, router, session]);

  useEffect(() => {
    const trimmedQuery = deferredQuery.trim();
    if (trimmedQuery.length < 2) {
      setSearchRec([]);
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://api.themoviedb.org/3/search/movie?api_key=${process.env.NEXT_PUBLIC_API_KEY}&query=${encodeURIComponent(
            trimmedQuery
          )}`,
          { signal: controller.signal }
        );

        if (!res.ok) {
          throw new Error(`Search request failed (${res.status})`);
        }

        const data = await res.json();
        const seenIds = new Set();
        const items = [];

        for (const item of data?.results || []) {
          if (!item?.id || seenIds.has(item.id)) continue;
          seenIds.add(item.id);
          items.push(item);
        }

        setSearchRec(
          items
            .sort((a, b) => (b?.vote_count || 0) - (a?.vote_count || 0))
            .slice(0, 8)
        );
      } catch (error) {
        if (error?.name === "AbortError") return;
        console.error("Navbar search recommendations failed", error);
      }
    }, 250);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [deferredQuery]);

  const openSearch = () => {
    setSearchOpen(true);
  };

  const closeSearch = () => {
    setSearchOpen(false);
    setQuery("");
    setSearchRec([]);
  };

  const submitSearch = (event) => {
    event.preventDefault();
    const trimmedQuery = query.trim();
    if (!trimmedQuery) return;

    router.push(`/search/${encodeURIComponent(trimmedQuery)}`);
    setQuery("");
    setSearchRec([]);
    setSearchOpen(false);
    setMobileOpen(false);
  };

  const handleSearchKeyDown = (event) => {
    if (event.key === "Escape") {
      closeSearch();
    }
  };

  const mainLinks = [
    { href: "/", label: "Home" },
    { href: "/movies", label: "Movies" },
    { href: "/write", label: "Write" },
  ];

  return (
    <>
      <div
        ref={navbarRef}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          scrolled ? "bg-white/10 backdrop-blur-xl shadow-lg" : "bg-transparent"
        }`}
      >
        <div className="flex justify-between items-center h-16 px-6">
          <div className="flex-1 flex justify-start">
            <button
              onClick={() => setMobileOpen(true)}
              className={`transition-colors duration-300 ${
                scrolled ? "text-white hover:text-gray-200" : "text-white hover:opacity-80"
              }`}
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>

          <div className="flex-1 flex justify-center">
            <Link
              href="/"
              prefetch
              className="flex items-center gap-2 text-white hover:opacity-80 transition-opacity duration-300"
            >
              <Image src={logo} alt="Movie Project Logo" width={16} height={16} />
              <span className="text-xs font-light tracking-widest text-white">
                MOVIE PROJECT
              </span>
            </Link>
          </div>

          <div className="flex-1 flex justify-end">
            <div className="flex items-center gap-3">
              {session ? <NotificationBell /> : null}
              <button
                onClick={openSearch}
                className={`transition-colors duration-300 group ${
                  scrolled ? "text-white hover:text-gray-200" : "text-white hover:opacity-80"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs font-light tracking-widest transition-all duration-300 ${
                      scrolled
                        ? "text-white opacity-0 group-hover:opacity-70"
                        : "text-white opacity-0 group-hover:opacity-100"
                    }`}
                  >
                    SEARCH
                  </span>
                  <Search className="h-5 w-5" />
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>

      {searchOpen && (
        <div
          ref={searchOverlayRef}
          className="fixed top-0 left-0 right-0 z-[60] bg-white/10 backdrop-blur-xl border-b border-white/20 py-4"
        >
          <div className="flex items-center h-16 px-6">
            <button
              onClick={closeSearch}
              className="text-white hover:text-gray-200 transition-colors mr-4"
            >
              <X className="h-5 w-5" />
            </button>

            <form onSubmit={submitSearch} className="flex w-full gap-3 items-center outline-none">
              <input
                ref={searchInputRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={handleSearchKeyDown}
                placeholder="Search movies or users..."
                className="w-[90%] bg-transparent border-b border-white/30 px-2 py-2 text-white placeholder:text-white/50 outline-none focus:outline-none focus:border-white/60 transition-colors text-lg"
              />
              <button type="button" onClick={() => setQuery("")} className="cursor-pointer">
                CLEAR
              </button>
              <button
                type="submit"
                className="text-white hover:text-gray-200 transition-colors ml-4"
              >
                <Search className="h-5 w-5" />
              </button>
            </form>
          </div>

          <div>
            {searchRec.map((rec) => (
              <Link
                key={rec.id}
                href={`/movies/${rec.id}`}
                prefetch
                onClick={() => closeSearch()}
                className="flex items-center gap-2 bg-white/10 hover:bg-yellow-600/50 backdrop-blur-xl border-b border-white/20 p-2 cursor-pointer"
              >
                <div>
                  <Image
                    height={500}
                    width={500}
                    className="w-[2rem] h-[2.5rem] rounded-md object-contain"
                    src={
                      rec.poster_path
                        ? `https://image.tmdb.org/t/p/w500${rec.poster_path}`
                        : PROJECT_ICON
                    }
                    alt={rec.title || "Movie"}
                  />
                </div>
                <div className="font-bold">{rec.title}</div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {mobileOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xl">
          <button
            onClick={() => setMobileOpen(false)}
            className="absolute top-4 right-6 text-white hover:text-gray-200 z-50 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>

          <div className="flex flex-col items-center justify-center h-full px-6">
            {session ? (
              <div className="flex flex-col items-center gap-8 mb-16">
                {mainLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    prefetch
                    onClick={() => setMobileOpen(false)}
                    className="text-2xl text-white/80 hover:text-white transition-colors font-bold"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            ) : (
              <Image width={70} height={70} src={logo} alt="Movie Project Logo" className="mb-20" />
            )}

            {session ? (
              <div className="flex flex-col items-center gap-6 border-t border-white/20 pt-8">
                <Link
                  href={`/profile/${session.user.id}`}
                  prefetch
                  onClick={() => setMobileOpen(false)}
                  className="text-white/80 hover:text-white transition-colors font-semibold"
                >
                  Profile
                </Link>
                <Link
                  href="/watchlist"
                  prefetch
                  onClick={() => setMobileOpen(false)}
                  className="text-white/80 hover:text-white transition-colors font-semibold"
                >
                  Watchlist
                </Link>
                <Link
                  href="/liked"
                  prefetch
                  onClick={() => setMobileOpen(false)}
                  className="text-white/80 hover:text-white transition-colors font-semibold"
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
                  prefetch
                  onClick={() => setMobileOpen(false)}
                  className="text-white/80 hover:text-white transition-colors"
                >
                  Log in
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
