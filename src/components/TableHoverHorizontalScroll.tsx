"use client";

import { useEffect } from "react";

/**
 * Enables horizontal scrolling on any overflowing `<table>` container when the
 * user hovers over it and scrolls with the mouse wheel.
 */
export function TableHoverHorizontalScroll() {
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || Math.abs(e.deltaY) <= Math.abs(e.deltaX) || e.deltaY === 0) {
        return;
      }

      const target = e.target as HTMLElement | null;
      const table = target?.closest("table");
      if (!table) return;

      let container: HTMLElement | null = table.parentElement;
      while (container && container !== document.body) {
        const style = window.getComputedStyle(container);
        const isScrollableX =
          (style.overflowX === "auto" || style.overflowX === "scroll") &&
          container.scrollWidth > container.clientWidth + 1;

        if (isScrollableX) {
          container.scrollLeft += e.deltaY;
          e.preventDefault();
          return;
        }
        container = container.parentElement;
      }
    };

    window.addEventListener("wheel", handleWheel, { passive: false });
    return () => {
      window.removeEventListener("wheel", handleWheel);
    };
  }, []);

  return null;
}
