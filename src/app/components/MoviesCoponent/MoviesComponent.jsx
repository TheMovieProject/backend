"use client";

import React, { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { CalendarDays, Shuffle, Sparkles, ThermometerSnowflake, ThermometerSun } from "lucide-react";
import MovieBlock from "@/app/components/MovieBlock/MovieBlock";

const IMG_BASE = "https://image.tmdb.org/t/p/w500";
const SECTION_HEADING_CLASS = "text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white";
const SECTION_SUBTITLE_CLASS = "text-sm md:text-base text-yellow-100/80";

function posterSrc(item) {
  const posterPath = item?.posterPath ?? item?.poster_path;
  if (item?.posterUrl) return item.posterUrl.startsWith("http") ? item.posterUrl : `${IMG_BASE}${item.posterUrl}`;
  if (!posterPath) return "/img/logo.png";
  return `${IMG_BASE}${posterPath}`;
}

function backdropSrc(item) {
  if (!item?.backdropPath) return posterSrc(item);
  return `${IMG_BASE}${item.backdropPath}`;
}

function weatherFromCode(code, tempC) {
  if (typeof code !== "number") return { weather: null, tempC: null };
  if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code)) {
    return { weather: "rain", tempC };
  }
  if ([71, 73, 75, 77, 85, 86].includes(code)) {
    return { weather: "cold", tempC };
  }
  if (typeof tempC === "number" && tempC >= 33) {
    return { weather: "hot", tempC };
  }
  if (typeof tempC === "number" && tempC <= 12) {
    return { weather: "cold", tempC };
  }
  return { weather: "clear", tempC };
}

