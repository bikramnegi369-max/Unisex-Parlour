"use client";

import React from "react";
import type { StockBalance, Product } from "../types/inventory.types";
import { UsageTypeBadge } from "./UsageTypeBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MinusCircle, PlusCircle, ArrowRightLeft } from "lucide-react";

interface StockBalanceMobileCardProps {
  balance: StockBalance;
  canConsume: boolean;
  canAdjust: boolean;
  canTransfer: boolean;
  onConsume: (product: Product, onHand: number) => void;
  onAdjust: (product: Product, onHand: number) => void;
  onTransfer: (product: Product, onHand: number) => void;
}

export function StockBalanceMobileCard({
  balance,
  canConsume,
  canAdjust,
  canTransfer,
  onConsume,
  onAdjust,
  onTransfer,
}: StockBalanceMobileCardProps) {
  const product = balance.product;
  const isLow =
    balance.onHand <= (product?.reorderLevel ?? 0) || balance.isLowStock;
  const available = Math.max(0, balance.onHand - (balance.allocated ?? 0));
  const allowsConsumption =
    product?.usageType === "salon_consumption" || product?.usageType === "both";

  return (
    <div className="p-4 bg-card border border-border/80 rounded-xl space-y-3 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <h4 className="font-semibold text-foreground text-sm">
            {product?.name || "Unknown Product"}
          </h4>
          <div className="text-[11px] font-mono text-muted-foreground">
            SKU: {product?.sku || "—"}
          </div>
        </div>
        <div>
          {isLow ? (
            <Badge variant="destructive" className="text-[10px] px-2 py-0.5">
              Low Stock
            </Badge>
          ) : (
            <Badge
              variant="outline"
              className="text-[10px] border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5"
            >
              Optimal
            </Badge>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap text-xs">
        <span className="text-muted-foreground">{product?.category || "General"}</span>
        <span>•</span>
        {product?.usageType && <UsageTypeBadge usageType={product.usageType} />}
      </div>

      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/60 text-xs">
        <div>
          <span className="text-muted-foreground text-[11px] block">On Hand</span>
          <span className="font-bold text-foreground text-sm">
            {balance.onHand} {product?.stockUnit || "units"}
          </span>
          <div className="text-[10px] text-muted-foreground mt-0.5 space-x-1">
            <span>Cons: {balance.onHandConsumables ?? 0}</span>
            <span>•</span>
            <span>Ret: {balance.onHandRetail ?? 0}</span>
            {(balance.onHandUnallocated ?? 0) > 0 && (
              <>
                <span>•</span>
                <span className="text-amber-600 dark:text-amber-400 font-medium">
                  Unalloc: {balance.onHandUnallocated}
                </span>
              </>
            )}
          </div>
          {balance.allocated > 0 && (
            <div className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
              ({available} avail / {balance.allocated} res)
            </div>
          )}
        </div>
        <div>
          <span className="text-muted-foreground text-[11px] block">Reorder Lvl</span>
          <span className="font-medium text-muted-foreground">
            {product?.reorderLevel ?? 0} {product?.stockUnit || "units"}
          </span>
        </div>
      </div>

      {product && (
        <div className="flex items-center justify-end gap-1.5 pt-2 border-t border-border/60">
          {canConsume && allowsConsumption && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onConsume(product, balance.onHand)}
              className="h-7 px-2 text-[11px]"
            >
              <MinusCircle className="w-3 h-3 mr-1 text-primary" />
              Use
            </Button>
          )}
          {canAdjust && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onAdjust(product, balance.onHand)}
              className="h-7 px-2 text-[11px]"
            >
              <PlusCircle className="w-3 h-3 mr-1 text-muted-foreground" />
              Adjust
            </Button>
          )}
          {canTransfer && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onTransfer(product, balance.onHand)}
              className="h-7 px-2 text-[11px]"
            >
              <ArrowRightLeft className="w-3 h-3 mr-1 text-muted-foreground" />
              Transfer
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

