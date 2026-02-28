export default function GlobalLoading() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-[#14171f] via-[#7a4a00] to-[#d79a00] text-white pt-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="space-y-6 animate-pulse">
          <div className="h-16 w-56 rounded-full bg-white/10" />
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="space-y-4">
              <div className="h-[38vh] rounded-3xl bg-white/10" />
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 6 }).map((_, index) => (
                  <div key={index} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="mb-4 aspect-[3/4] rounded-xl bg-white/10" />
                    <div className="h-4 w-3/4 rounded bg-white/10" />
                    <div className="mt-2 h-3 w-1/2 rounded bg-white/10" />
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-4">
              <div className="h-56 rounded-3xl bg-white/10" />
              <div className="h-72 rounded-3xl bg-white/10" />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
