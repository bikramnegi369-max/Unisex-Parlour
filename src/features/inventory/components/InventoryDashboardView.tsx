"use client";

import React, { useState } from "react";
import {
  Package,
  Layers,
  ArrowRightLeft,
  RotateCw,
  Search,
  SlidersHorizontal,
  Plus,
  ClipboardList,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { PageHeaderBanner } from "@/components/ui/page-header-banner";
import { ErrorState } from "@/components/ui/error-state";
import { toast } from "sonner";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { hasPermission } from "@/lib/permissions";
import { useBranchContext } from "@/hooks/useBranchContext";
import { useDebounce } from "@/hooks/useDebounce";

import {
  useProducts,
  useBranchStock,
  useStockMovements,
} from "../hooks/useInventory";
import type {
  Product,
  ProductUsageType,
  StockBalance,
} from "../types/inventory.types";

import { StockBalanceTable } from "./StockBalanceTable";
import { ProductCatalogTable } from "./ProductCatalogTable";
import { StockMovementTable } from "./StockMovementTable";

import { ProductFormModal } from "./ProductFormModal";
import { ConsumptionModal } from "./ConsumptionModal";
import { AdjustmentModal } from "./AdjustmentModal";
import { TransferModal } from "./TransferModal";
import { DomainAllocationModal } from "./DomainAllocationModal";
import { StocktakeListView } from "./StocktakeListView";
import { useDispatch } from "react-redux";
import { useQueryClient } from "@tanstack/react-query";
import { addProductToBasket } from "@/store/slices/saleBasketSlice";

type InventoryTabId = "stock" | "catalogue" | "movements" | "stocktake";

const INVENTORY_TABS: ReadonlyArray<{
  id: InventoryTabId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: "stock", label: "Branch Stock", icon: Package },
  { id: "catalogue", label: "Master Catalog", icon: Layers },
  { id: "movements", label: "Movement Ledger", icon: ArrowRightLeft },
  { id: "stocktake", label: "Physical Stocktake", icon: ClipboardList },
];

