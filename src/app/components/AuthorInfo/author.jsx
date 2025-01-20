import React from 'react'
import Link from 'next/link'
import Image from 'next/image'
const Author = ({data}) => {
  return (
    <div>
      <Link href={`${process.env.NEXTAUTH_URL}/profile/${data.user.id}`} className="flex gap-3 items-center">
            {data.user?.image ? (
              <Image
                className='rounded-full object-cover'
                src={data.user.image}
                alt={data.user.name || 'Author'}
                width={35}
                height={35}
              />
            ) : (
              <Image
              className='rounded-full object-cover'
              src='img/NoImage.jpg'
              alt={data.user.name || 'Author'}
              width={35}
              height={35}
            />
            )}
            
            <div className='flex flex-col gap-1 text-sm font-medium'>
              <p className="font-bold">{data.userEmail}</p>
              <p className="text-gray-600">
                {new Date(data.createdAt).toLocaleDateString()}
              </p>
              <p className="text-gray-600">Views: {data.views}</p>
            </div>
          </Link>
    </div>
  )
}

export default Author
