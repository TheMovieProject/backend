"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Image from "next/image";
import { Menu, X, Search, ChevronDown } from "lucide-react";
import Logout from "../Logout/Logout";

function cx(...s) {
  return s.filter(Boolean).join(" ");
}

export default function Navbar() {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const router = useRouter();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [userData, setUserData] = useState(null);

  // NEW: user search suggestions
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggest, setShowSuggest] = useState(false);
  const suggestBoxRef = useRef(null);
  const userMenuRef = useRef(null);
  const debounceRef = useRef(null);

  useEffect(() => {
    function onDocClick(e) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setUserOpen(false);
      }
      if (suggestBoxRef.current && !suggestBoxRef.current.contains(e.target)) {
        setShowSuggest(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  // fetch userData (username + avatar)
  useEffect(() => {
    if (session?.user?.id) {
      fetch(`/api/user/${session.user.id}`)
        .then((res) => res.json())
        .then((data) => setUserData(data))
        .catch((err) => console.error("Error fetching navbar user:", err));
    }
  }, [session?.user?.id]);

  // NEW: debounced user suggestions
  useEffect(() => {
    if (!query?.trim()) {
      setSuggestions([]);
      return;
    }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const r = await fetch(`/api/user/lookup?query=${encodeURIComponent(query.trim())}&limit=5`);
        if (!r.ok) return;
        const list = await r.json();
        setSuggestions(list || []);
        setShowSuggest(true);
      } catch (_) {}
    }, 200);
    return () => clearTimeout(debounceRef.current);
  }, [query]);

  if (status === "loading") {
    return (
      <div className="sticky top-0 z-40 flex h-14 items-center justify-center bg-[#0B0F14] text-white">
        Loading…
      </div>
    );
  }

  const mainLinks = [
    { href: "/", label: "Home" },
    { href: "/movies", label: "Movies" },
    { href: "/write", label: "Write" },
  ];

  async function submitSearch(e) {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;

    // 1) exact username match? go to profile
    try {
      const r = await fetch(`/api/user/lookup?query=${encodeURIComponent(q)}&limit=1&exact=1`);
      if (r.ok) {
        const match = await r.json();
        if (match?.length === 1) {
          router.push(`/profile/${match[0].id}`);
          setQuery("");
          setShowSuggest(false);
          setMobileOpen(false);
          return;
        }
      }
    } catch {}

    // 2) otherwise go to movies search page (keep your existing route)
    router.push(`/search/${encodeURIComponent(q)}`);
    setQuery("");
    setShowSuggest(false);
    setMobileOpen(false);
  }

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-white/10 bg-[#0B0F14]/90 backdrop-blur supports-[backdrop-filter]:bg-[#0B0F14]/70">
      <div className="mx-auto flex h-14 max-w-[1200px] items-center gap-3 px-3 sm:px-4">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <Link
            href="/"
            className="text-lg font-semibold tracking-tight text-white hover:opacity-90"
          >
            Movie Project
          </Link>
        </div>

        {/* Desktop links */}
        <div className="hidden md:flex md:items-center md:gap-2">
          {mainLinks.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={cx(
                "rounded-md px-3 py-2 text-sm text-white/80 hover:bg-white/10 hover:text-white",
                pathname === l.href && "bg-white/10 text-white"
              )}
            >
              {l.label}
            </Link>
          ))}
        </div>

        {/* Right side */}
        <div className="ms-auto flex items-center gap-2">
          {/* Search */}
          <div className="relative hidden sm:block" ref={suggestBoxRef}>
            <form onSubmit={submitSearch}>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={() => suggestions.length && setShowSuggest(true)}
                type="search"
                placeholder="Search movies or users…"
                className="w-56 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/50 outline-none focus:border-white/30 sm:w-64"
              />
              <button
                type="submit"
                className="absolute right-1 top-1.5 rounded-md p-1.5 text-white/60 hover:bg-white/10 hover:text-white"
                aria-label="Search"
              >
                <Search className="h-4 w-4" />
              </button>
            </form>

            {/* Suggestions dropdown */}
            {showSuggest && suggestions.length > 0 && (
              <div className="absolute z-50 mt-2 w-72 overflow-hidden rounded-xl border border-white/10 bg-[#0B0F14] shadow-xl">
                <ul className="max-h-80 overflow-auto">
                  {suggestions.map((u) => (
                    <li key={u.id}>
                      <Link
                        href={`/profile/${u.id}`}
                        onClick={() => {
                          setShowSuggest(false);
                          setQuery("");
                        }}
                        className="flex items-center gap-3 px-3 py-2 hover:bg-white/10"
                      >
                        <Image
                          src={u.avatarUrl || "/img/profile.png"}
                          alt={u.username}
                          width={32}
                          height={32}
                          className="h-8 w-8 rounded-full object-cover"
                        />
                        <div className="min-w-0">
                          <p className="truncate text-sm text-white">{u.username}</p>
                          {u.name ? (
                            <p className="truncate text-xs text-white/60">{u.name}</p>
                          ) : null}
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
                <button
                  onClick={submitSearch}
                  className="block w-full border-t border-white/10 px-3 py-2 text-left text-xs text-white/70 hover:bg-white/10"
                >
                  Search movies for “{query}”
                </button>
              </div>
            )}
          </div>

          {/* User */}
          {session ? (
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setUserOpen((v) => !v)}
                className="flex items-center gap-2 rounded-lg bg-white/5 px-2 py-1.5 text-sm text-white/90 hover:bg-white/10"
              >
                <Image
                  src={
                    userData?.avatarUrl ||
                    userData?.image ||
                    session.user?.image ||
                    "/img/profile.png"
                  }
                  width={28}
                  height={28}
                  alt="avatar"
                  className="h-7 w-7 rounded-full object-cover"
                />
                <span className="hidden sm:inline font-medium">
                  {userData?.username || session.user?.name || "Account"}
                </span>
                <ChevronDown className="h-4 w-4 opacity-70" />
              </button>

              {userOpen && (
                <div className="absolute right-0 mt-2 w-48 overflow-hidden rounded-xl border border-white/10 bg-[#0B0F14] shadow-lg">
                  <div className="p-1">
                    <Link
                      href={`/profile/${session.user.id}`}
                      onClick={() => setUserOpen(false)}
                      className="block rounded-md px-3 py-2 text-sm text-white/85 hover:bg-white/10"
                    >
                      Profile
                    </Link>
                    <Link
                      href="/watchlist"
                      onClick={() => setUserOpen(false)}
                      className="block rounded-md px-3 py-2 text-sm text-white/85 hover:bg-white/10"
                    >
                      Watchlist
                    </Link>
                    <Link
                      href="/liked"
                      onClick={() => setUserOpen(false)}
                      className="block rounded-md px-3 py-2 text-sm text-white/85 hover:bg-white/10"
                    >
                      Liked
                    </Link>
                    <div className="mt-1 border-t border-white/10 pt-1 w-full">
                      <Logout />
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="hidden items-center gap-2 sm:flex">
              <Link
                href="/login"
                className="rounded-md px-3 py-2 text-sm text-white/85 hover:bg-white/10"
              >
                Log in
              </Link>
              <Link
                href="/signup"
                className="rounded-md bg-white/90 px-3 py-2 text-sm font-medium text-black hover:bg-white"
              >
                Sign up
              </Link>
            </div>
          )}

          {/* Mobile menu toggle */}
          <button
            onClick={() => setMobileOpen((v) => !v)}
            className="inline-flex items-center rounded-md p-2 text-white/80 hover:bg-white/10 md:hidden"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="border-t border-white/10 bg-[#0B0F14] md:hidden">
          <div className="mx-auto max-w-[1200px] px-3 py-3">
            <form onSubmit={submitSearch} className="relative mb-3">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                type="search"
                placeholder="Search movies or users…"
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/50 outline-none focus:border-white/30"
              />
              <button
                type="submit"
                className="absolute right-1 top-1.5 rounded-md p-1.5 text-white/60 hover:bg-white/10 hover:text-white"
              >
                <Search className="h-4 w-4" />
              </button>
            </form>

            <div className="flex flex-col gap-1">
              {mainLinks.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={() => setMobileOpen(false)}
                  className={cx(
                    "rounded-md px-3 py-2 text-sm text-white/85 hover:bg-white/10",
                    pathname === l.href && "bg-white/10 text-white"
                  )}
                >
                  {l.label}
                </Link>
              ))}

              {session && (
                <>
                  <div className="mt-2 border-t border-white/10 pt-2 text-xs uppercase tracking-wide text-white/50">
                    You
                  </div>
                  <Link
                    href={`/profile/${session.user.id}`}
                    onClick={() => setMobileOpen(false)}
                    className="rounded-md px-3 py-2 text-sm text-white/85 hover:bg-white/10"
                  >
                    Profile
                  </Link>
                  <Link
                    href="/watchlist"
                    onClick={() => setMobileOpen(false)}
                    className="rounded-md px-3 py-2 text-sm text-white/85 hover:bg-white/10"
                  >
                    Watchlist
                  </Link>
                  <Link
                    href="/liked"
                    onClick={() => setMobileOpen(false)}
                    className="rounded-md px-3 py-2 text-sm text-white/85 hover:bg-white/10"
                  >
                    Liked
                  </Link>
                  <div className="mt-1">
                    <Logout />
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
