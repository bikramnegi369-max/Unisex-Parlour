import React, { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { useBranchContext } from "@/hooks/useBranchContext";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { hasPermission } from "@/lib/permissions";
import { useStocktakes } from "../hooks/useInventory";
import { Stocktake, StocktakeStatus, StocktakeTargetDomain } from "../types/inventory.types";
import { CreateStocktakeModal } from "./CreateStocktakeModal";
import { StocktakeCountModal } from "./StocktakeCountModal";
import { StocktakeReviewModal } from "./StocktakeReviewModal";
import {
  ClipboardList,
  Plus,
  RotateCcw,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  FileText,
  Lock,
} from "lucide-react";

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

  const getStatusBadge = (status: StocktakeStatus) => {
    switch (status) {
      case "completed":
        return (
          <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Completed
          </Badge>
        );
      case "in_progress":
        return (
          <Badge className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1">
            <Clock className="w-3 h-3" /> In Progress
          </Badge>
        );
      case "posting":
        return (
          <Badge className="bg-amber-600 hover:bg-amber-700 text-white flex items-center gap-1 animate-pulse">
            <Lock className="w-3 h-3" /> Posting...
          </Badge>
        );
      case "cancelled":
        return (
          <Badge variant="destructive" className="flex items-center gap-1">
            <XCircle className="w-3 h-3" /> Cancelled
          </Badge>
        );
      case "draft":
      default:
        return (
          <Badge variant="secondary" className="flex items-center gap-1">
            <FileText className="w-3 h-3" /> Draft
          </Badge>
        );
    }
  };

  const getDomainBadge = (domain: StocktakeTargetDomain) => {
    switch (domain) {
      case "salon_consumables":
        return (
          <Badge
            variant="outline"
            className="bg-purple-50 text-purple-700 dark:bg-purple-950/30 dark:text-purple-300 border-purple-200 text-xs"
          >
            Consumables Only
          </Badge>
        );
      case "retail_products":
        return (
          <Badge
            variant="outline"
            className="bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-300 border-blue-200 text-xs"
          >
            Retail Products Only
          </Badge>
        );
      case "all":
      default:
        return (
          <Badge variant="outline" className="text-xs">
            All Domains
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Action & Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-zinc-900 p-4 rounded-lg border border-gray-200 dark:border-zinc-800 shadow-sm">
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
      <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-lg overflow-hidden shadow-sm">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-gray-50 dark:bg-zinc-800/80 text-gray-600 dark:text-gray-300 border-b border-gray-200 dark:border-zinc-700">
            <tr>
              <th className="py-3 px-4">Stocktake #</th>
              <th className="py-3 px-4">Title & Remarks</th>
              <th className="py-3 px-4">Domain Scope</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4">Progress (Counted)</th>
              <th className="py-3 px-4">Discrepancies</th>
              <th className="py-3 px-4">Initiated</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
            {isLoading ? (
              <tr>
                <td colSpan={8} className="text-center py-10 text-gray-400">
                  Loading stocktake sessions...
                </td>
              </tr>
            ) : stocktakes.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-12 text-gray-400">
                  <ClipboardList className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="font-semibold text-gray-600 dark:text-gray-300">
                    No physical stocktake audits found
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Click "Initiate Stocktake" to capture an inventory snapshot and begin physical counting.
                  </p>
                </td>
              </tr>
            ) : (
              stocktakes.map((st, idx) => {
                const stocktakeId = (st.id || (st as any)._id || `stk-${idx}`) as string;
                const total = st.totalItems || 0;
                const counted = st.countedItemsCount || 0;
                const isCompleted = st.status === "completed";
                const isCancelled = st.status === "cancelled";

                return (
                  <tr key={stocktakeId} className="hover:bg-gray-50/60 dark:hover:bg-zinc-800/40">
                    <td className="py-3 px-4 font-mono font-bold text-gray-900 dark:text-gray-100">
                      {st.stocktakeNumber}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-gray-900 dark:text-gray-100">
                        {st.title || "Physical Stocktake"}
                      </div>
                      {st.notes && (
                        <div className="text-[11px] text-gray-500 truncate max-w-xs">{st.notes}</div>
                      )}
                    </td>
                    <td className="py-3 px-4">{getDomainBadge(st.targetDomain)}</td>
                    <td className="py-3 px-4">{getStatusBadge(st.status)}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-2">
                        <div className="w-20 bg-gray-200 dark:bg-zinc-700 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-emerald-500 h-1.5 rounded-full"
                            style={{
                              width: `${total > 0 ? Math.round((counted / total) * 100) : 0}%`,
                            }}
                          />
                        </div>
                        <span className="font-mono text-gray-600 dark:text-gray-400">
                          {counted} / {total}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono font-semibold">
                      {isCompleted ? (
                        <span className="text-gray-700 dark:text-gray-300">
                          {st.discrepancyCount} reconciled
                        </span>
                      ) : (
                        <span className="text-amber-600 dark:text-amber-400">
                          {st.discrepancyCount > 0 ? `${st.discrepancyCount} pending` : "-"}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-gray-500 text-[11px]">
                      <div>{new Date(st.createdAt).toLocaleDateString()}</div>
                      <div className="text-gray-400">
                        {typeof st.initiatedBy === "object" ? st.initiatedBy?.name : "User"}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex justify-end space-x-2">
                        {!isCompleted && !isCancelled && canManageStocktake && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs h-7"
                            onClick={() => setActiveCountStocktakeId(stocktakeId)}
                          >
                            Enter Counts
                          </Button>
                        )}
                        {!isCancelled && (
                          <Button
                            variant={isCompleted ? "outline" : "default"}
                            size="sm"
                            className={`text-xs h-7 ${
                              !isCompleted ? "bg-emerald-600 hover:bg-emerald-700 text-white" : ""
                            }`}
                            onClick={() => setActiveReviewStocktakeId(stocktakeId)}
                          >
                            {isCompleted ? "View Audit" : "Review & Post"}
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {/* Pagination Bar */}
        {meta && meta.totalPages > 1 && (
          <div className="flex items-center justify-between p-3 border-t border-gray-100 dark:border-zinc-800 text-xs">
            <span className="text-gray-500">
              Page {meta.page} of {meta.totalPages} ({meta.total} sessions)
            </span>
            <div className="flex space-x-1">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="h-7 text-xs"
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= meta.totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="h-7 text-xs"
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

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