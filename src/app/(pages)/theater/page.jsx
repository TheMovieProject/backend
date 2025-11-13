"use client";

import { useEffect, useState } from "react";

export default function TheaterComingSoon() {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0
  });

  useEffect(() => {
    const calculateTimeLeft = () => {
      const newYear = new Date('January 1, 2026 00:00:00').getTime();
      const now = new Date().getTime();
      const difference = newYear - now;

      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((difference % (1000 * 60)) / 1000)
        });
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <main className="relative min-h-[100dvh] w-full overflow-hidden bg-[#0A0A0A] text-white">
      {/* ===== Top truss bar ===== */}
      {/* <div className="mx-auto mt-6 w-full max-w-5xl px-6">
        <div className="mx-auto h-2 w-full max-w-3xl rounded-full bg-gradient-to-b from-yellow-500 via-yellow-600 to-yellow-700 shadow-[0_10px_24px_rgba(255,210,80,0.25)]" />
      </div> */}

      {/* ===== Spotlights (pure CSS cones) ===== */}
      <div className="pointer-events-none relative mx-auto mt-2 grid w-full max-w-5xl grid-cols-2 px-6">
        {/* Left cone */}
        <div className="relative h-[36vh]">
          <div
            className="absolute left-10 top-0 h-full w-1/2 origin-top"
            style={{
              background:
                "conic-gradient(from 180deg at 20% 0%, rgba(255,220,120,0.55), rgba(255,220,120,0.20), rgba(255,220,120,0))",
              maskImage:
                "linear-gradient(to bottom, rgba(0,0,0,1), rgba(0,0,0,0.45), rgba(0,0,0,0))",
              WebkitMaskImage:
                "linear-gradient(to bottom, rgba(0,0,0,1), rgba(0,0,0,0.45), rgba(0,0,0,0))",
              mixBlendMode: "screen",
              filter: "blur(1px)",
              borderRadius: "0 0 50% 50%",
              transform: "skewX(-8deg)",
              animation: "swayL 2.6s ease-in-out infinite alternate",
            }}
          />
        </div>

        {/* Right cone */}
        <div className="relative h-[36vh]">
          <div
            className="absolute right-10 top-0 h-full w-1/2 origin-top"
            style={{
              background:
                "conic-gradient(from 180deg at 80% 0%, rgba(255,220,120,0.55), rgba(255,220,120,0.20), rgba(255,220,120,0))",
              maskImage:
                "linear-gradient(to bottom, rgba(0,0,0,1), rgba(0,0,0,0.45), rgba(0,0,0,0))",
              WebkitMaskImage:
                "linear-gradient(to bottom, rgba(0,0,0,1), rgba(0,0,0,0.45), rgba(0,0,0,0))",
              mixBlendMode: "screen",
              filter: "blur(1px)",
              borderRadius: "0 0 50% 50%",
              transform: "skewX(8deg)",
              animation: "swayR 2.6s ease-in-out infinite alternate",
            }}
          />
        </div>
      </div>

      {/* ===== Stage & screen ===== */}
      <section className="relative mx-auto grid min-h-[46vh] w-full max-w-5xl place-items-center px-6">
        {/* Stage platform */}
        <div
          className="pointer-events-none absolute bottom-14 left-1/2 h-28 w-[65%] -translate-x-1/2 rounded-[999px]"
          style={{
            background:
              "radial-gradient(ellipse at center, rgba(255,215,90,0.22) 0%, rgba(255,215,90,0.10) 45%, rgba(0,0,0,0) 70%)",
            filter: "blur(6px)",
            mixBlendMode: "screen",
          }}
        />

        {/* Screen bezel */}
        <div className="relative z-10 w-full max-w-3xl rounded-2xl border border-yellow-500/30 bg-gradient-to-b from-[#0B0F14] via-[#0B0F14] to-[#0A0A0A] p-1 shadow-[0_0_0_1px_rgba(255,220,120,0.15),0_20px_60px_rgba(0,0,0,0.6)]">
          {/* Inner glow rim */}
          <div className="rounded-xl bg-gradient-to-b from-black to-[#0b0f14] p-0.5">
            {/* Screen */}
            <div className="relative rounded-[14px] bg-[#0d141c]">
              <div
                className="absolute inset-0 rounded-[14px]"
                style={{
                  background:
                    "radial-gradient(ellipse at center, rgba(255,240,180,0.18) 0%, rgba(255,225,140,0.10) 35%, rgba(0,0,0,0.0) 70%)",
                  filter: "blur(0.5px)",
                }}
              />
              <div className="relative z-10 flex aspect-[16/9] flex-col items-center justify-center rounded-[14px] space-y-4">
                <h1 className="bg-gradient-to-b from-yellow-200 via-yellow-100 to-yellow-400 bg-clip-text text-center text-3xl font-extrabold tracking-tight text-transparent sm:text-4xl md:text-5xl">
                  Theater Coming Soon
                </h1>
                
                {/* New Year Countdown */}
                <div className="text-center space-y-2">
                  <div className="text-yellow-300 text-sm font-semibold tracking-wider">
                    COUNTDOWN TO NEW YEAR 2026
                  </div>
                  
                  <div className="flex justify-center space-x-3 sm:space-x-4">
                    {/* Days */}
                    <div className="text-center">
                      <div className="bg-yellow-500/20 border border-yellow-500/30 rounded-lg px-3 py-2 min-w-[60px]">
                        <div className="text-2xl font-bold text-yellow-300">
                          {String(timeLeft.days).padStart(2, '0')}
                        </div>
                      </div>
                      <div className="text-yellow-400/70 text-xs mt-1">DAYS</div>
                    </div>
                    
                    {/* Hours */}
                    <div className="text-center">
                      <div className="bg-yellow-500/20 border border-yellow-500/30 rounded-lg px-3 py-2 min-w-[60px]">
                        <div className="text-2xl font-bold text-yellow-300">
                          {String(timeLeft.hours).padStart(2, '0')}
                        </div>
                      </div>
                      <div className="text-yellow-400/70 text-xs mt-1">HOURS</div>
                    </div>
                    
                    {/* Minutes */}
                    <div className="text-center">
                      <div className="bg-yellow-500/20 border border-yellow-500/30 rounded-lg px-3 py-2 min-w-[60px]">
                        <div className="text-2xl font-bold text-yellow-300">
                          {String(timeLeft.minutes).padStart(2, '0')}
                        </div>
                      </div>
                      <div className="text-yellow-400/70 text-xs mt-1">MIN</div>
                    </div>
                    
                    {/* Seconds */}
                    <div className="text-center">
                      <div className="bg-yellow-500/20 border border-yellow-500/30 rounded-lg px-3 py-2 min-w-[60px]">
                        <div className="text-2xl font-bold text-yellow-300 animate-pulse">
                          {String(timeLeft.seconds).padStart(2, '0')}
                        </div>
                      </div>
                      <div className="text-yellow-400/70 text-xs mt-1">SEC</div>
                    </div>
                  </div>
                  
                  <div className="text-yellow-200/80 text-sm font-light pt-2">
                    Grand Opening on January 1st, 2026
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Minimal stage legs */}
        <div className="mt-4 flex gap-10 opacity-70">
          <div className="h-2 w-24 rounded-full bg-yellow-700/30" />
          <div className="h-2 w-24 rounded-full bg-yellow-700/30" />
        </div>
      </section>

      {/* ===== Seat silhouettes ===== */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 select-none">
        {/* three rows of simple seats */}
        <div className="mx-auto mb-6 grid h-6 max-w-6xl grid-cols-12 gap-2 opacity-50">
          {Array.from({ length: 12 }).map((_, i) => (
            <span key={`r3-${i}`} className="h-full rounded-t-xl bg-[#0F131A]" />
          ))}
        </div>
        <div className="mx-auto mb-4 grid h-7 max-w-5xl grid-cols-10 gap-2 opacity-65">
          {Array.from({ length: 10 }).map((_, i) => (
            <span key={`r2-${i}`} className="h-full rounded-t-xl bg-[#0F141B]" />
          ))}
        </div>
        <div className="mx-auto mb-2 grid h-8 max-w-4xl grid-cols-8 gap-2 opacity-80">
          {Array.from({ length: 8 }).map((_, i) => (
            <span key={`r1-${i}`} className="h-full rounded-t-xl bg-[#121A23]" />
          ))}
        </div>
      </div>

      {/* custom keyframes for spotlight sway */}
      <style jsx global>{`
        @keyframes swayL {
          0%   { transform: skewX(-8deg) translateX(0) rotate(0deg); }
          100% { transform: skewX(-8deg) translateX(-14px) rotate(-6deg); }
        }
        @keyframes swayR {
          0%   { transform: skewX(8deg) translateX(0) rotate(0deg); }
          100% { transform: skewX(8deg) translateX(14px) rotate(6deg); }
        }
      `}</style>
    </main>
  );
}