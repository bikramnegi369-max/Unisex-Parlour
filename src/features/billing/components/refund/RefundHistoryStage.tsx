"use client";

import React from "react";
import { RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDateTime } from "@/lib/formatters";
import type { RefundContextResponse } from "../../api/billing.api";

interface RefundHistoryStageProps {
  refundHistory: RefundContextResponse["refundHistory"];
  retryingId: string | null;
  onRetryReversals: (refundCaseId: string) => void;
}

export function RefundHistoryStage({
  refundHistory,
  retryingId,
  onRetryReversals,
}: RefundHistoryStageProps) {
  if (!refundHistory || refundHistory.length === 0) {
    return (
      <div className="rounded-xl border bg-muted/30 p-8 text-center text-sm text-muted-foreground">
        No refunds have been recorded for this invoice yet.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {refundHistory.map((rc) => {
        const canRetry =
          rc.paymentSettlementStatus === "settled" &&
          rc.refundMode === "item_linked" &&
          ["pending", "failed", "partially_completed"].includes(rc.status);

        return (
          <div
            key={rc._id || rc.id || rc.refundNumber}
            className="rounded-xl border bg-card p-4 text-xs space-y-3"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="font-semibold text-sm">
                  {rc.refundNumber} •{" "}
                  {formatCurrency(rc.requestedAmountPaise / 100)}
                </div>
                <div className="text-muted-foreground">
                  {rc.refundMode === "financial_only"
                    ? "Financial-only"
                    : "Item-linked"}{" "}
                  • {rc.refundMethod.toUpperCase()} •{" "}
                  {formatDateTime(rc.createdAt)}
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <Badge variant="outline">
                  Payment: {rc.paymentSettlementStatus}
                </Badge>
                <Badge variant="secondary">Reversals: {rc.status}</Badge>
              </div>
            </div>

            {rc.reason && (
              <div className="text-muted-foreground border-t pt-2">
                Reason: {rc.reason}
              </div>
            )}

            {canRetry && (
              <div className="flex justify-end border-t pt-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={retryingId === rc._id}
                  onClick={() => onRetryReversals(rc._id)}
                >
                  <RefreshCw className="h-3 w-3 mr-1.5" />
                  {retryingId === rc._id ? "Retrying..." : "Retry Reversals"}
                </Button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
