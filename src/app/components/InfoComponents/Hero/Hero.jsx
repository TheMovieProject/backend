'use client';

import Image from "next/image";

function heroImage(item) {
  if (item?.backdrop_path) return `https://image.tmdb.org/t/p/original${item.backdrop_path}`;
  if (item?.poster_path) return `https://image.tmdb.org/t/p/w780${item.poster_path}`;
  return "/img/logo.png";
}

const Hero = ({ item }) => {
  return (
    <section className="relative h-[34vh] min-h-[240px] max-h-[340px] overflow-hidden sm:h-[90vh] sm:min-h-[520px] sm:max-h-none">
      <Image
        src={heroImage(item)}
        alt={item?.title || "Movie backdrop"}
        fill
        className="object-cover object-center"
        sizes="100vw"
        priority
      />

      <div className="absolute inset-0 bg-gradient-to-t from-yellow-600 via-[#1a1308]/72 to-black/25" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/20 to-transparent" />

      <div className="absolute inset-x-0 bottom-0 z-10">
        <div className="mx-auto max-w-7xl px-4 pb-12 pt-16 sm:px-6 sm:pb-16 sm:pt-24 lg:px-8 lg:pb-20">
          <div className="max-w-3xl">
            <h1 className="max-w-[18ch] text-3xl font-black leading-[0.96] tracking-tight text-white drop-shadow-[0_8px_24px_rgba(0,0,0,0.45)] sm:max-w-[16ch] sm:text-5xl md:text-6xl lg:max-w-[15ch] lg:text-7xl">
              {item?.title || item?.original_title || "Movie"}
            </h1>

            {item?.tagline ? (
              <p className="mt-3 max-w-2xl text-sm text-yellow-50/80 sm:text-base md:text-lg">
                {item.tagline}
              </p>
            ) : null}
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-yellow-600 to-transparent sm:h-28" />
    </section>
  );
};

export default Hero;
