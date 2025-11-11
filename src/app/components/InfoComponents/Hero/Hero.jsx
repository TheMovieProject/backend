'use client'
import Image from "next/image"

const Hero = ({ item }) => {
  return (
    <div className="relative h-screen overflow-hidden p-10">
      {/* Background Image */}
      <Image
        src={`https://image.tmdb.org/t/p/original${item.backdrop_path}`} 
        alt={item.title}
        fill
        className="object-cover object-center"
        priority
      />
      
      {/* Gradient Overlays */}
      {/* <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/80 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-r from-gray-900/90 to-transparent" /> */}
      
      {/* Content */}
      <div className="absolute bottom-0 left-0 right-0 p-10 lg:p-12">
        <div className="max-w-7xl mx-auto">
          {/* Title and Tagline */}
          <div className="mb-8">
            <h1 className="text-5xl w-[40%] lg:text-7xl font-bold text-gray-300 mb-4 leading-tight tracking-tight">
              {item.title}
            </h1>
            {/* {item.tagline && (
              <p className="text-xl lg:text-2xl text-yellow-400 font-light italic">
                {item.tagline}
              </p>
            )} */}
          </div>

          {/* Movie Details */}
          {/* <div className="flex flex-wrap items-center gap-6 text-white"> */}
            {/* Release Year */}
            {/* <div className="flex items-center gap-2">
              <span className="text-lg font-semibold text-yellow-400">
                {new Date(item.release_date).getFullYear()}
              </span>
            </div> */}

            {/* Runtime */}
            {/* {item.runtime && (
              <>
                <div className="w-1 h-1 bg-yellow-500 rounded-full"></div>
                <span className="text-lg font-medium">{item.runtime} mins</span>
              </>
            )} */}

            {/* Genres */}
            {/* {item.genres && item.genres.length > 0 && (
              <>
                <div className="w-1 h-1 bg-yellow-500 rounded-full"></div>
                <div className="flex flex-wrap gap-2">
                  {item.genres.map((genre, index) => (
                    <span 
                      key={genre.id}
                      className="px-3 py-1 bg-yellow-500/20 text-yellow-300 rounded-full text-sm border border-yellow-500/30"
                    >
                      {genre.name}
                    </span>
                  ))}
                </div>
              </>
            )} */}
          {/* </div> */}

          {/* Overview */}
          {/* {item.overview && (
            <div className="mt-6 max-w-2xl">
              <p className="text-lg text-gray-300 leading-relaxed line-clamp-3">
                {item.overview}
              </p>
            </div>
          )} */}
        </div>
      </div>

      {/* Bottom Gradient Fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-yellow-600 to-transparent" />
    </div>
  )
}

export default Hero