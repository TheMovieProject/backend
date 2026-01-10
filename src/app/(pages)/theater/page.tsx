import Link from "next/link";

async function fetchVideos(q?: string) {
  const url = q ? `/api/videos?q=${encodeURIComponent(q)}` : "/api/videos";
  
  try {
    const res = await fetch(url, { 
      cache: "no-store",
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    if (!res.ok) {
      throw new Error(`Failed to fetch: ${res.status} ${res.statusText}`);
    }
    
    return await res.json();
  } catch (error) {
    console.error('Error fetching videos:', error);
    return [];
  }
}

export default async function TheatrePage({ 
  searchParams 
}: { 
  searchParams: { q?: string; m?: string } 
}) {
  let items = [];
  let error = null;
  
  try {
    items = await fetchVideos(searchParams.q);
  } catch (err) {
    error = err instanceof Error ? err.message : 'Failed to load videos';
    console.error('Page error:', err);
  }

  const selected = searchParams.m;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Search Form */}
      <form className="mb-6">
        <input 
          name="q" 
          defaultValue={searchParams.q} 
          placeholder="Search films" 
          className="w-full px-4 py-2 rounded bg-white/10 text-white border border-white/20 placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </form>

      {/* Error State */}
      {error && (
        <div className="mb-6 p-4 bg-red-500/20 border border-red-500 rounded text-white">
          Error loading videos: {error}
        </div>
      )}

      {/* Results */}
      {items.length === 0 && !error ? (
        <div className="text-center text-white/60 py-12">
          No videos found{searchParams.q ? ` for "${searchParams.q}"` : ''}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {items.map((v: any) => (
            <Link 
              key={v.id} 
              href={`/theatre?m=${v.id}${searchParams.q ? `&q=${encodeURIComponent(searchParams.q)}` : ''}`}
              scroll={false}
            >
              <div className="rounded overflow-hidden bg-white/5 border border-white/10 hover:bg-white/10 transition-all duration-200 hover:scale-105 cursor-pointer">
                <img 
                  src={v.posterUrl || `/api/og?title=${encodeURIComponent(v.title)}`} 
                  alt={v.title} 
                  className="w-full aspect-[2/3] object-cover"
                  onError={(e) => {
                    // Fallback if image fails to load
                    e.currentTarget.src = `/api/og?title=${encodeURIComponent(v.title)}`;
                  }}
                />
                <div className="p-3">
                  <div className="text-white text-sm font-medium truncate">{v.title}</div>
                  {v.duration && (
                    <div className="text-white/50 text-xs mt-1">{v.duration}</div>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Selected Film Navigation */}
      {selected && (
        <div className="mt-8 p-4 bg-blue-500/20 border border-blue-500 rounded text-white">
          <div className="flex items-center justify-between">
            <span>Film selected →</span>
            <Link 
              href={`/theatre/watch?m=${selected}`}
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded transition-colors"
            >
              Watch Now
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}