"use client";
import { useHeadPose } from "./useHeadPose";

export default function CssParallax() {
  const pose = useHeadPose({ smoothing: 0.25, enable: true });
  const yawDeg = (pose.yaw * 180) / Math.PI;
  const pitchDeg = (pose.pitch * 180) / Math.PI;

  return (
    <div className="relative h-[60vh] w-full perspective-[1200px]">
      <div
        className="absolute inset-0 rounded-2xl border border-white/10 bg-[#0b0f14] shadow-xl"
        style={{
          transformStyle: "preserve-3d",
          transform: `rotateY(${yawDeg * 0.6}deg) rotateX(${pitchDeg * 0.6}deg)`,
        }}
      >
        <div className="absolute inset-6 rounded-xl bg-gradient-to-b from-slate-800 to-slate-950" style={{ transform: "translateZ(60px)" }} />
        <video src="/sample.mp4" autoPlay muted loop playsInline className="absolute inset-0 m-auto h-[55%] w-[85%] rounded-lg object-cover" style={{ transform: "translateZ(80px)" }} />
        <div className="absolute bottom-4 left-0 right-0 mx-auto w-max rounded-full bg-black/50 px-3 py-1 text-xs text-white/90 backdrop-blur">
          Move your head → parallax
        </div>
      </div>
    </div>
  );
}
