"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import requests from "@/app/helpers/Requests";
import { getGsapWithScrollTrigger } from "@/app/libs/gsapClient";
import Link from "next/link";

export default function HeroBeforeLogin() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hoveredWord, setHoveredWord] = useState(null);

  // Refs for animation
  const heroRef = useRef(null);
  const titleRef = useRef(null);
  const actionTextRef = useRef(null);
  const cardsRef = useRef([]);
  const backgroundRef = useRef(null);
  const imageRef = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(requests.requestPopular);
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

    let cancelled = false;
    let ctx;

    const timer = setTimeout(() => {
      void (async () => {
        const { gsap } = await getGsapWithScrollTrigger();
        if (cancelled || !gsap || !titleRef.current || !actionTextRef.current) {
          return;
        }

        ctx = gsap.context(() => {
          const tl = gsap.timeline({ delay: 0.5 });

          tl.fromTo(
            titleRef.current,
            { y: 100, opacity: 0 },
            { y: 0, opacity: 1, duration: 1.2, ease: "power3.out" }
          );

          tl.fromTo(
            actionTextRef.current.children,
            { y: 50, opacity: 0 },
            {
              y: 0,
              opacity: 1,
              duration: 0.8,
              stagger: 0.3,
              ease: "back.out(1.7)",
            },
            "-=0.5"
          );

          cardsRef.current.forEach((card, index) => {
            gsap.fromTo(
              card,
              { y: 60, opacity: 0 },
              {
                y: 0,
                opacity: 1,
                duration: 1,
                delay: index * 0.2,
                ease: "power2.out",
                scrollTrigger: {
                  trigger: card,
                  start: "top 85%",
                  end: "bottom 20%",
                  toggleActions: "play none none reverse",
                },
              }
            );
          });

          if (backgroundRef.current && heroRef.current) {
            gsap.to(backgroundRef.current, {
              y: -80,
              ease: "none",
              scrollTrigger: {
                trigger: heroRef.current,
                start: "top top",
                end: "bottom top",
                scrub: true,
              },
            });
          }
        }, heroRef);
      })();
    }, 100);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      if (ctx?.revert) {
        ctx.revert();
      }
    };
  }, [item, loading]);

  const addToCardsRef = (el) => {
    if (el && !cardsRef.current.includes(el)) {
      cardsRef.current.push(el);
    }
  };

  const handleWordHover = (word) => {
    setHoveredWord(word);
  };

  const handleWordLeave = () => {
    setHoveredWord(null);
  };

  const getHoverImage = () => {
    switch (hoveredWord) {
      case 'LIGHTS':
        return '/img/lights.png';
      case 'CAMERA':
        return '/img/camera.webp';
      case 'ACTION':
        return '/img/action.png';
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-yellow-600">
        <div className="h-8 w-8 animate-spin rounded-full border-3 border-white/30 border-t-white" />
      </div>
    );
  }

  if (!item) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-yellow-600 text-white/70">
        <Image src="/img/logo.png" alt="No Image" width={120} height={120} />
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
          alt="Cinematic Backdrop"
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-yellow-600/50" />
      </div>

      {/* Hero Content - Centered */}
      <div className="relative z-10 min-h-screen flex items-center justify-center py-20">
        <div className="text-center px-6 max-w-6xl">
          {/* Main Title */}
          <h1 ref={titleRef} className="text-5xl md:text-7xl lg:text-8xl font-black text-white leading-tight mb-8 tracking-tight">
            theMOVIE
            <br />
            <span className="text-amber-300">PROJECT</span>
          </h1>

          {/* Website Description */}
          <div className="max-w-4xl mx-auto mb-12">
            <p className="text-2xl md:text-3xl text-white font-bold mb-6 leading-tight">
              Your Complete Platform for Everything Cinema
            </p>
            <p className="text-lg md:text-xl text-white/90 leading-relaxed font-medium">
              Connect, create, and collaborate with cinephiles, filmmakers, bloggers, and movie enthusiasts worldwide. 
              Share reviews, write blogs, discuss films, and build your cinematic legacy.
            </p>
          </div>

          {/* Action Text Sequence with Hover Images */}
          <div className="relative mb-16">
            <div ref={actionTextRef} className="flex justify-center items-center gap-6 md:gap-10 mb-12 flex-wrap">
              {['LIGHTS', 'CAMERA', 'ACTION'].map((word, index) => (
                <div 
                  key={index} 
                  className="relative group"
                  onMouseEnter={() => handleWordHover(word)}
                  onMouseLeave={handleWordLeave}
                >
                  <div className="flex items-center gap-4 cursor-pointer transform transition-all duration-300 group-hover:scale-110">
                    <span className="text-2xl md:text-3xl font-bold text-white/90 tracking-widest group-hover:text-amber-300 transition-colors duration-300">
                      {word}
                    </span>
                    {index < 2 && (
                      <span className="text-amber-400 text-xl group-hover:text-amber-300 transition-colors duration-300">●</span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Hover Image Display */}
            {hoveredWord && (
              <div 
                ref={imageRef}
                className="absolute top-full left-1/2 transform -translate-x-1/2 mt-8 z-40"
              >
                <div className="bg-black/80 backdrop-blur-sm rounded-2xl p-4 border border-amber-400/30 shadow-2xl">
                  <Image
                    src={getHoverImage()}
                    alt={hoveredWord}
                    width={120}
                    height={120}
                    className="object-contain"
                    priority
                  />
                </div>
              </div>
            )}
          </div>

          {/* Sign Up Button */}
          <Link href='/login'>
            <button className="bg-amber-500 hover:bg-amber-400 text-white font-bold text-lg px-12 py-4 rounded-full transition-all duration-300 transform hover:scale-105 shadow-2xl mb-8">
              JOIN THE COMMUNITY
            </button>
          </Link>
        </div>
      </div>

      {/* Features Section */}
      <div className="relative z-20 bg-gradient-to-t from-yellow-700 via-yellow-600/90 to-transparent pt-32 pb-20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-12">
            
            {/* Platform Features Card */}
            <div 
              ref={addToCardsRef}
              className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20"
            >
              <h3 className="text-2xl md:text-3xl font-black text-white mb-6 tracking-tight">
                FOR CINEPHILES & FILMMAKERS
              </h3>
              <div className="space-y-5">
                <div className="flex items-start gap-4">
                  <div className="w-3 h-3 bg-amber-400 rounded-full mt-2 flex-shrink-0"></div>
                  <p className="text-white/90 text-lg font-medium leading-relaxed">
                    Write and share in-depth movie reviews and analysis
                  </p>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-3 h-3 bg-amber-400 rounded-full mt-2 flex-shrink-0"></div>
                  <p className="text-white/90 text-lg font-medium leading-relaxed">
                    Publish cinematic blogs and filmmaking insights
                  </p>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-3 h-3 bg-amber-400 rounded-full mt-2 flex-shrink-0"></div>
                  <p className="text-white/90 text-lg font-medium leading-relaxed">
                    Rate and track movies in your personal watchlist
                  </p>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-3 h-3 bg-amber-400 rounded-full mt-2 flex-shrink-0"></div>
                  <p className="text-white/90 text-lg font-medium leading-relaxed">
                    Connect with aspiring filmmakers and industry professionals
                  </p>
                </div>
              </div>
            </div>

            {/* Community Benefits Card */}
            <div 
              ref={addToCardsRef}
              className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20"
            >
              <h3 className="text-2xl md:text-3xl font-black text-white mb-6 tracking-tight">
                BUILD YOUR CINEMATIC PRESENCE
              </h3>
              <div className="space-y-5">
                <div className="flex items-start gap-4">
                  <div className="w-3 h-3 bg-amber-400 rounded-full mt-2 flex-shrink-0"></div>
                  <p className="text-white/90 text-lg font-medium leading-relaxed">
                    Showcase your film knowledge and critical analysis skills
                  </p>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-3 h-3 bg-amber-400 rounded-full mt-2 flex-shrink-0"></div>
                  <p className="text-white/90 text-lg font-medium leading-relaxed">
                    Collaborate on film projects and creative writing
                  </p>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-3 h-3 bg-amber-400 rounded-full mt-2 flex-shrink-0"></div>
                  <p className="text-white/90 text-lg font-medium leading-relaxed">
                    Discover filmmaking opportunities and partnerships
                  </p>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-3 h-3 bg-amber-400 rounded-full mt-2 flex-shrink-0"></div>
                  <p className="text-white/90 text-lg font-medium leading-relaxed">
                    Grow your audience as a film critic or content creator
                  </p>
                </div>
              </div>
            </div>

          </div>

          {/* Bottom CTA */}
          <div className="text-center mt-16">
            <Link href="/login">
              <button className="bg-transparent border-2 border-white text-white font-bold text-lg px-12 py-4 rounded-full transition-all duration-300 hover:bg-white hover:text-yellow-700 transform hover:scale-105">
                START YOUR FILM JOURNEY TODAY
              </button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
