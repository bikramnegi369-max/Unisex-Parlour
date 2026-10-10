import React from "react";

export default function BillingLoading() {
  return (
    <div className="space-y-5 animate-pulse">
      {/* 1. Header Banner Skeleton */}
      <div className="p-6 bg-card border border-border/80 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="h-7 w-48 bg-muted rounded-md" />
          <div className="h-4 w-72 bg-muted/60 rounded" />
        </div>
        <div className="h-9 w-32 bg-muted rounded-lg" />
      </div>

      {/* 2. KPI Summary Ribbon Skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="p-3.5 bg-card border border-border/80 rounded-xl space-y-2.5 shadow-2xs"
          >
            <div className="flex items-center justify-between">
              <div className="h-3 w-20 bg-muted/60 rounded" />
              <div className="h-4 w-4 bg-muted/40 rounded-full" />
            </div>
            <div className="h-6 w-28 bg-muted/70 rounded" />
            <div className="h-2.5 w-24 bg-muted/40 rounded" />
          </div>
        ))}
      </div>

      {/* 3. POS Ready Queue Skeleton */}
      <div className="bg-card border border-border/80 rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="h-4 w-48 bg-muted rounded" />
          <div className="h-4 w-20 bg-muted rounded" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="p-3 bg-muted/30 border border-border/60 rounded-lg space-y-2"
            >
              <div className="flex justify-between">
                <div className="h-3.5 w-28 bg-muted rounded" />
                <div className="h-3.5 w-16 bg-muted rounded" />
              </div>
              <div className="h-3 w-36 bg-muted/60 rounded" />
              <div className="h-7 w-full bg-muted rounded mt-2" />
            </div>
          ))}
        </div>
      </div>

      {/* 4. Filter Bar Skeleton */}
      <div className="bg-card border border-border/80 rounded-xl p-3.5 shadow-2xs space-y-3">
        <div className="h-8 bg-muted/40 rounded-lg" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="h-9 bg-muted/60 rounded-lg" />
          <div className="h-9 bg-muted/60 rounded-lg" />
          <div className="h-9 bg-muted/60 rounded-lg" />
        </div>
      </div>

      {/* 5. Data Table 5-Row Skeleton */}
      <div className="overflow-x-auto border border-border/80 rounded-xl bg-card shadow-xs">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-border bg-muted/20">
              {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                <th key={i} className="px-6 py-4">
                  <div className="h-4 w-20 bg-muted rounded" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {Array.from({ length: 5 }).map((_, rowIndex) => (
              <tr key={rowIndex}>
                {[1, 2, 3, 4, 5, 6, 7].map((colIndex) => (
                  <td key={colIndex} className="px-6 py-4 align-middle">
                    <div className="h-4 w-3/4 bg-muted/60 rounded" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
