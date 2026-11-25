import React, { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table/DataTable";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { Select } from "@/components/ui/select";
import { useBranchContext } from "@/hooks/useBranchContext";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { hasPermission } from "@/lib/permissions";
import { useStocktakes } from "../hooks/useInventory";
import { Stocktake, StocktakeStatus, StocktakeTargetDomain } from "../types/inventory.types";
import { buildStocktakeColumns } from "../columns/stocktakeColumns";
import { StocktakeMobileCard } from "./StocktakeMobileCard";
import { CreateStocktakeModal } from "./CreateStocktakeModal";
import { StocktakeCountModal } from "./StocktakeCountModal";
import { StocktakeReviewModal } from "./StocktakeReviewModal";
import { Plus, RotateCcw } from "lucide-react";

export const StocktakeListView: React.FC = () => {
  const { currentBranchId } = useBranchContext();
  const { user } = useAuth();

  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [domainFilter, setDomainFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [activeCountStocktakeId, setActiveCountStocktakeId] = useState<string | null>(null);
  const [activeReviewStocktakeId, setActiveReviewStocktakeId] = useState<string | null>(null);

  const canManageStocktake = hasPermission(user, "inventory.stocktake");

  const {
    data: stocktakesResponse,
    isLoading,
    refetch,
    isRefetching,
  } = useStocktakes({
    branchId: currentBranchId || undefined,
    status: statusFilter === "all" ? undefined : (statusFilter as StocktakeStatus),
    targetDomain: domainFilter === "all" ? undefined : (domainFilter as StocktakeTargetDomain),
    page,
    limit: pageSize,
  });

  const stocktakes: Stocktake[] = stocktakesResponse?.data || [];
  const meta = stocktakesResponse?.meta;

  const columns = useMemo(
    () =>
      buildStocktakeColumns({
        canManageStocktake,
        onEnterCounts: setActiveCountStocktakeId,
        onReviewOrView: setActiveReviewStocktakeId,
      }),
    [canManageStocktake],
  );

  const renderMobileRow = (stocktake: Stocktake) => (
    <StocktakeMobileCard
      key={stocktake.id || stocktake.stocktakeNumber}
      stocktake={stocktake}
      canManageStocktake={canManageStocktake}
      onEnterCounts={setActiveCountStocktakeId}
      onReviewOrView={setActiveReviewStocktakeId}
    />
  );

  return (
    <div className="space-y-4">
      {/* Top Action & Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card p-4 rounded-xl border border-border/80 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="h-9 text-xs w-36"
          >
            <option value="all">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </Select>

          <Select
            value={domainFilter}
            onChange={(e) => {
              setDomainFilter(e.target.value);
              setPage(1);
            }}
            className="h-9 text-xs w-44"
          >
            <option value="all">All Inventory Domains</option>
            <option value="salon_consumables">Salon Consumables</option>
            <option value="retail_products">Retail Products</option>
          </Select>

          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isLoading || isRefetching}
            className="h-9 text-xs"
          >
            <RotateCcw className="w-3.5 h-3.5 mr-1" /> Refresh
          </Button>
        </div>

        {canManageStocktake && (
          <Button
            size="sm"
            onClick={() => setIsCreateOpen(true)}
            className="h-9 text-xs bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            <Plus className="w-4 h-4 mr-1" /> Initiate Stocktake
          </Button>
        )}
      </div>

      {/* Stocktakes Table */}
      {/* Stocktakes Data Table */}
      <DataTable
        columns={columns}
        data={stocktakes}
        isLoading={isLoading}
        renderMobileRow={renderMobileRow}
        emptyState={
          <EmptyState
            title="No Physical Stocktake Audits Found"
            description='Click "Initiate Stocktake" to capture an inventory snapshot and begin physical counting.'
          />
        }
      />

      {meta && meta.total > 0 && (
        <Pagination
          currentPage={page}
          totalPages={meta.totalPages}
          totalItems={meta.total}
          onPageChange={setPage}
          pageSize={pageSize}
          pageSizeOptions={[10, 20, 50, 100]}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setPage(1);
          }}
          itemLabel="sessions"
        />
      )}

      {/* Modals */}
      <CreateStocktakeModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={(created) => {
          refetch();
          if (created?._id || created?.id) {
            setActiveCountStocktakeId(created._id || created.id);
          }
        }}
      />

      {activeCountStocktakeId && (
        <StocktakeCountModal
          isOpen={Boolean(activeCountStocktakeId)}
          onClose={() => setActiveCountStocktakeId(null)}
          stocktakeId={activeCountStocktakeId}
          onProceedToReview={() => {
            const sid = activeCountStocktakeId;
            setActiveCountStocktakeId(null);
            setActiveReviewStocktakeId(sid);
          }}
        />
      )}

      {activeReviewStocktakeId && (
        <StocktakeReviewModal
          isOpen={Boolean(activeReviewStocktakeId)}
          onClose={() => setActiveReviewStocktakeId(null)}
          stocktakeId={activeReviewStocktakeId}
          onBackToCount={() => {
            const sid = activeReviewStocktakeId;
            setActiveReviewStocktakeId(null);
            setActiveCountStocktakeId(sid);
          }}
          onPostSuccess={() => {
            refetch();
          }}
        />
      )}
    </div>
  );
};