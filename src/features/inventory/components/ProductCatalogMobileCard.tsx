"use client";

import React from "react";
import type { Product } from "../types/inventory.types";
import { UsageTypeBadge } from "./UsageTypeBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Edit } from "lucide-react";

interface ProductCatalogMobileCardProps {
  product: Product;
  canAdjust: boolean;
  onEdit: (product: Product) => void;
  onAddToSale?: (product: Product) => void;
}

export function ProductCatalogMobileCard({
  product,
  canAdjust,
  onEdit,
  onAddToSale,
}: ProductCatalogMobileCardProps) {
  const isRetailEligible =
    product.status === "active" &&
    ["retail_sale", "both"].includes(product.usageType);
  return (
    <div className="p-4 bg-card border border-border/80 rounded-xl space-y-3 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <h4 className="font-semibold text-foreground text-sm">
            {product.name}
          </h4>
          <div className="text-[11px] font-mono text-muted-foreground">
            SKU: {product.sku}
          </div>
        </div>
        <Badge
          variant={product.status === "active" ? "outline" : "secondary"}
          className="text-xs uppercase font-medium px-2 py-0.5"
        >
          {product.status}
        </Badge>
      </div>

      <div className="flex items-center gap-2 flex-wrap text-xs">
        <span className="text-muted-foreground">{product.category}</span>
        <span>•</span>
        <UsageTypeBadge usageType={product.usageType} />
        <span>•</span>
        <span className="capitalize text-muted-foreground">
          {product.stockUnit}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/60 text-xs">
        <div>
          <span className="text-muted-foreground text-[11px] block">
            Cost Price
          </span>
          <span className="font-semibold text-foreground">
            ₹{product.costPrice.toFixed(2)}
          </span>
        </div>
        <div>
          <span className="text-muted-foreground text-[11px] block">
            Selling Price
          </span>
          <span className="font-semibold text-foreground">
            {product.usageType === "salon_consumption" ? (
              <span className="text-muted-foreground italic">Internal</span>
            ) : (
              `₹${product.sellingPrice.toFixed(2)}`
            )}
          </span>
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/60">
        {onAddToSale && isRetailEligible && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onAddToSale(product)}
            className="h-7 px-2.5 text-[11px] text-primary hover:bg-primary/10"
          >
            Add to Sale
          </Button>
        )}
        {canAdjust && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onEdit(product)}
            className="h-7 px-2.5 text-[11px]"
          >
            <Edit className="w-3 h-3 mr-1" />
            Edit Product
          </Button>
        )}
      </div>
    </div>
  );
}
