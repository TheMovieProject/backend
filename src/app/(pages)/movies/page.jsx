import dynamic from "next/dynamic";

function MovieSectionSkeleton({ rows = 1 }) {
  return (
    <section className="px-4 pt-16 md:px-6 md:pt-20 font-sans">
      <div className="max-w-7xl mx-auto mb-12 space-y-6 animate-pulse">
        <div className="mx-auto h-10 w-72 rounded bg-white/10" />
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div
            key={rowIndex}
            className="grid grid-cols-2 gap-x-6 gap-y-10 pt-8 sm:grid-cols-3 lg:grid-cols-6"
          >
            {Array.from({ length: 6 }).map((__, index) => (
              <div key={index} className="w-full max-w-[185px] justify-self-center pt-8">
                <div className="h-64 rounded-xl bg-white/10" />
                <div className="mt-3 h-4 w-4/5 rounded bg-white/10" />
                <div className="mt-2 h-3 w-1/2 rounded bg-white/10" />
              </div>
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}

const MovieComponent = dynamic(() => import("@/app/components/MoviesCoponent/MoviesComponent"), {
  loading: () => <MovieSectionSkeleton rows={2} />,
});

const TrendingMovies = dynamic(
  () => import("@/app/components/Weekly_Trending_Movies/TrendingMovies"),
  {
    loading: () => <MovieSectionSkeleton />,
  }
);

const page = () => {
  return (
    <div className="bg-gradient-to-br from-gray-900 via-yellow-500 to-yellow-300 pb-12">
      <TrendingMovies />
      <MovieComponent />
    </div>
  );
};

export default page;
