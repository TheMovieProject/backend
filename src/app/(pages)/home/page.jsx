import { getAuthSession } from "@/app/api/auth/[...nextauth]/options";
import FeedList from "@/app/components/UserFeed/UserFeed";
import TrendingMoviesMini from "@/app/components/TrendingMoviesMini/TrendingMoviesMini";
import Hero from "@/app/components/Hero/Hero";
import LoginGate from "@/app/components/auth/LoginGate";
import HeroBeforeLogin from "@/app/components/HeroBeforeLogin/HeroBeforeLogin";

export default async function Home() {
  const session = await getAuthSession();

  if (!session) {
    return (
      <main className="bg-yellow-600 text-white overflow-x-hidden">
        <section>
          <div className="mx-auto max-w-full">
            <HeroBeforeLogin />
          </div>
        </section>
        <LoginGate threshold={1.0} />
      </main>
    );
  }

  return (
    <main className="bg-yellow-600 text-white overflow-x-hidden">
      <section>
        <div className="mx-auto max-w-full">
          <Hero />
        </div>
      </section>

      {/* ✅ remove bg-yellow-600 here */}
      <div className="min-h-screen">
        <div className="mx-auto max-w-full px-4 sm:px-6 py-8">
          
          {/* Mobile: trending ABOVE feed */}
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
            <div className="col-span-8">
              <FeedList />
            </div>
            <aside className="col-span-4 sticky top-24 h-fit space-y-6">
              <TrendingMoviesMini />
            </aside>
          </div>

        </div>
      </div>

      <LoginGate threshold={0.2} />
    </main>
  );
}
