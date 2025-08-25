// app/page.jsx
import Hero from "@/app/components/Hero/Hero";
import FeedList from "@/app/components/UserFeed/UserFeed";
import FollowSuggestions from "@/app/components/FollowSuggestions/FollowSuggestions";
import TrendingMoviesMini from "@/app/components/TrendingMoviesMini/TrendingMoviesMini";

export default function HomePage() {
  return (
    <div className="bg-[#0A0F14] text-white">
      <section className="border-b border-white/5">
        <div className="mx-auto max-w-[1200px] px-4 py-6">
          <Hero />
        </div>
      </section>

      <div className="mx-auto grid max-w-[1200px] grid-cols-12 gap-6 px-4 py-6">
        <main className="col-span-12 lg:col-span-8 space-y-6">
          {/* optional: friends “rings” row here */}
          <FeedList mode="forYou" />
        </main>
        <aside className="sticky top-20 hidden h-fit space-y-6 lg:col-span-4 lg:block">
          <div className="rounded-2xl border border-white/5 bg-white/5 p-4 backdrop-blur-sm">
            <FollowSuggestions />
          </div>
          <div className="rounded-2xl border border-white/5 bg-white/5 p-4 backdrop-blur-sm">
            <TrendingMoviesMini />
          </div>
        </aside>
      </div>
    </div>
  );
}
