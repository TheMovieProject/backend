// app/page.jsx
import Hero from "@/app/components/Hero/Hero";
import FeedList from "@/app/components/UserFeed/UserFeed";
import TrendingMoviesMini from "@/app/components/TrendingMoviesMini/TrendingMoviesMini";

export default function HomePage() {
  return (
    <div className="bg-[#0A0F14] text-white overflow-x-hidden">
      <section>
        <div className="mx-auto max-w-full">
          <Hero />
        </div>
      </section>

      <div className="min-h-screen">
        <div className="mx-auto max-w-[2000px] px-4 sm:px-6 py-8">
          {/* Mobile */}
          <div className="block lg:hidden space-y-8">
            <div className="space-y-6">
              <TrendingMoviesMini />
            </div>
            <div>
              <FeedList />
            </div>
          </div>

          {/* Desktop */}
          <div className="hidden lg:grid grid-cols-12 gap-8">
            <main className="col-span-8">
              <FeedList />
            </main>

            <aside className="sticky top-24 h-fit space-y-6 col-span-4">
              <TrendingMoviesMini />
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
}
