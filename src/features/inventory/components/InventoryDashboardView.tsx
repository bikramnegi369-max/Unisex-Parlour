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
  Calendar,
  Layers,
  Sparkles
} from "lucide-react";

export const InventoryDashboardView: React.FC = () => {
  const { currentBranchId, availableBranches } = useBranchContext();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<"stock" | "catalogue" | "movements">("stock");
  const [searchQuery, setSearchQuery] = useState("");
  const [usageFilter, setUsageFilter] = useState<string>("all");

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

  // Filtered lists based on search
  const filteredBalances = stockBalances.filter((b) => {
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

  const handleManualSync = async () => {
    try {
      if (activeTab === "stock") {
        await refetchStock();
        toast.success("Stock balances synchronized.");
      } else if (activeTab === "catalogue") {
        await refetchProducts();
        toast.success("Product catalogue synchronized.");
      } else {
        await refetchMovements();
        toast.success("Movement ledger synchronized.");
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
      {/* 1. Standard Page Header Banner */}
      <PageHeaderBanner
        title="Inventory Management"
        description="Comprehensive salon stock tracking, consumable deductions, internal movements, and retail catalogue."
        icon={Package}
        actions={
          <div className="flex flex-wrap items-center justify-end gap-2.5">
            <SyncButton
              isSyncing={isCurrentTabSyncing}
              onSync={handleManualSync}
              label="Sync Data"
              className="h-9 font-medium"
            />

            {canConsume && (
              <Button
                variant="outline"
                className="gap-2 h-9 border-purple-500/20 bg-purple-500/10 text-purple-700 dark:text-purple-300 hover:bg-purple-500/15"
                onClick={() => handleOpenConsume()}
              >
                <Scissors className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                <span>Log Consumption</span>
              </Button>
            )}

            {canAdjust && (
              <Button
                variant="outline"
                className="gap-2 h-9 bg-card hover:bg-muted"
                onClick={() => handleOpenAdjust()}
              >
                <SlidersHorizontal className="w-4 h-4 text-muted-foreground" />
                <span>Adjust Stock</span>
              </Button>
            )}

            {canTransfer && availableBranches.length > 1 && (
              <Button
                variant="outline"
                className="gap-2 h-9 bg-card hover:bg-muted"
                onClick={() => handleOpenTransfer()}
              >
                <ArrowRightLeft className="w-4 h-4 text-muted-foreground" />
                <span>Transfer</span>
              </Button>
            )}

            {canAdjust && (
              <Button
                className="gap-2 h-9 shadow-xs"
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

      {/* 2. Responsive Tab Bar & Search Toolbar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 border-b border-border/60 pb-3">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none p-1 bg-muted/40 rounded-xl border border-border/50">
          <button
            onClick={() => setActiveTab("stock")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs md:text-sm font-semibold transition-all duration-150 shrink-0 ${
              activeTab === "stock"
                ? "bg-background text-foreground shadow-xs border border-border/80"
                : "text-muted-foreground hover:text-foreground hover:bg-background/50"
            }`}
          >
            <Package className="w-4 h-4 text-primary" />
            <span>Branch Stock</span>
            {stockBalances.length > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-primary/10 text-primary font-bold">
                {stockBalances.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("catalogue")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs md:text-sm font-semibold transition-all duration-150 shrink-0 ${
              activeTab === "catalogue"
                ? "bg-background text-foreground shadow-xs border border-border/80"
                : "text-muted-foreground hover:text-foreground hover:bg-background/50"
            }`}
          >
            <SlidersHorizontal className="w-4 h-4 text-amber-500" />
            <span>Product Catalogue</span>
            {products.length > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-muted text-muted-foreground font-bold">
                {products.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("movements")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs md:text-sm font-semibold transition-all duration-150 shrink-0 ${
              activeTab === "movements"
                ? "bg-background text-foreground shadow-xs border border-border/80"
                : "text-muted-foreground hover:text-foreground hover:bg-background/50"
            }`}
          >
            <History className="w-4 h-4 text-emerald-500" />
            <span>Movement Ledger</span>
          </button>
        </div>

        {/* Filter & Search Bar */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search product, SKU..."
              className="pl-9 h-9 text-xs md:text-sm bg-card"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {activeTab === "catalogue" && (
            <select
              value={usageFilter}
              onChange={(e) => setUsageFilter(e.target.value)}
              className="h-9 px-3 py-1 text-xs border border-input rounded-lg bg-card text-foreground font-medium focus:outline-hidden focus:ring-1 focus:ring-ring"
            >
              <option value="all">All Usage Types</option>
              <option value="salon_consumption">Salon Consumables</option>
              <option value="retail_sale">Retail Products</option>
              <option value="both">Dual Purpose (Both)</option>
            </select>
          )}
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
          ) : isStockLoading ? (
            <div className="p-16 text-center text-muted-foreground flex flex-col items-center justify-center gap-2">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <span className="text-xs">Loading branch stock on hand...</span>
            </div>
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
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 text-xs font-medium text-purple-700 dark:text-purple-300 hover:bg-purple-500/10"
                                  onClick={() => handleOpenConsume(prod)}
                                >
                                  Consume
                                </Button>
                              )}
                              {canAdjust && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 text-xs font-medium text-muted-foreground hover:text-foreground"
                                  onClick={() => handleOpenAdjust(prod, item.onHand)}
                                >
                                  Adjust
                                </Button>
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
          {isProductsLoading ? (
            <div className="p-16 text-center text-muted-foreground flex flex-col items-center justify-center gap-2">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <span className="text-xs">Loading product catalogue...</span>
            </div>
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
                          {canAdjust && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 text-xs font-medium text-muted-foreground hover:text-foreground"
                              onClick={() => {
                                setProductToEdit(p);
                                setIsProductModalOpen(true);
                              }}
                            >
                              Edit
                            </Button>
                          )}
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
          {isMovementsLoading ? (
            <div className="p-16 text-center text-muted-foreground flex flex-col items-center justify-center gap-2">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <span className="text-xs">Loading stock movements ledger...</span>
            </div>
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
