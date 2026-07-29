"use client";

import React from "react";

export interface TabItem {
  id: "overview" | "preferences" | "notes" | "activity";
  label: string;
}

interface CustomerDetailsTabsProps {
  activeTab: TabItem["id"];
  onTabChange: (tabId: TabItem["id"]) => void;
  tabs: TabItem[];
}

export function CustomerDetailsTabs({
  activeTab,
  onTabChange,
  tabs,
}: CustomerDetailsTabsProps) {
  return (
    <nav className="flex flex-col gap-1">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
            activeTab === tab.id
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  );
}
