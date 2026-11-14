"use client";

import React, { useState, useMemo } from "react";
import { Plus, Trash2, ShoppingBag, AlertCircle, Package, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/formatters";
import { useProducts, useBranchStock } from "@/features/inventory/hooks/useInventory";
import type { Product } from "@/features/inventory/types/inventory.types";

export interface CartProductLine {
  productId: string;
  name: string;
  sku: string;
  unitPrice: number;
  stockUnit: string;
  quantity: number;
  availableStock: number;
}

interface PosProductCartProps {
  branchId: string;
  items: CartProductLine[];
  onChange: (items: CartProductLine[]) => void;
  disabled?: boolean;
}

export function PosProductCart({
  branchId,
  items,
  onChange,
  disabled = false,
}: PosProductCartProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [selectedQty, setSelectedQty] = useState<number>(1);

  // 1. Fetch retail-eligible products: includes usageType="retail_sale" and "both"
  const {
    data: productsData,
    isLoading: isProductsLoading,
    isError: isProductsError,
    error: productsError,
  } = useProducts({
    usageType: "retail_sale",
    status: "active",
    limit: 100,
  });

  const rawProductList = productsData?.data || [];
  const products: Product[] = useMemo(() => {
    return Array.isArray(rawProductList) ? rawProductList : [];
  }, [rawProductList]);

  // 2. Fetch stock balances scoped strictly to the selected branch
  const {
    data: stockData,
    isLoading: isStockLoading,
    isError: isStockError,
    error: stockError,
  } = useBranchStock({
    branchId: branchId || undefined,
    limit: 100,
  });

  const rawStockList = stockData?.data || [];
  const stockBalances = useMemo(() => {
    return Array.isArray(rawStockList) ? rawStockList : [];
  }, [rawStockList]);

  // 3. Map product stock availability strictly for the active branch: Math.max(0, onHand - allocated)
  const stockMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const b of stockBalances) {
      const pId =
        typeof b.productId === "object" && b.productId !== null
          ? (b.productId as { id?: string; _id?: string }).id || (b.productId as { id?: string; _id?: string })._id
          : String(b.productId || "");
      if (pId) {
        const onHand = typeof b.onHand === "number" ? b.onHand : 0;
        const allocated = typeof b.allocated === "number" ? b.allocated : 0;
        const avail = Math.max(0, onHand - allocated);
        map.set(pId, avail);
      }
    }
    return map;
  }, [stockBalances]);

  // Filter products by optional search term AND ensure only products with availableStock > 0 are shown
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const id = p.id || (p as { _id?: string })._id || "";
      const avail = stockMap.get(id) ?? 0;
      // In-stock requirement: only show products with positive available stock
      if (avail <= 0) return false;

      if (!searchTerm.trim()) return true;
      const lower = searchTerm.toLowerCase();
      return (
        p.name.toLowerCase().includes(lower) ||
        (p.sku && p.sku.toLowerCase().includes(lower))
      );
    });
  }, [products, stockMap, searchTerm]);

  const selectedProduct = useMemo(() => {
    return products.find(
      (p) =>
        p.id === selectedProductId ||
        (p as { _id?: string })._id === selectedProductId
    );
  }, [products, selectedProductId]);

  const selectedAvailable = selectedProduct
    ? (stockMap.get(selectedProduct.id || (selectedProduct as { _id?: string })._id || "") ?? 0)
    : 0;

  const handleAddProduct = () => {
    if (!selectedProduct) return;
    const prodId = selectedProduct.id || (selectedProduct as { _id?: string })._id || "";
    const existingIndex = items.findIndex((i) => i.productId === prodId);

    const available = stockMap.get(prodId) ?? 0;
    if (available <= 0) return;

    if (existingIndex >= 0) {
      const updated = [...items];
      const newQty = updated[existingIndex].quantity + selectedQty;
      updated[existingIndex].quantity = Math.min(newQty, available);
      onChange(updated);
    } else {
      const initialQty = Math.min(selectedQty, available);
      onChange([
        ...items,
        {
          productId: prodId,
          name: selectedProduct.name,
          sku: selectedProduct.sku,
          unitPrice: selectedProduct.sellingPrice || 0,
          stockUnit: selectedProduct.stockUnit,
          quantity: initialQty,
          availableStock: available,
        },
      ]);
    }

    setSelectedProductId("");
    setSelectedQty(1);
  };

  const handleUpdateQuantity = (index: number, newQty: number) => {
    const updated = [...items];
    const item = updated[index];
    const available = stockMap.get(item.productId) ?? item.availableStock;
    if (newQty <= 0) {
      updated.splice(index, 1);
    } else if (newQty > available) {
      item.quantity = available;
    } else {
      item.quantity = newQty;
    }
    onChange(updated);
  };

  const handleRemove = (index: number) => {
    const updated = [...items];
    updated.splice(index, 1);
    onChange(updated);
  };

  const isDataLoading = isProductsLoading || isStockLoading;
  const isDataError = isProductsError || isStockError;

  return (
    <div className="space-y-3 p-3.5 bg-muted/20 border border-border/80 rounded-xl text-xs">
      <div className="flex items-center justify-between">
        <label className="font-semibold text-foreground flex items-center gap-1.5">
          <ShoppingBag className="h-3.5 w-3.5 text-primary" />
          Retail Products (POS Cart)
        </label>
        <span className="text-[11px] text-muted-foreground">
          Live branch stock ({isStockLoading ? "checking..." : `${stockBalances.length} tracked`})
        </span>
      </div>

      {isDataLoading && (
        <div className="flex items-center gap-2 p-3 text-muted-foreground bg-muted/40 rounded-lg">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          <span>Loading branch inventory and retail catalog...</span>
        </div>
      )}

      {isDataError && (
        <div className="flex items-center gap-2 p-3 text-destructive bg-destructive/10 rounded-lg border border-destructive/20">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>
            Unable to fetch live stock for this branch:{" "}
            {(productsError as Error)?.message || (stockError as Error)?.message || "Network error"}
          </span>
        </div>
      )}

      {/* Product Search & Quick Add Bar */}
      {!disabled && !isDataLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center bg-card p-2.5 rounded-lg border border-border/60">
          <div className="sm:col-span-7">
            <select
              aria-label="Select retail product"
              value={selectedProductId}
              onChange={(e) => {
                setSelectedProductId(e.target.value);
                setSelectedQty(1);
              }}
              className="w-full h-8 text-xs bg-background border border-border rounded-md px-2 text-foreground"
            >
              <option value="">-- Choose retail product to add --</option>
              {filteredProducts.map((p) => {
                const id = p.id || (p as { _id?: string })._id || "";
                const avail = stockMap.get(id) ?? 0;
                const price = p.sellingPrice || 0;
                return (
                  <option key={id} value={id} disabled={avail <= 0}>
                    {p.name} ({p.sku}) — {formatCurrency(price)}{" "}
                    {avail > 0 ? `[Stock: ${avail} ${p.stockUnit}]` : "[Out of Stock]"}
                  </option>
                );
              })}
            </select>
          </div>

          <div className="sm:col-span-3 flex items-center gap-1.5">
            <span className="text-[11px] text-muted-foreground shrink-0">Qty:</span>
            <Input
              type="number"
              min="1"
              max={Math.max(1, selectedAvailable)}
              value={selectedQty}
              onChange={(e) => setSelectedQty(Math.max(1, parseInt(e.target.value, 10) || 1))}
              disabled={!selectedProductId || selectedAvailable <= 0}
              className="h-8 text-xs"
            />
          </div>

          <div className="sm:col-span-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleAddProduct}
              disabled={!selectedProductId || selectedAvailable <= 0}
              className="w-full h-8 text-xs font-semibold gap-1"
            >
              <Plus className="h-3.5 w-3.5" />
              Add
            </Button>
          </div>
        </div>
      )}

      {/* Cart Lines Table */}
      {items.length === 0 ? (
        <div className="text-center py-4 border border-dashed border-border/60 rounded-lg text-muted-foreground text-[11px] space-y-1">
          <Package className="h-4 w-4 mx-auto opacity-50" />
          <p>No retail products added to checkout cart yet.</p>
        </div>
      ) : (
        <div className="border border-border/80 rounded-lg overflow-hidden divide-y divide-border/60 bg-card">
          {items.map((line, idx) => {
            const avail = stockMap.get(line.productId) ?? line.availableStock;
            const lineTotal = line.unitPrice * line.quantity;
            const isOverAllocated = line.quantity > avail;

            return (
              <div
                key={line.productId || idx}
                className="p-2.5 flex items-center justify-between text-xs gap-3 hover:bg-muted/30"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-foreground truncate">
                      {line.name}
                    </span>
                    <Badge variant="outline" className="text-[10px] px-1 py-0 font-mono">
                      {line.sku}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground">
                      ({formatCurrency(line.unitPrice)} / {line.stockUnit})
                    </span>
                    <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400">
                      Avail: {avail}
                    </span>
                    {isOverAllocated && (
                      <span className="text-[10px] text-destructive flex items-center gap-1 font-semibold">
                        <AlertCircle className="h-3 w-3" /> Exceeds stock
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      min="1"
                      max={avail}
                      value={line.quantity}
                      onChange={(e) =>
                        handleUpdateQuantity(idx, parseInt(e.target.value, 10) || 0)
                      }
                      disabled={disabled}
                      className="w-14 h-7 text-xs text-center p-1"
                    />
                    <span className="text-[10px] text-muted-foreground">
                      {line.stockUnit}
                    </span>
                  </div>

                  <span className="font-mono font-bold text-foreground w-20 text-right">
                    {formatCurrency(lineTotal)}
                  </span>

                  {!disabled && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemove(idx)}
                      className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
