// types/next-auth.d.ts
import NextAuth from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      email?: string | null
      name?: string | null
      image?: string | null
      username?: string | null
      bio?: string | null
      avatarUrl?: string | null
      movieGenres?: string[]
    }
  }

  interface User {
    id: string
    email?: string | null
    name?: string | null
    image?: string | null
    username?: string | null
    bio?: string | null
    avatarUrl?: string | null
    movieGenres?: string[]
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string
    email?: string | null
    avatarUrl?: string | null
    movieGenres?: string[]
    username?: string | null
    bio?: string | null
  }
}
