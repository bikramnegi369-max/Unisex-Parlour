"use client";

import React, { useState } from "react";
import {
  useProducts,
  useBranchStock,
  useStockMovements
} from "../hooks/useInventory";
import { Product, StockBalance } from "../types/inventory.types";
import { UsageTypeBadge } from "./UsageTypeBadge";
import { ProductFormModal } from "./ProductFormModal";
import { ConsumptionModal } from "./ConsumptionModal";
import { AdjustmentModal } from "./AdjustmentModal";
import { TransferModal } from "./TransferModal";
import { EntityActionMenu } from "@/components/entity/EntityActionMenu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { PageHeaderBanner } from "@/components/ui/page-header-banner";
import { SyncButton } from "@/components/ui/sync-button";
import { useBranchContext } from "@/hooks/useBranchContext";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { hasPermission } from "@/lib/permissions";
import { toast } from "sonner";
import {
  Package,
  Plus,
  Scissors,
  ArrowRightLeft,
  SlidersHorizontal,
  History,
  AlertTriangle,
  Search,
  CheckCircle2,
  Filter,
  RefreshCw,
  Box,
  Layers,
  Sparkles,
  ArrowUpDown
} from "lucide-react";

function InventoryTableSkeleton({
  columns,
  rowCount = 5,
  description = "Loading inventory data..."
}: {
  columns: { header: string; width?: string; align?: "left" | "right" | "center" }[];
  rowCount?: number;
  description?: string;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 px-1 text-xs text-muted-foreground animate-pulse">
        <div className="w-2 h-2 rounded-full bg-primary/60 animate-ping" />
        <span>{description}</span>
      </div>
      <div className="rounded-xl border border-border/80 bg-card overflow-hidden shadow-2xs">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-xs md:text-sm text-left">
            <thead className="bg-muted/40 text-muted-foreground font-semibold border-b border-border/80 uppercase text-[11px] tracking-wider">
              <tr>
                {columns.map((col, idx) => (
                  <th
                    key={idx}
                    className={`py-3 px-4 ${col.width || "min-w-[120px]"} ${
                      col.align === "right"
                        ? "text-right"
                        : col.align === "center"
                        ? "text-center"
                        : "text-left"
                    }`}
                  >
                    {col.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {Array.from({ length: rowCount }).map((_, rIdx) => (
                <tr key={rIdx} className="animate-pulse">
                  {columns.map((col, cIdx) => (
                    <td
                      key={cIdx}
                      className={`py-3.5 px-4 ${
                        col.align === "right"
                          ? "text-right"
                          : col.align === "center"
                          ? "text-center"
                          : "text-left"
                      }`}
                    >
                      {col.align === "right" ? (
                        <div className="h-4 bg-muted/60 rounded w-16 ml-auto" />
                      ) : col.align === "center" ? (
                        <div className="h-5 bg-muted/60 rounded-md w-20 mx-auto" />
                      ) : cIdx === 0 ? (
                        <div className="space-y-1.5">
                          <div className="h-4 bg-muted/70 rounded w-36" />
                          <div className="h-3 bg-muted/40 rounded w-24" />
                        </div>
                      ) : (
                        <div className="h-4 bg-muted/60 rounded w-28" />
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export const InventoryDashboardView: React.FC = () => {
  const { currentBranchId, availableBranches } = useBranchContext();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<"stock" | "catalogue" | "movements">("stock");
  const [searchQuery, setSearchQuery] = useState("");
  const [usageFilter, setUsageFilter] = useState<string>("all");
  const [stockStatusFilter, setStockStatusFilter] = useState<"all" | "low" | "optimal">("all");

  // Modal triggers
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [productToEdit, setProductToEdit] = useState<Product | null>(null);

  const [isConsumeModalOpen, setIsConsumeModalOpen] = useState(false);
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedBalanceOnHand, setSelectedBalanceOnHand] = useState<number | undefined>(undefined);

  // Queries
  const {
    data: productsData,
    isLoading: isProductsLoading,
    isFetching: isProductsFetching,
    isError: isProductsError,
    refetch: refetchProducts
  } = useProducts({
    search: searchQuery || undefined,
    usageType: usageFilter !== "all" ? (usageFilter as any) : undefined
  });

  const {
    data: stockData,
    isLoading: isStockLoading,
    isFetching: isStockFetching,
    isError: isStockError,
    refetch: refetchStock
  } = useBranchStock();

  const {
    data: movementsData,
    isLoading: isMovementsLoading,
    isFetching: isMovementsFetching,
    isError: isMovementsError,
    refetch: refetchMovements
  } = useStockMovements();

  // Permission flags
  const canView = hasPermission(user, "inventory.view");
  const canConsume = hasPermission(user, "inventory.consume");
  const canAdjust = hasPermission(user, "inventory.adjust");
  const canTransfer = hasPermission(user, "inventory.transfer");

  const products = productsData?.data || [];
  const stockBalances = stockData?.data || [];
  const movements = movementsData?.data || [];

  // Filtered lists based on search & status
  const filteredBalances = stockBalances.filter((b) => {
    const isLow = b.onHand <= (b.product?.reorderLevel ?? 0);
    if (stockStatusFilter === "low" && !isLow) return false;
    if (stockStatusFilter === "optimal" && isLow) return false;

    if (!searchQuery) return true;
    const term = searchQuery.toLowerCase();
    const nameMatch = b.product?.name?.toLowerCase().includes(term);
    const skuMatch = b.product?.sku?.toLowerCase().includes(term);
    const catMatch = b.product?.category?.toLowerCase().includes(term);
    return nameMatch || skuMatch || catMatch;
  });

  const handleOpenConsume = (prod?: Product) => {
    setSelectedProduct(prod || null);
    setIsConsumeModalOpen(true);
  };

  const handleOpenAdjust = (prod?: Product, onHand?: number) => {
    setSelectedProduct(prod || null);
    setSelectedBalanceOnHand(onHand);
    setIsAdjustModalOpen(true);
  };

  const handleOpenTransfer = (prod?: Product) => {
    setSelectedProduct(prod || null);
    setIsTransferModalOpen(true);
  };

  const handleTabSync = async (tab: "stock" | "catalogue" | "movements") => {
    try {
      if (tab === "stock") {
        await refetchStock();
        toast.success("Stock balances synchronized");
      } else if (tab === "catalogue") {
        await refetchProducts();
        toast.success("Product catalogue synchronized");
      } else {
        await refetchMovements();
        toast.success("Movement audit ledger synchronized");
      }
    } catch {
      toast.error("Failed to synchronize inventory data.");
    }
  };

  if (!canView) {
    return (
      <div className="p-6 md:p-8 max-w-7xl mx-auto">
        <ErrorState
          title="Access Denied"
          description="You do not have permission to view inventory records."
        />
      </div>
    );
  }

  const isCurrentTabSyncing =
    (activeTab === "stock" && isStockFetching) ||
    (activeTab === "catalogue" && isProductsFetching) ||
    (activeTab === "movements" && isMovementsFetching);

  return (
    <div className="space-y-6 p-4 md:p-6 lg:p-8 max-w-7xl mx-auto animate-in fade-in duration-200">
      {/* 1. Standard Page Header Banner with Clear Action Hierarchy */}
      <PageHeaderBanner
        title="Inventory Management"
        description="Track branch stock balances, log internal salon consumables, execute adjustments, and manage catalogue."
        icon={Package}
        actions={
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
            {/* Contextual Tab Refresh */}
            <SyncButton
              isSyncing={isCurrentTabSyncing}
              onSync={() => handleTabSync(activeTab)}
              label="Sync Inventory"
              className="w-full sm:w-auto h-8 text-xs font-medium cursor-pointer"
            />

            {/* Primary Action */}
            {canAdjust && (
              <Button
                size="sm"
                className="gap-1.5 h-8 shadow-xs cursor-pointer font-medium w-full sm:w-auto"
                onClick={() => {
                  setProductToEdit(null);
                  setIsProductModalOpen(true);
                }}
              >
                <Plus className="w-4 h-4" />
                <span>Add Product</span>
              </Button>
            )}
          </div>
        }
      />

      {/* 2. Responsive Tab Bar & Integrated Toolbar */}
      <div className="flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-3 border-b border-border/60 pb-3">
        {/* Navigation Tabs with Visual Indicators */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none p-1 bg-muted/40 rounded-xl border border-border/50 shrink-0">
          <button
            onClick={() => setActiveTab("stock")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs md:text-sm font-semibold transition-all duration-150 shrink-0 cursor-pointer ${
              activeTab === "stock"
                ? "bg-background text-foreground shadow-xs border border-border/80"
                : "text-muted-foreground hover:text-foreground hover:bg-background/50"
            }`}
          >
            <Package className="w-4 h-4 text-primary" />
            <span>Branch Stock</span>
            {stockBalances.length > 0 && (
              <span className="ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] bg-primary/10 text-primary font-bold">
                {stockBalances.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("catalogue")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs md:text-sm font-semibold transition-all duration-150 shrink-0 cursor-pointer ${
              activeTab === "catalogue"
                ? "bg-background text-foreground shadow-xs border border-border/80"
                : "text-muted-foreground hover:text-foreground hover:bg-background/50"
            }`}
          >
            <SlidersHorizontal className="w-4 h-4 text-amber-500" />
            <span>Product Catalogue</span>
            {products.length > 0 && (
              <span className="ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] bg-muted text-muted-foreground font-bold">
                {products.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("movements")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs md:text-sm font-semibold transition-all duration-150 shrink-0 cursor-pointer ${
              activeTab === "movements"
                ? "bg-background text-foreground shadow-xs border border-border/80"
                : "text-muted-foreground hover:text-foreground hover:bg-background/50"
            }`}
          >
            <History className="w-4 h-4 text-emerald-500" />
            <span>Movement Ledger</span>
          </button>
        </div>

        {/* Tab-Scoped Search, Filters & Action Controls */}
        <div className="flex flex-wrap items-center justify-between xl:justify-end gap-2">
          {/* Operational Domain Actions - Contextual & High Visibility */}
          <div className="flex flex-wrap items-center gap-1.5">
            {canConsume && (
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 h-8 border-purple-500/25 bg-purple-500/10 text-purple-700 dark:text-purple-300 hover:bg-purple-500/15 cursor-pointer font-medium text-xs"
                onClick={() => handleOpenConsume()}
              >
                <Scissors className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                <span>Log Consumption</span>
              </Button>
            )}

            {canAdjust && (
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 h-8 bg-card hover:bg-muted cursor-pointer font-medium text-xs"
                onClick={() => handleOpenAdjust()}
              >
                <SlidersHorizontal className="w-3.5 h-3.5 text-muted-foreground" />
                <span>Adjust</span>
              </Button>
            )}

            {canTransfer && availableBranches.length > 1 && (
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 h-8 bg-card hover:bg-muted cursor-pointer font-medium text-xs"
                onClick={() => handleOpenTransfer()}
              >
                <ArrowRightLeft className="w-3.5 h-3.5 text-muted-foreground" />
                <span>Transfer</span>
              </Button>
            )}
          </div>

          {/* Search Input */}
          <div className="relative flex-1 sm:w-56 min-w-[160px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search product, SKU..."
              className="pl-9 h-8 text-xs bg-card"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Filter Dropdown for Catalogue Tab */}
          {activeTab === "catalogue" && (
            <select
              value={usageFilter}
              onChange={(e) => setUsageFilter(e.target.value)}
              className="h-8 px-2.5 text-xs border border-input rounded-lg bg-card text-foreground font-medium focus:outline-hidden focus:ring-1 focus:ring-ring cursor-pointer"
            >
              <option value="all">All Classifications</option>
              <option value="salon_consumption">Salon Consumables</option>
              <option value="retail_sale">Retail Products</option>
              <option value="both">Dual Purpose (Both)</option>
            </select>
          )}

          {/* Filter Dropdown for Branch Stock Tab */}
          {activeTab === "stock" && (
            <select
              value={stockStatusFilter}
              onChange={(e) => setStockStatusFilter(e.target.value as any)}
              className="h-8 px-2.5 text-xs border border-input rounded-lg bg-card text-foreground font-medium focus:outline-hidden focus:ring-1 focus:ring-ring cursor-pointer"
            >
              <option value="all">All Stock Statuses</option>
              <option value="low">Low Stock Alert</option>
              <option value="optimal">Optimal Stock</option>
            </select>
          )}

          {/* Dedicated In-Tab Refresh Button */}
          <Button
            size="sm"
            variant="outline"
            className="h-8 px-2.5 gap-1.5 text-xs font-medium bg-card hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer shrink-0"
            onClick={() => handleTabSync(activeTab)}
            disabled={isCurrentTabSyncing}
            title={`Refresh ${activeTab} data`}
          >
            <RefreshCw
              size={13}
              className={`transition-transform duration-700 ${isCurrentTabSyncing ? "animate-spin" : ""}`}
            />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
        </div>
      </div>

      {/* 3. TAB 1: Branch Stock Balances */}
      {activeTab === "stock" && (
        <div className="space-y-4">
          {!currentBranchId ? (
            <div className="p-8 text-center bg-amber-500/10 rounded-2xl border border-amber-500/20 text-amber-800 dark:text-amber-200">
              <Package className="w-8 h-8 mx-auto mb-2 text-amber-600 dark:text-amber-400 opacity-80" />
              <p className="font-semibold text-base">No active branch selected</p>
              <p className="text-xs md:text-sm text-muted-foreground mt-1 max-w-md mx-auto">
                Please choose a specific branch location using the top header branch switcher to review and manage localized stock on hand.
              </p>
            </div>
          ) : isStockLoading || isStockFetching ? (
            <InventoryTableSkeleton
              description="Updating branch stock on hand..."
              rowCount={5}
              columns={[
                { header: "Product / SKU", width: "min-w-[200px]" },
                { header: "Classification", width: "min-w-[150px]" },
                { header: "On Hand", width: "min-w-[110px]", align: "right" },
                { header: "Reorder Lvl", width: "min-w-[110px]", align: "right" },
                { header: "Stock Status", width: "min-w-[120px]", align: "center" },
                { header: "Actions", width: "min-w-[160px]", align: "right" },
              ]}
            />
          ) : isStockError ? (
            <ErrorState
              title="Failed to Load Stock"
              description="Unable to retrieve branch stock balances from server."
              retryAction={{ label: "Retry", onClick: () => refetchStock() }}
            />
          ) : filteredBalances.length === 0 ? (
            <EmptyState
              title={searchQuery ? "No Matching Stock" : "No Stock Balances Recorded"}
              description={
                searchQuery
                  ? `No product balances matched "${searchQuery}".`
                  : "No stock movements or balances exist for this branch yet. Use 'Adjust Stock' to record initial stock inwards."
              }
            />
          ) : (
            <div className="rounded-xl border border-border/80 bg-card overflow-hidden shadow-2xs">
              <div className="overflow-x-auto scrollbar-thin">
                <table className="w-full text-xs md:text-sm text-left">
                  <thead className="bg-muted/40 text-muted-foreground font-semibold border-b border-border/80 uppercase text-[11px] tracking-wider">
                    <tr>
                      <th className="py-3 px-4 min-w-[200px]">Product / SKU</th>
                      <th className="py-3 px-4 min-w-[150px]">Classification</th>
                      <th className="py-3 px-4 text-right min-w-[110px]">On Hand</th>
                      <th className="py-3 px-4 text-right min-w-[110px]">Reorder Lvl</th>
                      <th className="py-3 px-4 text-center min-w-[120px]">Stock Status</th>
                      <th className="py-3 px-4 text-right min-w-[160px]">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {filteredBalances.map((item) => {
                      const prod = item.product;
                      const isLow = item.onHand <= (prod?.reorderLevel ?? 0);
                      return (
                        <tr key={item.id} className="hover:bg-muted/20 transition-colors">
                          <td className="py-3.5 px-4">
                            <span className="font-semibold text-foreground block text-sm">
                              {prod?.name || "Product"}
                            </span>
                            <span className="text-xs text-muted-foreground font-mono mt-0.5 block">
                              {prod?.sku || item.productId}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            {prod && <UsageTypeBadge usageType={prod.usageType} />}
                          </td>
                          <td className="py-3.5 px-4 text-right font-bold text-sm text-foreground">
                            {item.onHand}{" "}
                            <span className="text-xs font-normal text-muted-foreground">
                              {prod?.stockUnit}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right text-muted-foreground">
                            {prod?.reorderLevel ?? 0}{" "}
                            <span className="text-xs text-muted-foreground/70">
                              {prod?.stockUnit}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-center whitespace-nowrap">
                            {isLow ? (
                              <Badge
                                variant="destructive"
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-medium text-xs bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20"
                              >
                                <AlertTriangle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                                Low Stock
                              </Badge>
                            ) : (
                              <Badge
                                variant="outline"
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-medium text-xs bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                                Optimal
                              </Badge>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              {canConsume && prod && (prod.usageType === "salon_consumption" || prod.usageType === "both") && (
                                <button
                                  type="button"
                                  onClick={() => handleOpenConsume(prod)}
                                  className="cursor-pointer h-8 px-2.5 rounded-lg border border-purple-500/20 bg-purple-500/10 hover:bg-purple-500/15 text-purple-700 dark:text-purple-300 flex items-center gap-1.5 transition-colors text-xs font-medium"
                                  title="Log Consumable Usage"
                                >
                                  <Scissors size={13} className="text-purple-600 dark:text-purple-400" />
                                  <span>Consume</span>
                                </button>
                              )}
                              {canAdjust && (
                                <button
                                  type="button"
                                  onClick={() => handleOpenAdjust(prod, item.onHand)}
                                  className="cursor-pointer h-8 px-2.5 rounded-lg border border-border/80 bg-background hover:bg-muted hover:text-foreground flex items-center gap-1.5 transition-colors text-xs font-medium text-muted-foreground"
                                  title="Adjust Stock Balance"
                                >
                                  <SlidersHorizontal size={13} />
                                  <span>Adjust</span>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 4. TAB 2: Product Catalogue */}
      {activeTab === "catalogue" && (
        <div className="space-y-4">
          {isProductsLoading || isProductsFetching ? (
            <InventoryTableSkeleton
              description="Updating product catalogue..."
              rowCount={5}
              columns={[
                { header: "Product Name", width: "min-w-[220px]" },
                { header: "SKU", width: "min-w-[140px]" },
                { header: "Category", width: "min-w-[130px]" },
                { header: "Usage Domain", width: "min-w-[150px]" },
                { header: "Unit", width: "min-w-[100px]" },
                { header: "Cost (₹)", width: "min-w-[110px]", align: "right" },
                { header: "Selling (₹)", width: "min-w-[110px]", align: "right" },
                { header: "Status", width: "min-w-[100px]", align: "center" },
                { header: "Actions", width: "min-w-[100px]", align: "right" },
              ]}
            />
          ) : isProductsError ? (
            <ErrorState
              title="Failed to Load Catalogue"
              description="Unable to retrieve product catalogue records."
              retryAction={{ label: "Retry", onClick: () => refetchProducts() }}
            />
          ) : products.length === 0 ? (
            <EmptyState
              title="No Products Found"
              description="Get started by adding your first salon consumable or retail product to the catalogue."
            />
          ) : (
            <div className="rounded-xl border border-border/80 bg-card overflow-hidden shadow-2xs">
              <div className="overflow-x-auto scrollbar-thin">
                <table className="w-full text-xs md:text-sm text-left">
                  <thead className="bg-muted/40 text-muted-foreground font-semibold border-b border-border/80 uppercase text-[11px] tracking-wider">
                    <tr>
                      <th className="py-3 px-4 min-w-[220px]">Product Name</th>
                      <th className="py-3 px-4 min-w-[140px]">SKU</th>
                      <th className="py-3 px-4 min-w-[130px]">Category</th>
                      <th className="py-3 px-4 min-w-[150px]">Usage Domain</th>
                      <th className="py-3 px-4 min-w-[100px]">Unit</th>
                      <th className="py-3 px-4 text-right min-w-[110px]">Cost (₹)</th>
                      <th className="py-3 px-4 text-right min-w-[110px]">Selling (₹)</th>
                      <th className="py-3 px-4 text-center min-w-[100px]">Status</th>
                      <th className="py-3 px-4 text-right min-w-[100px]">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {products.map((p) => (
                      <tr key={p.id} className="hover:bg-muted/20 transition-colors">
                        <td className="py-3.5 px-4 font-semibold text-foreground text-sm">
                          {p.name}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-xs text-muted-foreground">
                          {p.sku}
                        </td>
                        <td className="py-3.5 px-4 text-foreground whitespace-nowrap">
                          {p.category}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <UsageTypeBadge usageType={p.usageType} />
                        </td>
                        <td className="py-3.5 px-4 capitalize text-muted-foreground whitespace-nowrap">
                          {p.stockUnit}
                        </td>
                        <td className="py-3.5 px-4 text-right font-medium text-foreground">
                          ₹{p.costPrice.toFixed(2)}
                        </td>
                        <td className="py-3.5 px-4 text-right font-medium text-foreground">
                          {p.usageType === "salon_consumption" ? (
                            <span className="text-muted-foreground italic text-xs">
                              Internal
                            </span>
                          ) : (
                            `₹${p.sellingPrice.toFixed(2)}`
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          <Badge
                            variant={p.status === "active" ? "outline" : "secondary"}
                            className="text-xs uppercase font-medium px-2 py-0.5 rounded-md"
                          >
                            {p.status}
                          </Badge>
                        </td>
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <EntityActionMenu
                            onEdit={
                              canAdjust
                                ? () => {
                                    setProductToEdit(p);
                                    setIsProductModalOpen(true);
                                  }
                                : undefined
                            }
                            status={p.status}
                            permissions={{
                              edit: "inventory.adjust",
                            }}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 5. TAB 3: Movement Ledger History */}
      {activeTab === "movements" && (
        <div className="space-y-4">
          {isMovementsLoading || isMovementsFetching ? (
            <InventoryTableSkeleton
              description="Updating stock movements ledger..."
              rowCount={5}
              columns={[
                { header: "Timestamp", width: "min-w-[160px]" },
                { header: "Product / SKU", width: "min-w-[200px]" },
                { header: "Movement Type", width: "min-w-[150px]" },
                { header: "Delta", width: "min-w-[110px]", align: "right" },
                { header: "Balance After", width: "min-w-[110px]", align: "right" },
                { header: "Staff Actor", width: "min-w-[140px]" },
                { header: "Notes & Reference", width: "min-w-[220px]" },
              ]}
            />
          ) : isMovementsError ? (
            <ErrorState
              title="Failed to Load Ledger"
              description="Unable to retrieve stock movement audit entries."
              retryAction={{ label: "Retry", onClick: () => refetchMovements() }}
            />
          ) : movements.length === 0 ? (
            <EmptyState
              title="No Movement Records"
              description="Historical stock movements (consumption, adjustments, transfers, sales) will appear here."
            />
          ) : (
            <div className="rounded-xl border border-border/80 bg-card overflow-hidden shadow-2xs">
              <div className="overflow-x-auto scrollbar-thin">
                <table className="w-full text-xs md:text-sm text-left">
                  <thead className="bg-muted/40 text-muted-foreground font-semibold border-b border-border/80 uppercase text-[11px] tracking-wider">
                    <tr>
                      <th className="py-3 px-4 min-w-[160px]">Timestamp</th>
                      <th className="py-3 px-4 min-w-[200px]">Product / SKU</th>
                      <th className="py-3 px-4 min-w-[150px]">Movement Type</th>
                      <th className="py-3 px-4 text-right min-w-[110px]">Delta</th>
                      <th className="py-3 px-4 text-right min-w-[110px]">Balance After</th>
                      <th className="py-3 px-4 min-w-[140px]">Staff Actor</th>
                      <th className="py-3 px-4 min-w-[220px]">Notes & Reference</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {movements.map((m) => (
                      <tr key={m.id} className="hover:bg-muted/20 transition-colors">
                        <td className="py-3.5 px-4 text-xs text-muted-foreground whitespace-nowrap">
                          {new Date(m.createdAt).toLocaleString(undefined, {
                            dateStyle: "medium",
                            timeStyle: "short"
                          })}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="font-semibold text-foreground block text-sm">
                            {m.product?.name || "Product"}
                          </span>
                          <span className="text-xs text-muted-foreground font-mono mt-0.5 block">
                            {m.product?.sku}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <Badge
                            variant="outline"
                            className="capitalize text-xs font-medium px-2 py-0.5 rounded-md bg-muted/50 border-border"
                          >
                            {m.movementType.replace("_", " ")}
                          </Badge>
                        </td>
                        <td
                          className={`py-3.5 px-4 text-right font-bold text-sm whitespace-nowrap ${
                            m.quantityDelta > 0
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-rose-600 dark:text-rose-400"
                          }`}
                        >
                          {m.quantityDelta > 0 ? `+${m.quantityDelta}` : m.quantityDelta}{" "}
                          <span className="text-xs font-normal text-muted-foreground">
                            {m.product?.stockUnit}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-medium text-foreground whitespace-nowrap">
                          {m.balanceAfter}{" "}
                          <span className="text-xs font-normal text-muted-foreground">
                            {m.product?.stockUnit}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-xs font-medium text-foreground whitespace-nowrap">
                          {m.actor?.name ||
                            (typeof m.actorId === "object"
                              ? (m.actorId as any)?.name || (m.actorId as any)?._id
                              : m.actorId || "System")}
                        </td>
                        <td className="py-3.5 px-4 text-xs text-muted-foreground max-w-sm">
                          <p className="break-words leading-relaxed">
                            {m.notes || m.reference?.identifier || "—"}
                          </p>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 6. MODALS */}
      <ProductFormModal
        isOpen={isProductModalOpen}
        onClose={() => setIsProductModalOpen(false)}
        productToEdit={productToEdit}
      />

      <ConsumptionModal
        isOpen={isConsumeModalOpen}
        onClose={() => setIsConsumeModalOpen(false)}
        products={products}
        preselectedProduct={selectedProduct}
      />

      <AdjustmentModal
        isOpen={isAdjustModalOpen}
        onClose={() => setIsAdjustModalOpen(false)}
        products={products}
        preselectedProduct={selectedProduct}
        currentStockOnHand={selectedBalanceOnHand}
      />

      <TransferModal
        isOpen={isTransferModalOpen}
        onClose={() => setIsTransferModalOpen(false)}
        products={products}
        preselectedProduct={selectedProduct}
        availableBranches={availableBranches.map((b) => ({ id: b.id, name: b.name }))}
      />
    </div>
  );
};
