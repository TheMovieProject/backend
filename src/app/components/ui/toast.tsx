// app/components/ui/toast.tsx
"use client";

import { gsap } from "gsap";

let toastContainer: HTMLDivElement | null = null;

export function showToast(message = "", duration = 1400) {
  if (!toastContainer) {
    toastContainer = document.createElement("div");
    Object.assign(toastContainer.style, {
      position: "fixed",
      top: "16px",
      right: "16px",
      zIndex: "2147483647", // max
      pointerEvents: "none",
    });
    document.body.appendChild(toastContainer);
  }

  const el = document.createElement("div");
  el.className =
    "mb-2 rounded-lg bg-black/90 text-white px-3 py-2 text-sm shadow-xl border border-white/10";
  el.textContent = message;
  el.style.opacity = "0";
  el.style.transform = "translateY(-6px)";
  el.style.pointerEvents = "auto";

  toastContainer.appendChild(el);

  gsap.to(el, { opacity: 1, y: 6, duration: 0.18, ease: "power2.out" });

  setTimeout(() => {
    gsap.to(el, {
      opacity: 0,
      y: -6,
      duration: 0.18,
      ease: "power2.in",
      onComplete: () => {
        if (toastContainer && el.parentNode === toastContainer) {
          toastContainer.removeChild(el);
        }
      },
    });
  }, duration);
}
