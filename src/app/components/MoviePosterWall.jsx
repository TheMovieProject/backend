"use client";
import { useEffect, useState } from "react";
import requests from "@/app/helpers/Requests"; // adjust path if needed

const IMAGE_BASE = "https://image.tmdb.org/t/p/w500";

// simple config for 4 rows (vertical position, tilt, speed, direction)
const ROW_CONFIG = [
  { top: "10%", rotateX: 22, duration: 50, direction: "normal" },
  { top: "32%", rotateX: 10, duration: 60, direction: "reverse" },
  { top: "54%", rotateX: -2, duration: 55, direction: "normal" },
  { top: "76%", rotateX: -14, duration: 65, direction: "reverse" },
];

export default function MoviePosterWall() {
  const [rows, setRows] = useState([]); // array of [ [row1Posters], [row2Posters], ... ]

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const endpoints = [
          requests.requestPopular,
          requests.requestTopRated,
          requests.requestUpcoming,
          requests.requestNowPlaying,
          requests.requestTrendingWeek,
        ];

        const results = await Promise.all(
          endpoints.map((url) =>
            fetch(url)
              .then((r) => r.json())
              .catch(() => null)
          )
        );

        const byId = new Map();

        results.forEach((data) => {
          if (!data || !data.results) return;
          data.results.forEach((m) => {
            if (!m || !m.id || !m.poster_path) return;
            if (!byId.has(m.id)) {
              byId.set(m.id, `${IMAGE_BASE}${m.poster_path}`);
            }
          });
        });

        const allPosters = Array.from(byId.values());
        if (!allPosters.length) return;

        // split all posters across 4 rows so rows don't repeat the same ones
        const rowsCount = 4;
        const perRow = Math.ceil(allPosters.length / rowsCount);
        const nextRows = [];

        for (let i = 0; i < rowsCount; i++) {
          const slice = allPosters.slice(i * perRow, (i + 1) * perRow);
          if (!slice.length) break;
          nextRows.push(slice);
        }

        setRows(nextRows);
      } catch (e) {
        console.error("Failed to fetch posters", e);
      }
    };

    fetchAll();
  }, []);

  if (!rows.length) return null;

  return (
    <>
      <div className="pointer-events-none absolute inset-0 overflow-hidden z-0">
        {rows.map((rowPosters, rowIndex) => {
          const { top, rotateX, duration, direction } =
            ROW_CONFIG[rowIndex] || ROW_CONFIG[ROW_CONFIG.length - 1];

          // triple each row's posters so animation has no empty gap
          const loopPosters = [
            ...rowPosters,
            ...rowPosters,
            ...rowPosters,
          ];

          return (
            <div
              key={rowIndex}
              className="poster-row-wrapper"
              style={{
                top,
                transform: `rotateX(${rotateX}deg)`,
              }}
            >
              <div
                className="poster-row"
                style={{
                  animationDuration: `${duration}s`,
                  animationDirection: direction,
                }}
              >
                {loopPosters.map((src, idx) => (
                  <div key={`${rowIndex}-${idx}`} className="poster">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src} alt="Movie poster" />
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <style jsx>{`
        .poster-row-wrapper {
          position: absolute;
          left: 0;
          right: 0;
          display: block;
          perspective: 1400px;
          transform-style: preserve-3d;
        }

        .poster-row {
          display: flex;
          min-width: max-content; /* row width = total poster width */
          gap: 1.6rem;
          will-change: transform;
          transform-style: preserve-3d;
          animation-name: marquee;
          animation-timing-function: linear;
          animation-iteration-count: infinite;
        }

        /* LANDSCAPE cards */
        .poster {
          flex: 0 0 auto;
          width: 260px;
          height: 150px;
          border-radius: 1.2rem;
          overflow: hidden;
          box-shadow: 0 18px 45px rgba(0, 0, 0, 0.7);
          transform: translateZ(0);
        }

        .poster img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        @keyframes marquee {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-33.333%); /* we tripled posters => move by 1/3 */
          }
        }

        @media (max-width: 768px) {
          .poster {
            width: 180px;
            height: 110px;
          }
        }
      `}</style>
    </>
  );
}
