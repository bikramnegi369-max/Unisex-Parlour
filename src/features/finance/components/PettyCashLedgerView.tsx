"use client";

import React, { useState } from "react";
import { usePettyCashBalance, usePettyCashTransactions } from "@/features/expenses/hooks";
import PettyCashDrawerModal from "@/features/expenses/components/PettyCashDrawerModal";
import { formatCurrency } from "@/lib/formatters";
import { useBranchContext } from "@/hooks/useBranchContext";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import {
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  Plus,
  RotateCcw,
  ShieldAlert,
  Building2,
  Clock,
} from "lucide-react";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { hasPermission } from "@/lib/permissions";

export default function PettyCashLedgerView() {
  const { currentBranch, isAllBranchesSelected } = useBranchContext();
  const { user } = useAuth();

  const canCreate = hasPermission(user, "expenses.create");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const { data: balance, isLoading: balanceLoading, refetch: refetchBalance } = usePettyCashBalance();
  const { data: txData, isLoading: txLoading, refetch: refetchTx } = usePettyCashTransactions(page, pageSize);

  const transactions = txData?.items || [];
  const pagination = txData?.pagination;
  const currentBalance = balance?.currentBalance ?? 0;

  if (isAllBranchesSelected) {
    return (
      <div className="p-8 text-center bg-card rounded-2xl border border-border shadow-xs space-y-3">
        <Building2 className="h-10 w-10 text-muted-foreground mx-auto" />
        <h3 className="text-sm font-bold text-foreground">Select a Specific Branch</h3>
        <p className="text-xs text-muted-foreground max-w-md mx-auto">
          Petty cash drawers are physical cash registers tied to a specific physical branch. Select a branch from the top switcher to inspect or replenish its drawer ledger.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Live Balance Banner */}
      <div className="p-5 rounded-2xl bg-card border border-border shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Wallet className="h-4 w-4 text-primary" />
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              {currentBranch?.name || "Branch"} — Cash Drawer Ledger
            </span>
          </div>
          <div className="text-3xl font-extrabold font-mono text-foreground tracking-tight">
            {balanceLoading ? <Skeleton className="h-9 w-36" /> : formatCurrency(currentBalance)}
          </div>
          <p className="text-xs text-muted-foreground">
            Authoritatively derived from the append-only petty cash ledger. Funding is an imprest movement, not an operating expense.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              refetchBalance();
              refetchTx();
            }}
            className="text-xs h-9"
          >
            <RotateCcw className="h-3.5 w-3.5 mr-1" />
            Refresh
          </Button>

          {canCreate && (
            <Button
              size="sm"
              onClick={() => setIsModalOpen(true)}
              className="text-xs h-9 font-semibold shadow-xs"
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              Manage Drawer (Replenish / Recover)
            </Button>
          )}
        </div>
      </div>

      {/* Append-Only Transactions Table */}
      <div className="rounded-2xl border border-border bg-card shadow-xs overflow-hidden">
        <div className="p-4 border-b border-border/80 flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
            Immutable Cash Movements
          </h3>
          <span className="text-xs text-muted-foreground">
            {transactions.length} Recorded Entries
          </span>
        </div>

        {txLoading ? (
          <div className="p-6 space-y-2">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        ) : transactions.length === 0 ? (
          <EmptyState
            title="No Drawer Transactions Yet"
            description="Replenish the drawer or log an expense payout to create ledger entries."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted/40 text-muted-foreground text-[11px] uppercase font-semibold border-b border-border">
                <tr>
                  <th className="py-3 px-4">Date & Time</th>
                  <th className="py-3 px-3">Transaction #</th>
                  <th className="py-3 px-3">Type</th>
                  <th className="py-3 px-3">Description</th>
                  <th className="py-3 px-3">Recorded By</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {transactions.map((tx) => {
                  const isInflow =
                    tx.type === "replenishment" ||
                    tx.type === "payout_reversal" ||
                    tx.type === "opening_balance";

                  return (
                    <tr key={tx.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-3 px-4 font-mono text-muted-foreground">
                        {new Date(tx.transactionDate).toLocaleString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="py-3 px-3 font-mono font-semibold text-foreground">
                        {tx.transactionNumber}
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`inline-flex items-center gap-1 text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                            isInflow
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                              : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                          }`}
                        >
                          {isInflow ? (
                            <ArrowDownLeft className="h-3 w-3" />
                          ) : (
                            <ArrowUpRight className="h-3 w-3" />
                          )}
                          {tx.type.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-muted-foreground max-w-xs truncate">
                        {tx.description || "Petty cash movement"}
                      </td>
                      <td className="py-3 px-3 font-medium text-foreground">
                        {tx.recordedBy?.name || "System"}
                      </td>
                      <td
                        className={`py-3 px-4 text-right font-mono font-bold text-sm ${
                          isInflow
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-rose-600 dark:text-rose-400"
                        }`}
                      >
                        {isInflow ? "+" : "-"}
                        {formatCurrency(tx.amount)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {pagination && (
          <div className="p-4 border-t border-border">
            <Pagination
              currentPage={pagination.page}
              totalPages={Math.max(1, pagination.totalPages)}
              totalItems={pagination.total}
              onPageChange={setPage}
              pageSize={pageSize}
              pageSizeOptions={[10, 20, 50, 100]}
              onPageSizeChange={(size) => {
                setPageSize(size);
                setPage(1);
              }}
              itemLabel="transactions"
            />
          </div>
        )}
      </div>

      <PettyCashDrawerModal open={isModalOpen} onOpenChange={setIsModalOpen} />
    </div>
  );
}
