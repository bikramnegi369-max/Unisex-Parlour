"use client";

import React from "react";
import { cn } from "@/lib/utils";

export interface ProfileTabItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  badge?: string | number;
  badgeVariant?: "default" | "outline" | "success" | "warning";
}

interface EntityProfileLayoutProps {
  tabs: ProfileTabItem[];
  activeTab: string;
  onTabChange: (id: string) => void;
  children: React.ReactNode;
}

export function EntityProfileLayout({
  tabs,
  activeTab,
  onTabChange,
  children,
}: EntityProfileLayoutProps) {
  return (
    <div className="flex flex-col md:flex-row gap-6 items-start w-full min-w-0">
      {/* Sidebar Navigation Card */}
      <div className="w-full md:w-64 shrink-0 min-w-0">
        <div className="bg-card border border-border/80 rounded-2xl p-2 shadow-2xs">
          <nav
            role="tablist"
            className="flex flex-row md:flex-col overflow-x-auto md:overflow-x-visible pb-1 md:pb-0 gap-1.5 select-none scrollbar-thin"
          >
            {tabs.map((tab) => {
              const isActive = tab.id === activeTab;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => onTabChange(tab.id)}
                  className={cn(
                    "cursor-pointer flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                  )}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {tab.icon && (
                      <span className={cn("shrink-0", isActive ? "text-primary-foreground" : "text-muted-foreground/70")}>
                        {tab.icon}
                      </span>
                    )}
                    <span className="truncate">{tab.label}</span>
                  </div>

                  {tab.badge !== undefined && tab.badge !== null && tab.badge !== "" && (
                    <span
                      className={cn(
                        "px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0",
                        isActive
                          ? "bg-primary-foreground/20 text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 min-w-0 w-full overflow-hidden">
        <div className="animate-in fade-in duration-200 min-w-0">{children}</div>
      </div>
    </div>
  );
}
