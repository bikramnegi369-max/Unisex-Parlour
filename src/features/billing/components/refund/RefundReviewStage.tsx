"use client";

import React from "react";
import { toast } from "sonner";
import { Copy } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/formatters";
import type { RefundPreviewResponse } from "../../api/billing.api";

interface RefundReviewStageProps {
  previewData: RefundPreviewResponse | null;
  refundMethod: string;
  reason: string;
}

export function RefundReviewStage({
  previewData,
  refundMethod,
  reason,
}: RefundReviewStageProps) {
  if (!previewData) {
    return (
      <div className="rounded-xl border bg-muted/30 p-8 text-center text-sm text-muted-foreground">
        Click <strong>Preview Refund</strong> in the footer to calculate the
        exact refund breakdown and operational consequences.
      </div>
    );
  }

  return (
    <div className="space-y-5 text-xs">
      <div className="rounded-xl border bg-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Refund Preview</h3>
          <Badge variant="outline" className="capitalize">
            {previewData.refundMode.replace("_", "-")} • {refundMethod}
          </Badge>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 border-t pt-3">
          <div>
            <div className="text-muted-foreground">Refund Amount</div>
            <div className="mt-1 text-base font-bold text-primary">
              {formatCurrency(
                Number(previewData.totalRefundAmountPaise || 0) / 100,
              )}
            </div>
          </div>
          <div>
            <div className="text-muted-foreground">Remaining Refundable</div>
            <div className="mt-1 text-base font-semibold">
              {formatCurrency(
                Number(previewData.remainingRefundableBalancePaise || 0) / 100,
              )}
            </div>
          </div>
          <div className="col-span-2 sm:col-span-1">
            <div className="text-muted-foreground">Reason</div>
            <div className="mt-1 font-medium truncate">{reason || "—"}</div>
          </div>
        </div>
      </div>

      {previewData.allocations.length > 0 && (
        <div className="rounded-xl border bg-card p-4 space-y-2">
          <div className="font-semibold text-sm">Line-by-Line Allocations</div>
          <div className="divide-y">
            {previewData.allocations.map((a) => (
              <div
                key={a.lineId}
                className="flex items-center justify-between py-2"
              >
                <span>
                  {a.name} (x{a.quantity})
                </span>
                <span className="font-semibold">
                  {formatCurrency(a.allocatedAmountPaise / 100)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {previewData.consequences.length > 0 && (
        <div className="rounded-xl border bg-card p-4 space-y-2">
          <div className="font-semibold text-sm">Operational Consequences</div>
          <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
            {previewData.consequences.map((c, idx) => (
              <li key={idx}>{c}</li>
            ))}
          </ul>
        </div>
      )}

      {previewData.warnings.length > 0 && (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 space-y-1.5 text-amber-800 dark:text-amber-300">
          <div className="font-semibold">Warnings</div>
          <ul className="list-disc pl-5 space-y-0.5">
            {previewData.warnings.map((w, idx) => (
              <li key={idx}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      {previewData.customerExplanation && (
        <div className="rounded-xl border bg-card p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-sm">Customer Explanation</span>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 px-2.5 text-xs gap-1"
              onClick={() => {
                navigator.clipboard?.writeText(
                  previewData.customerExplanation || "",
                );
                toast.success("Customer explanation copied");
              }}
            >
              <Copy className="h-3 w-3" />
              <span>Copy</span>
            </Button>
          </div>
          <p className="text-muted-foreground leading-relaxed bg-muted/30 rounded-lg p-3 border">
            {previewData.customerExplanation}
          </p>
        </div>
      )}
    </div>
  );
}
