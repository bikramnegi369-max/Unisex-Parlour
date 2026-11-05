"use client";

import React, { useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDateTime } from "@/lib/formatters";
import { useInvoiceDiscountHistory } from "../hooks/useBillingQueries";
import type { DiscountHistoryEntry } from "../types/billing.types";
import {
  History,
  ArrowRight,
  User,
  Clock,
  Loader2,
  AlertCircle,
  Scissors,
  Receipt,
  Layers,
  FileText,
  TrendingDown,
} from "lucide-react";

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
  const { data, isLoading, isError, refetch } = useInvoiceDiscountHistory(
    isOpen ? invoiceId : undefined,
    branchId,
  );
  const history: DiscountHistoryEntry[] = data || [];

  const [activeFilter, setActiveFilter] = useState<
    "all" | "applied" | "modified" | "removed"
  >("all");

  const filteredHistory = history.filter((entry) => {
    if (activeFilter === "all") return true;
    return entry.action === activeFilter;
  });

  const getActionBadge = (action: DiscountHistoryEntry["action"]) => {
    switch (action) {
      case "applied":
        return (
          <Badge
            variant="outline"
            className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 font-bold uppercase tracking-wider text-[10px] px-2 py-0.5"
          >
            Applied
          </Badge>
        );
      case "modified":
        return (
          <Badge
            variant="outline"
            className="bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30 font-bold uppercase tracking-wider text-[10px] px-2 py-0.5"
          >
            Modified
          </Badge>
        );
      case "removed":
        return (
          <Badge
            variant="outline"
            className="bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30 font-bold uppercase tracking-wider text-[10px] px-2 py-0.5"
          >
            Removed
          </Badge>
        );
      default:
        return (
          <Badge
            variant="outline"
            className="text-[10px] uppercase font-bold px-2 py-0.5"
          >
            {action}
          </Badge>
        );
    }
  };

  const getLevelIcon = (level: DiscountHistoryEntry["discountLevel"]) => {
    switch (level) {
      case "line":
        return (
          <Scissors className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        );
      case "selected_lines":
        return (
          <Layers className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        );
      case "invoice":
      default:
        return (
          <Receipt className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        );
    }
  };

  const getLevelLabel = (level: DiscountHistoryEntry["discountLevel"]) => {
    switch (level) {
      case "line":
        return "Single Line Discount";
      case "selected_lines":
        return "Selected Services Discount";
      case "invoice":
      default:
        return "Entire Invoice Discount";
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={`Discount Audit Trail — ${invoiceNumber}`}
      maxWidth="3xl"
      className="p-0 overflow-hidden bg-card border-border/80 shadow-2xl rounded-2xl flex flex-col max-h-[88vh]"
    >
      <div className="flex flex-col flex-1 min-h-0">
        {/* Fixed Subheader context & summary banner */}
        <div className="px-6 py-3.5 border-b border-border/60 bg-muted/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <History className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs font-semibold text-foreground">
                Immutable Discount Audit Log
              </p>
              <p className="text-[11px] text-muted-foreground">
                Chronological record of all discount applications,
                modifications, and removals.
              </p>
            </div>
          </div>

          {/* Quick filter pill buttons */}
          {!isLoading && !isError && history.length > 0 && (
            <div className="flex items-center gap-1 bg-background/80 p-1 rounded-lg border border-border/60 self-start sm:self-center shrink-0">
              {(["all", "applied", "modified", "removed"] as const).map(
                (filter) => {
                  const count =
                    filter === "all"
                      ? history.length
                      : history.filter((h) => h.action === filter).length;
                  if (filter !== "all" && count === 0) return null;
                  const isSelected = activeFilter === filter;
                  return (
                    <button
                      key={filter}
                      type="button"
                      onClick={() => setActiveFilter(filter)}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all capitalize cursor-pointer ${
                        isSelected
                          ? "bg-primary text-primary-foreground shadow-2xs font-bold"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                      }`}
                    >
                      {filter} ({count})
                    </button>
                  );
                },
              )}
            </div>
          )}
        </div>

        {/* Single Scrollable Content Body */}
        <div className="px-6 py-4 overflow-y-auto space-y-3.5 flex-1 min-h-0">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 space-y-3 text-muted-foreground">
              <Loader2 className="h-7 w-7 animate-spin text-primary" />
              <p className="text-xs font-medium">Loading discount history...</p>
            </div>
          ) : isError ? (
            <div className="p-4 bg-destructive/10 border border-destructive/20 text-destructive rounded-xl text-xs flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>Failed to load discount audit history.</span>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                className="h-7 text-xs border-destructive/30 hover:bg-destructive/10 text-destructive"
              >
                Retry
              </Button>
            </div>
          ) : history.length === 0 ? (
            <div className="py-14 text-center text-muted-foreground space-y-2.5">
              <div className="h-12 w-12 rounded-full bg-muted/60 flex items-center justify-center mx-auto text-muted-foreground/60">
                <History className="h-6 w-6" />
              </div>
              <p className="text-xs font-semibold text-foreground">
                No discount actions recorded on this invoice yet.
              </p>
              <p className="text-[11px] max-w-sm mx-auto text-muted-foreground">
                Any applied, adjusted, or deleted invoice discounts will be
                permanently recorded here with author, timestamp, and financial
                impact snapshots.
              </p>
            </div>
          ) : filteredHistory.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground text-xs">
              No {activeFilter} discounts found.{" "}
              <button
                type="button"
                onClick={() => setActiveFilter("all")}
                className="text-primary font-medium hover:underline cursor-pointer"
              >
                Reset filter
              </button>
            </div>
          ) : (
            <div className="space-y-3.5">
              {filteredHistory.map((entry, idx) => {
                const actorName =
                  typeof entry.performedBy === "object" &&
                  entry.performedBy !== null
                    ? entry.performedBy.name
                    : String(entry.performedBy || "Staff");

                const actorEmail =
                  typeof entry.performedBy === "object" &&
                  entry.performedBy !== null
                    ? entry.performedBy.email
                    : undefined;

                const discountLabel =
                  entry.name ||
                  (entry.discountLevel === "selected_lines"
                    ? "Selected Services Discount"
                    : entry.discountLevel === "line"
                      ? "Line Item Discount"
                      : "Invoice Discount");

                const hasAllocations = Boolean(
                  entry.allocations && entry.allocations.length > 0,
                );

                return (
                  <div
                    key={entry.id || idx}
                    className="p-4 border border-border/80 rounded-xl bg-card space-y-3.5 shadow-2xs hover:border-primary/40 transition-colors"
                  >
                    {/* Top Row: Action Badge, Title, Scope & Actor/Timestamp */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-border/60 pb-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        {getActionBadge(entry.action)}
                        <span className="font-bold text-sm text-foreground">
                          {discountLabel}
                        </span>
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-muted-foreground bg-muted/70 px-2 py-0.5 rounded-md border border-border/60">
                          {getLevelIcon(entry.discountLevel)}
                          <span>{getLevelLabel(entry.discountLevel)}</span>
                          <span>•</span>
                          <span className="capitalize">
                            {entry.discountType}
                          </span>
                        </span>
                      </div>

                      <div className="flex items-center gap-2.5 text-xs text-muted-foreground shrink-0 flex-wrap">
                        <span className="flex items-center gap-1 font-medium text-foreground/80">
                          <User className="h-3.5 w-3.5 text-primary" />
                          <span>{actorName}</span>
                          {actorEmail && (
                            <span className="text-[10px] text-muted-foreground">
                              ({actorEmail})
                            </span>
                          )}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1 text-[11px]">
                          <Clock className="h-3 w-3" />
                          {formatDateTime(entry.performedAt)}
                        </span>
                      </div>
                    </div>

                    {/* Discount Value & Mandatory Reason */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-muted/20 p-3 rounded-xl border border-border/50">
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                          Deduction & Nominal Value
                        </span>
                        <div className="flex items-baseline gap-2">
                          <span className="font-extrabold text-sm text-foreground">
                            {formatCurrency(entry.calculatedDiscount)}
                          </span>
                          {entry.discountType === "percentage" && (
                            <span className="text-xs text-muted-foreground font-semibold">
                              ({entry.enteredValue}%)
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-muted-foreground block">
                          Calculated discount reduction
                        </span>
                      </div>

                      <div className="md:col-span-2 space-y-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                          <FileText className="h-3 w-3 text-primary" />
                          <span>Mandatory Business Reason</span>
                        </span>
                        <p className="text-xs text-foreground font-medium italic bg-background/80 p-2 rounded-lg border border-border/60 leading-relaxed">
                          &quot;{entry.reason}&quot;
                        </p>
                      </div>
                    </div>

                    {/* Multi-line or Line Item Allocations */}
                    {hasAllocations &&
                      entry.allocations &&
                      entry.allocations.length > 0 && (
                        <div className="space-y-1.5 pt-0.5">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                            <Scissors className="h-3 w-3" />
                            <span>
                              Affected Service Allocations (
                              {entry.allocations.length})
                            </span>
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {entry.allocations.map((alloc, aIdx) => (
                              <div
                                key={alloc.lineId || aIdx}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-muted/60 border border-border text-xs"
                              >
                                <span className="font-medium text-foreground">
                                  {alloc.lineName || "Service Line"}
                                </span>
                                <span className="font-mono text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                                  -{formatCurrency(alloc.allocatedAmount)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                    {!hasAllocations && entry.lineName && (
                      <div className="text-xs bg-muted/40 px-3 py-1.5 rounded-lg flex items-center gap-2">
                        <span className="font-semibold text-muted-foreground text-[11px]">
                          Applied to Line:
                        </span>
                        <span className="font-semibold text-foreground">
                          {entry.lineName}
                        </span>
                      </div>
                    )}

                    {/* Financial Snapshot Comparison (Before vs After) */}
                    {(entry.beforeSnapshot || entry.afterSnapshot) && (
                      <div className="pt-2 border-t border-border/60 space-y-2">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                            <TrendingDown className="h-3.5 w-3.5 text-primary" />
                            <span>Financial State Transition</span>
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            Before → After Deduction Snapshot
                          </span>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                          {/* Total Discount Impact */}
                          <div className="p-2.5 bg-muted/30 border border-border/60 rounded-xl space-y-1">
                            <span className="text-[10px] text-muted-foreground font-semibold block uppercase">
                              Total Discounts
                            </span>
                            <div className="text-xs">
                              {entry.beforeSnapshot && entry.afterSnapshot ? (
                                <div className="flex items-center gap-1.5 font-bold flex-wrap">
                                  <span className="line-through text-muted-foreground font-normal">
                                    {formatCurrency(
                                      entry.beforeSnapshot.discountTotal,
                                    )}
                                  </span>
                                  <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                                  <span className="text-primary font-bold">
                                    {formatCurrency(
                                      entry.afterSnapshot.discountTotal,
                                    )}
                                  </span>
                                </div>
                              ) : (
                                <span className="font-bold text-foreground">
                                  {formatCurrency(
                                    (
                                      entry.afterSnapshot ||
                                      entry.beforeSnapshot
                                    )?.discountTotal ?? 0,
                                  )}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Customer Payable Amount */}
                          <div className="p-2.5 bg-muted/30 border border-border/60 rounded-xl space-y-1">
                            <span className="text-[10px] text-muted-foreground font-semibold block uppercase">
                              Payable Amount
                            </span>
                            <div className="text-xs">
                              {entry.beforeSnapshot && entry.afterSnapshot ? (
                                <div className="flex items-center gap-1.5 font-bold flex-wrap">
                                  <span className="text-muted-foreground font-normal">
                                    {formatCurrency(
                                      entry.beforeSnapshot.payableAmount,
                                    )}
                                  </span>
                                  <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                                  <span className="text-foreground font-extrabold">
                                    {formatCurrency(
                                      entry.afterSnapshot.payableAmount,
                                    )}
                                  </span>
                                </div>
                              ) : (
                                <span className="font-bold text-foreground">
                                  {formatCurrency(
                                    (
                                      entry.afterSnapshot ||
                                      entry.beforeSnapshot
                                    )?.payableAmount ?? 0,
                                  )}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Balance Due */}
                          <div className="p-2.5 bg-muted/30 border border-border/60 rounded-xl space-y-1">
                            <span className="text-[10px] text-muted-foreground font-semibold block uppercase">
                              Amount Due
                            </span>
                            <div className="text-xs">
                              {entry.beforeSnapshot && entry.afterSnapshot ? (
                                <div className="flex items-center gap-1.5 font-bold flex-wrap">
                                  <span className="text-muted-foreground font-normal">
                                    {formatCurrency(
                                      entry.beforeSnapshot.amountDue,
                                    )}
                                  </span>
                                  <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                                  <span className="text-foreground font-extrabold">
                                    {formatCurrency(
                                      entry.afterSnapshot.amountDue,
                                    )}
                                  </span>
                                </div>
                              ) : (
                                <span className="font-bold text-foreground">
                                  {formatCurrency(
                                    (
                                      entry.afterSnapshot ||
                                      entry.beforeSnapshot
                                    )?.amountDue ?? 0,
                                  )}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Subscription Covered Amount */}
                          <div className="p-2.5 bg-muted/30 border border-border/60 rounded-xl space-y-1">
                            <span className="text-[10px] text-muted-foreground font-semibold block uppercase">
                              Sub Covered
                            </span>
                            <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                              {formatCurrency(
                                (entry.afterSnapshot || entry.beforeSnapshot)
                                  ?.subscriptionCoveredAmount ?? 0,
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Fixed Modal Footer */}
        <div className="px-6 py-3 border-t border-border/80 bg-muted/20 flex items-center justify-between text-xs shrink-0">
          <p className="text-[11px] text-muted-foreground">
            {history.length > 0 ? (
              <span>
                Showing {filteredHistory.length} of {history.length} audited
                actions
              </span>
            ) : null}
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            className="text-xs h-8 px-4 cursor-pointer font-semibold"
          >
            Close
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
