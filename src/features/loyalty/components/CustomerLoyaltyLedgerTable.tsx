"use client";

import React, { useState } from "react";
import { formatDateTime } from "@/lib/formatters";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, History } from "lucide-react";
import { useCustomerLoyaltyLedger } from "../hooks/useLoyaltyQueries";
import type { LoyaltyLedgerTransaction, LoyaltyTransactionType } from "../types/loyalty.types";
import { LOYALTY_CONFIG } from "../config/loyalty.config";

interface CustomerLoyaltyLedgerTableProps {
  customerId: string;
}

const getTransactionBadge = (type: LoyaltyTransactionType) => {
  switch (type) {
    case "EARNED":
      return <Badge variant="success">Earned</Badge>;
    case "REDEEMED":
      return <Badge variant="outline" className="border-primary/30 text-primary">Redeemed</Badge>;
    case "ADJUSTED":
      return <Badge variant="outline" className="border-blue-500/30 text-blue-600 dark:text-blue-400">Manual Adjustment</Badge>;
    case "EARNING_REVERSED":
      return <Badge variant="destructive">Earning Reversed</Badge>;
    case "REDEMPTION_RESTORED":
      return <Badge variant="outline" className="border-emerald-500/30 text-emerald-600 dark:text-emerald-400">Redemption Restored</Badge>;
    default:
      return <Badge variant="muted">{type}</Badge>;
  }
};

