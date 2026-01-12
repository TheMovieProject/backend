import { NextRequest, NextResponse } from "next/server";
import Mux from "@mux/mux-node";
import prisma from "@/app/libs/prismaDB";

export const runtime = "nodejs"; // ✅ important

const mux = new Mux({
  webhookSecret: process.env.MUX_WEBHOOK_SECRET,
});

export async function POST(req: NextRequest) {
  const rawBody = await req.text(); // ✅ must be raw
  const signature = req.headers.get("mux-signature"); // ✅ route handler way

  if (!signature) {
    return NextResponse.json(
      { error: "Missing mux-signature header" },
      { status: 400 }
    );
  }

  let evt: any;
  try {
    // ✅ verifies signature + returns parsed event
    evt = mux.webhooks.unwrap(rawBody, req.headers);
  } catch (e) {
    console.error("[mux webhook] invalid signature", e);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const type = evt.type as string;
  const data = evt.data;

  try {
    if (type === "video.upload.asset_created") {
      const uploadId: string | undefined = data?.id;
      const assetId: string | undefined = data?.asset_id;

      if (!uploadId) return NextResponse.json({ ok: true });

      const ticket = await prisma.uploadTicket.findUnique({
        where: { muxUploadId: uploadId },
      });

      if (!ticket) return NextResponse.json({ ok: true });

      await prisma.uploadTicket.update({
        where: { muxUploadId: uploadId },
        data: { status: "asset_created" },
      });

      if (assetId) {
        await prisma.video.update({
          where: { id: ticket.videoId },
          data: { muxAssetId: assetId, status: "processing" },
        });
      }

      return NextResponse.json({ ok: true });
    }

    if (type === "video.asset.ready") {
      const assetId: string | undefined = data?.id;
      if (!assetId) return NextResponse.json({ ok: true });

      const video = await prisma.video.findFirst({
        where: { muxAssetId: assetId },
      });
      if (!video) return NextResponse.json({ ok: true });

      const playbackId: string | null = data?.playback_ids?.[0]?.id ?? null;
      const durationSec =
        typeof data?.duration === "number" ? Math.floor(data.duration) : null;

      await prisma.video.update({
        where: { id: video.id },
        data: { status: "ready", muxPlaybackId: playbackId, durationSec },
      });

      await prisma.uploadTicket.updateMany({
        where: { videoId: video.id },
        data: { status: "ready" },
      });

      return NextResponse.json({ ok: true });
    }

    if (type === "video.asset.errored") {
      const assetId: string | undefined = data?.id;
      if (!assetId) return NextResponse.json({ ok: true });

      const video = await prisma.video.findFirst({
        where: { muxAssetId: assetId },
        select: { id: true },
      });

      await prisma.video.updateMany({
        where: { muxAssetId: assetId },
        data: { status: "errored" },
      });

      if (video?.id) {
        await prisma.uploadTicket.updateMany({
          where: { videoId: video.id },
          data: { status: "errored" },
        });
      }

      return NextResponse.json({ ok: true });
    }

    console.log("[mux webhook] ignored event:", type);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[mux webhook] handler error", err);
    return NextResponse.json({ error: "Internal webhook error" }, { status: 500 });
  }
}
