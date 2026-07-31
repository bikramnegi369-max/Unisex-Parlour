import React from "react";

export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header Skeleton */}
      <div className="flex items-center justify-between gap-4 border-b border-border pb-4">
        <div className="space-y-2">
          <div className="h-7 w-48 bg-muted rounded" />
          <div className="h-4 w-72 bg-muted rounded" />
        </div>
        <div className="flex items-center gap-2">
          <div className="h-9 w-32 bg-muted rounded-lg" />
          <div className="h-9 w-32 bg-muted rounded-lg" />
        </div>
      </div>

      {/* Filter Row Skeleton */}
      <div className="flex flex-col lg:flex-row gap-4 justify-between items-stretch lg:items-center">
        <div className="h-10 w-full lg:w-96 bg-muted rounded-lg" />
        <div className="flex gap-3">
          <div className="h-10 w-32 bg-muted rounded-lg" />
          <div className="h-10 w-40 bg-muted rounded-lg" />
          <div className="h-10 w-40 bg-muted rounded-lg" />
        </div>
      </div>

      {/* Table Skeleton */}
      <div className="border border-border/80 rounded-xl bg-card shadow-sm h-96" />
    </div>
  );
}
