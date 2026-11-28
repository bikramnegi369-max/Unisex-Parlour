"use client";

import React, { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, RotateCcw } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/formatters";
import {
  getRefundContext,
  previewRefund,
  createRefundCase,
  settleRefundCase,
  retryRefundReversals,
  type RefundContextResponse,
  type RefundPreviewResponse,
} from "../api/billing.api";
import { RefundOverviewStage } from "./refund/RefundOverviewStage";
import { RefundSelectionStage } from "./refund/RefundSelectionStage";
import { RefundReviewStage } from "./refund/RefundReviewStage";
import { RefundHistoryStage } from "./refund/RefundHistoryStage";

type RefundStage = "overview" | "select" | "review" | "history";

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
  const [stage, setStage] = useState<RefundStage>("select");
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
  const [previewData, setPreviewData] = useState<RefundPreviewResponse | null>(
    null,
  );
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmationError, setConfirmationError] = useState<string | null>(
    null,
  );
  const [retryingId, setRetryingId] = useState<string | null>(null);

  const loadContext = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getRefundContext(invoiceId, branchId);
      const refundablePaise = data.summary.refundableBalancePaise ?? 0;
      setContext(data);
      setAmountRupees(
        refundablePaise > 0 ? (refundablePaise / 100).toFixed(2) : "0",
      );
      if (refundablePaise <= 0 && data.refundHistory.length > 0) {
        setStage("history");
      }
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
      setStage("review");
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
    setConfirmationError(null);
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
      setStage("history");
      onSuccess?.();
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Failed to process refund";
      setConfirmationError(msg);
      toast.error(msg);
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

  const stages: Array<{ id: RefundStage; label: string }> = [
    { id: "overview", label: "1. Overview & Benefits" },
    { id: "select", label: "2. Select & Calculate" },
    { id: "review", label: "3. Review" },
    {
      id: "history",
      label: `4. Audit & History (${context?.refundHistory.length || 0})`,
    },
  ];

  return (
    <Dialog
      isOpen={open}
      onClose={() => onOpenChange(false)}
      title={context ? `Refund • ${context.invoiceNumber}` : "Process Refund"}
      className="max-w-4xl w-full"
    >
      <div className="flex flex-col h-dvh sm:h-[78vh] sm:max-h-180 -m-1">
        {/* Fixed Stage Navigation Bar */}
        <div className="shrink-0 border-b px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 bg-muted/20">
          <div className="flex flex-wrap items-center gap-1.5">
            {stages.map((s) => (
              <Button
                key={s.id}
                type="button"
                size="sm"
                variant={stage === s.id ? "default" : "ghost"}
                className="h-7 px-2.5 text-xs"
                onClick={() => setStage(s.id)}
              >
                {s.label}
              </Button>
            ))}
          </div>
          {context && (
            <Badge variant="outline" className="text-xs font-semibold">
              Refundable:{" "}
              {formatCurrency(context.summary.refundableBalancePaise / 100)}
            </Badge>
          )}
        </div>

        {/* Single Primary Scrolling Region */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {confirmationError && (
            <div
              role="alert"
              className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-xs text-destructive"
            >
              {confirmationError}
            </div>
          )}
          {isLoading || !context ? (
            <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Loading refund details...
            </div>
          ) : (
            <>
              {stage === "overview" && (
                <RefundOverviewStage context={context} />
              )}
              {stage === "select" && (
                <RefundSelectionStage
                  context={context}
                  refundMode={refundMode}
                  onChangeMode={(m) => {
                    setRefundMode(m);
                    setPreviewData(null);
                  }}
                  amountRupees={amountRupees}
                  onChangeAmountRupees={(val) => {
                    setAmountRupees(val);
                    setPreviewData(null);
                  }}
                  selectedItems={selectedItems}
                  onChangeSelectedItem={(lineId, qty) => {
                    setSelectedItems((prev) => ({ ...prev, [lineId]: qty }));
                    setPreviewData(null);
                  }}
                  refundMethod={refundMethod}
                  onChangeRefundMethod={setRefundMethod}
                  reason={reason}
                  onChangeReason={setReason}
                />
              )}
              {stage === "review" && (
                <RefundReviewStage
                  previewData={previewData}
                  refundMethod={refundMethod}
                  reason={reason}
                />
              )}
              {stage === "history" && (
                <RefundHistoryStage
                  refundHistory={context.refundHistory}
                  retryingId={retryingId}
                  onRetryReversals={handleRetryReversals}
                />
              )}
            </>
          )}
        </div>

        {/* Fixed Persistent Action Footer */}
        <div className="shrink-0 border-t bg-muted/20 px-4 py-3 flex items-center justify-between gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
          <div className="flex items-center gap-2">
            {context && context.summary.refundableBalancePaise > 0 && (
              <>
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
                  <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                  {isSubmitting ? "Processing..." : "Confirm Refund"}
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </Dialog>
  );
}
