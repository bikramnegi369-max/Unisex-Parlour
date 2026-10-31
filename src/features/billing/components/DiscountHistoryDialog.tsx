"use client";

import React from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDateTime } from "@/lib/formatters";
import { useInvoiceDiscountHistory } from "../hooks/useBillingQueries";
import type { DiscountHistoryEntry } from "../types/billing.types";
import { History, ArrowRight, User, Clock, Loader2, Info } from "lucide-react";

interface DiscountHistoryDialogProps {
  isOpen: boolean;
  onClose: () => void;
  invoiceId: string;
  invoiceNumber: string;
  branchId?: string;
}

export function DiscountHistoryDialog({
  isOpen,
  onClose,
  invoiceId,
  invoiceNumber,
  branchId,
}: DiscountHistoryDialogProps) {
  const { data: history = [], isLoading, isError } = useInvoiceDiscountHistory(
    isOpen ? invoiceId : undefined,
    branchId
  );

  const getActionBadge = (action: DiscountHistoryEntry["action"]) => {
    switch (action) {
      case "applied":
        return <Badge variant="success">Applied</Badge>;
      case "modified":
        return <Badge variant="warning">Modified</Badge>;
      case "removed":
        return <Badge variant="destructive">Removed</Badge>;
      default:
        return <Badge variant="outline">{action}</Badge>;
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={`Discount Audit Trail — ${invoiceNumber}`}
      maxWidth="2xl"
    >
      <div className="space-y-4 pt-2">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-10 space-y-2 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <p className="text-xs">Loading discount history...</p>
          </div>
        ) : isError ? (
          <div className="p-4 bg-destructive/10 text-destructive rounded-xl text-xs flex items-center gap-2">
            <Info className="h-4 w-4" />
            <span>Failed to load discount audit history.</span>
          </div>
        ) : history.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground space-y-2">
            <History className="h-8 w-8 mx-auto opacity-40" />
            <p className="text-xs">No discount actions recorded on this invoice yet.</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
            {history.map((entry, idx) => {
              const actorName =
                typeof entry.performedBy === "object" && entry.performedBy !== null
                  ? entry.performedBy.name
                  : String(entry.performedBy || "Staff");

              const discountLabel =
                entry.name ||
                (entry.discountLevel === "selected_lines"
                  ? "Selected Services Discount"
                  : entry.discountLevel === "line"
                  ? "Line Item Discount"
                  : "Invoice Discount");

              const affectedServices = entry.allocations && entry.allocations.length > 0
                ? entry.allocations.map((a) => a.lineName || "Service").join(", ")
                : entry.lineName || undefined;

              return (
                <div
                  key={entry.id || idx}
                  className="p-3.5 border border-border/80 rounded-xl bg-card text-xs space-y-2.5 shadow-2xs"
                >
                  {/* Header: Action, Target & Time */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-2">
                    <div className="flex items-center gap-2">
                      {getActionBadge(entry.action)}
                      <span className="font-bold text-foreground">{discountLabel}</span>
                      <span className="text-[10px] text-muted-foreground uppercase bg-muted/60 px-1.5 py-0.5 rounded">
                        {entry.discountLevel.replace("_", " ")} • {entry.discountType}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {actorName}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDateTime(entry.performedAt)}
                      </span>
                    </div>
                  </div>

                  {/* Affected Services if multi-line or line */}
                  {affectedServices && (
                    <div className="text-[11px] bg-muted/40 p-2 rounded-lg flex items-start gap-1.5">
                      <span className="font-semibold text-muted-foreground shrink-0">Affected Services:</span>
                      <span className="text-foreground font-medium">{affectedServices}</span>
                    </div>
                  )}

                  {/* Discount details & Reason */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-[11px] text-muted-foreground block">
                        Value & Calculated Deduction:
                      </span>
                      <span className="font-semibold text-foreground">
                        {entry.discountType === "percentage"
                          ? `${entry.enteredValue}% (${formatCurrency(entry.calculatedDiscount)})`
                          : formatCurrency(entry.calculatedDiscount)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[11px] text-muted-foreground block">
                        Mandatory Reason:
                      </span>
                      <p className="font-medium text-foreground italic bg-muted/30 p-1.5 rounded">
                        &quot;{entry.reason}&quot;
                      </p>
                    </div>
                  </div>

                  {/* Financial Snapshots Comparison if available */}
                  {(entry.beforeSnapshot || entry.afterSnapshot) && (
                    <div className="pt-2 border-t border-border/60 text-[11px] space-y-1">
                      <span className="font-semibold text-muted-foreground">
                        Financial Impact:
                      </span>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-muted/30 p-2 rounded-lg">
                        <div>
                          <span className="text-muted-foreground block">Total Discount</span>
                          <span className="font-medium">
                            {entry.beforeSnapshot && entry.afterSnapshot ? (
                              <span className="flex items-center gap-1">
                                {formatCurrency(entry.beforeSnapshot.discountTotal)}
                                <ArrowRight className="h-2.5 w-2.5 text-muted-foreground" />
                                <strong className="text-primary font-bold">
                                  {formatCurrency(entry.afterSnapshot.discountTotal)}
                                </strong>
                              </span>
                            ) : (
                              formatCurrency(
                                (entry.afterSnapshot || entry.beforeSnapshot)?.discountTotal ?? 0
                              )
                            )}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block">Payable Amount</span>
                          <span className="font-medium">
                            {entry.beforeSnapshot && entry.afterSnapshot ? (
                              <span className="flex items-center gap-1">
                                {formatCurrency(entry.beforeSnapshot.payableAmount)}
                                <ArrowRight className="h-2.5 w-2.5 text-muted-foreground" />
                                <strong className="text-foreground font-bold">
                                  {formatCurrency(entry.afterSnapshot.payableAmount)}
                                </strong>
                              </span>
                            ) : (
                              formatCurrency(
                                (entry.afterSnapshot || entry.beforeSnapshot)?.payableAmount ?? 0
                              )
                            )}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block">Amount Due</span>
                          <span className="font-medium">
                            {entry.beforeSnapshot && entry.afterSnapshot ? (
                              <span className="flex items-center gap-1">
                                {formatCurrency(entry.beforeSnapshot.amountDue)}
                                <ArrowRight className="h-2.5 w-2.5 text-muted-foreground" />
                                <strong className="text-foreground font-bold">
                                  {formatCurrency(entry.afterSnapshot.amountDue)}
                                </strong>
                              </span>
                            ) : (
                              formatCurrency(
                                (entry.afterSnapshot || entry.beforeSnapshot)?.amountDue ?? 0
                              )
                            )}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block">Covered By Sub</span>
                          <span className="font-medium text-emerald-600 dark:text-emerald-400">
                            {formatCurrency(
                              (entry.afterSnapshot || entry.beforeSnapshot)
                                ?.subscriptionCoveredAmount ?? 0
                            )}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div className="flex justify-end pt-3 border-t border-border/80">
          <Button variant="ghost" size="sm" onClick={onClose} className="text-xs h-8">
            Close
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

