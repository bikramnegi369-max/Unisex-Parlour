"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { inventoryApi } from "../api/inventory.api";
import { useBranchContext } from "@/hooks/useBranchContext";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { hasPermission } from "@/lib/permissions";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, CheckCircle, DollarSign, Layers, Package, Calendar } from "lucide-react";

export function StockBatchLedgerView() {
  const { currentBranchId } = useBranchContext();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const canView = hasPermission(user, "inventory.view");
  const canAdjust = hasPermission(user, "inventory.adjust");

  const [selectedBatch, setSelectedBatch] = useState<any>(null);
  const [unitCostInput, setUnitCostInput] = useState<string>("");
  const [notesInput, setNotesInput] = useState<string>("");
  const [docRefInput, setDocRefInput] = useState<string>("");
  const [filterDomain, setFilterDomain] = useState<string>("all");
  const [filterValuation, setFilterValuation] = useState<string>("all");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Fetch batches for current branch
  const { data: batchData, isLoading, isError } = useQuery({
    queryKey: ["inventory-batches", currentBranchId, filterDomain, filterValuation],
    queryFn: () =>
      inventoryApi.getBatches({
        branchId: currentBranchId || undefined,
        stockDomain: filterDomain !== "all" ? filterDomain : undefined,
        isValued: filterValuation === "valued" ? true : filterValuation === "unvalued" ? false : undefined,
      }),
    enabled: canView,
  });

  // Valuation mutation
  const valuationMutation = useMutation({
    mutationFn: (data: { batchId: string; unitCostPrice: number; notes: string; sourceDocumentRef?: string }) =>
      inventoryApi.valueBatch(data.batchId, {
        unitCostPrice: data.unitCostPrice,
        notes: data.notes,
        sourceDocumentRef: data.sourceDocumentRef,
        branchId: currentBranchId || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory-batches"] });
      setSelectedBatch(null);
      setUnitCostInput("");
      setNotesInput("");
      setDocRefInput("");
      setErrorMessage(null);
    },
    onError: (err: any) => {
      setErrorMessage(err?.response?.data?.message || err?.message || "Failed to submit valuation");
    },
  });

  const handleOpenValuationModal = (batch: any) => {
    setSelectedBatch(batch);
    setUnitCostInput("");
    setNotesInput("");
    setDocRefInput("");
    setErrorMessage(null);
  };

  const handleValuationSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBatch) return;

    const unitCostRupees = parseFloat(unitCostInput);
    if (isNaN(unitCostRupees) || unitCostRupees <= 0) {
      setErrorMessage("Unit cost must be greater than zero.");
      return;
    }

    if (!notesInput.trim()) {
      setErrorMessage("Valuation audit note/reason is required.");
      return;
    }

    valuationMutation.mutate({
      batchId: selectedBatch._id,
      unitCostPrice: unitCostRupees,
      notes: notesInput.trim(),
      sourceDocumentRef: docRefInput.trim() || undefined,
    });
  };

  if (!canView) {
    return (
      <Card className="border-amber-200 bg-amber-50">
        <CardContent className="pt-6 text-center text-amber-800">
          <AlertCircle className="mx-auto h-8 w-8 text-amber-600 mb-2" />
          <p className="font-semibold">Access Restricted</p>
          <p className="text-sm">You do not have permission to view inventory batch subledgers.</p>
        </CardContent>
      </Card>
    );
  }

  const batches = batchData?.data || [];

  return (
    <div className="space-y-6">
      {/* Header Summary */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            Inventory Batch Subledger
          </h1>
          <p className="text-sm text-gray-500">
            FIFO Lot Costing, Physical Balances, and Opening Stock Valuation
          </p>
        </div>

        {/* Filter controls */}
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={filterDomain}
            onChange={(e) => setFilterDomain(e.target.value)}
            className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm focus:border-indigo-500 focus:outline-none"
          >
            <option value="all">All Domains</option>
            <option value="retail">Retail</option>
            <option value="in_house">In-House</option>
          </select>

          <select
            value={filterValuation}
            onChange={(e) => setFilterValuation(e.target.value)}
            className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm focus:border-indigo-500 focus:outline-none"
          >
            <option value="all">All Valuations</option>
            <option value="valued">Valued Lots Only</option>
            <option value="unvalued">Unvalued Lots Only</option>
          </select>
        </div>
      </div>

      {/* Main Table / Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold">Active & Depleted FIFO Batches</CardTitle>
              <CardDescription className="text-xs">
                Lots are consumed in strict receipt order. Valuation status is tracked separately from physical balance.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                FIFO Strict Queuing
              </Badge>
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                Integer Paise Precision
              </Badge>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : isError ? (
            <div className="rounded-md bg-red-50 p-4 text-sm text-red-700">
              Failed to load inventory batches. Please check your network or branch selection.
            </div>
          ) : batches.length === 0 ? (
            <div className="py-12 text-center text-sm text-gray-500">
              <Package className="mx-auto h-10 w-10 text-gray-300 mb-2" />
              No inventory batches found matching current filters.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b bg-gray-50 text-gray-600">
                    <th className="py-2.5 px-3">Batch Number</th>
                    <th className="py-2.5 px-3">Product</th>
                    <th className="py-2.5 px-3">Domain</th>
                    <th className="py-2.5 px-3">Receipt Date</th>
                    <th className="py-2.5 px-3 text-right">Received Qty</th>
                    <th className="py-2.5 px-3 text-right">Remaining Qty</th>
                    <th className="py-2.5 px-3 text-right">Unit Cost</th>
                    <th className="py-2.5 px-3">Valuation Status</th>
                    <th className="py-2.5 px-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {batches.map((batch: any) => {
                    const receivedUnits = (batch.receivedQuantityMilli / 1000).toFixed(3);
                    const remainingUnits = (batch.remainingQuantityMilli / 1000).toFixed(3);
                    const isExhausted = batch.remainingQuantityMilli <= 0;
                    const canValueThisBatch =
                      !batch.isValued &&
                      batch.remainingQuantityMilli > 0 &&
                      canAdjust &&
                      (batch.sourceMovementType === "opening_stock" ||
                        batch.sourceMovementType === "adjustment");

                    return (
                      <tr
                        key={batch._id}
                        className={`hover:bg-gray-50 ${isExhausted ? "opacity-60 bg-gray-50/50" : ""}`}
                      >
                        <td className="py-2.5 px-3 font-mono font-medium text-gray-900">
                          {batch.batchNumber}
                        </td>
                        <td className="py-2.5 px-3 font-medium text-gray-800">
                          {batch.productId?.name || "Product"}
                        </td>
                        <td className="py-2.5 px-3">
                          <Badge
                            variant="secondary"
                            className={
                              batch.stockDomain === "retail" || batch.inventoryDomain === "retail"
                                ? "bg-purple-50 text-purple-700 border-purple-200"
                                : "bg-blue-50 text-blue-700 border-blue-200"
                            }
                          >
                            {batch.stockDomain || batch.inventoryDomain || "general"}
                          </Badge>
                        </td>
                        <td className="py-2.5 px-3 text-gray-500">
                          {new Date(batch.receivedAt).toLocaleDateString()}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono">
                          {receivedUnits} {batch.productId?.stockUnit || "units"}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-semibold">
                          <span className={isExhausted ? "text-gray-400" : "text-gray-900"}>
                            {remainingUnits} {batch.productId?.stockUnit || "units"}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono">
                          {batch.isValued && batch.unitCostPaise !== null ? (
                            `₹${(batch.unitCostPaise / 100).toFixed(2)}`
                          ) : (
                            <span className="text-amber-600 font-semibold italic">Unvalued</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3">
                          {batch.isValued ? (
                            <span className="inline-flex items-center gap-1 text-emerald-700 font-medium bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                              <CheckCircle className="h-3 w-3" /> Valued
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-amber-700 font-medium bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                              <AlertCircle className="h-3 w-3" /> Unvalued Lot
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {canValueThisBatch ? (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 border-indigo-200 bg-indigo-50/50 text-indigo-700 hover:bg-indigo-100"
                              onClick={() => handleOpenValuationModal(batch)}
                            >
                              <DollarSign className="mr-1 h-3 w-3" />
                              Value Lot
                            </Button>
                          ) : !batch.isValued && isExhausted ? (
                            <span className="text-[11px] text-gray-400 italic">Depleted</span>
                          ) : (
                            <span className="text-[11px] text-gray-400">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Valuation Modal Dialog */}
      {selectedBatch && (
        <Dialog
          isOpen={!!selectedBatch}
          onClose={() => setSelectedBatch(null)}
          title={`Value Opening Stock Batch: ${selectedBatch.batchNumber}`}
          maxWidth="lg"
        >
          <div className="p-6">
            <p className="text-xs text-gray-500 mb-4">
              Enter the verified acquisition unit cost for this lot. This cost will be applied only to
              remaining unconsumed units ({ (selectedBatch.remainingQuantityMilli / 1000).toFixed(3) } units) for future COGS recognition.
              Historical depletions prior to this valuation are never retroactively recalculated.
            </p>

            {errorMessage && (
              <div className="mb-4 rounded-md bg-red-50 p-3 text-xs text-red-700 border border-red-200">
                {errorMessage}
              </div>
            )}

            <form onSubmit={handleValuationSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-700">Product & Remaining Stock</label>
                <div className="mt-1 rounded-md bg-gray-50 p-2.5 text-xs text-gray-700 border border-gray-200">
                  <div><strong>{selectedBatch.productId?.name}</strong></div>
                  <div>Remaining Physical Qty: <strong>{(selectedBatch.remainingQuantityMilli / 1000).toFixed(3)} {selectedBatch.productId?.stockUnit}</strong></div>
                </div>
              </div>

              <div>
                <label htmlFor="unitCost" className="text-xs font-semibold text-gray-700">
                  Unit Cost Price (₹) <span className="text-red-500">*</span>
                </label>
                <Input
                  id="unitCost"
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="e.g. 250.00"
                  value={unitCostInput}
                  onChange={(e) => setUnitCostInput(e.target.value)}
                  className="mt-1"
                  required
                />
              </div>

              <div>
                <label htmlFor="notes" className="text-xs font-semibold text-gray-700">
                  Reason & Audit Notes <span className="text-red-500">*</span>
                </label>
                <Textarea
                  id="notes"
                  placeholder="e.g. Verified with opening physical inventory count and supplier invoice"
                  value={notesInput}
                  onChange={(e) => setNotesInput(e.target.value)}
                  className="mt-1 text-xs"
                  required
                />
              </div>

              <div>
                <label htmlFor="docRef" className="text-xs font-semibold text-gray-700">
                  Source Document Reference (Optional)
                </label>
                <Input
                  id="docRef"
                  type="text"
                  placeholder="e.g. INV-2026-OPEN-001"
                  value={docRefInput}
                  onChange={(e) => setDocRefInput(e.target.value)}
                  className="mt-1 text-xs"
                />
              </div>

              <div className="mt-6 flex justify-end gap-2 pt-2 border-t border-gray-100">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setSelectedBatch(null)}
                  disabled={valuationMutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={valuationMutation.isPending}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  {valuationMutation.isPending ? "Valuing..." : "Confirm Valuation"}
                </Button>
              </div>
            </form>
          </div>
        </Dialog>
      )}
    </div>
  );
}
