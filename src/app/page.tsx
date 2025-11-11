import { getAuthSession } from "@/app/api/auth/[...nextauth]/options";
import FeedList from "@/app/components/UserFeed/UserFeed";
import TrendingMoviesMini from "@/app/components/TrendingMoviesMini/TrendingMoviesMini";
import Hero from "@/app/components/Hero/Hero";
import LoginGate from "@/app/components/auth/LoginGate";

export default async function Home() {
  const session = await getAuthSession();

  if (!session) {
    // Guests: show just Hero (your choice). Gate still mounts and will pop if they scroll.
    return (
      <main className="bg-[#0A0F14] text-white">
        <section>
          <div className="mx-auto max-w-full">
            <Hero />
          </div>
        </section>
        {/* Scroll gate for guests */}
        <LoginGate threshold={0.2} />
      </main>
    );
  }

  // Logged-in: normal experience
  return (
    <main className="bg-[#0A0F14] text-white">
      <section>
        <div className="mx-auto max-w-full">
          <Hero />
        </div>
      </section>

      <div className="min-h-screen bg-yellow-600">
        <div className="mx-auto grid max-w-[2000px] grid-cols-12 gap-8 px-6 py-8">
          <div className="col-span-12 lg:col-span-8">
            <FeedList />
          </div>
          <aside className="sticky top-24 hidden h-fit space-y-6 lg:col-span-4 lg:block">
            <TrendingMoviesMini />
          </aside>
        </div>
      </div>

      {/* Gate mounts but stays hidden for authed users */}
      <LoginGate threshold={0.2} />
    </main>
  );
}
