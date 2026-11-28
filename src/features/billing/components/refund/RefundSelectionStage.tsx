"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency } from "@/lib/formatters";
import type { RefundContextResponse } from "../../api/billing.api";

interface RefundSelectionStageProps {
  context: RefundContextResponse;
  refundMode: "financial_only" | "item_linked";
  onChangeMode: (mode: "financial_only" | "item_linked") => void;
  amountRupees: string;
  onChangeAmountRupees: (val: string) => void;
  selectedItems: Record<string, number>;
  onChangeSelectedItem: (lineId: string, qty: number) => void;
  refundMethod: "cash" | "card" | "upi" | "other";
  onChangeRefundMethod: (method: "cash" | "card" | "upi" | "other") => void;
  reason: string;
  onChangeReason: (val: string) => void;
}

export function RefundSelectionStage({
  context,
  refundMode,
  onChangeMode,
  amountRupees,
  onChangeAmountRupees,
  selectedItems,
  onChangeSelectedItem,
  refundMethod,
  onChangeRefundMethod,
  reason,
  onChangeReason,
}: RefundSelectionStageProps) {
  const { refundableBalancePaise } = context.summary;

  if (refundableBalancePaise <= 0) {
    return (
      <div className="rounded-xl border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
        No refundable balance remains on this invoice.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant={refundMode === "financial_only" ? "default" : "outline"}
          onClick={() => onChangeMode("financial_only")}
        >
          Financial-only
        </Button>
        <Button
          type="button"
          size="sm"
          variant={refundMode === "item_linked" ? "default" : "outline"}
          onClick={() => onChangeMode("item_linked")}
        >
          Selected invoice items
        </Button>
      </div>

      {refundMode === "financial_only" ? (
        <div className="rounded-xl border bg-card p-4 space-y-2">
          <label className="text-xs font-medium text-foreground">
            Refund Amount (₹) — Max{" "}
            {formatCurrency(refundableBalancePaise / 100)}
          </label>
          <input
            type="number"
            min="0.01"
            step="0.01"
            max={(refundableBalancePaise / 100).toFixed(2)}
            value={amountRupees}
            onChange={(e) => onChangeAmountRupees(e.target.value)}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
          />
          <p className="text-[11px] text-muted-foreground">
            Adjusts financial records only and does not cancel appointments,
            restock inventory, or revoke entitlements.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border bg-card overflow-hidden">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-muted/40 border-b text-muted-foreground font-semibold">
                <th className="px-4 py-2.5">Item</th>
                <th className="px-4 py-2.5">Type</th>
                <th className="px-4 py-2.5 text-right">Net Refundable</th>
                <th className="px-4 py-2.5 text-right">Qty</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {context.refundableItems.map((line) => (
                <tr key={line.lineId} className="hover:bg-muted/20">
                  <td className="px-4 py-2.5">
                    <div className="font-medium text-foreground">
                      {line.name}
                    </div>
                    {!line.isEligible && line.ineligibilityReason && (
                      <div className="text-[11px] text-rose-600">
                        Restricted: {line.ineligibilityReason}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    <Badge variant="outline" className="capitalize text-[10px]">
                      {line.lineType}
                    </Badge>
                  </td>
                  <td className="px-4 py-2.5 text-right font-medium">
                    {formatCurrency(line.maxRefundablePaise / 100)}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <input
                      type="number"
                      min={0}
                      max={line.remainingQuantity}
                      disabled={!line.isEligible}
                      value={selectedItems[line.lineId] || 0}
                      onChange={(e) =>
                        onChangeSelectedItem(
                          line.lineId,
                          Math.max(
                            0,
                            Math.min(
                              line.remainingQuantity,
                              Number(e.target.value) || 0,
                            ),
                          ),
                        )
                      }
                      className="w-16 rounded border bg-background px-2 py-1 text-right disabled:opacity-50"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-xl border bg-card p-4">
        <div className="space-y-1.5">
          <label className="text-xs font-medium">Refund Method</label>
          <select
            value={refundMethod}
            onChange={(e) =>
              onChangeRefundMethod(
                e.target.value as "cash" | "card" | "upi" | "other",
              )
            }
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
          >
            <option value="cash">Cash</option>
            <option value="card">Card</option>
            <option value="upi">UPI</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium">Reason</label>
          <Textarea
            rows={2}
            value={reason}
            onChange={(e) => onChangeReason(e.target.value)}
            placeholder="Reason for refund"
          />
        </div>
      </div>
    </div>
  );
}
