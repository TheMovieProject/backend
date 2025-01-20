// import React from 'react'
// import Image from 'next/image'
// const Hero = ({item}) => {
//   return (
//       <div className="h-full w-full relative">
//                 <div className="absolute bg-black/30 top-0 left-0 w-full h-[30rem] text-white font-bold"></div>
//                 <Image
//                     className="inset-0 h-[30rem] w-full object-cover object-top"
//                     src={`https://image.tmdb.org/t/p/original${item.backdrop_path}`}
//                     alt={item.title || "Movie Image"}
//                     width={240}
//                     height={360}
//                 />
//       </div>
//   )
// }

// export default Hero
import Image from "next/image"

const Hero = ({ item }) => {
  return (
    <div className="relative h-[70vh] overflow-hidden">
      <Image
        src={`https://image.tmdb.org/t/p/original${item.backdrop_path}`}
        alt={item.title}
        layout="fill"
        objectFit="cover"
        priority
      />
      <div className="absolute inset-0 bg-gradient-to-t from-gray-900 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 p-8">
        <h1 className="text-4xl md:text-6xl font-bold text-white mb-4">{item.title}</h1>
        <p className="text-xl text-gray-300">{item.tagline}</p>
      </div>
    </div>
  )
}

export default Hero
