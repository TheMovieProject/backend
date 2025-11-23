"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import requests from "@/app/helpers/Requests";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

// Register ScrollTrigger plugin
if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

export default function Hero() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  // Refs for animation
  const heroRef = useRef(null);
  const titleRef = useRef(null);
  const descriptionRef = useRef(null);
  const detailsRef = useRef(null);
  const backgroundRef = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(requests.requestPopular, { cache: "no-store" });
        const data = await res.json();
        setItems(data?.results ?? []);
      } catch (e) {
        console.error("Error fetching data:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const item = useMemo(
    () =>
      items.length
        ? items[Math.floor(Math.random() * items.length)]
        : null,
    [items]
  );

  // GSAP Scroll Animations
  useEffect(() => {
    if (!item || loading || typeof window === "undefined") return;

    const timer = setTimeout(() => {
      if (!titleRef.current || !descriptionRef.current || !detailsRef.current) {
        return;
      }

      const ctx = gsap.context(() => {
        gsap.set(
          [titleRef.current, descriptionRef.current, detailsRef.current],
          {
            y: 50,
            opacity: 0,
          }
        );

        // Background parallax effect
        if (backgroundRef.current && heroRef.current) {
          gsap.to(backgroundRef.current, {
            y: -100,
            ease: "none",
            scrollTrigger: {
              trigger: heroRef.current,
              start: "top top",
              end: "bottom top",
              scrub: true,
            },
          });
        }

        gsap.to(titleRef.current, {
          y: 0,
          opacity: 1,
          duration: 1,
          ease: "power2.out",
          scrollTrigger: {
            trigger: titleRef.current,
            start: "top 80%",
            end: "bottom 20%",
            toggleActions: "play none none reverse",
          },
        });

        gsap.to(descriptionRef.current, {
          y: 0,
          opacity: 1,
          duration: 1,
          delay: 0.2,
          ease: "power2.out",
          scrollTrigger: {
            trigger: descriptionRef.current,
            start: "top 80%",
            end: "bottom 20%",
            toggleActions: "play none none reverse",
          },
        });

        gsap.to(detailsRef.current, {
          y: 0,
          opacity: 1,
          duration: 1,
          delay: 0.4,
          ease: "power2.out",
          scrollTrigger: {
            trigger: detailsRef.current,
            start: "top 80%",
            end: "bottom 20%",
            toggleActions: "play none none reverse",
          },
        });
      }, heroRef);

      return () => {
        if (ctx && ctx.revert) ctx.revert();
      };
    }, 50);

    return () => clearTimeout(timer);
  }, [item, loading]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-yellow-600">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/20 border-t-white" />
      </div>
    );
  }

  if (!item) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-yellow-600 text-white/70">
        <Image
          src="/img/NoImage.png"
          alt="No Image"
          width={120}
          height={120}
        />
        <p className="mt-3 text-sm">No movie available</p>
      </div>
    );
  }

  return (
    <div
      ref={heroRef}
      className="min-h-screen bg-yellow-600 relative overflow-hidden z-30"
    >
      {/* Background Image with Parallax */}
      <div ref={backgroundRef} className="absolute inset-0">
        <Image
          src={`https://image.tmdb.org/t/p/original${item.backdrop_path}`}
          alt={item.title || "Backdrop"}
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
      </div>

      {/* Title section */}
      <div className="relative z-10 min-h-screen flex py-[25%] px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h1
            ref={titleRef}
            className="text-5xl md:text-7xl font-bold text-white leading-tight drop-shadow-[0_10px_30px_rgba(0,0,0,0.7)]"
          >
            {item.title}
          </h1>
        </div>
      </div>

      {/* Content overlay */}
      <div className="relative z-20 bg-gradient-to-t from-yellow-700/95 via-yellow-600/90 to-transparent">
        <div className="max-w-6xl mx-auto px-6 pb-24">
          {/* Movie Description */}
          <div ref={descriptionRef} className="max-w-3xl">
            <p className="text-md md:text-lg text-white/90 leading-relaxed font-semibold">
              {item.overview}
            </p>
          </div>

          {/* Movie Details */}
          <div
            ref={detailsRef}
            className="mt-6 flex flex-wrap items-center gap-4 text-white/85 text-sm md:text-lg font-semibold"
          >
            <div className="flex items-center gap-2">
              <svg
                viewBox="0 0 20 20"
                className="h-5 w-5 text-amber-400"
                fill="currentColor"
              >
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              <span>{item.vote_average?.toFixed(1)}</span>
            </div>
            <span>•</span>
            <span>{new Date(item.release_date).getFullYear()}</span>
            <span>•</span>
            <span className="uppercase tracking-wider">
              {item.original_language}
            </span>
          </div>

          {/* === TWO GLASS CARDS SECTION (the UI from your screenshot) === */}
          <div className="mt-14 md:mt-20 grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Card 1 */}
            <div className="rounded-[32px] bg-gradient-to-br from-yellow-500/55 via-yellow-500/40 to-orange-500/45 border border-white/18 backdrop-blur-2xl shadow-[0_24px_80px_rgba(0,0,0,0.75)] px-8 py-10 md:px-10 md:py-12">
              <h3 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white mb-6 md:mb-8 leading-snug">
                FOR CINEPHILES &amp; <br className="hidden md:block" />
                FILMMAKERS
              </h3>

              <ul className="space-y-4 md:space-y-5 text-base md:text-lg text-white/90">
                <li className="flex gap-3">
                  <span className="mt-1.5 h-2.5 w-2.5 rounded-full bg-yellow-300 shadow-[0_0_0_6px_rgba(250,204,21,0.35)]" />
                  <span>
                    Write and share in-depth movie reviews and analysis
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="mt-1.5 h-2.5 w-2.5 rounded-full bg-yellow-300 shadow-[0_0_0_6px_rgba(250,204,21,0.35)]" />
                  <span>
                    Publish cinematic blogs and filmmaking insights
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="mt-1.5 h-2.5 w-2.5 rounded-full bg-yellow-300 shadow-[0_0_0_6px_rgba(250,204,21,0.35)]" />
                  <span>
                    Rate and track movies in your personal watchlist
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="mt-1.5 h-2.5 w-2.5 rounded-full bg-yellow-300 shadow-[0_0_0_6px_rgba(250,204,21,0.35)]" />
                  <span>
                    Connect with aspiring filmmakers and industry professionals
                  </span>
                </li>
              </ul>
            </div>

            {/* Card 2 */}
            <div className="rounded-[32px] bg-gradient-to-br from-yellow-500/55 via-yellow-500/40 to-orange-500/45 border border-white/18 backdrop-blur-2xl shadow-[0_24px_80px_rgba(0,0,0,0.75)] px-8 py-10 md:px-10 md:py-12">
              <h3 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white mb-6 md:mb-8 leading-snug">
                BUILD YOUR CINEMATIC <br className="hidden md:block" />
                PRESENCE
              </h3>

              <ul className="space-y-4 md:space-y-5 text-base md:text-lg text-white/90">
                <li className="flex gap-3">
                  <span className="mt-1.5 h-2.5 w-2.5 rounded-full bg-yellow-300 shadow-[0_0_0_6px_rgba(250,204,21,0.35)]" />
                  <span>
                    Showcase your film knowledge and critical analysis skills
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="mt-1.5 h-2.5 w-2.5 rounded-full bg-yellow-300 shadow-[0_0_0_6px_rgba(250,204,21,0.35)]" />
                  <span>
                    Collaborate on film projects and creative writing
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="mt-1.5 h-2.5 w-2.5 rounded-full bg-yellow-300 shadow-[0_0_0_6px_rgba(250,204,21,0.35)]" />
                  <span>
                    Discover filmmaking opportunities and partnerships
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="mt-1.5 h-2.5 w-2.5 rounded-full bg-yellow-300 shadow-[0_0_0_6px_rgba(250,204,21,0.35)]" />
                  <span>
                    Grow your audience as a film critic or content creator
                  </span>
                </li>
              </ul>
            </div>
          </div>
          {/* === END cards section === */}
        </div>
      </div>
    </div>
  );
}
