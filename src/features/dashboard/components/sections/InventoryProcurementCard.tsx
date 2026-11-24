"use client";

import React from "react";
import Link from "next/link";
import { Package, AlertTriangle, ArrowRight, Truck, Boxes } from "lucide-react";
import { cn } from "@/lib/utils";

interface InventoryProcurementCardProps {
  inventory?: {
    status: "AVAILABLE" | "FAILED" | "EMPTY" | "UNAVAILABLE";
    outOfStockCount: number;
    lowStockCount: number;
    consumablesShortageCount: number;
    retailShortageCount: number;
    error?: string;
  };
  procurement?: {
    status: "AVAILABLE" | "FAILED" | "EMPTY" | "UNAVAILABLE";
    pendingOrdersCount: number;
    outstandingSupplierPayables: number;
    error?: string;
  };
}

export function InventoryProcurementCard({
  inventory,
  procurement,
}: InventoryProcurementCardProps) {
  const hasInventory = inventory && inventory.status !== "UNAVAILABLE";
  const hasProcurement = procurement && procurement.status !== "UNAVAILABLE";

  if (!hasInventory && !hasProcurement) {
    return null;
  }

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(val);
  };

  return (
    <div className="flex flex-col p-4 sm:p-5 rounded-2xl bg-card border border-border/80 shadow-2xs select-none space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <Package size={16} />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-foreground">
              Inventory & Supply Chain
            </h3>
            <p className="text-[11px] text-muted-foreground">
              Consumables back-bar, retail stock thresholds, and supplier orders
            </p>
          </div>
        </div>
        <Link
          href="/inventory"
          className="text-[11px] font-semibold text-primary hover:underline flex items-center gap-1 group"
        >
          <span>Inventory</span>
          <ArrowRight size={11} className="transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>

      {/* Stock Health Badges */}
      {hasInventory && inventory.status === "AVAILABLE" && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2.5">
            <div
              className={cn(
                "p-3 rounded-xl border flex flex-col justify-between",
                inventory.outOfStockCount > 0
                  ? "bg-rose-500/5 border-rose-500/20"
                  : "bg-muted/30 border-border/50"
              )}
            >
              <span className="text-[10px] font-semibold text-muted-foreground">
                Out of Stock
              </span>
              <span
                className={cn(
                  "text-xl font-extrabold font-mono mt-0.5",
                  inventory.outOfStockCount > 0
                    ? "text-rose-600 dark:text-rose-400"
                    : "text-foreground"
                )}
              >
                {inventory.outOfStockCount}
              </span>
              <span className="text-[10px] text-muted-foreground">
                Zero balance SKUs
              </span>
            </div>

            <div
              className={cn(
                "p-3 rounded-xl border flex flex-col justify-between",
                inventory.lowStockCount > 0
                  ? "bg-amber-500/5 border-amber-500/20"
                  : "bg-muted/30 border-border/50"
              )}
            >
              <span className="text-[10px] font-semibold text-muted-foreground">
                Low Stock Threshold
              </span>
              <span
                className={cn(
                  "text-xl font-extrabold font-mono mt-0.5",
                  inventory.lowStockCount > 0
                    ? "text-amber-600 dark:text-amber-400"
                    : "text-foreground"
                )}
              >
                {inventory.lowStockCount}
              </span>
              <span className="text-[10px] text-muted-foreground">
                At reorder trigger point
              </span>
            </div>
          </div>

          {/* Consumable vs Retail separation */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2 rounded-lg bg-muted/20 border border-border/40 flex items-center justify-between">
              <span className="text-muted-foreground text-[11px]">Consumables Shortage</span>
              <span className="font-bold font-mono text-foreground">
                {inventory.consumablesShortageCount}
              </span>
            </div>
            <div className="p-2 rounded-lg bg-muted/20 border border-border/40 flex items-center justify-between">
              <span className="text-muted-foreground text-[11px]">Retail Shortage</span>
              <span className="font-bold font-mono text-foreground">
                {inventory.retailShortageCount}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Procurement & Supplier Payables */}
      {hasProcurement && procurement.status === "AVAILABLE" && (
        <div className="space-y-2 pt-2 border-t border-border/40">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
              <Truck size={12} />
              <span>Purchase Orders & Payables</span>
            </span>
            <Link
              href="/procurement"
              className="text-[10px] font-semibold text-primary hover:underline"
            >
              Orders
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div className="p-2.5 rounded-xl bg-blue-500/5 border border-blue-500/20">
              <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 block">
                Pending POs
              </span>
              <span className="text-base font-extrabold font-mono text-blue-600 dark:text-blue-400">
                {procurement.pendingOrdersCount}
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-purple-500/5 border border-purple-500/20">
              <span className="text-[10px] font-semibold text-purple-600 dark:text-purple-400 block">
                Supplier Payables
              </span>
              <span className="text-base font-extrabold font-mono text-purple-600 dark:text-purple-400 truncate block">
                {formatCurrency(procurement.outstandingSupplierPayables)}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
