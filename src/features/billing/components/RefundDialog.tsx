"use client";

import React, { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, RefreshCw, RotateCcw } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency, formatDateTime } from "@/lib/formatters";
import {
  getRefundContext,
  previewRefund,
  createRefundCase,
  settleRefundCase,
  retryRefundReversals,
  type RefundContextResponse,
} from "../api/billing.api";

interface RefundDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoiceId: string;
  branchId?: string;
  onSuccess?: () => void;
}

export function RefundDialog({
  open,
  onOpenChange,
  invoiceId,
  branchId,
  onSuccess,
}: RefundDialogProps) {
  const [context, setContext] = useState<RefundContextResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [refundMode, setRefundMode] = useState<
    "financial_only" | "item_linked"
  >("financial_only");
  const [amountRupees, setAmountRupees] = useState("");
  const [selectedItems, setSelectedItems] = useState<Record<string, number>>(
    {},
  );
  const [refundMethod, setRefundMethod] = useState<
    "cash" | "card" | "upi" | "other"
  >("cash");
  const [reason, setReason] = useState("");
  const [previewData, setPreviewData] = useState<Record<
    string,
    unknown
  > | null>(null);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [retryingId, setRetryingId] = useState<string | null>(null);

  const loadContext = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getRefundContext(invoiceId, branchId);
      const refundablePaise =
        data.refundableBalancePaise ??
        (data as { summary?: { refundableBalancePaise?: number } }).summary
          ?.refundableBalancePaise ??
        0;
      setContext({ ...data, refundableBalancePaise: refundablePaise });
      setAmountRupees(
        refundablePaise > 0 ? (refundablePaise / 100).toFixed(2) : "0",
      );
    } catch {
      toast.error("Failed to load refund context");
    } finally {
      setIsLoading(false);
    }
  }, [invoiceId, branchId]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      if (!cancelled) {
        await loadContext();
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, loadContext]);

  const buildPayload = () => {
    if (refundMode === "financial_only") {
      return {
        refundMode: "financial_only",
        requestedAmountPaise: Math.round(Number(amountRupees || 0) * 100),
        refundMethod,
        reason: reason.trim(),
        branchId,
      };
    }
    const items = Object.entries(selectedItems)
      .filter(([, qty]) => qty > 0)
      .map(([lineId, quantity]) => ({ lineId, quantity }));
    return {
      refundMode: "item_linked",
      items,
      refundMethod,
      reason: reason.trim(),
      branchId,
    };
  };

  const handlePreview = async () => {
    setIsPreviewing(true);
    try {
      const res = await previewRefund(invoiceId, buildPayload(), branchId);
      setPreviewData(res);
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Failed to preview refund",
      );
    } finally {
      setIsPreviewing(false);
    }
  };

  const handleConfirmRefund = async () => {
    setIsSubmitting(true);
    try {
      const createKey = `rf-create-${invoiceId}-${Date.now()}`;
      const created = await createRefundCase(
        invoiceId,
        buildPayload(),
        createKey,
        branchId,
      );
      const refundCaseId = String(created.refundCase?._id || "");
      if (refundCaseId) {
        const settleKey = `rf-settle-${refundCaseId}`;
        await settleRefundCase(
          invoiceId,
          refundCaseId,
          { refundMethod, branchId },
          settleKey,
          branchId,
        );
      }
      toast.success("Refund processed successfully");
      setPreviewData(null);
      setReason("");
      await loadContext();
      onSuccess?.();
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Failed to process refund",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRetryReversals = async (refundCaseId: string) => {
    setRetryingId(refundCaseId);
    try {
      await retryRefundReversals(invoiceId, refundCaseId, branchId);
      toast.success("Domain reversals retried");
      await loadContext();
      onSuccess?.();
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Failed to retry reversals",
      );
    } finally {
      setRetryingId(null);
    }
  };

  return (
    <Dialog
      isOpen={open}
      onClose={() => onOpenChange(false)}
      title="Process Refund"
    >
      <div className="space-y-4 max-h-[80vh] overflow-y-auto p-1">
        {isLoading || !context ? (
          <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            Loading refund details...
          </div>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-2 rounded-lg border p-3 text-xs bg-muted/30">
              <div>
                <div className="text-muted-foreground">Original Payable</div>
                <div className="font-semibold">
                  {formatCurrency(context.originalPayablePaise / 100)}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground">Refundable Balance</div>
                <div className="font-semibold text-primary">
                  {formatCurrency(context.refundableBalancePaise / 100)}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground">Net Retained</div>
                <div className="font-semibold">
                  {formatCurrency(context.netRetainedPaise / 100)}
                </div>
              </div>
            </div>

            {context.refundableBalancePaise > 0 && (
              <div className="space-y-3 rounded-lg border p-3">
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant={
                      refundMode === "financial_only" ? "default" : "outline"
                    }
                    onClick={() => {
                      setRefundMode("financial_only");
                      setPreviewData(null);
                    }}
                  >
                    Financial-only
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={
                      refundMode === "item_linked" ? "default" : "outline"
                    }
                    onClick={() => {
                      setRefundMode("item_linked");
                      setPreviewData(null);
                    }}
                  >
                    Selected invoice items
                  </Button>
                </div>

                {refundMode === "financial_only" ? (
                  <div className="space-y-1">
                    <label className="text-xs font-medium">
                      Refund Amount (₹)
                    </label>
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      max={(context.refundableBalancePaise / 100).toFixed(2)}
                      value={amountRupees}
                      onChange={(e) => {
                        setAmountRupees(e.target.value);
                        setPreviewData(null);
                      }}
                      className="w-full rounded-md border px-3 py-1.5 text-sm"
                    />
                  </div>
                ) : (
                  <div className="space-y-2">
                    {context.refundableLines.map((line) => (
                      <div
                        key={line.lineId}
                        className="flex items-center justify-between text-xs border rounded p-2"
                      >
                        <div>
                          <div className="font-medium">{line.name}</div>
                          <div className="text-muted-foreground">
                            Remaining: {line.remainingQuantity} •{" "}
                            {formatCurrency(line.unitNetPaise / 100)} each
                          </div>
                        </div>
                        <input
                          type="number"
                          min={0}
                          max={line.remainingQuantity}
                          value={selectedItems[line.lineId] || 0}
                          onChange={(e) => {
                            setSelectedItems((prev) => ({
                              ...prev,
                              [line.lineId]: Math.max(
                                0,
                                Math.min(
                                  line.remainingQuantity,
                                  Number(e.target.value) || 0,
                                ),
                              ),
                            }));
                            setPreviewData(null);
                          }}
                          className="w-16 rounded border px-2 py-1 text-right"
                        />
                      </div>
                    ))}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-medium">Refund Method</label>
                    <select
                      value={refundMethod}
                      onChange={(e) =>
                        setRefundMethod(
                          e.target.value as "cash" | "card" | "upi" | "other",
                        )
                      }
                      className="w-full rounded-md border px-2 py-1.5 text-sm"
                    >
                      <option value="cash">Cash</option>
                      <option value="card">Card</option>
                      <option value="upi">UPI</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium">Reason</label>
                    <Textarea
                      rows={1}
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="Reason for refund"
                    />
                  </div>
                </div>

                {previewData && (
                  <div className="rounded-md bg-muted/50 p-2.5 text-xs space-y-1 border">
                    <div className="font-semibold">Refund Preview</div>
                    <div>
                      Refund Amount:{" "}
                      {formatCurrency(
                        Number(previewData.requestedAmountPaise || 0) / 100,
                      )}
                    </div>
                    <div>
                      Remaining Refundable:{" "}
                      {formatCurrency(
                        Number(previewData.remainingRefundablePaise || 0) / 100,
                      )}
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isPreviewing || !reason.trim()}
                    onClick={handlePreview}
                  >
                    {isPreviewing ? "Previewing..." : "Preview Refund"}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    disabled={isSubmitting || !previewData || !reason.trim()}
                    onClick={handleConfirmRefund}
                  >
                    <RotateCcw className="h-3.5 w-3.5 mr-1" />
                    {isSubmitting ? "Processing..." : "Confirm Refund"}
                  </Button>
                </div>
              </div>
            )}

            {context.refundHistory.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs font-semibold">Refund History</div>
                {context.refundHistory.map((rc) => {
                  const canRetry =
                    rc.paymentSettlementStatus === "settled" &&
                    rc.refundMode === "item_linked" &&
                    ["pending", "failed", "partially_completed"].includes(
                      rc.status,
                    );
                  return (
                    <div
                      key={rc._id}
                      className="rounded-lg border p-2.5 text-xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold">
                          {rc.refundNumber} •{" "}
                          {formatCurrency(rc.requestedAmountPaise / 100)}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <Badge variant="outline">
                            Payment: {rc.paymentSettlementStatus}
                          </Badge>
                          <Badge variant="secondary">
                            Reversals: {rc.status}
                          </Badge>
                        </div>
                      </div>
                      <div className="text-muted-foreground">
                        {rc.refundMode === "financial_only"
                          ? "Financial-only"
                          : "Item-linked"}{" "}
                        • {formatDateTime(rc.createdAt)}
                      </div>
                      {canRetry && (
                        <div className="flex justify-end">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={retryingId === rc._id}
                            onClick={() => handleRetryReversals(rc._id)}
                          >
                            <RefreshCw className="h-3 w-3 mr-1" />
                            {retryingId === rc._id
                              ? "Retrying..."
                              : "Retry Reversals"}
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </Dialog>
  );
}