export function CustomerLoyaltyLedgerTable({
  customerId,
}: CustomerLoyaltyLedgerTableProps) {
  const [page, setPage] = useState(1);
  const limit = LOYALTY_CONFIG.defaults.pageSize;

  const { data, isLoading, isError, refetch } = useCustomerLoyaltyLedger(
    customerId,
    { page, limit }
  );

  const transactions = data?.data || [];
  const meta = data?.meta;
  const totalPages = Number(meta?.totalPages) || 1;

  if (isLoading) {
    return (
      <div className="space-y-3 py-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-12 bg-muted/40 animate-pulse rounded-lg" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-6 text-center text-xs space-y-2 border border-destructive/20 bg-destructive/5 rounded-xl">
        <p className="text-destructive font-semibold">Failed to load loyalty ledger transactions.</p>
        <Button size="sm" variant="outline" onClick={() => refetch()} className="text-xs">
          Try Again
        </Button>
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center border border-dashed border-border rounded-xl">
        <div className="p-3 rounded-full bg-muted/60 text-muted-foreground mb-2">
          <History className="h-5 w-5" />
        </div>
        <p className="text-xs font-semibold text-foreground">
          {LOYALTY_CONFIG.labels.emptyLedgerTitle}
        </p>
        <p className="text-[11px] text-muted-foreground mt-1 max-w-sm">
          {LOYALTY_CONFIG.labels.emptyLedgerDescription}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="border border-border/80 rounded-xl overflow-hidden divide-y divide-border/60 bg-card">
        {/* Table Header */}
        <div className="grid grid-cols-12 px-4 py-2.5 bg-muted/40 text-[11px] font-semibold text-muted-foreground items-center">
          <span className="col-span-3 sm:col-span-2">Date & Time</span>
          <span className="col-span-2 sm:col-span-2">Type</span>
          <span className="col-span-3 sm:col-span-2 text-right">Points Delta</span>
          <span className="col-span-4 sm:col-span-2 text-right">Balance</span>
          <span className="hidden sm:block sm:col-span-2 text-left pl-3">Branch & Staff</span>
          <span className="hidden sm:block sm:col-span-2 text-right">Reference</span>
        </div>

        {/* Transaction Rows */}
        {transactions.map((tx: LoyaltyLedgerTransaction) => {
          const isPositive = tx.pointsDelta > 0;
          const invoiceNum = tx.invoice?.invoiceNumber || (tx.referenceId ? `#INV-${tx.referenceId.slice(-6).toUpperCase()}` : null);
          const paymentNum = tx.payment?.paymentNumber;
          const branchName = tx.branch?.name;
          const staffName = tx.actor?.name || (typeof tx.performedBy === "object" && tx.performedBy?.name ? tx.performedBy.name : null);

          return (
            <div
              key={tx.id}
              className="grid grid-cols-12 px-4 py-3 text-xs items-center gap-1 sm:gap-2 hover:bg-muted/20 transition-colors"
            >
              {/* Date & Time */}
              <div className="col-span-3 sm:col-span-2 text-muted-foreground">
                <span className="text-[11px] block text-foreground font-medium">
                  {formatDateTime(tx.createdAt)}
                </span>
                {tx.rateSnapshot?.eligibleSpendAmount !== undefined && tx.rateSnapshot?.eligibleSpendAmount !== null && (
                  <span className="text-[10px] text-muted-foreground block">
                    Spend: ₹{tx.rateSnapshot.eligibleSpendAmount.toLocaleString()}
                  </span>
                )}
              </div>

              {/* Type Badge */}
              <div className="col-span-2 sm:col-span-2">
                {getTransactionBadge(tx.type)}
              </div>

              {/* Points Delta */}
              <div className="col-span-3 sm:col-span-2 text-right">
                <span
                  className={`font-bold block ${
                    isPositive
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-rose-600 dark:text-rose-400"
                  }`}
                >
                  <span>{isPositive ? `+${tx.pointsDelta}` : tx.pointsDelta}</span>
                  <span className="text-[10px] font-normal text-muted-foreground ml-1">pts</span>
                </span>
                {tx.rateSnapshot?.earnPointsPerUnit && tx.rateSnapshot?.earnThresholdAmount && (
                  <span className="text-[10px] text-muted-foreground block font-mono">
                    {tx.rateSnapshot.earnPointsPerUnit}pt/₹{tx.rateSnapshot.earnThresholdAmount}
                  </span>
                )}
              </div>

              {/* Balance Progression (Before -> After) */}
              <div className="col-span-4 sm:col-span-2 text-right">
                <span className="font-semibold text-foreground block">
                  {tx.balanceAfter} pts
                </span>
                {tx.balanceBefore !== undefined && (
                  <span className="text-[10px] text-muted-foreground block font-mono">
                    was {tx.balanceBefore} pts
                  </span>
                )}
              </div>

              {/* Branch & Staff */}
              <div className="hidden sm:block sm:col-span-2 text-left pl-3 text-[11px] truncate">
                {branchName ? (
                  <span className="block font-medium text-foreground truncate" title={branchName}>
                    {branchName}
                  </span>
                ) : (
                  <span className="text-muted-foreground/60">—</span>
                )}
                {staffName && (
                  <span className="text-[10px] text-muted-foreground block truncate" title={`Handled by ${staffName}`}>
                    by {staffName}
                  </span>
                )}
              </div>

              {/* Reference Links & Reason */}
              <div className="hidden sm:block sm:col-span-2 text-right text-[11px]">
                {tx.invoice ? (
                  <a
                    href={`/billing/invoices/${tx.invoice.id}`}
                    className="font-mono text-primary hover:underline font-semibold block"
                  >
                    {invoiceNum}
                  </a>
                ) : invoiceNum ? (
                  <span className="font-mono text-foreground/80 font-medium block">
                    {invoiceNum}
                  </span>
                ) : null}

                {paymentNum && (
                  <span className="font-mono text-[10px] text-muted-foreground block">
                    {paymentNum}
                  </span>
                )}

                {!invoiceNum && !paymentNum && (
                  <span className="text-muted-foreground truncate block" title={tx.reason}>
                    {tx.reason || "—"}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs px-1 pt-1">
          <span className="text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="h-7 px-2"
            >
              <ChevronLeft className="h-3.5 w-3.5 mr-1" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="h-7 px-2"
            >
              Next
              <ChevronRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
