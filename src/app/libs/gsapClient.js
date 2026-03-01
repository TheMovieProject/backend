"use client";

let gsapPromise;
let gsapWithScrollTriggerPromise;

function resolveGsap(mod) {
  return mod?.gsap || mod?.default?.gsap || mod?.default || mod || null;
}

function resolveScrollTrigger(mod) {
  return mod?.ScrollTrigger || mod?.default?.ScrollTrigger || mod?.default || mod || null;
}

export async function getGsap() {
  if (typeof window === "undefined") return null;

  if (!gsapPromise) {
    gsapPromise = import("gsap/dist/gsap").then(resolveGsap);
  }

  return gsapPromise;
}

export async function getGsapWithScrollTrigger() {
  if (typeof window === "undefined") {
    return { gsap: null, ScrollTrigger: null };
  }

  if (!gsapWithScrollTriggerPromise) {
    gsapWithScrollTriggerPromise = Promise.all([
      getGsap(),
      import("gsap/dist/ScrollTrigger"),
    ]).then(([gsap, scrollTriggerModule]) => {
      const ScrollTrigger = resolveScrollTrigger(scrollTriggerModule);

      if (gsap && ScrollTrigger) {
        gsap.registerPlugin(ScrollTrigger);
      }

      return { gsap, ScrollTrigger };
    });
  }

  return gsapWithScrollTriggerPromise;
}
