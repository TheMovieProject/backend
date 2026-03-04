"use client";

import dynamic from "next/dynamic";
import Hero from "@/app/components/Hero/Hero";
import LoginGate from "@/app/components/auth/LoginGate";
import { useSession } from "next-auth/react";

const DeferredFeedList = dynamic(() => import("@/app/components/UserFeed/UserFeed"), {
  loading: () => (
    <div className="mx-auto max-w-[760px] min-h-[55vh] space-y-4 animate-pulse">
      <div className="p-1">
        <div className="h-8 w-40 rounded bg-white/10" />
        <div className="mt-3 h-4 w-72 rounded bg-white/10" />
      </div>
      {Array.from({ length: 3 }).map((_, index) => (
        <div key={index} className="rounded-[24px] bg-black/10 p-5 shadow-[0_12px_28px_rgba(0,0,0,0.14)]">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-white/10" />
              <div className="space-y-2">
                <div className="h-4 w-24 rounded bg-white/10" />
                <div className="h-3 w-16 rounded bg-white/10" />
              </div>
            </div>
            <div className="h-7 w-16 rounded-full bg-white/10" />
          </div>
          <div className="grid min-h-[144px] grid-cols-[96px_minmax(0,1fr)] gap-4">
            <div className="h-[144px] w-[96px] rounded-[16px] bg-white/10" />
            <div className="py-1">
              <div className="h-6 w-40 rounded bg-white/10" />
              <div className="mt-3 h-5 w-16 rounded-full bg-white/10" />
              <div className="mt-3 h-4 w-full rounded bg-white/10" />
              <div className="mt-2 h-4 w-5/6 rounded bg-white/10" />
            </div>
          </div>
          <div className="mt-4 flex gap-5">
            <div className="h-5 w-10 rounded bg-white/10" />
            <div className="h-5 w-10 rounded bg-white/10" />
            <div className="h-5 w-10 rounded bg-white/10" />
          </div>
        </div>
      ))}
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

const DeferredFeedHighlights = dynamic(
  () => import("@/app/components/UserFeed/FeedHighlights"),
  {
    loading: () => (
      <div className="rounded-2xl border border-white/10 bg-black/20 p-4 animate-pulse">
        <div className="mb-4 h-6 w-28 rounded bg-white/10" />
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-16 rounded-xl bg-white/10" />
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
        <div className="mx-auto max-w-[1440px] px-4 py-8 sm:px-6">
          <div className="block lg:hidden space-y-8">
            <div>
              <DeferredFeedList />
            </div>
            <div className="space-y-6">
              <DeferredTrendingMoviesMini />
              <DeferredFeedHighlights />
            </div>
          </div>

          <div className="hidden lg:grid grid-cols-[minmax(0,1fr)_340px] gap-8 xl:grid-cols-[minmax(0,1fr)_380px]">
            <div className="min-w-0">
              <DeferredFeedList />
            </div>
            <aside className="sticky top-24 h-fit space-y-6">
              <DeferredTrendingMoviesMini />
              <DeferredFeedHighlights />
            </aside>
          </div>
        </div>
      </div>

      <LoginGate threshold={0.2} />
    </main>
  );
}
