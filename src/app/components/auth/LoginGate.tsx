"use client";
import React, { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import LoginBox from "./LoginBox";

type Props = {
  /** 0..1 percentage of scroll height at which to show gate (default 0.2 = 20%) */
  threshold?: number;
  /** only show once per page load (default true) */
  once?: boolean;
};

export default function LoginGate({ threshold = 0.2, once = true }: Props) {
  const { status } = useSession(); // "authenticated" | "loading" | "unauthenticated"
  const authed = status === "authenticated";
  const [open, setOpen] = useState(false);
  const [triggered, setTriggered] = useState(false);

  const shouldListen = useMemo(
    () => !authed && !triggered,
    [authed, triggered]
  );

  useEffect(() => {
    if (!shouldListen) return;

    const onScroll = () => {
      const doc = document.documentElement;
      const max = doc.scrollHeight - window.innerHeight;
      const progress = max <= 0 ? 0 : window.scrollY / max;

      if (progress >= threshold) {
        setOpen(true);
        if (once) setTriggered(true);
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll(); // run once in case user is already scrolled
    return () => window.removeEventListener("scroll", onScroll);
  }, [threshold, once, shouldListen]);

  // lock background scroll when open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (authed || !open) return null;

  return (
    <div className="fixed inset-0 z-[100]">
      {/* Backdrop */}
      <div
        onClick={() => setOpen(false)}
        className="absolute inset-0 bg-black/90"
      />
      {/* Modal */}
      <div className="absolute inset-0 flex items-center justify-center p-10">
        <div className="w-full max-w-xl p-5">
          <div className="mb-4 text-center text-white p-4">
            <h3 className="text-2xl font-semibold">Sign in to continue</h3>
            <p className="text-white/70 mt-1">
              You&apos;ve reached the free preview. Create an account or log in to keep scrolling.
            </p>
          </div>
          <LoginBox />
        </div>
      </div>
    </div>
  );
}