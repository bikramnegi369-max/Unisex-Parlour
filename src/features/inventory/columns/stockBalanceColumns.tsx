import React from "react";
import { type ColumnDef } from "@tanstack/react-table";
import type { StockBalance, Product } from "../types/inventory.types";
import { UsageTypeBadge } from "../components/UsageTypeBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MinusCircle, PlusCircle, ArrowRightLeft, Split } from "lucide-react";

interface StockBalanceColumnOptions {
  canConsume: boolean;
  canAdjust: boolean;
  canTransfer: boolean;
  onConsume: (product: Product, onHand: number) => void;
  onAdjust: (product: Product, onHand: number) => void;
  onTransfer: (product: Product, onHand: number) => void;
  onAllocateDomain?: (balance: StockBalance) => void;
}

export const buildStockBalanceColumns = ({
  canConsume,
  canAdjust,
  canTransfer,
  onConsume,
  onAdjust,
  onTransfer,
  onAllocateDomain,
}: StockBalanceColumnOptions): ColumnDef<StockBalance>[] => [
  {
    accessorKey: "product.name",
    header: "Product / SKU",
    cell: ({ row }) => {
      const item = row.original;
      return (
        <div className="min-w-48">
          <div className="font-semibold text-foreground text-sm">
            {item.product?.name || "Unknown Product"}
          </div>
          <div className="text-[11px] font-mono text-muted-foreground flex items-center gap-1.5 mt-0.5">
            <span>SKU: {item.product?.sku || "—"}</span>
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: "product.category",
    header: "Classification",
    cell: ({ row }) => {
      const item = row.original;
      return (
        <div className="space-y-1 min-w-36">
          <div className="text-xs text-foreground font-medium">
            {item.product?.category || "General"}
          </div>
          {item.product?.usageType && (
            <UsageTypeBadge usageType={item.product.usageType} />
          )}
        </div>
      );
    },
  },
  {
    accessorKey: "onHand",
    header: () => <div className="text-right">On Hand</div>,
    cell: ({ row }) => {
      const item = row.original;
      const available = Math.max(0, item.onHand - (item.allocated ?? 0));
      return (
        <div className="text-right min-w-36">
          <span className="font-bold text-foreground text-sm">
            {item.onHand}
          </span>{" "}
          <span className="text-[11px] text-muted-foreground font-normal">
            {item.product?.stockUnit || "units"}
          </span>
          <div className="text-[11px] text-muted-foreground mt-0.5 space-x-1">
            <span title="Salon Consumables">Cons: {item.onHandConsumables ?? 0}</span>
            <span>•</span>
            <span title="Retail Products">Ret: {item.onHandRetail ?? 0}</span>
            {(item.onHandUnallocated ?? 0) > 0 && (
              <>
                <span>•</span>
                <span className="text-amber-600 dark:text-amber-400 font-medium" title="Unallocated remainder">
                  Unalloc: {item.onHandUnallocated}
                </span>
              </>
            )}
          </div>
          {item.allocated > 0 && (
            <div className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
              ({available} avail / {item.allocated} res)
            </div>
          )}
        </div>
      );
    },
  },
  {
    accessorKey: "product.reorderLevel",
    header: () => <div className="text-right">Reorder Lvl</div>,
    cell: ({ row }) => {
      const item = row.original;
      return (
        <div className="text-right text-muted-foreground font-medium text-xs min-w-24">
          {item.product?.reorderLevel ?? 0} {item.product?.stockUnit || "units"}
        </div>
      );
    },
  },
  {
    id: "stockStatus",
    header: () => <div className="text-center">Stock Status</div>,
    cell: ({ row }) => {
      const item = row.original;
      const isLow =
        item.onHand <= (item.product?.reorderLevel ?? 0) || item.isLowStock;
      return (
        <div className="text-center min-w-28">
          {isLow ? (
            <Badge
              variant="destructive"
              className="text-[11px] font-semibold px-2 py-0.5 rounded-md"
            >
              Low Stock
            </Badge>
          ) : (
            <Badge
              variant="outline"
              className="text-[11px] font-medium border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md"
            >
              Optimal
            </Badge>
          )}
        </div>
      );
    },
  },
  {
    id: "actions",
    header: () => <div className="text-right">Actions</div>,
    cell: ({ row }) => {
      const item = row.original;
      const product = item.product;
      if (!product) return null;

      const allowsConsumption =
        product.usageType === "salon_consumption" ||
        product.usageType === "both";

      const unallocated = item.onHandUnallocated ?? Math.max(
        0,
        item.onHand - ((item.onHandConsumables || 0) + (item.onHandRetail || 0))
      );
      const isDualUsage = product.usageType === "both";

      return (
        <div className="flex items-center justify-end gap-1.5 min-w-44">
          {canAdjust && isDualUsage && unallocated > 0 && onAllocateDomain && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onAllocateDomain(item)}
              title="Allocate Unallocated Historical Stock to Domains"
              className="h-8 px-2 text-xs font-semibold text-purple-600 dark:text-purple-400 border-purple-500/30 hover:bg-purple-500/10 transition-colors"
            >
              <Split className="w-3.5 h-3.5 mr-1" />
              Allocate ({unallocated})
            </Button>
          )}
          {canConsume && allowsConsumption && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onConsume(product, item.onHand)}
              title="Consume Stock for Internal Salon Service"
              className="h-8 px-2 text-xs font-medium hover:bg-primary/10 hover:text-primary transition-colors"
            >
              <MinusCircle className="w-3.5 h-3.5 mr-1 text-primary" />
              Use
            </Button>
          )}
          {canAdjust && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onAdjust(product, item.onHand)}
              title="Adjust / Audit Stock Level"
              className="h-8 px-2 text-xs font-medium hover:bg-muted transition-colors"
            >
              <PlusCircle className="w-3.5 h-3.5 mr-1 text-muted-foreground" />
              Adjust
            </Button>
          )}
          {canTransfer && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onTransfer(product, item.onHand)}
              title="Transfer Stock to Another Branch"
              className="h-8 px-2 text-xs font-medium hover:bg-muted transition-colors"
            >
              <ArrowRightLeft className="w-3.5 h-3.5 mr-1 text-muted-foreground" />
              Transfer
            </Button>
          )}
        </div>
      );
    },
  },
];

