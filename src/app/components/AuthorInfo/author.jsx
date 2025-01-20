import React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Calendar, User } from "lucide-react"
const Author = ({data}) => {
  return (
    <div>
      <Link href={`${process.env.NEXTAUTH_URL}/profile/${data.user.id}`} className="flex gap-3 items-center">
      <Image
        src={data.user.image || "/default-avatar.jpg"}
        alt={data.user.name}
        width={50}
        height={50}
        className="rounded-full"
      />
      <div>
        <div className="flex items-center space-x-2">
          <User className="h-4 w-4" />
          <span className="font-medium">{data.user.name}</span>
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
