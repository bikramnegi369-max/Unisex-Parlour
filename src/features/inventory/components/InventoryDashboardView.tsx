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
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { PageHeaderBanner } from "@/components/ui/page-header-banner";
import { useBranchContext } from "@/hooks/useBranchContext";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { hasPermission } from "@/lib/permissions";
import {
  Package,
  Plus,
  Scissors,
  ArrowRightLeft,
  SlidersHorizontal,
  History,
  AlertTriangle,
  Search,
  Filter
} from "lucide-react";

export const InventoryDashboardView: React.FC = () => {
  const { currentBranchId, availableBranches } = useBranchContext();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<"catalogue" | "stock" | "movements">("stock");
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
    isError: isProductsError,
    refetch: refetchProducts
  } = useProducts({
    search: searchQuery || undefined,
    usageType: usageFilter !== "all" ? (usageFilter as any) : undefined
  });

  const {
    data: stockData,
    isLoading: isStockLoading,
    isError: isStockError,
    refetch: refetchStock
  } = useBranchStock();

  const {
    data: movementsData,
    isLoading: isMovementsLoading,
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

  if (!canView) {
    return (
      <div className="p-8">
        <ErrorState
          title="Access Denied"
          description="You do not have permission to view inventory records."
        />
      </div>
    );
  }

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

  return (
    <div className="space-y-6 p-6">
      <PageHeaderBanner
        title="Inventory Management"
        description="Manage salon consumables, retail product catalogue, branch stock balances, and internal usage."
        actions={
          <div className="flex flex-wrap gap-2">
            {canConsume && (
              <Button
                variant="outline"
                className="gap-2 bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100"
                onClick={() => handleOpenConsume()}
              >
                <Scissors className="w-4 h-4" />
                Log Salon Consumption
              </Button>
            )}

            {canAdjust && (
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => handleOpenAdjust()}
              >
                <SlidersHorizontal className="w-4 h-4" />
                Adjust Stock
              </Button>
            )}

            {canTransfer && availableBranches.length > 1 && (
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => handleOpenTransfer()}
              >
                <ArrowRightLeft className="w-4 h-4" />
                Inter-Branch Transfer
              </Button>
            )}

            {canAdjust && (
              <Button
                className="gap-2"
                onClick={() => {
                  setProductToEdit(null);
                  setIsProductModalOpen(true);
                }}
              >
                <Plus className="w-4 h-4" />
                Add Product
              </Button>
            )}
          </div>
        }
      />

      {/* Navigation Tabs */}
      <div className="flex border-b space-x-6 text-sm font-medium">
        <button
          className={`pb-3 border-b-2 flex items-center gap-2 ${
            activeTab === "stock"
              ? "border-primary text-primary font-semibold"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
          onClick={() => setActiveTab("stock")}
        >
          <Package className="w-4 h-4" />
          Branch Stock Balances
        </button>

        <button
          className={`pb-3 border-b-2 flex items-center gap-2 ${
            activeTab === "catalogue"
              ? "border-primary text-primary font-semibold"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
          onClick={() => setActiveTab("catalogue")}
        >
          <SlidersHorizontal className="w-4 h-4" />
          Product Catalogue
        </button>

        <button
          className={`pb-3 border-b-2 flex items-center gap-2 ${
            activeTab === "movements"
              ? "border-primary text-primary font-semibold"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
          onClick={() => setActiveTab("movements")}
        >
          <History className="w-4 h-4" />
          Movement Ledger
        </button>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-card p-4 rounded-lg border shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
          <Input
            placeholder="Search by name, SKU..."
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <select
            className="h-10 px-3 py-2 border rounded-md text-sm bg-background"
            value={usageFilter}
            onChange={(e) => setUsageFilter(e.target.value)}
          >
            <option value="all">All Domains (Salon + Retail)</option>
            <option value="salon_consumption">Salon Consumables Only</option>
            <option value="retail_sale">Retail Products Only</option>
            <option value="both">Dual Purpose (Both)</option>
          </select>
        </div>
      </div>

      {/* TAB 1: Branch Stock Balances */}
      {activeTab === "stock" && (
        <div>
          {!currentBranchId ? (
            <div className="p-8 text-center bg-amber-50 rounded border border-amber-200 text-amber-800">
              <p className="font-semibold">No active branch selected</p>
              <p className="text-sm mt-1">
                Please select a specific branch in the header switcher to view local stock on hand.
              </p>
            </div>
          ) : isStockLoading ? (
            <div className="p-8 text-center text-muted-foreground">Loading branch stock...</div>
          ) : isStockError ? (
            <ErrorState
              title="Error"
              description="Failed to load stock balances."
              retryAction={{ label: "Retry", onClick: () => refetchStock() }}
            />
          ) : stockBalances.length === 0 ? (
            <EmptyState
              title="No Stock Balances Recorded"
              description="No stock movements or balances exist for this branch yet. Use 'Adjust Stock' to perform initial stock inwards."
            />
          ) : (
            <div className="overflow-x-auto bg-card rounded-lg border shadow-sm">
              <table className="w-full text-sm text-left">
                <thead className="bg-muted/50 text-muted-foreground font-semibold border-b">
                  <tr>
                    <th className="p-3">Product / SKU</th>
                    <th className="p-3">Domain Classification</th>
                    <th className="p-3 text-right">On Hand</th>
                    <th className="p-3 text-right">Reorder Level</th>
                    <th className="p-3 text-center">Status</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {stockBalances.map((item) => {
                    const prod = item.product;
                    return (
                      <tr key={item.id} className="hover:bg-muted/30">
                        <td className="p-3">
                          <p className="font-medium text-foreground">{prod?.name || "Product"}</p>
                          <p className="text-xs text-muted-foreground font-mono">{prod?.sku}</p>
                        </td>
                        <td className="p-3">
                          {prod && <UsageTypeBadge usageType={prod.usageType} />}
                        </td>
                        <td className="p-3 text-right font-semibold">
                          {item.onHand} {prod?.stockUnit}
                        </td>
                        <td className="p-3 text-right text-muted-foreground">
                          {prod?.reorderLevel} {prod?.stockUnit}
                        </td>
                        <td className="p-3 text-center">
                          {item.isLowStock ? (
                            <Badge variant="destructive" className="flex items-center gap-1 mx-auto w-fit">
                              <AlertTriangle className="w-3 h-3" />
                              Low Stock
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                              Adequate
                            </Badge>
                          )}
                        </td>
                        <td className="p-3 text-right space-x-2">
                          {canConsume && prod && (prod.usageType === "salon_consumption" || prod.usageType === "both") && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleOpenConsume(prod)}
                            >
                              Consume
                            </Button>
                          )}
                          {canAdjust && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleOpenAdjust(prod, item.onHand)}
                            >
                              Adjust
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Product Catalogue */}
      {activeTab === "catalogue" && (
        <div>
          {isProductsLoading ? (
            <div className="p-8 text-center text-muted-foreground">Loading product catalogue...</div>
          ) : isProductsError ? (
            <ErrorState
              title="Error"
              description="Failed to load product catalogue."
              retryAction={{ label: "Retry", onClick: () => refetchProducts() }}
            />
          ) : products.length === 0 ? (
            <EmptyState
              title="No Products Found"
              description="Get started by creating your first salon consumable or retail product in the catalogue."
            />
          ) : (
            <div className="overflow-x-auto bg-card rounded-lg border shadow-sm">
              <table className="w-full text-sm text-left">
                <thead className="bg-muted/50 text-muted-foreground font-semibold border-b">
                  <tr>
                    <th className="p-3">Product Name</th>
                    <th className="p-3">SKU</th>
                    <th className="p-3">Category</th>
                    <th className="p-3">Usage Domain</th>
                    <th className="p-3">Stock Unit</th>
                    <th className="p-3 text-right">Cost Price</th>
                    <th className="p-3 text-right">Selling Price</th>
                    <th className="p-3 text-center">Status</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {products.map((p) => (
                    <tr key={p.id} className="hover:bg-muted/30">
                      <td className="p-3 font-medium text-foreground">{p.name}</td>
                      <td className="p-3 font-mono text-xs">{p.sku}</td>
                      <td className="p-3">{p.category}</td>
                      <td className="p-3">
                        <UsageTypeBadge usageType={p.usageType} />
                      </td>
                      <td className="p-3 capitalize">{p.stockUnit}</td>
                      <td className="p-3 text-right">₹{p.costPrice.toFixed(2)}</td>
                      <td className="p-3 text-right font-medium">
                        {p.usageType === "salon_consumption" ? (
                          <span className="text-muted-foreground italic">N/A (Internal)</span>
                        ) : (
                          `₹${p.sellingPrice.toFixed(2)}`
                        )}
                      </td>
                      <td className="p-3 text-center">
                        <Badge variant={p.status === "active" ? "outline" : "secondary"}>
                          {p.status}
                        </Badge>
                      </td>
                      <td className="p-3 text-right">
                        {canAdjust && (
                          <Button
                            size="sm"
                            variant="ghost"
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
          )}
        </div>
      )}

      {/* TAB 3: Movement Ledger History */}
      {activeTab === "movements" && (
        <div>
          {isMovementsLoading ? (
            <div className="p-8 text-center text-muted-foreground">Loading movement history...</div>
          ) : isMovementsError ? (
            <ErrorState
              title="Error"
              description="Failed to load stock movements."
              retryAction={{ label: "Retry", onClick: () => refetchMovements() }}
            />
          ) : movements.length === 0 ? (
            <EmptyState
              title="No Movement Records"
              description="Historical inventory movements (consumption, adjustments, transfers, sales) will appear here."
            />
          ) : (
            <div className="overflow-x-auto bg-card rounded-lg border shadow-sm">
              <table className="w-full text-sm text-left">
                <thead className="bg-muted/50 text-muted-foreground font-semibold border-b">
                  <tr>
                    <th className="p-3">Date & Time</th>
                    <th className="p-3">Product</th>
                    <th className="p-3">Movement Type</th>
                    <th className="p-3 text-right">Delta</th>
                    <th className="p-3 text-right">Balance After</th>
                    <th className="p-3">Actor / Staff</th>
                    <th className="p-3">Notes & Reference</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {movements.map((m) => (
                    <tr key={m.id} className="hover:bg-muted/30">
                      <td className="p-3 text-xs text-muted-foreground">
                        {new Date(m.createdAt).toLocaleString()}
                      </td>
                      <td className="p-3 font-medium">
                        {m.product?.name || "Product"}
                        <span className="block text-xs font-mono text-muted-foreground">
                          {m.product?.sku}
                        </span>
                      </td>
                      <td className="p-3">
                        <Badge variant="outline" className="capitalize">
                          {m.movementType.replace("_", " ")}
                        </Badge>
                      </td>
                      <td
                        className={`p-3 text-right font-semibold ${
                          m.quantityDelta > 0 ? "text-emerald-600" : "text-rose-600"
                        }`}
                      >
                        {m.quantityDelta > 0 ? `+${m.quantityDelta}` : m.quantityDelta}{" "}
                        {m.product?.stockUnit}
                      </td>
                      <td className="p-3 text-right font-mono font-medium">
                        {m.balanceAfter} {m.product?.stockUnit}
                      </td>
                      <td className="p-3 text-xs">
                        {m.actor?.name ||
                          (typeof m.actorId === "object"
                            ? (m.actorId as any)?.name || (m.actorId as any)?._id
                            : m.actorId)}
                      </td>
                      <td className="p-3 text-xs text-muted-foreground max-w-xs truncate">
                        {m.notes || m.reference?.identifier || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* MODALS */}
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
