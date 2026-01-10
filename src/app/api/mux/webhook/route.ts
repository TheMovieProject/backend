import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { Webhook } from "@mux/mux-node";
import prisma from "@/app/libs/prismaDB";

const MUX_WEBHOOK_SECRET = process.env.MUX_WEBHOOK_SECRET!;

export async function POST(req: NextRequest) {
  const headerList = headers();
  const signature = headerList.get("mux-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "Missing mux-signature header" },
      { status: 400 }
    );
  }

  const rawBody = await req.text();
  let evt: any;

  try {
    evt = Webhook.verifyHeader(rawBody, signature, MUX_WEBHOOK_SECRET);
  } catch (e) {
    console.error("[mux webhook] invalid signature", e);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const type = evt.type as string;
  const data = evt.data;

  try {
    // 1) Upload → Asset created (link uploadId -> assetId -> video)
    if (type === "video.upload.asset_created") {
      // data.id       = upload id
      // data.asset_id = asset id
      const uploadId: string | undefined = data?.id;
      const assetId: string | undefined = data?.asset_id;

      if (!uploadId) {
        console.warn("[mux webhook] upload.asset_created without id");
        return NextResponse.json({ ok: true });
      }

      const ticket = await prisma.uploadTicket.findUnique({
        where: { muxUploadId: uploadId },
      });

      if (!ticket) {
        console.warn(
          "[mux webhook] no UploadTicket for uploadId",
          uploadId
        );
        return NextResponse.json({ ok: true });
      }

      // Mark ticket as asset_created
      await prisma.uploadTicket.update({
        where: { muxUploadId: uploadId },
        data: { status: "asset_created" },
      });

      // If we got an asset_id, store it on the Video so we can match when
      // video.asset.ready fires.
      if (assetId) {
        await prisma.video.update({
          where: { id: ticket.videoId },
          data: {
            muxAssetId: assetId,
            status: "processing", // or "pending_processing"
          },
        });
      }

      return NextResponse.json({ ok: true });
    }

    // 2) Asset is ready → update Video (muxPlaybackId, duration, status)
    if (type === "video.asset.ready") {
      // data.id = asset id
      const assetId: string | undefined = data?.id;

      if (!assetId) {
        console.warn("[mux webhook] asset.ready without asset id");
        return NextResponse.json({ ok: true });
      }

      const video = await prisma.video.findFirst({
        where: { muxAssetId: assetId },
      });

      if (!video) {
        console.warn(
          "[mux webhook] no Video found for muxAssetId",
          assetId
        );
        return NextResponse.json({ ok: true });
      }

      const playbackId: string | null =
        data?.playback_ids?.[0]?.id ?? null;
      const durationSec =
        typeof data?.duration === "number"
          ? Math.floor(data.duration)
          : null;

      await prisma.video.update({
        where: { id: video.id },
        data: {
          status: "ready",
          muxPlaybackId: playbackId,
          durationSec,
        },
      });

      // Mark all tickets for this video as ready
      await prisma.uploadTicket.updateMany({
        where: { videoId: video.id },
        data: { status: "ready" },
      });

      return NextResponse.json({ ok: true });
    }

    // 3) Asset errored → mark video errored
    if (type === "video.asset.errored") {
      const assetId: string | undefined = data?.id;

      if (!assetId) {
        return NextResponse.json({ ok: true });
      }

      await prisma.video.updateMany({
        where: { muxAssetId: assetId },
        data: { status: "errored" },
      });

      await prisma.uploadTicket.updateMany({
        where: { video: { muxAssetId: assetId } },
        data: { status: "errored" },
      });

      return NextResponse.json({ ok: true });
    }

    // For other event types we don't care about yet
    console.log("[mux webhook] ignored event:", type);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[mux webhook] handler error", err);
    return NextResponse.json(
      { error: "Internal webhook error" },
      { status: 500 }
    );
  }
}
