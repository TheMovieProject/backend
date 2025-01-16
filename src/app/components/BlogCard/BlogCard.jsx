import React from 'react';
import Image from 'next/image';
import Link from 'next/link';

const BlogCard = ({ item }) => {
  return (
    <Link href={`/blog/${item.id}`} className="mt-[0.8rem] flex flex-col lg:flex-row w-full gap-5">
      <div className='border-2'>
        {!item.thumbnail ? (
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
        <div className="border-b-2 border-red-500">Read More</div>
      </div>
    </Link>
  );
};

export default BlogCard;
