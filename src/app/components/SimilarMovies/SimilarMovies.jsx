'use client'
import MovieBlock from "@/app/components/MovieBlock/MovieBlock";

const SECTION_HEADING_CLASS = "text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white";

function toMovieBlockItem(movie) {
  return {
    id: movie?.id,
    title: movie?.title || movie?.name || "Untitled",
    original_title: movie?.original_title || movie?.title || movie?.name || "Untitled",
    poster_path: movie?.poster_path ?? movie?.posterPath ?? null,
    posterUrl: movie?.posterUrl ?? null,
    vote_average: Number(movie?.vote_average ?? movie?.voteAverage ?? 0),
    release_date: movie?.release_date ?? movie?.releaseDate ?? null,
  };
}

export default function SimilarMovies({ item, recommendations = [] }) {
  if (!recommendations.length) {
    return (
      <section className="mt-10 rounded-2xl border border-white/20 bg-black/30 backdrop-blur-xl p-4 md:p-6 text-center">
        <h2 className={SECTION_HEADING_CLASS}>Because you watched {item?.title || "this movie"}</h2>
      </section>
    );
  }

  return (
    <section className="mt-10 rounded-2xl border border-white/20 bg-black/30 backdrop-blur-xl p-4 md:p-6 space-y-4">
      <header className="space-y-2 text-center">
        <h2 className={SECTION_HEADING_CLASS}>
          Because you watched {item?.title || "this movie"}
        </h2>
      </header>

      <div className="grid grid-cols-2 gap-x-3 gap-y-8 pt-4 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">
        {recommendations.slice(0, 12).map((movie, index) => (
          <div key={`hybrid-${movie.id}`} className="w-full max-w-[170px] justify-self-center pt-8">
            <MovieBlock item={toMovieBlockItem(movie)} index={index} />
          </div>
        ))}
      </div>
    </section>
  );
}
