"use client";

import dynamic from "next/dynamic";
import Hero from "@/app/components/Hero/Hero";
import LoginGate from "@/app/components/auth/LoginGate";
import { useSession } from "next-auth/react";

const DeferredFeedList = dynamic(() => import("@/app/components/UserFeed/UserFeed"), {
  loading: () => (
    <div className="min-h-[55vh] rounded-3xl border border-white/10 bg-black/20 p-6 animate-pulse">
      <div className="mb-6 h-8 w-40 rounded bg-white/10" />
      <div className="columns-1 sm:columns-2 xl:columns-3 [column-gap:1rem]">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={index}
            className="mb-4 break-inside-avoid rounded-2xl border border-white/10 bg-white/5 p-4"
          >
            <div className="h-44 rounded-xl bg-white/10" />
            <div className="mt-4 h-4 w-4/5 rounded bg-white/10" />
            <div className="mt-2 h-3 w-1/2 rounded bg-white/10" />
          </div>
        ))}
      </div>
    </div>
  ),
});

const DeferredTrendingMoviesMini = dynamic(
  () => import("@/app/components/TrendingMoviesMini/TrendingMoviesMini"),
  {
    loading: () => (
      <div className="rounded-2xl border border-white/10 bg-black/20 p-4 animate-pulse">
        <div className="mb-4 h-6 w-32 rounded bg-white/10" />
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="flex items-center gap-3">
              <div className="h-14 w-10 rounded-lg bg-white/10" />
              <div className="flex-1">
                <div className="h-4 w-4/5 rounded bg-white/10" />
                <div className="mt-2 h-3 w-2/5 rounded bg-white/10" />
              </div>
            </div>
          ))}
        </div>
      </div>
    ),
  }
);

const DeferredHeroBeforeLogin = dynamic(
  () => import("@/app/components/HeroBeforeLogin/HeroBeforeLogin"),
  {
    loading: () => (
      <div className="flex h-screen items-center justify-center bg-yellow-600">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-white" />
      </div>
    ),
  }
);

export default function Home() {
  const { status } = useSession();
  const isAuthenticated = status === "authenticated";
  const isLoading = status === "loading";

  if (!isAuthenticated) {
    return (
      <main className="bg-yellow-600 text-white overflow-x-hidden">
        <section>
          <div className="mx-auto max-w-full">
            {isLoading ? (
              <div className="flex h-screen items-center justify-center bg-yellow-600">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-white" />
              </div>
            ) : (
              <DeferredHeroBeforeLogin />
            )}
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

      <div className="min-h-screen">
        <div className="mx-auto max-w-full px-4 sm:px-6 py-8">
          <div className="block lg:hidden space-y-8">
            <div className="space-y-6">
              <DeferredTrendingMoviesMini />
            </div>
            <div>
              <DeferredFeedList />
            </div>
          </div>

          <div className="hidden lg:grid grid-cols-12 gap-8">
            <div className="col-span-8">
              <DeferredFeedList />
            </div>
            <aside className="col-span-4 sticky top-24 h-fit space-y-6">
              <DeferredTrendingMoviesMini />
            </aside>
          </div>
        </div>
      </div>

      <LoginGate threshold={0.2} />
    </main>
  );
}
