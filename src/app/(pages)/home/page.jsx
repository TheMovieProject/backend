// app/page.jsx
import Hero from "@/app/components/Hero/Hero";
import FeedList from "@/app/components/UserFeed/UserFeed";
import FollowSuggestions from "@/app/components/FollowSuggestions/FollowSuggestions";
import TrendingMoviesMini from "@/app/components/TrendingMoviesMini/TrendingMoviesMini";

export default function HomePage() {
  return (
    <div className="bg-[#0A0F14] text-white">
      <section className="">
        <div className="mx-auto max-w-full">
          <Hero />
        </div>
      </section>

      <div className="min-h-screen">
        <div className="mx-auto max-w-[2000px] px-4 sm:px-6 py-8">
          {/* Mobile: Stack layout */}
          <div className="block lg:hidden space-y-8">
            <div>
              <FeedList />
            </div>
            <div className="space-y-6">
              {/* <FollowSuggestions /> */}
              <TrendingMoviesMini />
            </div>
          </div>

          {/* Desktop: Grid layout */}
          <div className="hidden lg:grid grid-cols-12 gap-8">
            {/* Main Movie Reel Feed */}
            <main className="col-span-8">
              <FeedList />
            </main>
            
            {/* Sidebar */}
            <aside className="sticky top-24 h-fit space-y-6 col-span-4"> 
              {/* <FollowSuggestions /> */}
              <TrendingMoviesMini />
            </aside>
          </div> 
        </div>
      </div>
    </div>
  );
}