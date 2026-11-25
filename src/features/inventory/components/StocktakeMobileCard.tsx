"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/formatters";
import type { Stocktake } from "../types/inventory.types";
import {
  getStocktakeDomainBadge,
  getStocktakeStatusBadge,
} from "../columns/stocktakeColumns";

interface StocktakeMobileCardProps {
  stocktake: Stocktake;
  canManageStocktake: boolean;
  onEnterCounts: (stocktakeId: string) => void;
  onReviewOrView: (stocktakeId: string) => void;
}

export function StocktakeMobileCard({
  stocktake,
  canManageStocktake,
  onEnterCounts,
  onReviewOrView,
}: StocktakeMobileCardProps) {
  const stocktakeId = (stocktake.id || (stocktake as any)._id || "") as string;
  const total = stocktake.totalItems || 0;
  const counted = stocktake.countedItemsCount || 0;
  const pct = total > 0 ? Math.round((counted / total) * 100) : 0;
  const isCompleted = stocktake.status === "completed";
  const isCancelled = stocktake.status === "cancelled";
  const actorName =
    typeof stocktake.initiatedBy === "object"
      ? stocktake.initiatedBy?.name
      : "User";

  return (
    <div className="p-4 bg-card border border-border/80 rounded-xl space-y-3 shadow-sm text-xs">
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-0.5 min-w-0">
          <div className="font-mono text-[11px] font-semibold text-muted-foreground">
            {stocktake.stocktakeNumber}
          </div>
          <h4 className="font-semibold text-foreground text-sm truncate">
            {stocktake.title || "Physical Stocktake"}
          </h4>
        </div>
        {getStocktakeStatusBadge(stocktake.status)}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        {getStocktakeDomainBadge(stocktake.targetDomain)}
        <span className="font-mono text-[11px] text-muted-foreground tabular-nums">
          {counted}/{total} counted ({pct}%)
        </span>
      </div>

      <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
        <div
          className="bg-emerald-500 h-1.5 rounded-full transition-all duration-200"
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="pt-2 border-t border-border/60 flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
        <span>{formatDateTime(stocktake.createdAt)}</span>
        <span className="truncate">{actorName || "User"}</span>
      </div>

      {!isCancelled && (
        <div className="pt-2 border-t border-border/60 flex items-center justify-end gap-2">
          {!isCompleted && canManageStocktake && (
            <Button
              variant="outline"
              size="sm"
              className="text-xs h-7"
              onClick={() => onEnterCounts(stocktakeId)}
            >
              Enter Counts
            </Button>
          )}
          <Button
            variant={isCompleted ? "outline" : "default"}
            size="sm"
            className={`text-xs h-7 ${
              !isCompleted
                ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                : ""
            }`}
            onClick={() => onReviewOrView(stocktakeId)}
          >
            {isCompleted ? "View Audit" : "Review & Post"}
          </Button>
        </div>
      )}
    </div>
  );
}
