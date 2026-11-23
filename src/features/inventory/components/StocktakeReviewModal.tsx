import React, { useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useBranchContext } from "@/hooks/useBranchContext";
import {
  useStocktakeDiscrepancies,
  usePostStocktake,
  useCancelStocktake,
} from "../hooks/useInventory";
import { StocktakeDiscrepancySummary, StocktakeDiscrepancyItem } from "../types/inventory.types";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/api/errors";
import {
  AlertTriangle,
  CheckCircle2,
  Lock,
  RotateCcw,
  ShieldAlert,
  ArrowRight,
  TrendingDown,
  TrendingUp,
  Minus,
} from "lucide-react";

interface StocktakeReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  stocktakeId: string;
  onBackToCount?: () => void;
  onPostSuccess?: () => void;
}

export const StocktakeReviewModal: React.FC<StocktakeReviewModalProps> = ({
  isOpen,
  onClose,
  stocktakeId,
  onBackToCount,
  onPostSuccess,
}) => {
  const { currentBranchId } = useBranchContext();
  const {
    data: summary,
    isLoading,
    refetch,
    isRefetching,
  } = useStocktakeDiscrepancies(stocktakeId, currentBranchId || undefined);

  const postMutation = usePostStocktake();
  const cancelMutation = useCancelStocktake();

  const [idempotencyKey, setIdempotencyKey] = useState(() => `stk_post_${crypto.randomUUID()}`);
  const [filterDiscrepancy, setFilterDiscrepancy] = useState<"all" | "variances_only" | "matched_only">(
    "all",
  );

  const discrepancies: StocktakeDiscrepancyItem[] = summary?.discrepancies || [];

  const filteredDiscrepancies = discrepancies.filter((d) => {
    if (filterDiscrepancy === "variances_only") {
      return d.varianceAgainstLive !== 0 && d.varianceAgainstLive !== null;
    }
    if (filterDiscrepancy === "matched_only") {
      return d.varianceAgainstLive === 0;
    }
    return true;
  });

  const handlePost = async () => {
    if (!summary?.canPost) {
      toast.error(
        summary?.blockers?.[0] || "Cannot post stocktake due to incomplete counts or unresolved recounts."
      );
      return;
    }

    try {
      await postMutation.mutateAsync({
        id: stocktakeId,
        payload: { branchId: currentBranchId || undefined },
        idempotencyKey,
      });

      toast.success("Stocktake posted successfully. Inventory reconciled with immutable ledger records.");
      onPostSuccess?.();
      onClose();
    } catch (err: any) {
      const errorMsg = getErrorMessage(err, "Failed to post stocktake");
      if (err?.response?.status === 409 || err?.status === 409) {
        // Race condition conflict detected!
        toast.error("Concurrency conflict: Stock was altered mid-audit. Recount is required for flagged lines.");
        // Refetch preview to refresh live balances and conflict status
        refetch();
        // Regenerate idempotency key for future retry
        setIdempotencyKey(`stk_post_${crypto.randomUUID()}`);
      } else {
        toast.error(errorMsg);
      }
    }
  };

  const handleCancel = async () => {
    const reason = window.prompt("Reason for cancelling stocktake session:", "Discrepancy audit voided");
    if (reason === null) return;

    try {
      await cancelMutation.mutateAsync({
        id: stocktakeId,
        payload: { reason, branchId: currentBranchId || undefined },
      });
      toast.success("Stocktake session cancelled");
      onClose();
    } catch (err: any) {
      toast.error(getErrorMessage(err, "Failed to cancel stocktake"));
    }
  };

  return (
    <Dialog isOpen={isOpen} onClose={onClose} maxWidth="5xl">
      <div className="p-6 max-w-5xl w-full max-h-[90vh] flex flex-col bg-white dark:bg-zinc-900 rounded-lg shadow-2xl">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-gray-200 dark:border-zinc-800 gap-3">
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                Stocktake Discrepancy Review
              </h2>
              <Badge variant="outline" className="font-mono">
                {summary?.stocktakeNumber}
              </Badge>
              <Badge
                variant={
                  summary?.canPost ? "default" : "destructive"
                }
              >
                {summary?.canPost ? "READY TO POST" : "BLOCKED"}
              </Badge>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Read-only variance preview comparing shelf counts against live balances. Reconciling commits immutable ledger adjustments.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isLoading || isRefetching || postMutation.isPending}
            >
              <RotateCcw className="w-4 h-4 mr-1" /> Refresh
            </Button>
            {onBackToCount && (
              <Button variant="outline" size="sm" onClick={onBackToCount}>
                ← Return to Count Entry
              </Button>
            )}
            <Button
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={handlePost}
              disabled={!summary?.canPost || postMutation.isPending}
            >
              <Lock className="w-4 h-4 mr-1" />
              {postMutation.isPending ? "Reconciling..." : "Approve & Post Reconciliation"}
            </Button>
          </div>
        </div>

        {/* Metrics Bar */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 my-4">
          <div className="p-3 bg-gray-50 dark:bg-zinc-800/60 rounded-lg border border-gray-100 dark:border-zinc-800">
            <span className="text-xs text-gray-500 dark:text-gray-400">Total Lines</span>
            <div className="text-lg font-bold text-gray-800 dark:text-gray-200">{summary?.totalItems ?? 0}</div>
          </div>
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 rounded-lg border border-emerald-100 dark:border-emerald-900/40">
            <span className="text-xs text-emerald-600 dark:text-emerald-400">Matched (0 Variance)</span>
            <div className="text-lg font-bold text-emerald-700 dark:text-emerald-300">
              {summary?.matchedItems ?? 0}
            </div>
          </div>
          <div className="p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-100 dark:border-amber-900/40">
            <span className="text-xs text-amber-600 dark:text-amber-400">Discrepancies</span>
            <div className="text-lg font-bold text-amber-700 dark:text-amber-300">
              {summary?.discrepantItems ?? 0}
            </div>
          </div>
          <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-100 dark:border-blue-900/40">
            <span className="text-xs text-blue-600 dark:text-blue-400">Uncounted</span>
            <div className="text-lg font-bold text-blue-700 dark:text-blue-300">
              {summary?.uncountedItems ?? 0}
            </div>
          </div>
          <div className="p-3 bg-rose-50 dark:bg-rose-950/20 rounded-lg border border-rose-100 dark:border-rose-900/40">
            <span className="text-xs text-rose-600 dark:text-rose-400">Recount Required</span>
            <div className="text-lg font-bold text-rose-700 dark:text-rose-300">
              {summary?.recountRequiredCount ?? 0}
            </div>
          </div>
        </div>

        {/* Blocking Warnings Banner */}
        {summary && !summary.canPost && (
          <div className="mb-3 p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 rounded-md">
            <div className="flex items-center space-x-2 text-rose-800 dark:text-rose-300 font-semibold text-xs mb-1">
              <ShieldAlert className="w-4 h-4 text-rose-600" />
              <span>Posting Blocked:</span>
            </div>
            <ul className="list-disc pl-5 text-xs text-rose-700 dark:text-rose-400 space-y-0.5">
              {summary.blockers?.map((b: string, i: number) => (
                <li key={i}>{b}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Filters */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex space-x-2">
            <Button
              variant={filterDiscrepancy === "all" ? "default" : "outline"}
              size="sm"
              className="text-xs h-7"
              onClick={() => setFilterDiscrepancy("all")}
            >
              All Items ({discrepancies.length})
            </Button>
            <Button
              variant={filterDiscrepancy === "variances_only" ? "default" : "outline"}
              size="sm"
              className="text-xs h-7"
              onClick={() => setFilterDiscrepancy("variances_only")}
            >
              Discrepancies Only ({summary?.discrepantItems ?? 0})
            </Button>
            <Button
              variant={filterDiscrepancy === "matched_only" ? "default" : "outline"}
              size="sm"
              className="text-xs h-7"
              onClick={() => setFilterDiscrepancy("matched_only")}
            >
              Matched Only ({summary?.matchedItems ?? 0})
            </Button>
          </div>
          <span className="text-xs text-gray-500 font-mono">
            Showing {filteredDiscrepancies.length} line(s)
          </span>
        </div>

        {/* Discrepancy Table */}
        <div className="flex-1 overflow-y-auto border border-gray-200 dark:border-zinc-800 rounded-lg">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-gray-50 dark:bg-zinc-800/80 sticky top-0 text-gray-600 dark:text-gray-300 border-b border-gray-200 dark:border-zinc-700">
              <tr>
                <th className="py-2.5 px-3">Product / SKU</th>
                <th className="py-2.5 px-3">Domain</th>
                <th className="py-2.5 px-3">Unit</th>
                <th className="py-2.5 px-3">Snapshot Qty</th>
                <th className="py-2.5 px-3">Live Balance</th>
                <th className="py-2.5 px-3">Counted Qty</th>
                <th className="py-2.5 px-3">Variance</th>
                <th className="py-2.5 px-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
              {filteredDiscrepancies.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-gray-400">
                    No discrepancies match the active filter.
                  </td>
                </tr>
              ) : (
                filteredDiscrepancies.map((d) => {
                  const varVal = d.varianceAgainstLive ?? 0;
                  const isPositive = varVal > 0;
                  const isNegative = varVal < 0;
                  const isZero = varVal === 0;

                  return (
                    <tr
                      key={d.itemId}
                      className={
                        d.status === "recount_required"
                          ? "bg-rose-50/50 dark:bg-rose-950/20"
                          : !isZero
                          ? "bg-amber-50/20 dark:bg-amber-950/10"
                          : ""
                      }
                    >
                      <td className="py-2 px-3">
                        <div className="font-semibold text-gray-900 dark:text-gray-100">
                          {d.productName}
                        </div>
                        <div className="text-[10px] text-gray-400 font-mono">{d.sku}</div>
                      </td>
                      <td className="py-2 px-3">
                        <Badge
                          variant="outline"
                          className={
                            d.stockDomain === "salon_consumables"
                              ? "bg-purple-50 text-purple-700 dark:bg-purple-950/30 dark:text-purple-300 border-purple-200 text-[10px]"
                              : "bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-300 border-blue-200 text-[10px]"
                          }
                        >
                          {d.stockDomain === "salon_consumables" ? "Consumables" : "Retail"}
                        </Badge>
                      </td>
                      <td className="py-2 px-3 font-mono text-gray-500">{d.stockUnit}</td>
                      <td className="py-2 px-3 font-mono text-gray-500">{d.snapshotQuantity}</td>
                      <td className="py-2 px-3 font-mono text-gray-700 dark:text-gray-200 font-semibold">
                        {d.liveBalance}
                      </td>
                      <td className="py-2 px-3 font-mono">
                        {d.countedQuantity !== null ? (
                          <span className="font-bold text-gray-900 dark:text-gray-100">
                            {d.countedQuantity}
                          </span>
                        ) : (
                          <span className="text-gray-400 italic">Uncounted</span>
                        )}
                      </td>
                      <td className="py-2 px-3 font-mono font-bold">
                        {d.countedQuantity === null ? (
                          <span className="text-gray-400">-</span>
                        ) : isPositive ? (
                          <span className="text-emerald-600 dark:text-emerald-400 flex items-center">
                            <TrendingUp className="w-3.5 h-3.5 mr-1" /> +{varVal}
                          </span>
                        ) : isNegative ? (
                          <span className="text-rose-600 dark:text-rose-400 flex items-center">
                            <TrendingDown className="w-3.5 h-3.5 mr-1" /> {varVal}
                          </span>
                        ) : (
                          <span className="text-gray-500 flex items-center">
                            <Minus className="w-3.5 h-3.5 mr-1" /> 0
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-3">
                        {d.status === "recount_required" ? (
                          <Badge variant="destructive" className="text-[10px]">
                            Recount Required
                          </Badge>
                        ) : d.status === "uncounted" ? (
                          <Badge variant="secondary" className="text-[10px]">
                            Uncounted
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] text-emerald-700 border-emerald-300">
                            Ready
                          </Badge>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 mt-3 border-t border-gray-200 dark:border-zinc-800">
          <Button
            variant="ghost"
            size="sm"
            className="text-rose-600 hover:bg-rose-50 hover:text-rose-700"
            onClick={handleCancel}
            disabled={cancelMutation.isPending}
          >
            Cancel Stocktake Session
          </Button>

          <div className="flex space-x-2">
            <Button variant="outline" size="sm" onClick={onClose}>
              Close
            </Button>
            <Button
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={handlePost}
              disabled={!summary?.canPost || postMutation.isPending}
            >
              <Lock className="w-4 h-4 mr-1" />
              {postMutation.isPending ? "Reconciling..." : "Approve & Post Reconciliation"}
            </Button>
          </div>
        </div>
      </div>
    </Dialog>
  );
};