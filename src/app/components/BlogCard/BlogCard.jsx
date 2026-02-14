import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Calendar, User } from "lucide-react"

const BlogCard = ({ item }) => {
  return (
    <div className="bg-gray-800 rounded-lg overflow-hidden shadow-lg transition-transform duration-300 hover:scale-105">
    <Link href={`/blog/${item.id}`}>
      <div className="relative h-48">
        {/* {!item.thumbnail ? (
          <Image
            src="img/NoImage.jpg"
            alt="no-image"
            className="w-[40rem] h-[25rem] object-cover"
            width={1050}
            height={1050}
          />
        ) : (
          <Image
            className="w-[40rem] h-[25rem] object-cover"
            src={item.thumbnail}
            alt="scene"
            width={1050}
            height={1050}
          />
        )}
      </div>
      <div className="flex flex-col gap-3 items-start">
        <div className="text-[0.8rem] text-gray-600">
          {item.createdAt.slice(0, 10)}
          <span className="text-red-500 ml-3">{item.hashtags}</span>
        </div>
        <div>
          {item.title ? (
            <div className="font-bold text-[1.25rem]">{item.title}</div>
          ) : (
            <div>No title</div>
          )}
        </div>
        <div className="text-[0.9rem] text-gray-600">{item.desc}</div>
        <div className="border-b-2 border-red-500">Read More</div> */}
        <Image 
        src={item.thumbnail || "img/NoImage.jpg"} 
        alt={item.title} layout="fill" objectFit="cover" 
        />
        </div>
        <div className="p-6">
          <h2 className="text-xl font-semibold text-white mb-2 line-clamp-2">{item.title}</h2>
          <p className="text-gray-400 mb-4 line-clamp-3">{item.description}</p>
          <div className="flex gap-2 items-center text-sm text-gray-500">
            <User className="h-4 w-4 mr-1" />
            <span className="mr-4">{item.author}</span>
            <Calendar className="h-4 w-4 mr-1" />
            <span>{new Date(item.createdAt).toLocaleDateString()}</span>
            {/* <span className='text-white'>{item.hashtags}</span> */}
        </div>
      </div>
    </Link>
    </div>
  );
};

export default BlogCard;
