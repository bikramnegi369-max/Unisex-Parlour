"use client";

import React from "react";
import type { StockMovement } from "../types/inventory.types";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/formatters";

interface StockMovementMobileCardProps {
  movement: StockMovement;
}

export function StockMovementMobileCard({
  movement,
}: StockMovementMobileCardProps) {
  const delta = movement.quantityDelta;
  const type = movement.movementType;

  return (
    <div className="p-4 bg-card border border-border/80 rounded-xl space-y-2.5 shadow-sm text-xs">
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-0.5">
          <h4 className="font-semibold text-foreground text-sm">
            {movement.product?.name || "Product"}
          </h4>
          <div className="text-[11px] font-mono text-muted-foreground">
            {movement.product?.sku || movement.productId}
          </div>
        </div>
        <Badge
          variant={
            type === "pos_sale" || type === "service_consumption"
              ? "secondary"
              : type === "purchase_in" || type === "transfer_in"
                ? "success"
                : "outline"
          }
          className="text-[10px] uppercase font-semibold px-2 py-0.5"
        >
          {type.replace(/_/g, " ")}
        </Badge>
      </div>

      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/60">
        <div>
          <span className="text-muted-foreground text-[11px] block">
            Change
          </span>
          <span
            className={`font-bold text-sm ${
              delta > 0
                ? "text-emerald-600 dark:text-emerald-400"
                : delta < 0
                  ? "text-rose-600 dark:text-rose-400"
                  : "text-muted-foreground"
            }`}
          >
            {delta > 0 ? `+${delta}` : delta}
          </span>
        </div>
        <div>
          <span className="text-muted-foreground text-[11px] block">
            Balance After
          </span>
          <span className="font-mono font-semibold text-foreground text-sm">
            {movement.balanceAfter}
          </span>
        </div>
      </div>

      <div className="pt-2 border-t border-border/60 space-y-1 text-[11px] text-muted-foreground">
        <div className="flex justify-between items-center">
          <span>{formatDateTime(movement.createdAt)}</span>
          <span className="truncate max-w-37.5">
            {movement.actor?.name || "System"}
          </span>
        </div>
        {movement.notes && (
          <p className="italic text-foreground/80 truncate">{movement.notes}</p>
        )}
      </div>
    </div>
  );
}
