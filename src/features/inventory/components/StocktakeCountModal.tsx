import React, { useState, useEffect } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useBranchContext } from "@/hooks/useBranchContext";
import { useStocktake, useRecordStocktakeCounts } from "../hooks/useInventory";
import { Stocktake, StocktakeItem, DISCRETE_STOCK_UNITS } from "../types/inventory.types";
import { validateDecimalPrecision } from "../schemas/inventory.schema";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/api/errors";
import { AlertCircle, CheckCircle2, RotateCcw, Save, Search, Sparkles } from "lucide-react";

interface StocktakeCountModalProps {
  isOpen: boolean;
  onClose: () => void;
  stocktakeId: string;
  onProceedToReview?: () => void;
}

interface CountRowState {
  countedQuantity: string; // Keep as string for precision and empty representation
  notes: string;
  error?: string;
}

export const StocktakeCountModal: React.FC<StocktakeCountModalProps> = ({
  isOpen,
  onClose,
  stocktakeId,
  onProceedToReview,
}) => {
  const { currentBranchId } = useBranchContext();
  const { data: stocktake, isLoading, refetch } = useStocktake(stocktakeId, currentBranchId || undefined);
  const recordCountsMutation = useRecordStocktakeCounts();

  const [countRows, setCountRows] = useState<Record<string, CountRowState>>({});
  const [filterDomain, setFilterDomain] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const items: StocktakeItem[] = stocktake?.items || [];

  // Initialize or re-sync form state from fetched stocktake items
  useEffect(() => {
    if (items.length > 0) {
      const initialMap: Record<string, CountRowState> = {};
      items.forEach((item) => {
        initialMap[item.id] = {
          countedQuantity:
            item.countedQuantity !== null && item.countedQuantity !== undefined
              ? String(item.countedQuantity)
              : "",
          notes: item.notes || "",
        };
      });
      setCountRows(initialMap);
    }
  }, [stocktake?.items]);

  const handleQuantityChange = (itemId: string, rawVal: string, unit: string) => {
    const isDiscrete = DISCRETE_STOCK_UNITS.includes(unit as any);
    let error: string | undefined = undefined;

    if (rawVal.trim() !== "") {
      const num = Number(rawVal);
      if (isNaN(num)) {
        error = "Must be a valid number";
      } else if (num < 0) {
        error = "Cannot be negative";
      } else if (isDiscrete && !Number.isInteger(num)) {
        error = `Whole number required for ${unit}`;
      } else if (!isDiscrete && !validateDecimalPrecision(num)) {
        error = "Max 3 decimal places allowed";
      }
    }

    setCountRows((prev) => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        countedQuantity: rawVal,
        error,
      },
    }));
  };

  const handleNotesChange = (itemId: string, notes: string) => {
    setCountRows((prev) => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        notes,
      },
    }));
  };

  const handleSaveCounts = async () => {
    // Validate rows
    const entriesToSubmit: Array<{
      productId: string;
      stockDomain: "salon_consumables" | "retail_products";
      countedQuantity: number;
      notes?: string;
    }> = [];

    let hasValidationError = false;

    for (const item of items) {
      const row = countRows[item.id];
      if (!row || row.countedQuantity === "") {
        continue; // Uncounted line - skipped in this batch update
      }

      const num = Number(row.countedQuantity);
      const isDiscrete = DISCRETE_STOCK_UNITS.includes(item.stockUnit as any);

      if (
        isNaN(num) ||
        num < 0 ||
        (isDiscrete && !Number.isInteger(num)) ||
        (!isDiscrete && !validateDecimalPrecision(num))
      ) {
        hasValidationError = true;
        setCountRows((prev) => ({
          ...prev,
          [item.id]: {
            ...prev[item.id],
            error: isDiscrete
              ? `Whole number required for ${item.stockUnit}`
              : "Invalid number or >3 decimals",
          },
        }));
      } else {
        entriesToSubmit.push({
          productId: item.productId,
          stockDomain: item.stockDomain,
          countedQuantity: num,
          notes: row.notes || "",
        });
      }
    }

    if (hasValidationError) {
      toast.error("Please correct the quantity errors before saving");
      return;
    }

    if (entriesToSubmit.length === 0) {
      toast.info("No counts entered or modified to save");
      return;
    }

    try {
      await recordCountsMutation.mutateAsync({
        id: stocktakeId,
        payload: {
          items: entriesToSubmit,
          branchId: currentBranchId || undefined,
        },
      });

      toast.success(`Saved physical counts for ${entriesToSubmit.length} line(s)`);
      refetch();
    } catch (err: any) {
      toast.error(getErrorMessage(err, "Failed to save stocktake counts"));
    }
  };

  const filteredItems = items.filter((item) => {
    if (filterDomain !== "all" && item.stockDomain !== filterDomain) return false;
    if (filterStatus === "uncounted" && item.status !== "uncounted") return false;
    if (filterStatus === "counted" && item.status !== "counted") return false;
    if (filterStatus === "recount_required" && item.status !== "recount_required") return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const pName = item.product?.name?.toLowerCase() || "";
      const sku = item.product?.sku?.toLowerCase() || "";
      return pName.includes(q) || sku.includes(q);
    }
    return true;
  });

  const totalLines = items.length;
  const countedLines = items.filter((it) => it.status === "counted").length;
  const recountRequiredLines = items.filter((it) => it.status === "recount_required").length;
  const uncountedLines = items.filter((it) => it.status === "uncounted").length;

  return (
    <Dialog isOpen={isOpen} onClose={onClose} maxWidth="5xl">
      <div className="p-6 max-w-5xl w-full max-h-[90vh] flex flex-col bg-white dark:bg-zinc-900 rounded-lg shadow-2xl">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-gray-200 dark:border-zinc-800 gap-3">
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                {stocktake?.title || "Stocktake Count Entry"}
              </h2>
              <Badge variant="outline" className="font-mono">
                {stocktake?.stocktakeNumber}
              </Badge>
              <Badge
                variant={
                  stocktake?.status === "completed"
                    ? "default"
                    : stocktake?.status === "cancelled"
                    ? "destructive"
                    : "secondary"
                }
              >
                {stocktake?.status?.toUpperCase()}
              </Badge>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Enter shelf-counted quantities. An explicit count of <strong>0</strong> indicates out-of-stock, while blank indicates uncounted.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isLoading || recordCountsMutation.isPending}
            >
              <RotateCcw className="w-4 h-4 mr-1" /> Refresh
            </Button>
            <Button
              size="sm"
              onClick={handleSaveCounts}
              disabled={recordCountsMutation.isPending || stocktake?.status === "completed"}
            >
              <Save className="w-4 h-4 mr-1" />
              {recordCountsMutation.isPending ? "Saving..." : "Save Progress"}
            </Button>
            {onProceedToReview && (
              <Button
                variant="default"
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={onProceedToReview}
                disabled={stocktake?.status === "completed"}
              >
                Review & Post Discrepancies →
              </Button>
            )}
          </div>
        </div>

        {/* Metrics Banner */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 my-4">
          <div className="p-3 bg-gray-50 dark:bg-zinc-800/60 rounded-lg border border-gray-100 dark:border-zinc-800">
            <span className="text-xs text-gray-500 dark:text-gray-400">Total Items</span>
            <div className="text-lg font-bold text-gray-800 dark:text-gray-200">{totalLines}</div>
          </div>
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 rounded-lg border border-emerald-100 dark:border-emerald-900/40">
            <span className="text-xs text-emerald-600 dark:text-emerald-400">Counted Lines</span>
            <div className="text-lg font-bold text-emerald-700 dark:text-emerald-300">
              {countedLines} / {totalLines}
            </div>
          </div>
          <div className="p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-100 dark:border-amber-900/40">
            <span className="text-xs text-amber-600 dark:text-amber-400">Uncounted</span>
            <div className="text-lg font-bold text-amber-700 dark:text-amber-300">{uncountedLines}</div>
          </div>
          <div className="p-3 bg-rose-50 dark:bg-rose-950/20 rounded-lg border border-rose-100 dark:border-rose-900/40">
            <span className="text-xs text-rose-600 dark:text-rose-400">Recount Required</span>
            <div className="text-lg font-bold text-rose-700 dark:text-rose-300">{recountRequiredLines}</div>
          </div>
        </div>

        {/* Filters & Search */}
        <div className="flex flex-col sm:flex-row gap-2 mb-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
            <Input
              placeholder="Filter by product name or SKU..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-xs"
            />
          </div>
          <Select
            value={filterDomain}
            onChange={(e) => setFilterDomain(e.target.value)}
            className="h-9 text-xs w-48"
          >
            <option value="all">All Domains</option>
            <option value="salon_consumables">Salon Consumables</option>
            <option value="retail_products">Retail Products</option>
          </Select>
          <Select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="h-9 text-xs w-48"
          >
            <option value="all">All Statuses</option>
            <option value="uncounted">Uncounted Only</option>
            <option value="counted">Counted</option>
            <option value="recount_required">Recount Required Only</option>
          </Select>
        </div>

        {/* Recount Required Alert Notice */}
        {recountRequiredLines > 0 && (
          <div className="mb-3 p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-md flex items-center justify-between">
            <div className="flex items-center space-x-2 text-red-800 dark:text-red-300 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>
                <strong>{recountRequiredLines} line(s)</strong> require a physical recount because inventory movements committed after previous counts. Posting is blocked until recounted.
              </span>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="text-xs h-7 text-red-700 border-red-300 hover:bg-red-100"
              onClick={() => setFilterStatus("recount_required")}
            >
              Filter Conflicted Lines
            </Button>
          </div>
        )}

        {/* Table Content */}
        <div className="flex-1 overflow-y-auto border border-gray-200 dark:border-zinc-800 rounded-lg">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-gray-50 dark:bg-zinc-800/80 sticky top-0 text-gray-600 dark:text-gray-300 border-b border-gray-200 dark:border-zinc-700">
              <tr>
                <th className="py-2.5 px-3">Product / SKU</th>
                <th className="py-2.5 px-3">Domain</th>
                <th className="py-2.5 px-3">Unit</th>
                <th className="py-2.5 px-3">Snapshot Qty</th>
                <th className="py-2.5 px-3 w-36">Physical Count</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Audit Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-gray-400">
                    No stocktake line items matching the current filter.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => {
                  const row = countRows[item.id] || { countedQuantity: "", notes: "" };
                  const isRecount = item.status === "recount_required";
                  const isCounted = item.status === "counted";

                  return (
                    <tr
                      key={item.id}
                      className={
                        isRecount
                          ? "bg-rose-50/50 dark:bg-rose-950/20"
                          : isCounted
                          ? "bg-emerald-50/20 dark:bg-emerald-950/10"
                          : ""
                      }
                    >
                      <td className="py-2 px-3">
                        <div className="font-semibold text-gray-900 dark:text-gray-100">
                          {item.product?.name || "Product"}
                        </div>
                        <div className="text-[10px] text-gray-400 font-mono">
                          {item.product?.sku || item.productId}
                        </div>
                      </td>
                      <td className="py-2 px-3">
                        <Badge
                          variant="outline"
                          className={
                            item.stockDomain === "salon_consumables"
                              ? "bg-purple-50 text-purple-700 dark:bg-purple-950/30 dark:text-purple-300 border-purple-200 text-[10px]"
                              : "bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-300 border-blue-200 text-[10px]"
                          }
                        >
                          {item.stockDomain === "salon_consumables" ? "Consumables" : "Retail"}
                        </Badge>
                      </td>
                      <td className="py-2 px-3 font-mono text-gray-500">{item.stockUnit}</td>
                      <td className="py-2 px-3 font-mono text-gray-600 dark:text-gray-300">
                        {item.snapshotQuantity}
                      </td>
                      <td className="py-2 px-3">
                        <div>
                          <Input
                            type="number"
                            step={DISCRETE_STOCK_UNITS.includes(item.stockUnit as any) ? "1" : "0.001"}
                            placeholder="Uncounted"
                            value={row.countedQuantity}
                            onChange={(e) =>
                              handleQuantityChange(item.id, e.target.value, item.stockUnit)
                            }
                            className={`h-8 text-xs font-mono w-28 ${
                              row.error
                                ? "border-red-500 focus-visible:ring-red-400"
                                : isRecount
                                ? "border-amber-400 bg-amber-50/40"
                                : ""
                            }`}
                            disabled={stocktake?.status === "completed"}
                          />
                          {row.error && (
                            <span className="text-[10px] text-red-500 block mt-0.5">
                              {row.error}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-2 px-3">
                        {isRecount ? (
                          <Badge variant="destructive" className="text-[10px]">
                            Recount Required
                          </Badge>
                        ) : isCounted ? (
                          <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white text-[10px]">
                            Counted
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-[10px]">
                            Uncounted
                          </Badge>
                        )}
                      </td>
                      <td className="py-2 px-3">
                        <Input
                          placeholder="e.g. Expired shelf pack"
                          value={row.notes}
                          onChange={(e) => handleNotesChange(item.id, e.target.value)}
                          className="h-8 text-xs w-44"
                          disabled={stocktake?.status === "completed"}
                        />
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
          <span className="text-xs text-gray-500 dark:text-gray-400">
            Showing {filteredItems.length} of {totalLines} lines
          </span>
          <div className="flex space-x-2">
            <Button variant="outline" size="sm" onClick={onClose}>
              Close
            </Button>
            <Button
              size="sm"
              onClick={handleSaveCounts}
              disabled={recordCountsMutation.isPending || stocktake?.status === "completed"}
            >
              {recordCountsMutation.isPending ? "Saving..." : "Save Progress"}
            </Button>
          </div>
        </div>
      </div>
    </Dialog>
  );
};