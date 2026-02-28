'use client'
import MovieBlock from "@/app/components/MovieBlock/MovieBlock";

const SECTION_HEADING_CLASS = "text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white";
const SECTION_SUBTITLE_CLASS = "text-sm md:text-base text-white/70";

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

export default function SimilarMovies({ item, recommendations = [], subtitle }) {
  if (!recommendations.length) {
    return (
      <section className="mt-10 rounded-2xl border border-white/20 bg-black/30 backdrop-blur-xl p-4 md:p-6 text-center">
        <h2 className={SECTION_HEADING_CLASS}>Because you watched {item?.title || "this movie"}</h2>
        <p className={`mt-2 ${SECTION_SUBTITLE_CLASS}`}>
          Hybrid recommendations are still warming up for this title.
        </p>
      </section>
    );
  }

  return (
    <section className="mt-10 rounded-2xl border border-white/20 bg-black/30 backdrop-blur-xl p-4 md:p-6 space-y-4">
      <header className="space-y-2 text-center">
        <h2 className={SECTION_HEADING_CLASS}>
          Because you watched {item?.title || "this movie"}
        </h2>
        <p className={`mx-auto max-w-3xl ${SECTION_SUBTITLE_CLASS}`}>
          {subtitle ||
            "Ranked with matrix factorization from audience behavior, then re-weighted by genre, actor, and director similarity."}
        </p>
      </header>

      <div
        className="grid justify-center gap-x-6 gap-y-10 pt-6"
        style={{ gridTemplateColumns: "repeat(auto-fit, minmax(150px, 170px))" }}
      >
        {recommendations.slice(0, 12).map((movie, index) => (
          <div key={`hybrid-${movie.id}`} className="w-[150px] sm:w-[170px] pt-8">
            <MovieBlock item={toMovieBlockItem(movie)} index={index} />
          </div>
        ))}
      </div>
    </section>
  );
}
