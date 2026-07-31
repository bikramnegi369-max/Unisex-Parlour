"use client";

import React from "react";
import { cn } from "@/lib/utils";

export interface ProfileTabItem {
  id: string;
  label: string;
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
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* Sidebar Navigation */}
      <div className="lg:col-span-1">
        <nav className="flex flex-row lg:flex-col overflow-x-auto lg:overflow-x-visible border-b lg:border-b-0 lg:border-r border-border pb-2 lg:pb-0 lg:pr-4 gap-1 select-none">
          {tabs.map((tab) => {
            const isActive = tab.id === activeTab;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={cn(
                  "cursor-pointer flex-1 lg:flex-initial text-left px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Content Area */}
      <div className="lg:col-span-3">
        <div className="animate-in fade-in duration-200">
          {children}
        </div>
      </div>
    </div>
  );
}
