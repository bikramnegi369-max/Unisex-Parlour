import React from "react";
import { type ColumnDef } from "@tanstack/react-table";
import type { StockMovement } from "../types/inventory.types";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/formatters";

export const buildStockMovementColumns = (): ColumnDef<StockMovement>[] => [
  {
    accessorKey: "createdAt",
    header: "Timestamp",
    cell: ({ row }) => (
      <div className="font-mono text-xs text-muted-foreground whitespace-nowrap min-w-36">
        {formatDate(row.original.createdAt, "short")}
      </div>
    ),
  },
  {
    accessorKey: "product.name",
    header: "Product / SKU",
    cell: ({ row }) => {
      const m = row.original;
      return (
        <div className="min-w-44">
          <div className="font-semibold text-foreground text-xs">
            {m.product?.name || "Product"}
          </div>
          <div className="text-[11px] font-mono text-muted-foreground">
            {m.product?.sku || m.productId}
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: "movementType",
    header: "Movement Type",
    cell: ({ row }) => {
      const type = row.original.movementType;
      return (
        <div className="whitespace-nowrap min-w-32">
          <Badge
            variant={
              type === "pos_sale" || type === "service_consumption"
                ? "secondary"
                : type === "purchase_in" || type === "transfer_in"
                ? "success"
                : "outline"
            }
            className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-md"
          >
            {type.replace(/_/g, " ")}
          </Badge>
        </div>
      );
    },
  },
  {
    accessorKey: "quantityDelta",
    header: () => <div className="text-right">Delta</div>,
    cell: ({ row }) => {
      const delta = row.original.quantityDelta;
      return (
        <div
          className={`text-right font-bold text-xs whitespace-nowrap min-w-20 ${
            delta > 0
              ? "text-emerald-600 dark:text-emerald-400"
              : delta < 0
              ? "text-rose-600 dark:text-rose-400"
              : "text-muted-foreground"
          }`}
        >
          {delta > 0 ? `+${delta}` : delta}
        </div>
      );
    },
  },
  {
    accessorKey: "balanceAfter",
    header: () => <div className="text-right">Balance After</div>,
    cell: ({ row }) => (
      <div className="text-right font-mono font-semibold text-xs whitespace-nowrap min-w-24">
        {row.original.balanceAfter}
      </div>
    ),
  },
  {
    accessorKey: "actor",
    header: "Staff Actor",
    cell: ({ row }) => {
      const m = row.original;
      return (
        <div className="text-xs text-foreground min-w-32 whitespace-nowrap">
          {m.actor?.name ? (
            <span>{m.actor.name}</span>
          ) : (
            <span className="font-mono text-muted-foreground text-[11px]">
              {typeof m.actorId === "object"
                ? (m.actorId as any)?.name || (m.actorId as any)?._id || "System"
                : m.actorId || "System"}
            </span>
          )}
        </div>
      );
    },
  },
  {
    id: "notes",
    header: "Notes & Reference",
    cell: ({ row }) => {
      const m = row.original;
      return (
        <div className="text-xs text-muted-foreground max-w-xs truncate min-w-44">
          {m.notes || m.reference?.identifier || "—"}
        </div>
      );
    },
  },
];

