"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import MovieInfo from "@/app/components/InfoComponents/MovieInfo/MovieInfo";
import Hero from "@/app/components/InfoComponents/Hero/Hero";

function SectionSkeleton({ className = "" }) {
  return (
    <div className={`rounded-2xl border border-white/20 bg-black/30 p-4 md:p-6 animate-pulse ${className}`}>
      <div className="mx-auto h-8 w-56 rounded bg-white/10" />
      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="space-y-3">
            <div className="aspect-[3/4] rounded-xl bg-white/10" />
            <div className="h-4 w-4/5 rounded bg-white/10" />
            <div className="h-3 w-1/2 rounded bg-white/10" />
          </div>
        ))}
      </div>
    </div>
  );
}

const SimilarMovies = dynamic(() => import("@/app/components/SimilarMovies/SimilarMovies"), {
  loading: () => <SectionSkeleton className="mt-10" />,
});

const MovieUtilityPanel = dynamic(
  () => import("@/app/components/InfoComponents/MovieInfo/MovieUtilityPanel"),
  {
    loading: () => <SectionSkeleton className="mt-10" />,
  }
);

const Reviews = dynamic(() => import("@/app/components/Reviews/review"), {
  loading: () => <SectionSkeleton className="mt-16" />,
});

const Info = () => {
  const [item, setItem] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [averageRating, setAverageRating] = useState(null);
  const [userRating, setUserRating] = useState(0);
  const [ratingCount, setRatingCount] = useState(0);
  const [defaultInWatchlist, setDefaultInWatchlist] = useState(false);
  const [defaultInLiked, setDefaultInLiked] = useState(false);
  const [recommendations, setRecommendations] = useState([]);
  const params = useParams();
  const movieId = params.id;

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    const loadSecondaryData = async (movieData, creditsData) => {
      try {
        const [videosRes, providersRes, releaseDatesRes, recommendationsRes] = await Promise.all([
          fetch(`https://api.themoviedb.org/3/movie/${movieId}/videos?api_key=${process.env.NEXT_PUBLIC_API_KEY}`, { signal: controller.signal }),
          fetch(`https://api.themoviedb.org/3/movie/${movieId}/watch/providers?api_key=${process.env.NEXT_PUBLIC_API_KEY}`, { signal: controller.signal }),
          fetch(`https://api.themoviedb.org/3/movie/${movieId}/release_dates?api_key=${process.env.NEXT_PUBLIC_API_KEY}`, { signal: controller.signal }),
          fetch(`/api/movies/recommendations/${movieId}`, { signal: controller.signal }),
        ]);

        const videosData = videosRes.ok ? await videosRes.json() : { results: [] };
        const providersData = providersRes.ok ? await providersRes.json() : { results: {} };
        const releaseDatesData = releaseDatesRes.ok ? await releaseDatesRes.json() : { results: [] };
        const recommendationsData = recommendationsRes.ok ? await recommendationsRes.json() : { items: [] };

        if (!active) return;

        const trailer = (videosData?.results || []).find(
          (video) => video?.site === "YouTube" && video?.type === "Trailer"
        );

        const countryRelease =
          (releaseDatesData?.results || []).find((release) => release.iso_3166_1 === "IN") ||
          (releaseDatesData?.results || []).find((release) => release.iso_3166_1 === "US") ||
          null;

        const certification =
          (countryRelease?.release_dates || []).find((release) => release.certification)
            ?.certification || null;

        const providers =
          providersData?.results?.IN?.flatrate ||
          providersData?.results?.US?.flatrate ||
          providersData?.results?.IN?.rent ||
          [];

        setItem((prev) => ({
          ...prev,
          ...movieData,
          credits: creditsData,
          providers,
          certification,
          trailerUrl: trailer ? `https://www.youtube.com/watch?v=${trailer.key}` : null,
        }));
        setRecommendations((recommendationsData?.items || []).slice(0, 18));

        if (process.env.NEXT_PUBLIC_OMDB_API_KEY && movieData?.imdb_id) {
          const omdbRes = await fetch(
            `https://www.omdbapi.com/?apikey=${process.env.NEXT_PUBLIC_OMDB_API_KEY}&i=${movieData.imdb_id}`,
            { signal: controller.signal }
          );

          if (!omdbRes.ok || !active) return;

          const omdbData = await omdbRes.json();
          const rotten =
            (omdbData?.Ratings || []).find((rating) => rating.Source === "Rotten Tomatoes")
              ?.Value || null;
          const imdbRating = Number.parseFloat(omdbData?.imdbRating || "");

          if (!active) return;

          setItem((prev) => ({
            ...prev,
            imdbRating: Number.isFinite(imdbRating) ? imdbRating : null,
            rottenTomatoes: rotten,
          }));
        }
      } catch (secondaryError) {
        if (secondaryError?.name !== "AbortError") {
          console.error("Movie detail secondary load failed", secondaryError);
        }
      }
    };

    const loadCoreData = async () => {
      try {
        if (!movieId) return;

        setLoading(true);
        setError(null);
        setRecommendations([]);

        const [
          movieResponse,
          creditsResponse,
          ratingResponse,
          watchStatusRes,
          likedStatusRes,
        ] = await Promise.all([
          fetch(`https://api.themoviedb.org/3/movie/${movieId}?api_key=${process.env.NEXT_PUBLIC_API_KEY}`, { signal: controller.signal }),
          fetch(`https://api.themoviedb.org/3/movie/${movieId}/credits?api_key=${process.env.NEXT_PUBLIC_API_KEY}`, { signal: controller.signal }),
          fetch(`/api/userRating?movieId=${movieId}`, { signal: controller.signal }),
          fetch(`/api/watchlist/status?movieId=${movieId}`, { signal: controller.signal }),
          fetch(`/api/liked/status?movieId=${movieId}`, { signal: controller.signal }),
        ]);

        if (!movieResponse.ok || !creditsResponse.ok) {
          throw new Error("Network response was not ok");
        }

        const movieData = await movieResponse.json();
        const creditsData = await creditsResponse.json();
        const ratingData = ratingResponse.ok
          ? await ratingResponse.json()
          : { averageRating: 0, userRating: null, ratingCount: 0 };
        const watchData = watchStatusRes.ok
          ? await watchStatusRes.json()
          : { inWatchlist: false };
        const likedData = likedStatusRes.ok
          ? await likedStatusRes.json()
          : { isLiked: false };

        if (!active) return;

        setItem({
          ...movieData,
          credits: creditsData,
          providers: [],
          certification: null,
          trailerUrl: null,
          imdbRating: null,
          rottenTomatoes: null,
        });
        setAverageRating(ratingData.averageRating ?? 0);
        setUserRating(ratingData.userRating ?? 0);
        setRatingCount(ratingData.ratingCount ?? 0);
        setDefaultInWatchlist(!!watchData.inWatchlist);
        setDefaultInLiked(!!likedData.isLiked);
        setLoading(false);

        void loadSecondaryData(movieData, creditsData);
      } catch (loadError) {
        if (loadError?.name === "AbortError") return;
        setError(loadError.message);
        setLoading(false);
      }
    };

    void loadCoreData();

    return () => {
      active = false;
      controller.abort();
    };
  }, [movieId]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-yellow-600">
        <Loader2 className="h-12 w-12 animate-spin text-red-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-900">
        <div
          className="bg-red-900 border-l-4 border-red-500 text-red-100 p-4 rounded"
          role="alert"
        >
          <p className="font-bold">Error in loading</p>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-yellow-600 text-white">
      <Hero item={item} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <MovieInfo
          item={item}
          averageRating={averageRating}
          userRating={userRating}
          ratingCount={ratingCount}
          onRatingChange={setUserRating}
          defaultInWatchlist={defaultInWatchlist}
          defaultLiked={defaultInLiked}
        />

        <SimilarMovies
          item={item}
          recommendations={recommendations}
        />

        <MovieUtilityPanel
          movie={item}
          certification={item?.certification}
          recommendations={recommendations}
        />

        <div className="mt-16">
          <Reviews movieId={movieId} title={item.title} posterUrl={item.poster_path} />
        </div>
      </div>
    </div>
  );
};

export default Info;
