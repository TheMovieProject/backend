
import { getServerSession } from "next-auth";
import {authOptions} from "../../auth/[...nextauth]/options"
import prisma  from "@/app/libs/prismaDB";

export const GET=async(req)=>{
    try {
        const session = await getServerSession(authOptions)

        if(!session?.user?.email){
            return Response.json({isLiked:false})
        }
        const url = new URL(req.url)
        const tmdbId = url.searchParams.get("movieId")

        if(!tmdbId) return Response.json({message:"movieId required"} , {status:400})

        const user = await prisma.user.findUnique({
            where:{email:session.user.email},
            select:{id:true}
        })

        if(!user) return Response.json({isLiked:false})

            const movie = await prisma.movie.findUnique({
                where:{tmdbId:String(tmdbId)},
                select:{id:true}
            })
        if(!movie) return Response.json({isLiked:false})

       const exist = await prisma.liked.findUnique({
        where:{
            userId_movieId:{
                userId:user.id,
                movieId:movie.id
            },

        },
        select:{id:true}
       })

       return Response.json({isLiked:!!exist})
    } catch (error) {
        return Response.json({message:"Error",error} , {status:500})
    }

}