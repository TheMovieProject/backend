"use client";

import { useEffect, useMemo, useRef } from "react";

export function useRafThrottledCallback<T extends (...args: any[]) => void>(callback: T): T {
  const callbackRef = useRef(callback);
  const frameRef = useRef<number | null>(null);
  const latestArgsRef = useRef<Parameters<T> | null>(null);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    return () => {
      if (frameRef.current !== null && typeof window !== "undefined") {
        window.cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
    };
  }, []);

  return useMemo(
    () =>
      ((...args: Parameters<T>) => {
        latestArgsRef.current = args;

        if (typeof window === "undefined") {
          callbackRef.current(...args);
          return;
        }

        if (frameRef.current !== null) return;

        frameRef.current = window.requestAnimationFrame(() => {
          frameRef.current = null;
          const latestArgs = latestArgsRef.current;
          if (!latestArgs) return;
          callbackRef.current(...latestArgs);
        });
      }) as T,
    []
  );
}
