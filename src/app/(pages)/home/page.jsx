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

      {/* Remove bg-yellow-600 from here and move it inside UserFeed */}
      <div className="min-h-screen">
        <div className="mx-auto grid max-w-[2000px] grid-cols-12 gap-8 px-6 py-8">
          {/* Main Movie Reel Feed */}
          <main className="col-span-12 lg:col-span-8">
            <FeedList />
          </main>
          
          {/* Sidebar */}
          <aside className="sticky top-24 hidden h-fit space-y-6 lg:col-span-4 lg:block"> 
            {/* <FollowSuggestions /> */}
            <TrendingMoviesMini />
          </aside>
        </div> 
      </div>
    </div>
  );
}