import React from "react";

export function LoyaltyContentSkeleton() {
  return (
    <div className="space-y-6 animate-pulse w-full max-w-full">
      {/* 1. Program Settings Card Skeleton */}
      <div className="p-5 md:p-6 bg-card border border-border/80 rounded-2xl space-y-5 shadow-2xs">
        <div className="flex items-center justify-between border-b border-border/60 pb-3">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-xl bg-muted" />
            <div className="space-y-1.5">
              <div className="h-5 w-44 bg-muted rounded-md" />
              <div className="h-3.5 w-72 bg-muted/60 rounded" />
            </div>
          </div>
          <div className="h-7 w-24 bg-muted rounded-lg" />
        </div>

        {/* Highlight Banner skeleton */}
        <div className="h-14 bg-muted/40 rounded-xl" />

        {/* Inputs Grid Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="h-4 w-32 bg-muted/60 rounded" />
              <div className="h-10 bg-muted/40 rounded-xl" />
            </div>
          ))}
        </div>

        <div className="flex justify-end pt-2">
          <div className="h-9 w-32 bg-muted rounded-xl" />
        </div>
      </div>

      {/* 2. Customer Loyalty Search & Ledger Explorer Skeleton */}
      <div className="bg-card border border-border/80 rounded-2xl p-5 shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b border-border/60 pb-3">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl bg-muted" />
            <div className="space-y-1.5">
              <div className="h-5 w-52 bg-muted rounded-md" />
              <div className="h-3.5 w-80 bg-muted/60 rounded" />
            </div>
          </div>
        </div>

        <div className="space-y-2 max-w-md">
          <div className="h-4 w-48 bg-muted/60 rounded" />
          <div className="h-10 bg-muted/40 rounded-xl" />
        </div>
      </div>
    </div>
  );
}

export function LoyaltyPageSkeleton() {
  return (
    <div className="space-y-6 animate-pulse w-full max-w-full">
      {/* 1. Header Banner Skeleton */}
      <div className="p-6 md:p-8 bg-card border border-border/80 rounded-2xl flex flex-col lg:flex-row lg:items-center justify-between gap-6 shadow-sm">
        <div className="space-y-2.5 max-w-3xl w-full">
          <div className="h-8 w-64 bg-muted rounded-lg" />
          <div className="h-4 w-full max-w-md bg-muted/60 rounded-md" />
        </div>
        <div className="h-8 w-32 bg-muted rounded-md shrink-0" />
      </div>

      {/* Content Skeleton */}
      <LoyaltyContentSkeleton />
    </div>
  );
}
