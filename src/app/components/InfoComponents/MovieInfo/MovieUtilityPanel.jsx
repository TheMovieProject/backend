"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CalendarClock, Clock3, Shield, Ticket } from "lucide-react";

function addMinutesToTime(startHHMM, minutesToAdd) {
  const [h, m] = (startHHMM || "20:00").split(":").map((x) => Number(x));
  if (!Number.isFinite(h) || !Number.isFinite(m)) return "--:--";
  const base = new Date();
  base.setHours(h, m, 0, 0);
  base.setMinutes(base.getMinutes() + Math.max(0, Math.round(minutesToAdd || 0)));
  return base.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function contentFlags(overview = "") {
  const text = overview.toLowerCase();
  const flags = [];
  if (/(kill|murder|violence|blood|war|gun|fight)/i.test(text)) flags.push("Violence");
  if (/(sex|intimate|romance|affair|adult)/i.test(text)) flags.push("Mature Themes");
  if (/(drug|alcohol|smoke|addiction)/i.test(text)) flags.push("Substance Use");
  if (/(curse|abuse|explicit|slur)/i.test(text)) flags.push("Strong Language");
  return flags;
}

export default function MovieUtilityPanel({
  movie,
  certification,
  recommendations = [],
}) {
  const [availableMinutes, setAvailableMinutes] = useState(180);
  const [startTime, setStartTime] = useState("20:00");
  const [selected, setSelected] = useState([]);
  const [runtimeMap, setRuntimeMap] = useState({});

  const candidates = useMemo(() => {
    const base = [{ id: String(movie?.id), title: movie?.title || "Current Movie", runtime: movie?.runtime || 0 }];
    const extra = (recommendations || []).slice(0, 12).map((item) => ({
      id: String(item.id),
      title: item.title || "Untitled",
      runtime: 0,
    }));
    return [...base, ...extra];
  }, [movie?.id, movie?.title, movie?.runtime, recommendations]);

  const selectedItems = useMemo(
    () => candidates.filter((item) => selected.includes(item.id)).slice(0, 3),
    [candidates, selected]
  );

  useEffect(() => {
    let alive = true;
    async function hydrateRuntimes() {
      const toLoad = selectedItems.filter((item) => runtimeMap[item.id] === undefined);
      if (!toLoad.length) return;

      const key = process.env.NEXT_PUBLIC_API_KEY;
      if (!key) return;

      const entries = await Promise.all(
        toLoad.map(async (item) => {
          try {
            const res = await fetch(
              `https://api.themoviedb.org/3/movie/${item.id}?api_key=${key}&language=en-US`
            );
            if (!res.ok) return [item.id, 0];
            const json = await res.json();
            return [item.id, Number(json?.runtime || 0)];
          } catch {
            return [item.id, 0];
          }
        })
      );

      if (!alive) return;
      setRuntimeMap((prev) => {
        let changed = false;
        const next = { ...prev };
        for (const [id, rt] of entries) {
          if (prev[id] === rt) continue;
          next[id] = rt;
          changed = true;
        }
        return changed ? next : prev;
      });
    }
    hydrateRuntimes();
    return () => {
      alive = false;
    };
  }, [selectedItems, runtimeMap]);

  useEffect(() => {
    setSelected((prev) => {
      if (prev.length) return prev;
      const fallback = [String(movie?.id)];
      return fallback.filter(Boolean);
    });
  }, [movie?.id]);

  const baseRuntime = Number(movie?.runtime || 0);
  const fitCount = baseRuntime > 0 ? Math.floor(Math.max(0, availableMinutes) / baseRuntime) : 0;
  const selectedRuntime = selectedItems.reduce(
    (sum, item) => sum + Number(runtimeMap[item.id] ?? item.runtime ?? 0),
    0
  );
  const plannerRuntime = selectedRuntime + Math.max(0, selectedItems.length - 1) * 10;
  const plannerEndTime = addMinutesToTime(startTime, plannerRuntime);

  const flags = contentFlags(movie?.overview || "");
  const justWatchHref = `https://www.justwatch.com/in/search?q=${encodeURIComponent(movie?.title || "movie")}`;

  const toggleMovie = (id) => {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 3) return prev;
      return [...prev, id];
    });
  };

  return (
    <section className="mt-10 rounded-2xl border border-white/20 bg-black/30 backdrop-blur-xl p-4 md:p-6 space-y-6">
      <header>
        <h3 className="text-xl md:text-2xl font-bold text-white">Movie Utilities</h3>
        <p className="text-sm text-white/70">Planning tools + quick parent-safe context.</p>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <article className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3">
          <h4 className="text-white font-semibold flex items-center gap-2">
            <Clock3 className="h-4 w-4 text-yellow-300" /> How Long To Watch?
          </h4>
          <label className="text-xs text-white/70">Available minutes</label>
          <input
            type="number"
            min={30}
            max={720}
            value={availableMinutes}
            onChange={(e) => setAvailableMinutes(Number(e.target.value || 0))}
            className="w-full rounded-lg border border-white/25 bg-black/30 text-white px-3 py-2 text-sm outline-none"
          />
          <p className="text-sm text-yellow-100">
            You can fit about <span className="font-bold">{fitCount}</span> full watch(es) of this movie.
          </p>
          <p className="text-xs text-white/60">
            Based on runtime: {baseRuntime || "N/A"} minutes.
          </p>
        </article>

        <article className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3">
          <h4 className="text-white font-semibold flex items-center gap-2">
            <CalendarClock className="h-4 w-4 text-cyan-300" /> Movie Night Planner (Pick 3)
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {candidates.slice(0, 10).map((item) => {
              const checked = selected.includes(item.id);
              const rt = runtimeMap[item.id] ?? item.runtime ?? 0;
              return (
                <label
                  key={`planner-${item.id}`}
                  className={`rounded-lg border px-2.5 py-2 text-xs cursor-pointer transition ${
                    checked
                      ? "border-cyan-300/60 bg-cyan-500/15 text-white"
                      : "border-white/20 bg-black/20 text-white/80 hover:bg-white/10"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleMovie(item.id)}
                    className="mr-2"
                  />
                  <span className="font-medium">{item.title}</span>
                  <span className="ml-2 text-white/60">({rt || "?"}m)</span>
                </label>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs text-white/70">Start time</label>
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="rounded-lg border border-white/25 bg-black/30 text-white px-2 py-1.5 text-sm outline-none"
            />
          </div>
          <p className="text-sm text-cyan-100">
            Total runtime with breaks: <span className="font-bold">{plannerRuntime}</span> min, ends by{" "}
            <span className="font-bold">{plannerEndTime}</span>.
          </p>
        </article>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <article className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3">
          <h4 className="text-white font-semibold flex items-center gap-2">
            <Shield className="h-4 w-4 text-emerald-300" /> Parental Guide Quick View
          </h4>
          <p className="text-sm text-white/80">
            Certification: <span className="font-semibold text-emerald-200">{certification || "Not Rated"}</span>
          </p>
          <div className="flex flex-wrap gap-2">
            {flags.length ? (
              flags.map((flag) => (
                <span
                  key={flag}
                  className="rounded-full border border-white/20 bg-black/25 px-2.5 py-1 text-xs text-white/85"
                >
                  {flag}
                </span>
              ))
            ) : (
              <span className="text-xs text-white/60">No high-risk content flags inferred from synopsis.</span>
            )}
          </div>
          <p className="text-xs text-white/60">
            Quick guidance only. For strict family screening, verify detailed parental guides externally.
          </p>
        </article>

        <article className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3">
          <h4 className="text-white font-semibold flex items-center gap-2">
            <Ticket className="h-4 w-4 text-yellow-300" /> Where To Watch
          </h4>
          <p className="text-sm text-white/80">
            Use JustWatch for live OTT/theater availability by region.
          </p>
          <Link
            href={justWatchHref}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-full bg-white text-black px-4 py-2 text-sm font-semibold hover:bg-yellow-200 transition"
          >
            Open in JustWatch
          </Link>
          <p className="text-xs text-white/60">Search query prefilled with this movie title.</p>
        </article>
      </div>
    </section>
  );
}
