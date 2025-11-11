"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import requests from "@/app/helpers/Requests";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

// Register ScrollTrigger plugin
if (typeof window !== 'undefined') {
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
    () => (items.length ? items[Math.floor(Math.random() * items.length)] : null),
    [items]
  );

  // GSAP Scroll Animations
  useEffect(() => {
    if (!item || loading || typeof window === 'undefined') return;

    // Wait for refs to be available
    const timer = setTimeout(() => {
      if (!titleRef.current || !descriptionRef.current || !detailsRef.current) {
        console.log('Refs not ready yet');
        return;
      }

      const ctx = gsap.context(() => {
        // Initial state - elements hidden
        gsap.set([titleRef.current, descriptionRef.current, detailsRef.current], {
          y: 50,
          opacity: 0
        });

        // Background parallax effect
        if (backgroundRef.current && heroRef.current) {
          gsap.to(backgroundRef.current, {
            y: -100,
            ease: "none",
            scrollTrigger: {
              trigger: heroRef.current,
              start: "top top",
              end: "bottom top",
              scrub: true
            }
          });
        }

        // Title animation
        gsap.to(titleRef.current, {
          y: 0,
          opacity: 1,
          duration: 1,
          ease: "power2.out",
          scrollTrigger: {
            trigger: titleRef.current,
            start: "top 80%",
            end: "bottom 20%",
            toggleActions: "play none none reverse"
          }
        });

        // Description animation
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
            toggleActions: "play none none reverse"
          }
        });

        // Details animation
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
            toggleActions: "play none none reverse"
          }
        });

      }, heroRef);

      return () => {
        if (ctx && ctx.revert) {
          ctx.revert();
        }
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
        <Image src="/img/NoImage.png" alt="No Image" width={120} height={120} />
        <p className="mt-3 text-sm">No movie available</p>
      </div>
    );
  }

  return (
    <div ref={heroRef} className="min-h-screen bg-yellow-600 relative overflow-hidden z-30">
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
        {/* Gradient overlays */}
        {/* <div className="absolute inset-0 bg-yellow-600/40" />
        <div className="absolute inset-0 bg-gradient-to-t from-yellow-600 via-yellow-300/20 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-b from-yellow-600/30 to-transparent" /> */}
      </div>

      {/* Initial Hero Content - Centered */}
      <div className="relative z-10 min-h-screen flex py-[25%]">
        <div className="text-center px-6 max-w-4xl">
          <h1 ref={titleRef} className="text-5xl md:text-7xl font-bold text-white leading-tight">
            {item.title}
          </h1>
        </div>
      </div>

      {/* Animated Content Section - Appears on Scroll */}
      <div className="relative z-20 bg-gradient-to-t from-yellow-600 via-yellow-600 to-transparent ">
        <div className="max-w-4xl px-6">
          {/* Movie Description */}
          <div ref={descriptionRef} className="">
            <p className="text-md md:text-lg text-white/90 leading-relaxed font-bold max-w-3xl">
              {item.overview}
            </p>
          </div>

          {/* Movie Details */}
          <div ref={detailsRef} className="flex items-center font-bold gap-6 text-white/80 text-lg mb-12">
            <div className="flex items-center gap-2">
              <svg viewBox="0 0 20 20" className="h-5 w-5 text-amber-400" fill="currentColor">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              <span className="font-medium">{item.vote_average?.toFixed(1)}</span>
            </div>
            <span>•</span>
            <span>{new Date(item.release_date).getFullYear()}</span>
            <span>•</span>
            <span className="uppercase tracking-wider">{item.original_language}</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 mt-12 md:mt-16">
  {/* Left Column - Core Features */}
 <div className="space-y-4 md:space-y-6">
  <h3 className="text-xl md:text-2xl text-white font-light mb-3 md:mb-4">Platform Features</h3>
  <div className="space-y-3 md:space-y-4">
    <p className="text-white/80 text-base md:text-lg leading-relaxed">
      Share your movie insights through blogs and engage in discussions with fellow cinephiles.
    </p>
    <p className="text-white/80 text-base md:text-lg leading-relaxed">
      Publish in-depth blogs and spark conversations about your favorite films.
    </p>
    <p className="text-white/80 text-base md:text-lg leading-relaxed">
      Follow friends, discover reviews, read blogs, and rate movies in your personalized feed.
    </p>
  </div>
</div>

  {/* Right Column - Community Benefits */}
 <div className="space-y-4 md:space-y-6">
  <h3 className="text-xl md:text-2xl text-white font-light mb-3 md:mb-4">Why Join Our Community</h3>
  <div className="space-y-3 md:space-y-4">
    <div className="flex items-start gap-3 md:gap-4">
      <div className="w-2 h-2 bg-yellow-400 rounded-full mt-2 flex-shrink-0"></div>
      <p className="text-white/80 text-base md:text-lg">Connect with fellow movie enthusiasts and cinephiles</p>
    </div>
    <div className="flex items-start gap-3 md:gap-4">
      <div className="w-2 h-2 bg-yellow-400 rounded-full mt-2 flex-shrink-0"></div>
      <p className="text-white/80 text-base md:text-lg">Collaborate on reviews and creative projects</p>
    </div>
    <div className="flex items-start gap-3 md:gap-4">
      <div className="w-2 h-2 bg-yellow-400 rounded-full mt-2 flex-shrink-0"></div>
      <p className="text-white/80 text-base md:text-lg">Share your passion and discover hidden cinematic gems</p>
    </div>
    <div className="flex items-start gap-3 md:gap-4">
      <div className="w-2 h-2 bg-yellow-400 rounded-full mt-2 flex-shrink-0"></div>
      <p className="text-white/80 text-base md:text-lg">Build your reputation as a film critic and content creator</p>
    </div>
  </div>
</div>
</div>
        </div>
      </div>

      {/* Scroll Indicator - Bottom Center */}
      {/* <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-30">
        <div className="flex flex-col items-center gap-2 text-white/60 text-sm tracking-widest">
          <span className="h-8 w-px bg-white/40"></span>
          SCROLL
          <span className="h-8 w-px bg-white/40"></span>
        </div>
      </div> */}
    </div>
  );
}