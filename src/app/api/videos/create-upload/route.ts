import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/app/libs/prismaDB";
import { Video as muxVideo } from "@/app/libs/mux";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";

// App origin for Mux CORS (used for Direct Uploads)
const rawAppUrl =
  process.env.NEXTAUTH_URL ??
  (process.env.NODE_ENV === "development"
    ? "http://localhost:3000"
    : "https://themovieproject.in");

// ensures it's just "scheme://host[:port]"
const APP_ORIGIN = new URL(rawAppUrl).origin;

const BodySchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  language: z.string().optional(),
  posterUrl: z.string().url().optional(),
  visibility: z.enum(["public", "unlisted", "private"]).default("public"),
  tags: z.array(z.string()).default([]),

  // NEW FIELDS
  cast: z.array(z.string()).default([]),
  genres: z.array(z.string()).default([]),
  ageRestricted: z.boolean().default(false),
  writer: z.string().optional(),
  director: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const session = (await getServerSession(authOptions as any)) as any;

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const json = await req.json();
    const data = BodySchema.parse(json);

    // 1) Create DB video row (pending)
    const video = await prisma.video.create({
      data: {
        userId: session.user.id,
        title: data.title,
        description: data.description ?? null,
        language: data.language ?? "en",
        posterUrl: data.posterUrl ?? null,
        visibility: data.visibility,
        tags: data.tags,

        // new metadata fields
        cast: data.cast,
        genres: data.genres,
        ageRestricted: data.ageRestricted,
        writer: data.writer ?? null,
        director: data.director ?? null,

        status: "pending", // matches your Video model
      },
    });

    // 2) Create Mux Direct Upload (gives you a signed upload URL)
    const upload = await muxVideo.uploads.create({
      cors_origin: APP_ORIGIN,
      new_asset_settings: {
        playback_policy: ["public"],
      },
    });

    // 3) Track upload ticket so webhook can later link asset -> video
    await prisma.uploadTicket.create({
      data: {
        userId: session.user.id,
        videoId: video.id,
        muxUploadId: upload.id,
        status: "uploading",
      },
    });

    // 4) Return info to client – client will PUT file to uploadUrl
    return NextResponse.json(
      {
        videoId: video.id,
        uploadId: upload.id,
        uploadUrl: upload.url,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("[create-upload] error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
