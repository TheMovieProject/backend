import Image from "next/image";
import Link from "next/link";
import ProfileImage from "../../../../../../public/img/profile.png";
import prisma from "@/app/libs/prismaDB";
const PROJECT_ICON = "/img/logo.png";

function posterSrc(movie) {
  if (!movie?.posterUrl) return PROJECT_ICON;
  if (movie.posterUrl.startsWith("http")) return movie.posterUrl;
  return `https://image.tmdb.org/t/p/w500${movie.posterUrl}`;
}

export default async function SharedWatchlistPage({ params }) {
  const token = params?.token;
  if (!token) return <div className="pt-24 text-white">Invalid share link.</div>;

  const list = await prisma.watchlist.findUnique({
    where: { shareToken: token },
    include: {
      owner: {
        select: {
          id: true,
          username: true,
          avatarUrl: true,
          image: true,
        },
      },
      items: {
        orderBy: [{ rank: "asc" }, { addedAt: "desc" }],
        include: { movie: true },
      },
    },
  });

  const visibility = list?.visibility || (list?.isPublic ? "SHARED" : "PRIVATE");
  if (!list || visibility !== "SHARED") {
    return (
      <div className="min-h-screen pt-24 bg-gradient-to-br from-gray-900 via-yellow-700 to-yellow-500 text-white px-6">
        <div className="max-w-3xl mx-auto text-center py-20">
          <h1 className="text-3xl font-bold mb-3">Shared list unavailable</h1>
          <p className="text-white/80">This link is invalid or the list is private.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 bg-gradient-to-br from-gray-900 via-yellow-700 to-yellow-500 text-white px-4 md:px-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex items-center gap-4">
          <Image
            src={list.owner?.avatarUrl || list.owner?.image || ProfileImage}
            alt="owner"
            width={56}
            height={56}
            className="w-14 h-14 rounded-full border-2 border-white/40 object-cover"
          />
          <div>
            <h1 className="text-3xl font-bold">{list.name}</h1>
            <p className="text-white/80 text-sm">
              by @{list.owner?.username || "movie-lover"} · {list.items.length} movies
            </p>
          </div>
        </div>

        {list.items.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-4 pb-10">
            {list.items.map((item) => (
              <Link
                href={`/movies/${item.movie.tmdbId}`}
                key={item.id}
                className="bg-white shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 p-3 border border-gray-200"
              >
                <div className="aspect-[3/4] overflow-hidden mb-3 bg-gradient-to-br from-yellow-400 to-orange-500 relative">
                  <Image
                    src={posterSrc(item.movie)}
                    alt={item.movie.title || "Movie"}
                    width={200}
                    height={300}
                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <h3 className="font-semibold text-gray-900 text-sm line-clamp-2 leading-tight min-h-[2.4rem]">
                  {item.movie.title}
                </h3>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-white/80">No movies in this list yet.</div>
        )}
      </div>
    </div>
  );
}