export const InventoryDashboardView: React.FC = () => {
  const dispatch = useDispatch();
  const queryClient = useQueryClient();
  const { currentBranchId, availableBranches } = useBranchContext();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<InventoryTabId>("stock");

  // Search & Filtering
  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebounce(searchInput, 300);

  const [usageFilter, setUsageFilter] = useState<ProductUsageType | "all">(
    "all",
  );
  const [stockStatusFilter, setStockStatusFilter] = useState<
    "all" | "low" | "optimal"
  >("all");

  // Pagination states per tab
  const [stockPage, setStockPage] = useState(1);
  const [stockPageSize, setStockPageSize] = useState(25);

  const [catalogPage, setCatalogPage] = useState(1);
  const [catalogPageSize, setCatalogPageSize] = useState(25);

  const [movementsPage, setMovementsPage] = useState(1);
  const [movementsPageSize, setMovementsPageSize] = useState(25);

  // Reset pagination to page 1 during render when search or filters change
  const [prevSearch, setPrevSearch] = useState(debouncedSearch);
  const [prevUsageFilter, setPrevUsageFilter] = useState(usageFilter);
  const [prevStockStatusFilter, setPrevStockStatusFilter] =
    useState(stockStatusFilter);

  if (
    prevSearch !== debouncedSearch ||
    prevUsageFilter !== usageFilter ||
    prevStockStatusFilter !== stockStatusFilter
  ) {
    setPrevSearch(debouncedSearch);
    setPrevUsageFilter(usageFilter);
    setPrevStockStatusFilter(stockStatusFilter);
    setStockPage(1);
    setCatalogPage(1);
    setMovementsPage(1);
  }

  // Modal triggers
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [productToEdit, setProductToEdit] = useState<Product | null>(null);

  const [isConsumeModalOpen, setIsConsumeModalOpen] = useState(false);
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [isAllocateModalOpen, setIsAllocateModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedBalanceOnHand, setSelectedBalanceOnHand] = useState<
    number | undefined
  >(undefined);
  const [selectedBalanceForAllocation, setSelectedBalanceForAllocation] =
    useState<StockBalance | null>(null);

  // Queries
  const {
    data: productsData,
    isLoading: isProductsLoading,
    isFetching: isProductsFetching,
    isError: isProductsError,
    refetch: refetchProducts,
  } = useProducts({
    page: catalogPage,
    limit: catalogPageSize,
    search: debouncedSearch || undefined,
    usageType: usageFilter !== "all" ? usageFilter : undefined,
  });

  const {
    data: stockData,
    isLoading: isStockLoading,
    isFetching: isStockFetching,
    isError: isStockError,
    refetch: refetchStock,
  } = useBranchStock({
    page: stockPage,
    limit: stockPageSize,
    search: debouncedSearch || undefined,
    lowStock:
      stockStatusFilter === "low"
        ? "true"
        : stockStatusFilter === "optimal"
          ? "false"
          : undefined,
  });

  const {
    data: movementsData,
    isLoading: isMovementsLoading,
    isFetching: isMovementsFetching,
    isError: isMovementsError,
    refetch: refetchMovements,
  } = useStockMovements({
    page: movementsPage,
    limit: movementsPageSize,
  });

  // Global full product list for modal dropdowns
  const { data: allProductsData } = useProducts({ limit: 100 });
  const modalProducts = allProductsData?.data || productsData?.data || [];

  // Permission flags
  const canView = hasPermission(user, "inventory.view");
  const canConsume = hasPermission(user, "inventory.consume");
  const canAdjust = hasPermission(user, "inventory.adjust");
  const canTransfer = hasPermission(user, "inventory.transfer");

  const products = productsData?.data || [];
  const stockBalances = stockData?.data || [];
  const movements = movementsData?.data || [];

  // Pagination Metadata
  const stockMeta = stockData?.meta || {
    total: stockBalances.length,
    totalPages: Math.ceil(stockBalances.length / stockPageSize) || 1,
    page: stockPage,
    limit: stockPageSize,
  };

  const catalogMeta = productsData?.meta || {
    total: products.length,
    totalPages: Math.ceil(products.length / catalogPageSize) || 1,
    page: catalogPage,
    limit: catalogPageSize,
  };

  const movementsMeta = movementsData?.meta || {
    total: movements.length,
    totalPages: Math.ceil(movements.length / movementsPageSize) || 1,
    page: movementsPage,
    limit: movementsPageSize,
  };

  const handleOpenConsume = (prod?: Product, onHand?: number) => {
    setSelectedProduct(prod || null);
    setSelectedBalanceOnHand(onHand);
    setIsConsumeModalOpen(true);
  };

  const handleOpenAdjust = (prod?: Product, onHand?: number) => {
    setSelectedProduct(prod || null);
    setSelectedBalanceOnHand(onHand);
    setIsAdjustModalOpen(true);
  };

  const handleOpenTransfer = (prod?: Product, onHand?: number) => {
    setSelectedProduct(prod || null);
    setSelectedBalanceOnHand(onHand);
    setIsTransferModalOpen(true);
  };

  const handleOpenAllocateDomain = (balance: StockBalance) => {
    setSelectedBalanceForAllocation(balance);
    setIsAllocateModalOpen(true);
  };

  const handleTabSync = async (
    tab: "stock" | "catalogue" | "movements" | "stocktake",
  ) => {
    try {
      if (tab === "stock") {
        await refetchStock();
        toast.success("Stock balances synchronized");
      } else if (tab === "catalogue") {
        await refetchProducts();
        toast.success("Product catalogue synchronized");
      } else if (tab === "movements") {
        await refetchMovements();
        toast.success("Movement audit ledger synchronized");
      } else if (tab === "stocktake") {
        await queryClient.invalidateQueries({
          predicate: (query) =>
            typeof query.queryKey[0] === "string" &&
            (query.queryKey[0].startsWith("inventory-stocktakes") ||
              query.queryKey[0].startsWith("inventory-stocktake-detail")),
        });
        toast.success("Stocktake sessions synchronized");
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
        description="Track branch stock balances, log internal salon consumables, execute adjustments, and manage catalog."
        icon={Package}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {canAdjust && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleOpenAdjust()}
                className="gap-1.5 shadow-2xs font-medium text-xs md:text-sm"
              >
                <SlidersHorizontal className="w-3.5 h-3.5 text-muted-foreground" />
                <span>Adjust Stock</span>
              </Button>
            )}

            {canAdjust && (
              <Button
                size="sm"
                onClick={() => {
                  setProductToEdit(null);
                  setIsProductModalOpen(true);
                }}
                className="gap-1.5 shadow-xs font-semibold text-xs md:text-sm"
              >
                <Plus className="w-4 h-4" />
                <span>Create Product</span>
              </Button>
            )}
          </div>
        }
      />

      {/* 2. TAB CONTROLS & FILTER BAR */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-border/80 pb-4">
        {/* Navigation Tabs (WAI-ARIA Tablist) */}
        <div
          role="tablist"
          aria-label="Inventory management sections"
          className="inline-flex items-center gap-1 p-1 rounded-xl bg-muted/60 border border-border/60 overflow-x-auto scrollbar-none max-w-full"
          onKeyDown={(e) => {
            const currentIndex = INVENTORY_TABS.findIndex(
              (t) => t.id === activeTab,
            );
            let nextIndex = -1;
            if (e.key === "ArrowRight") {
              nextIndex = (currentIndex + 1) % INVENTORY_TABS.length;
            } else if (e.key === "ArrowLeft") {
              nextIndex =
                (currentIndex - 1 + INVENTORY_TABS.length) %
                INVENTORY_TABS.length;
            } else if (e.key === "Home") {
              nextIndex = 0;
            } else if (e.key === "End") {
              nextIndex = INVENTORY_TABS.length - 1;
            }
            if (nextIndex !== -1) {
              e.preventDefault();
              const nextTab = INVENTORY_TABS[nextIndex];
              setActiveTab(nextTab.id);
              document.getElementById(`inventory-tab-${nextTab.id}`)?.focus();
            }
          }}
        >
          {INVENTORY_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            const count =
              tab.id === "stock"
                ? stockData?.meta?.total
                : tab.id === "catalogue"
                  ? productsData?.meta?.total
                  : tab.id === "movements"
                    ? movementsData?.meta?.total
                    : undefined;

            return (
              <button
                key={tab.id}
                id={`inventory-tab-${tab.id}`}
                role="tab"
                type="button"
                aria-selected={isActive}
                aria-controls={`inventory-tabpanel-${tab.id}`}
                tabIndex={isActive ? 0 : -1}
                onClick={() => setActiveTab(tab.id)}
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs md:text-sm font-medium whitespace-nowrap shrink-0 transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 ${
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                }`}
              >
                <Icon
                  className={`w-4 h-4 shrink-0 ${
                    isActive ? "text-primary-foreground" : "text-muted-foreground"
                  }`}
                />
                <span>{tab.label}</span>
                {typeof count === "number" && (
                  <span
                    className={`ml-0.5 px-1.5 py-0.5 text-[10px] leading-none font-semibold rounded-full tabular-nums ${
                      isActive
                        ? "bg-primary-foreground/20 text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Global Search and Filter Options */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative flex-1 sm:w-60 md:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search product, SKU..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-9 h-9 text-xs md:text-sm rounded-lg"
            />
          </div>

          {activeTab === "stock" && (
            <div className="w-36">
              <Select
                value={stockStatusFilter}
                onChange={(e) =>
                  setStockStatusFilter(
                    e.target.value as "all" | "low" | "optimal",
                  )
                }
                className="h-9 text-xs rounded-lg"
              >
                <option value="all">All Stock</option>
                <option value="low">Low Stock</option>
                <option value="optimal">Optimal Stock</option>
              </Select>
            </div>
          )}

          {activeTab === "catalogue" && (
            <div className="w-44">
              <Select
                value={usageFilter}
                onChange={(e) =>
                  setUsageFilter(e.target.value as ProductUsageType | "all")
                }
                className="h-9 text-xs rounded-lg"
              >
                <option value="all">All Usage Types</option>
                <option value="retail_sale">Retail Sale</option>
                <option value="salon_consumption">Salon Use Only</option>
                <option value="both">Dual Use (Both)</option>
              </Select>
            </div>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => handleTabSync(activeTab)}
            disabled={isCurrentTabSyncing}
            className="h-9 px-3 gap-1.5 text-xs rounded-lg"
          >
            <RotateCw
              size={14}
              className={`transition-transform duration-700 ${
                isCurrentTabSyncing ? "animate-spin" : ""
              }`}
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
              <p className="font-semibold text-base">
                No active branch selected
              </p>
              <p className="text-xs md:text-sm text-muted-foreground mt-1 max-w-md mx-auto">
                Please choose a specific branch location using the top header
                branch switcher to review and manage localized stock on hand.
              </p>
            </div>
          ) : isStockError ? (
            <ErrorState
              title="Failed to Load Stock"
              description="Unable to retrieve branch stock balances from server."
              retryAction={{ label: "Retry", onClick: () => refetchStock() }}
            />
          ) : (
            <StockBalanceTable
              balances={stockBalances}
              isLoading={isStockLoading || isStockFetching}
              canConsume={canConsume}
              canAdjust={canAdjust}
              canTransfer={canTransfer}
              onConsume={(p, onHand) => handleOpenConsume(p, onHand)}
              onAdjust={(p, onHand) => handleOpenAdjust(p, onHand)}
              onTransfer={(p, onHand) => handleOpenTransfer(p, onHand)}
              onAllocateDomain={handleOpenAllocateDomain}
              currentPage={stockPage}
              totalPages={Number(stockMeta.totalPages) || 1}
              totalItems={Number(stockMeta.total) || stockBalances.length}
              pageSize={stockPageSize}
              onPageChange={setStockPage}
              onPageSizeChange={(sz) => {
                setStockPageSize(sz);
                setStockPage(1);
              }}
              searchQuery={debouncedSearch}
            />
          )}
        </div>
      )}

      {/* 4. TAB 2: Master Product Catalogue */}
      {activeTab === "catalogue" && (
        <div className="space-y-4">
          {isProductsError ? (
            <ErrorState
              title="Failed to Load Products"
              description="Unable to retrieve product catalogue records."
              retryAction={{
                label: "Retry",
                onClick: () => refetchProducts(),
              }}
            />
          ) : (
            <ProductCatalogTable
              products={products}
              isLoading={isProductsLoading || isProductsFetching}
              canAdjust={canAdjust}
              onEdit={(p) => {
                setProductToEdit(p);
                setIsProductModalOpen(true);
              }}
              onAddToSale={(p) => {
                dispatch(
                  addProductToBasket({
                    productId: p.id,
                    sku: p.sku,
                    name: p.name,
                    unitPrice: p.sellingPrice || 0,
                    quantity: 1,
                    stockUnit: p.stockUnit,
                  }),
                );
                toast.success(`Product '${p.name}' added to Sale Basket.`);
              }}
              currentPage={catalogPage}
              totalPages={Number(catalogMeta.totalPages) || 1}
              totalItems={Number(catalogMeta.total) || products.length}
              pageSize={catalogPageSize}
              onPageChange={setCatalogPage}
              onPageSizeChange={(sz) => {
                setCatalogPageSize(sz);
                setCatalogPage(1);
              }}
              searchQuery={debouncedSearch}
            />
          )}
        </div>
      )}

      {/* 5. TAB 3: Movement Ledger History */}
      {activeTab === "movements" && (
        <div className="space-y-4">
          {isMovementsError ? (
            <ErrorState
              title="Failed to Load Ledger"
              description="Unable to retrieve stock movement audit entries."
              retryAction={{
                label: "Retry",
                onClick: () => refetchMovements(),
              }}
            />
          ) : (
            <StockMovementTable
              movements={movements}
              isLoading={isMovementsLoading || isMovementsFetching}
              currentPage={movementsPage}
              totalPages={Number(movementsMeta.totalPages) || 1}
              totalItems={Number(movementsMeta.total) || movements.length}
              pageSize={movementsPageSize}
              onPageChange={setMovementsPage}
              onPageSizeChange={(sz) => {
                setMovementsPageSize(sz);
                setMovementsPage(1);
              }}
              searchQuery={debouncedSearch}
            />
          )}
        </div>
      )}

      {/* 6. TAB 4: Physical Stocktake Audits */}
      {activeTab === "stocktake" && (
        <div className="space-y-4">
          <StocktakeListView />
        </div>
      )}

      {/* 7. MODALS */}
      <ProductFormModal
        isOpen={isProductModalOpen}
        onClose={() => setIsProductModalOpen(false)}
        productToEdit={productToEdit}
      />

      <ConsumptionModal
        isOpen={isConsumeModalOpen}
        onClose={() => setIsConsumeModalOpen(false)}
        products={modalProducts}
        preselectedProduct={selectedProduct}
      />

      <AdjustmentModal
        isOpen={isAdjustModalOpen}
        onClose={() => setIsAdjustModalOpen(false)}
        products={modalProducts}
        preselectedProduct={selectedProduct}
        currentStockOnHand={selectedBalanceOnHand}
      />

      <TransferModal
        isOpen={isTransferModalOpen}
        onClose={() => setIsTransferModalOpen(false)}
        products={modalProducts}
        preselectedProduct={selectedProduct}
        availableBranches={availableBranches.map((b) => ({
          id: b.id,
          name: b.name,
        }))}
      />

      <DomainAllocationModal
        isOpen={isAllocateModalOpen}
        onClose={() => {
          setIsAllocateModalOpen(false);
          setSelectedBalanceForAllocation(null);
        }}
        balance={selectedBalanceForAllocation}
      />
    </div>
  );
};
