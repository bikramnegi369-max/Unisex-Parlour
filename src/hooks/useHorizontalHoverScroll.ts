"use client";

import { useRef, useEffect, useCallback } from "react";

interface UseHorizontalHoverScrollOptions {
  /** Width in pixels of the left/right edge auto-scroll zone on hover. */
  edgeZone?: number;
  /** Maximum pixels per animation frame when hovering near an edge. */
  maxSpeed?: number;
  /** Optional callback invoked when scroll position changes. */
  onScrollChange?: () => void;
}

/**
 * Enables smooth horizontal scrolling on an overflowing container via:
 * 1. Edge-hover auto-scroll using `requestAnimationFrame`
 * 2. Mouse-wheel horizontal scroll (`{ passive: false }`) that prevents vertical page scroll
 */
export function useHorizontalHoverScroll<T extends HTMLElement = HTMLDivElement>(
  options: UseHorizontalHoverScrollOptions = {},
) {
  const { edgeZone = 56, maxSpeed = 8, onScrollChange } = options;
  const scrollRef = useRef<T | null>(null);
  const rafRef = useRef<number | null>(null);
  const velocityRef = useRef<number>(0);

  const stopHoverScroll = useCallback(() => {
    velocityRef.current = 0;
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const stepHoverScroll = useCallback(() => {
    const tick = () => {
      const el = scrollRef.current;
      const velocity = velocityRef.current;
      if (!el || velocity === 0) {
        rafRef.current = null;
        return;
      }
      el.scrollLeft += velocity;
      onScrollChange?.();
      rafRef.current = requestAnimationFrame(tick);
    };
    tick();
  }, [onScrollChange]);

  const onMouseMove = useCallback(
    (e: React.MouseEvent<T>) => {
      const el = scrollRef.current;
      if (!el || el.scrollWidth <= el.clientWidth + 1) {
        stopHoverScroll();
        return;
      }
      const rect = el.getBoundingClientRect();
      const distLeft = e.clientX - rect.left;
      const distRight = rect.right - e.clientX;

      if (distLeft < edgeZone) {
        velocityRef.current = -maxSpeed * ((edgeZone - distLeft) / edgeZone);
      } else if (distRight < edgeZone) {
        velocityRef.current = maxSpeed * ((edgeZone - distRight) / edgeZone);
      } else {
        stopHoverScroll();
        return;
      }

      if (rafRef.current === null) {
        rafRef.current = requestAnimationFrame(stepHoverScroll);
      }
    },
    [edgeZone, maxSpeed, stepHoverScroll, stopHoverScroll],
  );

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const handleNativeWheel = (e: WheelEvent) => {
      if (el.scrollWidth <= el.clientWidth + 1) return;
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX) && e.deltaY !== 0) {
        e.preventDefault();
        el.scrollLeft += e.deltaY;
        onScrollChange?.();
      }
    };

    el.addEventListener("wheel", handleNativeWheel, { passive: false });
    return () => {
      el.removeEventListener("wheel", handleNativeWheel);
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [onScrollChange]);

  return {
    scrollRef,
    containerProps: {
      ref: scrollRef,
      onMouseMove,
      onMouseLeave: stopHoverScroll,
    },
  };
}
