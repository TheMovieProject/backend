"use client"

import { SessionProvider } from "next-auth/react"

export default function Provider({children}){
    return(
        <SessionProvider refetchOnWindowFocus={false} refetchWhenOffline={false}>
          {children}
        </SessionProvider>

    )
}
