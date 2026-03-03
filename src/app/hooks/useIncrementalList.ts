"use client";

import { startTransition, useEffect, useMemo, useRef, useState } from "react";

type UseIncrementalListOptions = {
  initialCount?: number;
  increment?: number;
  rootMargin?: string;
  enabled?: boolean;
};

export function useIncrementalList<T>(items: T[], options: UseIncrementalListOptions = {}) {
  const {
    initialCount = 24,
    increment = 12,
    rootMargin = "320px",
    enabled = true,
  } = options;

  const normalizedInitialCount = Math.max(1, initialCount);
  const normalizedIncrement = Math.max(1, increment);
  const [visibleCount, setVisibleCount] = useState(() =>
    enabled ? Math.min(items.length, normalizedInitialCount) : items.length
  );
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setVisibleCount(enabled ? Math.min(items.length, normalizedInitialCount) : items.length);
  }, [enabled, items, normalizedInitialCount]);

  const hasMore = enabled && visibleCount < items.length;

  useEffect(() => {
    if (!hasMore || typeof IntersectionObserver === "undefined") return;

    const node = loadMoreRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) return;

        startTransition(() => {
          setVisibleCount((currentCount) => {
            if (currentCount >= items.length) return currentCount;
            return Math.min(items.length, currentCount + normalizedIncrement);
          });
        });
      },
      { rootMargin }
    );

    observer.observe(node);

    return () => {
      observer.disconnect();
    };
  }, [hasMore, items.length, normalizedIncrement, rootMargin]);

  const visibleItems = useMemo(() => {
    if (!enabled) return items;
    return items.slice(0, visibleCount);
  }, [enabled, items, visibleCount]);

  return {
    hasMore,
    loadMoreRef,
    visibleCount,
    visibleItems,
  };
}
