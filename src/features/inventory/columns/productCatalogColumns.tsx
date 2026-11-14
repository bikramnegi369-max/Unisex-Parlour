import React from "react";
import { type ColumnDef } from "@tanstack/react-table";
import type { Product } from "../types/inventory.types";
import { UsageTypeBadge } from "../components/UsageTypeBadge";
import { Badge } from "@/components/ui/badge";
import { EntityActionMenu } from "@/components/entity/EntityActionMenu";
import { ShoppingCart } from "lucide-react";

interface ProductCatalogColumnOptions {
  canAdjust: boolean;
  onEdit: (product: Product) => void;
  onAddToSale?: (product: Product) => void;
}

export const buildProductCatalogColumns = ({
  canAdjust,
  onEdit,
  onAddToSale,
}: ProductCatalogColumnOptions): ColumnDef<Product>[] => [
  {
    accessorKey: "name",
    header: "Product / Name",
    cell: ({ row }) => {
      const p = row.original;
      return (
        <div className="min-w-44">
          <div className="font-semibold text-foreground text-sm">{p.name}</div>
        </div>
      );
    },
  },
  {
    accessorKey: "sku",
    header: "SKU",
    cell: ({ row }) => (
      <div className="font-mono text-xs text-muted-foreground whitespace-nowrap">
        {row.original.sku}
      </div>
    ),
  },
  {
    accessorKey: "category",
    header: "Category",
    cell: ({ row }) => (
      <div className="text-foreground text-xs whitespace-nowrap">
        {row.original.category}
      </div>
    ),
  },
  {
    accessorKey: "usageType",
    header: "Usage Type",
    cell: ({ row }) => (
      <div className="whitespace-nowrap">
        <UsageTypeBadge usageType={row.original.usageType} />
      </div>
    ),
  },
  {
    accessorKey: "stockUnit",
    header: "Stock Unit",
    cell: ({ row }) => (
      <div className="capitalize text-muted-foreground text-xs whitespace-nowrap">
        {row.original.stockUnit}
      </div>
    ),
  },
  {
    accessorKey: "costPrice",
    header: () => <div className="text-right">Cost Price</div>,
    cell: ({ row }) => (
      <div className="text-right font-medium text-foreground text-xs whitespace-nowrap">
        ₹{row.original.costPrice.toFixed(2)}
      </div>
    ),
  },
  {
    accessorKey: "sellingPrice",
    header: () => <div className="text-right">Selling Price</div>,
    cell: ({ row }) => {
      const p = row.original;
      return (
        <div className="text-right font-medium text-foreground text-xs whitespace-nowrap">
          {p.usageType === "salon_consumption" ? (
            <span className="text-muted-foreground italic text-xs">
              Internal
            </span>
          ) : (
            `₹${p.sellingPrice.toFixed(2)}`
          )}
        </div>
      );
    },
  },
  {
    accessorKey: "status",
    header: () => <div className="text-center">Status</div>,
    cell: ({ row }) => {
      const p = row.original;
      return (
        <div className="text-center whitespace-nowrap">
          <Badge
            variant={p.status === "active" ? "outline" : "secondary"}
            className="text-xs uppercase font-medium px-2 py-0.5 rounded-md"
          >
            {p.status}
          </Badge>
        </div>
      );
    },
  },
  {
    id: "actions",
    header: () => <div className="text-right">Actions</div>,
    cell: ({ row }) => {
      const p = row.original;
      const isRetailEligible =
        p.status === "active" && ["retail_sale", "both"].includes(p.usageType);

      return (
        <div className="flex items-center justify-end gap-1 whitespace-nowrap">
          {onAddToSale && isRetailEligible && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onAddToSale(p);
              }}
              className="cursor-pointer h-9 px-2 rounded-lg hover:bg-primary/10 hover:text-primary flex items-center gap-1 transition-colors text-muted-foreground text-xs font-semibold"
              title="Add to Sale Basket"
            >
              <ShoppingCart size={14} className="text-primary" />
              <span className="hidden sm:inline">Add to Sale</span>
            </button>
          )}
          <EntityActionMenu
            onEdit={canAdjust ? () => onEdit(p) : undefined}
            status={p.status}
            permissions={{ edit: "inventory.adjust" }}
          />
        </div>
      );
    },
  },
];
