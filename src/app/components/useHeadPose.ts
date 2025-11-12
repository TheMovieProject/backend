"use client";
import { useEffect, useRef, useState } from "react";
import * as posedet from "@tensorflow-models/face-landmarks-detection";
import * as tf from "@tensorflow/tfjs-core";
import "@tensorflow/tfjs-backend-webgl";

export type Pose = { yaw: number; pitch: number; roll: number; ok: boolean };

export function useHeadPose({
  smoothing = 0.2,
  enable = true,
  debugVideo = false,
}: { smoothing?: number; enable?: boolean; debugVideo?: boolean }) {
  const [pose, setPose] = useState<Pose>({ yaw: 0, pitch: 0, roll: 0, ok: false });
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const animRef = useRef<number | null>(null);
  const modelRef = useRef<posedet.FaceLandmarksDetector | null>(null);

  useEffect(() => {
    if (!enable) return;
    let stopped = false;

    const video = document.createElement("video");
    video.playsInline = true;
    video.muted = true;
    video.autoplay = true;
    if (debugVideo) {
      video.style.position = "fixed";
      video.style.right = "12px";
      video.style.bottom = "12px";
      video.style.width = "220px";
      video.style.opacity = "0.9";
      document.body.appendChild(video);
    }
    videoRef.current = video;

    (async () => {
      await tf.setBackend("webgl");
      await tf.ready();

      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
      video.srcObject = stream;
      await video.play();

      modelRef.current = await posedet.createDetector(posedet.SupportedModels.MediaPipeFaceMesh, {
          runtime: "tfjs",
          refineLandmarks: false
      });

      const smooth = (prev: number, next: number) => prev + (next - prev) * smoothing;
      let y = 0, p = 0, r = 0;

      const loop = async () => {
        if (stopped) return;
        const det = modelRef.current;
        if (det && video.readyState >= 2) {
          const faces = await det.estimateFaces(video, { flipHorizontal: true });
          if (faces && faces[0] && faces[0].keypoints) {
            const pts = faces[0].keypoints as any[];
            const leftEye = pts.find((k) => k.name === "leftEyeInner") || pts[33];
            const rightEye = pts.find((k) => k.name === "rightEyeInner") || pts[133];
            const nose = pts.find((k) => k.name === "noseTip") || pts[1];
            const left = [leftEye.x, leftEye.y];
            const right = [rightEye.x, rightEye.y];
            const midEye = [(left[0] + right[0]) / 2, (left[1] + right[1]) / 2];
            const dx = right[0] - left[0];
            const dy = right[1] - left[1];
            const rollRaw = Math.atan2(dy, dx);
            const yawRaw = Math.atan2(nose.x - midEye[0], Math.abs(dx));
            const pitchRaw = Math.atan2(midEye[1] - nose.y, Math.abs(dy));

            y = smooth(y, yawRaw);
            p = smooth(p, pitchRaw);
            r = smooth(r, rollRaw);
            setPose({ yaw: y, pitch: p, roll: r, ok: true });
          } else {
            setPose((prev) => ({ ...prev, ok: false }));
          }
        }
        animRef.current = requestAnimationFrame(loop);
      };
      loop();
    })();

    return () => {
      stopped = true;
      if (animRef.current) cancelAnimationFrame(animRef.current);
      const v = videoRef.current;
      if (v) {
        const s = v.srcObject as MediaStream | null;
        s?.getTracks().forEach((t) => t.stop());
        v.remove();
      }
      modelRef.current = null;
    };
  }, [enable, smoothing, debugVideo]);

  return pose;
}
