import React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Calendar, User } from "lucide-react"
const Author = ({data}) => {
  return (
    <div>
      <Link href={`${process.env.NEXTAUTH_URL}/profile/${data.user.id}`} className="flex gap-3 items-center">
      <div className=''>
      <Image
        src={data.user.avatarUrl || "/default-avatar.jpg"}
        alt={data.user.name}
        width={100}
        height={200}
        className="rounded-full w-20 h-20 object-cover"
      />
      </div>
      <div>
        <div className="flex items-center space-x-2">
          <User className="h-4 w-4" />
          <span className="font-medium italic">{data.user.username}</span>
        </div>
        <div className="flex items-center space-x-2 mt-1">
          <Calendar className="h-4 w-4" />
          <span>{new Date(data.createdAt).toLocaleDateString()}</span>
        </div>
      </div>
          </Link>
    </div>
  )
}

export default Author