function dayLabel(releaseDate) {
  if (!releaseDate) return "TBA";
  const d = new Date(releaseDate);
  if (Number.isNaN(d.getTime())) return "TBA";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function toMovieBlockItem(item) {
  return {
    id: item?.id,
    title: item?.title || item?.original_title || "Untitled",
    original_title: item?.original_title || item?.title || "Untitled",
    poster_path: item?.poster_path ?? item?.posterPath ?? null,
    posterUrl: item?.posterUrl ?? null,
    vote_average: Number(item?.vote_average ?? item?.voteAverage ?? 0),
    release_date: item?.release_date ?? item?.releaseDate ?? null,
  };
}

function Rail({ title, subtitle, items = [] }) {
  if (!items?.length) return null;
  return (
    <section className="space-y-3">
      <div className="flex justify-center text-center">
        <div className="space-y-1">
          <h2 className={SECTION_HEADING_CLASS}>{title}</h2>
          {subtitle ? <p className={SECTION_SUBTITLE_CLASS}>{subtitle}</p> : null}
        </div>
      </div>

      <div
        className="grid grid-cols-2 gap-x-6 gap-y-10 pt-8 sm:grid-cols-3 lg:grid-cols-6"
      >
        {items.map((item, index) => (
          <div key={`${title}-${item.id}`} className="w-full max-w-[185px] justify-self-center pt-8">
            <MovieBlock item={toMovieBlockItem(item)} index={index} />
          </div>
        ))}
      </div>
    </section>
  );
}

export default function MoviesComponent() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState("grid");
  const [randomPick, setRandomPick] = useState(null);
  const [weatherMeta, setWeatherMeta] = useState({ weather: null, tempC: null });

  const loadDiscovery = async (query = "", options = {}) => {
    const { background = false, signal } = options;

    if (!background) {
      setLoading(true);
      setError(null);
    }

    try {
      const res = await fetch(`/api/movies/discovery${query}`, {
        cache: "no-store",
        signal,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed to load discovery");
      setError(null);
      setData(json);
      setRandomPick(json?.randomPick || null);
    } catch (e) {
      if (e?.name === "AbortError") return;
      if (!background) {
        setError(e?.message || "Failed to load movies");
      }
    } finally {
      if (!background) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    let alive = true;
    const controller = new AbortController();

    async function detectWeatherAndLoad() {
      await loadDiscovery("", { signal: controller.signal });

      if (!alive || !navigator.geolocation) {
        return;
      }

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          if (!alive) return;
          try {
            const lat = position.coords.latitude;
            const lon = position.coords.longitude;
            const weatherRes = await fetch(
              `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code`,
              { signal: controller.signal }
            );
            const weatherJson = await weatherRes.json();
            const code = weatherJson?.current?.weather_code;
            const temp = Number(weatherJson?.current?.temperature_2m);
            const mood = weatherFromCode(code, Number.isFinite(temp) ? temp : null);
            setWeatherMeta(mood);
            const qs = `?weather=${encodeURIComponent(mood.weather || "")}&tempC=${encodeURIComponent(
              mood.tempC ?? ""
            )}`;
            await loadDiscovery(qs, { background: true, signal: controller.signal });
          } catch (e) {
            if (e?.name === "AbortError") return;
          }
        },
        () => undefined,
        { timeout: 4500 }
      );
    }

    void detectWeatherAndLoad();
    return () => {
      alive = false;
      controller.abort();
    };
  }, []);

  const randomPool = useMemo(() => {
    if (!data) return [];
    return [
      ...(data?.occasionSpotlight?.items || []),
      ...(data?.becauseYouWatched?.items || []),
      ...(data?.trending || []),
    ];
  }, [data]);

  const surpriseMe = () => {
    if (!randomPool.length) return;
    const idx = Math.floor(Math.random() * randomPool.length);
    setRandomPick(randomPool[idx]);
  };

  if (loading) {
    return (
      <div className="min-h-screen p-6 pt-16">
        <div className="max-w-7xl mx-auto space-y-6 animate-pulse">
          <div className="h-44 rounded-2xl bg-white/10" />
          <div className="h-32 rounded-xl bg-white/10" />
          <div className="h-56 rounded-xl bg-white/10" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen p-6 pt-20">
        <div className="max-w-4xl mx-auto rounded-2xl border border-red-300/30 bg-red-950/40 p-6 text-red-100">
          {error}
        </div>
      </div>
    );
  }

  const releaseMonths = data?.releaseCalendar?.months || [];
  const releaseItems = data?.releaseCalendar?.items || [];
  const seasonType = data?.context?.seasonType;

  return (
    <div className="min-h-screen p-4 md:p-6 pt-14 font-sans">
      <div className="max-w-7xl mx-auto space-y-10">
        <section className="rounded-3xl border border-white/20 bg-black/35 overflow-hidden">
          <div className="relative min-h-[240px]">
            <Image
              src={backdropSrc(randomPick || data?.occasionSpotlight?.items?.[0])}
              alt="Spotlight"
              fill
              className="object-cover"
              sizes="100vw"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/65 to-black/30" />

            <div className="relative p-5 md:p-8 space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-yellow-300/40 bg-yellow-500/15 px-3 py-1 text-xs text-yellow-100">
                <Sparkles className="h-4 w-4" />
                {data?.occasionSpotlight?.title || "Spotlight"}
              </div>

              <h1 className={`${SECTION_HEADING_CLASS} max-w-3xl`}>
                {seasonType === "festival"
                  ? "Festival + Weather Curated Picks"
                  : "Mood-Aware Movie Discovery"}
              </h1>

              <p className={`${SECTION_SUBTITLE_CLASS} max-w-3xl`}>
                {data?.occasionSpotlight?.subtitle}
              </p>

              <div className="flex flex-wrap items-center gap-2 text-xs text-white/90">
                {weatherMeta.weather === "cold" ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1">
                    <ThermometerSnowflake className="h-3.5 w-3.5" />
                    Cold Mood
                  </span>
                ) : null}
                {weatherMeta.weather === "hot" ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1">
                    <ThermometerSun className="h-3.5 w-3.5" />
                    Heatwave Mood
                  </span>
                ) : null}
                {typeof weatherMeta.tempC === "number" ? (
                  <span className="rounded-full bg-white/15 px-2.5 py-1">{Math.round(weatherMeta.tempC)}Ãƒâ€šÃ‚Â°C</span>
                ) : null}
              </div>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 rounded-2xl border border-white/20 bg-black/30 p-4 md:p-5">
            <Rail
              title={data?.occasionSpotlight?.title || "Occasion Picks"}
              subtitle="Festival/season first, then weather context."
              items={data?.occasionSpotlight?.items || []}
            />
          </div>

          <div className="rounded-2xl border border-white/20 bg-black/30 p-4 md:p-5 space-y-4">
            <div className="space-y-3 text-center">
              <h3 className={SECTION_HEADING_CLASS}>Random Movie Picker</h3>
              <button
                onClick={surpriseMe}
                className="inline-flex items-center gap-2 rounded-full bg-white text-black px-3 py-1.5 text-sm font-semibold hover:bg-yellow-200 transition"
              >
                <Shuffle className="h-4 w-4" />
                Surprise Me
              </button>
            </div>

            {randomPick ? (
              <Link href={`/movies/${randomPick.id}`} className="block rounded-xl overflow-hidden border border-white/20">
                <div className="relative h-52">
                  <Image src={backdropSrc(randomPick)} alt={randomPick.title} fill className="object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                  <div className="absolute bottom-0 p-3">
                    <h4 className="text-white font-bold">{randomPick.title}</h4>
                    <p className="text-xs text-yellow-100/80">{dayLabel(randomPick.releaseDate)}</p>
                  </div>
                </div>
              </Link>
            ) : (
              <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-white/70">
                No random pick available.
              </div>
            )}
          </div>
        </section>

        {data?.becauseYouWatched ? (
          <Rail
            title={`Because you watched ${data.becauseYouWatched.seedMovieTitle}`}
            subtitle={
              data?.becauseYouWatched?.subtitle ||
              "Ranked with matrix factorization from audience behavior, then re-weighted by genre, actor, and director similarity."
            }
            items={data.becauseYouWatched.items}
          />
        ) : null}

        {(data?.categories?.genres || []).map((bucket) => (
          <Rail
            key={`genre-${bucket.id}`}
            title={`${bucket.name} Picks`}
            subtitle="Dynamic genre spotlight"
            items={bucket.items || []}
          />
        ))}

        {(data?.categories?.directors || []).map((bucket) => (
          <Rail
            key={`director-${bucket.personId || bucket.name}`}
            title={`${bucket.name} Spotlight`}
            subtitle="Director-driven picks"
            items={bucket.items || []}
          />
        ))}

        {(data?.categories?.actors || []).map((bucket) => (
          <Rail
            key={`actor-${bucket.personId || bucket.name}`}
            title={`${bucket.name} Spotlight`}
            subtitle="Actor filmography highlights"
            items={bucket.items || []}
          />
        ))}

        <section className="rounded-2xl border border-white/20 bg-black/30 p-4 md:p-5 space-y-4">
          <div className="flex flex-col items-center justify-center gap-3 text-center">
            <div className="space-y-1">
              <h3 className={`${SECTION_HEADING_CLASS} flex items-center justify-center gap-2`}>
                <CalendarDays className="h-5 w-5 text-yellow-300" />
                Release Calendar
              </h3>
              <p className={SECTION_SUBTITLE_CLASS}>Grid + month-group views</p>
            </div>
            <div className="inline-flex rounded-full border border-white/20 bg-black/30 p-1">
              <button
                onClick={() => setViewMode("grid")}
                className={`px-3 py-1.5 text-sm rounded-full ${
                  viewMode === "grid" ? "bg-white text-black" : "text-white/80 hover:text-white"
                }`}
              >
                Grid
              </button>
              <button
                onClick={() => setViewMode("calendar")}
                className={`px-3 py-1.5 text-sm rounded-full ${
                  viewMode === "calendar" ? "bg-white text-black" : "text-white/80 hover:text-white"
                }`}
              >
                Calendar
              </button>
            </div>
          </div>

          {viewMode === "grid" ? (
            <div
              className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 lg:grid-cols-6"
            >
              {releaseItems.slice(0, 20).map((item, index) => (
                <div key={`release-grid-${item.id}`} className="w-full max-w-[185px] justify-self-center pt-8">
                  <MovieBlock item={toMovieBlockItem(item)} index={index} />
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {releaseMonths.map((group) => (
                <div key={group.month} className="rounded-xl border border-white/10 bg-white/5 p-3">
                  <h4 className="text-sm font-semibold text-yellow-200 mb-2">{group.month}</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {(group.items || []).slice(0, 10).map((item) => (
                      <Link
                        href={`/movies/${item.id}`}
                        key={`release-cal-${group.month}-${item.id}`}
                        className="flex items-center gap-3 rounded-lg bg-black/30 border border-white/10 p-2 hover:bg-black/40"
                      >
                        <div className="relative h-12 w-9 shrink-0 rounded overflow-hidden">
                          <Image src={posterSrc(item)} alt={item.title} fill className="object-cover" sizes="36px" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs text-yellow-100/70">{dayLabel(item.releaseDate ?? item.release_date)}</p>
                          <p className="text-sm text-white truncate">{item.title}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
