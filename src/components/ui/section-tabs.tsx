"use client";

import React from "react";
import { useHorizontalHoverScroll } from "@/hooks/useHorizontalHoverScroll";

export interface SectionTabItem<T extends string = string> {
  key: T;
  label: string;
  icon?: React.ReactNode;
  badge?: number | string;
}

interface SectionTabsProps<T extends string = string> {
  items: ReadonlyArray<SectionTabItem<T>>;
  activeTab: T;
  onSelectTab: (tab: T) => void;
  ariaLabel?: string;
  className?: string;
}

/**
 * Shared horizontal section tab bar with pill-rounded active state,
 * edge-hover auto-scroll, and mouse-wheel horizontal scrolling.
 */
export function SectionTabs<T extends string = string>({
  items,
  activeTab,
  onSelectTab,
  ariaLabel,
  className = "",
}: SectionTabsProps<T>) {
  const { containerProps } = useHorizontalHoverScroll<HTMLDivElement>();

  return (
    <div
      className={`border-b border-border bg-card/60 backdrop-blur-xs rounded-2xl p-1.5 shadow-xs ${className}`}
    >
      <div
        {...containerProps}
        aria-label={ariaLabel}
        className="flex space-x-1 overflow-x-auto no-scrollbar scroll-smooth"
      >
        {items.map((item) => {
          const isActive = activeTab === item.key;
          return (
            <button
              key={item.key}
              type="button"
              aria-pressed={isActive}
              onClick={(e) => {
                onSelectTab(item.key);
                e.currentTarget.scrollIntoView?.({
                  behavior: "smooth",
                  block: "nearest",
                  inline: "center",
                });
              }}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl transition-all duration-150 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 ${
                isActive
                  ? "bg-primary text-primary-foreground shadow-xs shadow-primary/25"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
              }`}
            >
              {item.icon}
              <span>{item.label}</span>
              {item.badge !== undefined && item.badge !== 0 && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                    isActive
                      ? "bg-primary-foreground text-primary"
                      : "bg-destructive/15 text-destructive"
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
