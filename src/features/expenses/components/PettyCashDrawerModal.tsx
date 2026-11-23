"use client";

import React, { useState } from "react";
import {
  usePettyCashBalance,
  usePettyCashTransactions,
  useReplenishPettyCash,
  useRecoverPettyCashPayout,
} from "../hooks";
import { PettyCashTransaction } from "../types/expense.types";
import { EXPENSES_CONFIG } from "../config/expenses.config";
import { formatCurrency } from "@/lib/formatters";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { hasPermission } from "@/lib/permissions";
import { getErrorMessage } from "@/lib/api/errors";
import {
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  RotateCcw,
  AlertCircle,
  Clock,
  Plus,
  RefreshCw,
} from "lucide-react";
import { useBranchContext } from "@/hooks/useBranchContext";

interface PettyCashDrawerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function PettyCashDrawerModal({
  open,
  onOpenChange,
}: PettyCashDrawerModalProps) {
  const { currentBranch } = useBranchContext();
  const { user } = useAuth();

  const canReplenish = hasPermission(
    user,
    EXPENSES_CONFIG.permissions.replenish,
  );
  const canRecover = hasPermission(user, EXPENSES_CONFIG.permissions.recover);

  const [activeTab, setActiveTab] = useState<
    "history" | "replenish" | "recover"
  >("history");

  // Replenish form state
  const [replenishAmount, setReplenishAmount] = useState<string>("");
  const [replenishDesc, setReplenishDesc] = useState<string>("");
  const [replenishError, setReplenishError] = useState<string | null>(null);

  // Recovery form state
  const [selectedTxForRecovery, setSelectedTxForRecovery] =
    useState<PettyCashTransaction | null>(null);
  const [recoveryAmount, setRecoveryAmount] = useState<string>("");
  const [recoveryReason, setRecoveryReason] = useState<string>("");
  const [recoveryError, setRecoveryError] = useState<string | null>(null);

  // Modular Server-State Queries via Canonical Hooks
  const { data: balanceData, isLoading: isBalanceLoading } =
    usePettyCashBalance();
  const {
    data: ledgerData,
    isLoading: isLedgerLoading,
    refetch: refetchLedger,
  } = usePettyCashTransactions(1, 50, open);

  // Modular Mutations via Canonical Hooks
  const replenishMutation = useReplenishPettyCash();
  const recoverMutation = useRecoverPettyCashPayout();

  const handleReplenishSubmit = () => {
    setReplenishError(null);
    replenishMutation.mutate(
      {
        amount: Number(replenishAmount),
        description: replenishDesc,
      },
      {
        onSuccess: () => {
          setReplenishAmount("");
          setReplenishDesc("");
          setActiveTab("history");
        },
        onError: (err: unknown) => {
          setReplenishError(
            getErrorMessage(err, "Failed to replenish cash drawer."),
          );
        },
      },
    );
  };

  const handleRecoverSubmit = () => {
    if (
      !selectedTxForRecovery?.linkedExpenseId?.id ||
      !selectedTxForRecovery?.id
    ) {
      setRecoveryError("Invalid transaction selected for cash recovery.");
      return;
    }

    setRecoveryError(null);
    recoverMutation.mutate(
      {
        linkedExpenseId: selectedTxForRecovery.linkedExpenseId.id,
        originalPayoutId: selectedTxForRecovery.id,
        recoveredAmount: Number(recoveryAmount),
        reason: recoveryReason,
      },
      {
        onSuccess: () => {
          setSelectedTxForRecovery(null);
          setRecoveryAmount("");
          setRecoveryReason("");
          setActiveTab("history");
        },
        onError: (err: unknown) => {
          setRecoveryError(
            getErrorMessage(err, "Cash recovery could not be registered."),
          );
        },
      },
    );
  };

  const transactions: PettyCashTransaction[] = ledgerData?.items || [];

  return (
    <Dialog
      isOpen={open}
      onClose={() => onOpenChange(false)}
      title="Cash Drawer & Petty Cash Management"
      maxWidth="3xl"
    >
      <div className="p-6 space-y-6">
        {/* Balance Card Banner */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-5 rounded-2xl bg-linear-to-r from-primary/10 via-primary/5 to-card border border-primary/20">
          <div className="space-y-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Wallet className="h-4 w-4 text-primary" />
              Available Cash in Drawer
            </span>
            <div className="text-2xl font-bold font-mono tracking-tight text-foreground">
              {isBalanceLoading
                ? "Calculating..."
                : formatCurrency(balanceData?.currentBalance || 0)}
            </div>
            <p className="text-[11px] text-muted-foreground">
              {currentBranch?.name || "Active Salon"}
            </p>
          </div>

          <div className="space-y-1 border-t sm:border-t-0 sm:border-l border-border/80 pt-3 sm:pt-0 sm:pl-4">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <ArrowDownLeft className="h-3.5 w-3.5" />
              Total Cash Inflows
            </span>
            <div className="text-lg font-semibold font-mono text-foreground">
              {formatCurrency(balanceData?.totalInflow || 0)}
            </div>
            <p className="text-[11px] text-muted-foreground">
              Drawer funding & recoveries
            </p>
          </div>

          <div className="space-y-1 border-t sm:border-t-0 sm:border-l border-border/80 pt-3 sm:pt-0 sm:pl-4">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-rose-600 dark:text-rose-400 flex items-center gap-1">
              <ArrowUpRight className="h-3.5 w-3.5" />
              Total Cash Disbursed
            </span>
            <div className="text-lg font-semibold font-mono text-foreground">
              {formatCurrency(balanceData?.totalOutflow || 0)}
            </div>
            <p className="text-[11px] text-muted-foreground">
              Settled operational payouts
            </p>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="flex border-b border-border space-x-6 text-xs font-semibold">
          <button
            onClick={() => setActiveTab("history")}
            className={`pb-2.5 transition-colors flex items-center gap-1.5 ${
              activeTab === "history"
                ? "text-primary border-b-2 border-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Clock className="h-3.5 w-3.5" />
            Cash Drawer History
          </button>

          {canReplenish && (
            <button
              onClick={() => setActiveTab("replenish")}
              className={`pb-2.5 transition-colors flex items-center gap-1.5 ${
                activeTab === "replenish"
                  ? "text-primary border-b-2 border-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Plus className="h-3.5 w-3.5" />
              Add Cash to Drawer
            </button>
          )}

          {canRecover && (
            <button
              onClick={() => setActiveTab("recover")}
              className={`pb-2.5 transition-colors flex items-center gap-1.5 ${
                activeTab === "recover"
                  ? "text-primary border-b-2 border-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Record Cash Return
            </button>
          )}
        </div>

        {/* Tab 1: Append-Only Drawer History */}
        {activeTab === "history" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Verified append-only ledger entries</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => refetchLedger()}
                className="h-7 text-xs flex items-center gap-1"
              >
                <RefreshCw className="h-3 w-3" />
                Refresh
              </Button>
            </div>

            <div className="border border-border rounded-xl overflow-hidden shadow-xs">
              <div className="max-h-80 overflow-y-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-muted/40 text-muted-foreground border-b border-border uppercase font-semibold">
                    <tr>
                      <th className="px-4 py-2.5">Date & Time</th>
                      <th className="px-4 py-2.5">Transaction Type</th>
                      <th className="px-4 py-2.5">Reference / Payee</th>
                      <th className="px-4 py-2.5 text-right">Amount</th>
                      <th className="px-4 py-2.5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {isLedgerLoading ? (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-4 py-8 text-center text-muted-foreground"
                        >
                          Loading cash drawer activity...
                        </td>
                      </tr>
                    ) : transactions.length === 0 ? (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-4 py-8 text-center text-muted-foreground"
                        >
                          No drawer transactions recorded yet.
                        </td>
                      </tr>
                    ) : (
                      transactions.map((tx: PettyCashTransaction) => {
                        const isInflow =
                          tx.type === "replenishment" ||
                          tx.type === "opening_balance" ||
                          tx.type === "payout_reversal";

                        return (
                          <tr
                            key={tx.id}
                            className="hover:bg-muted/20 transition-colors"
                          >
                            <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                              {new Date(tx.createdAt).toLocaleDateString()}{" "}
                              <span className="text-[10px]">
                                {new Date(tx.createdAt).toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-medium ${
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
                                {tx.type === "replenishment"
                                  ? "Drawer Replenishment"
                                  : tx.type === "expense_payout"
                                    ? "Expense Cash Payout"
                                    : tx.type === "payout_reversal"
                                      ? "Vendor Cash Recovery"
                                      : "Opening Balance"}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-foreground">
                              <div className="font-medium truncate max-w-xs">
                                {tx.linkedExpenseId
                                  ? `${tx.linkedExpenseId.payeeName} (${tx.linkedExpenseId.expenseCode})`
                                  : tx.description ||
                                    "General Cash Drawer Entry"}
                              </div>
                              <div className="text-[10px] text-muted-foreground">
                                By: {tx.recordedBy?.name || "Staff"}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-right font-mono font-bold whitespace-nowrap">
                              <span
                                className={
                                  isInflow
                                    ? "text-emerald-600 dark:text-emerald-400"
                                    : "text-foreground"
                                }
                              >
                                {isInflow
                                  ? `+${formatCurrency(tx.amount)}`
                                  : `-${formatCurrency(tx.amount)}`}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right whitespace-nowrap">
                              {tx.type === "expense_payout" && canRecover && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedTxForRecovery(tx);
                                    setActiveTab("recover");
                                  }}
                                  className="h-6 text-[10px] px-2 text-primary hover:bg-primary/10"
                                >
                                  Return Cash
                                </Button>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Replenish Drawer */}
        {activeTab === "replenish" && (
          <div className="p-4 rounded-xl border border-border bg-card/60 space-y-4 max-w-lg mx-auto">
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                <Plus className="h-4 w-4 text-primary" />
                Add Cash to Drawer (Replenishment)
              </h3>
              <p className="text-xs text-muted-foreground">
                Enter cash transferred from bank or store safe into the
                front-desk register drawer.
              </p>
            </div>

            {replenishError && (
              <div className="p-3 bg-destructive/10 text-destructive text-xs rounded-xl border border-destructive/20 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{replenishError}</span>
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">
                  Cash Amount (₹) *
                </label>
                <Input
                  type="number"
                  step="0.01"
                  min="1"
                  placeholder="e.g. 5000"
                  value={replenishAmount}
                  onChange={(e) => setReplenishAmount(e.target.value)}
                  className="h-10 text-base font-semibold font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground mb-1">
                  Funding Source & Description *
                </label>
                <Textarea
                  placeholder="e.g. Main Safe withdrawal, Bank Cash withdrawal by Manager..."
                  value={replenishDesc}
                  onChange={(e) => setReplenishDesc(e.target.value)}
                  rows={2}
                  className="text-xs"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setActiveTab("history")}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  disabled={
                    !replenishAmount ||
                    Number(replenishAmount) <= 0 ||
                    !replenishDesc.trim() ||
                    replenishMutation.isPending
                  }
                  onClick={handleReplenishSubmit}
                  className="text-xs font-semibold"
                >
                  {replenishMutation.isPending
                    ? "Depositing..."
                    : "Confirm Cash Deposit"}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Record Actual Cash Recovery */}
        {activeTab === "recover" && (
          <div className="p-4 rounded-xl border border-border bg-card/60 space-y-4 max-w-lg mx-auto">
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                <RotateCcw className="h-4 w-4 text-primary" />
                Record Vendor Cash Return / Recovery
              </h3>
              <p className="text-xs text-muted-foreground">
                When cash previously disbursed to a vendor or contractor is
                returned back to the salon, record it here. The original payout
                record is permanently preserved for audit.
              </p>
            </div>

            {recoveryError && (
              <div className="p-3 bg-destructive/10 text-destructive text-xs rounded-xl border border-destructive/20 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{recoveryError}</span>
              </div>
            )}

            {selectedTxForRecovery ? (
              <div className="p-3 rounded-xl bg-muted/40 border border-border space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    Original Disbursed:
                  </span>
                  <span className="font-mono font-bold text-foreground">
                    {formatCurrency(selectedTxForRecovery.amount)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Expense Code:</span>
                  <span className="font-mono">
                    {selectedTxForRecovery.linkedExpenseId?.expenseCode}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Payee:</span>
                  <span className="font-medium text-foreground">
                    {selectedTxForRecovery.linkedExpenseId?.payeeName}
                  </span>
                </div>
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-800 dark:text-amber-300">
                Please select a payout transaction from the{" "}
                <strong>Cash Drawer History</strong> tab using the &quot;Return
                Cash&quot; button.
              </div>
            )}

            {selectedTxForRecovery && (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">
                    Recovered Cash Amount (₹) *
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    min="1"
                    max={selectedTxForRecovery.amount}
                    placeholder="e.g. 500"
                    value={recoveryAmount}
                    onChange={(e) => setRecoveryAmount(e.target.value)}
                    className="h-10 text-base font-semibold font-mono"
                  />
                  <span className="text-[11px] text-muted-foreground">
                    Cannot exceed remaining unrecovered payout amount.
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">
                    Recovery Reason & Payee Note *
                  </label>
                  <Textarea
                    placeholder="e.g. Vendor returned excess change, cancelled dry cleaning service..."
                    value={recoveryReason}
                    onChange={(e) => setRecoveryReason(e.target.value)}
                    rows={2}
                    className="text-xs"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedTxForRecovery(null);
                      setActiveTab("history");
                    }}
                    className="text-xs"
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    disabled={
                      !recoveryAmount ||
                      Number(recoveryAmount) <= 0 ||
                      !recoveryReason.trim() ||
                      recoverMutation.isPending
                    }
                    onClick={handleRecoverSubmit}
                    className="text-xs font-semibold"
                  >
                    {recoverMutation.isPending
                      ? "Recording Recovery..."
                      : "Deposit Returned Cash"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-end pt-2 border-t border-border">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="text-xs"
          >
            Close
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
