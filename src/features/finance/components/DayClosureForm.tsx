"use client";

import React, { useState } from "react";
import { useSystemTotals, useSubmitDayClosure } from "../hooks";
import { formatCurrency } from "@/lib/formatters";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useBranchContext } from "@/hooks/useBranchContext";
import { getErrorMessage } from "@/lib/api/errors";
import {
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Lock,
  AlertCircle,
  Banknote,
  CreditCard,
  QrCode,
  Layers,
} from "lucide-react";

interface DayClosureFormProps {
  onSuccess: () => void;
}

export default function DayClosureForm({ onSuccess }: DayClosureFormProps) {
  const { currentBranch } = useBranchContext();
  const todayStr = new Date().toISOString().slice(0, 10);
  const [selectedDate, setSelectedDate] = useState(todayStr);

  const [physicalCash, setPhysicalCash] = useState<string>("");
  const [physicalCard, setPhysicalCard] = useState<string>("");
  const [physicalUpi, setPhysicalUpi] = useState<string>("");
  const [physicalOther, setPhysicalOther] = useState<string>("0");
  const [discrepancyReason, setDiscrepancyReason] = useState<string>("");
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Canonical Query Hook
  const { data: totalsData, isLoading } = useSystemTotals(selectedDate);

  // Canonical Mutation Hook
  const submitMutation = useSubmitDayClosure();

  const totals = totalsData?.systemTotals;
  const isAlreadyClosed = totalsData?.alreadyClosed;

  // Real-time Tender Deltas
  const countCash = Number(physicalCash) || 0;
  const countCard = Number(physicalCard) || 0;
  const countUpi = Number(physicalUpi) || 0;
  const countOther = Number(physicalOther) || 0;

  const expectedCash = totals?.cash || 0;
  const expectedCard = totals?.card || 0;
  const expectedUpi = totals?.upi || 0;
  const expectedOther = totals?.other || 0;

  const deltaCash = countCash - expectedCash;
  const deltaCard = countCard - expectedCard;
  const deltaUpi = countUpi - expectedUpi;
  const deltaOther = countOther - expectedOther;

  const totalCounted = countCash + countCard + countUpi + countOther;
  const totalExpected = totals?.netExpected || 0;
  const totalDelta = totalCounted - totalExpected;

  // Strict Balanced Check: Every tender delta must be 0
  const isBalanced =
    Math.abs(deltaCash) < 0.01 &&
    Math.abs(deltaCard) < 0.01 &&
    Math.abs(deltaUpi) < 0.01 &&
    Math.abs(deltaOther) < 0.01;

  const requiresReason = !isBalanced;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (requiresReason && !discrepancyReason.trim()) {
      setSubmitError(
        "A difference was detected between physical counts and system expected collections. Please explain the reason for the difference."
      );
      return;
    }

    submitMutation.mutate(
      {
        businessDate: selectedDate,
        physicalCounts: {
          cash: Number(physicalCash) || 0,
          card: Number(physicalCard) || 0,
          upi: Number(physicalUpi) || 0,
          other: Number(physicalOther) || 0,
        },
        discrepancyReason: discrepancyReason.trim() || undefined,
      },
      {
        onSuccess: () => {
          onSuccess();
        },
        onError: (err: unknown) => {
          setSubmitError(
            getErrorMessage(
              err,
              "Unable to complete register closure. Please verify counts."
            )
          );
        },
      }
    );
  };

  if (isAlreadyClosed) {
    return (
      <div className="p-8 rounded-2xl border border-border bg-card max-w-xl mx-auto text-center space-y-4">
        <div className="h-12 w-12 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto">
          <Lock className="h-6 w-6" />
        </div>
        <div className="space-y-1">
          <h3 className="text-base font-bold text-foreground">
            Day Register Already Closed
          </h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            The register drawer for <strong className="text-foreground">{selectedDate}</strong> at{" "}
            <strong className="text-foreground">{currentBranch?.name}</strong> has already been
            counted and submitted. Register closures are strictly unique per business date.
          </p>
        </div>
        <div className="pt-2 flex justify-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const yesterday = new Date();
              yesterday.setDate(yesterday.getDate() - 1);
              setSelectedDate(yesterday.toISOString().slice(0, 10));
            }}
            className="text-xs"
          >
            Check Another Date
          </Button>
          <Button size="sm" onClick={onSuccess} className="text-xs font-semibold">
            View Closure History
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Date & Branch Context Toolbar */}
      <div className="bg-card p-4 rounded-2xl border border-border flex flex-wrap gap-4 items-center justify-between shadow-xs">
        <div className="flex items-center gap-3">
          <Calendar className="h-4 w-4 text-primary" />
          <span className="text-xs font-semibold text-foreground">
            Reconcile Register for Business Date:
          </span>
          <Input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="h-8 w-36 text-xs font-mono"
          />
        </div>

        <div className="text-xs text-muted-foreground">
          Branch Timezone:{" "}
          <strong className="font-mono text-foreground">
            {totalsData?.branchTimezone || currentBranch?.timezone || "Asia/Kolkata"}
          </strong>
        </div>
      </div>

      {submitError && (
        <div className="p-3.5 bg-destructive/10 text-destructive text-xs rounded-xl border border-destructive/20 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{submitError}</span>
        </div>
      )}

      {/* Guided Reconciliation Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Tender Table */}
        <div className="border border-border rounded-2xl bg-card shadow-xs overflow-hidden">
          <div className="bg-muted/40 px-5 py-3 border-b border-border flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-foreground">
              Physical Tender Verification
            </span>
            <span className="text-[11px] text-muted-foreground">
              Enter the exact amounts counted in the register
            </span>
          </div>

          <div className="p-5">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border text-[11px] uppercase tracking-wider text-muted-foreground pb-2 text-left">
                  <th className="pb-2.5">Payment Method</th>
                  <th className="pb-2.5">System Recorded Expected</th>
                  <th className="pb-2.5 w-44">Physical Counted Amount (₹)</th>
                  <th className="pb-2.5 text-right">Amount Difference</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {/* Cash Tender */}
                <tr>
                  <td className="py-3.5 font-medium flex items-center gap-2">
                    <Banknote className="h-4 w-4 text-emerald-500" />
                    <span>Physical Cash in Drawer</span>
                  </td>
                  <td className="py-3.5 font-mono text-muted-foreground">
                    {formatCurrency(expectedCash)}
                  </td>
                  <td className="py-3.5">
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={physicalCash}
                      onChange={(e) => setPhysicalCash(e.target.value)}
                      className="h-8 text-xs font-mono font-semibold"
                    />
                  </td>
                  <td className="py-3.5 text-right font-mono font-bold">
                    <span
                      className={
                        deltaCash === 0
                          ? "text-muted-foreground"
                          : deltaCash > 0
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-rose-600 dark:text-rose-400"
                      }
                    >
                      {deltaCash > 0 ? `+${formatCurrency(deltaCash)}` : formatCurrency(deltaCash)}
                    </span>
                  </td>
                </tr>

                {/* Card Tender */}
                <tr>
                  <td className="py-3.5 font-medium flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-blue-500" />
                    <span>Credit / Debit Card EDC Slips</span>
                  </td>
                  <td className="py-3.5 font-mono text-muted-foreground">
                    {formatCurrency(expectedCard)}
                  </td>
                  <td className="py-3.5">
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={physicalCard}
                      onChange={(e) => setPhysicalCard(e.target.value)}
                      className="h-8 text-xs font-mono font-semibold"
                    />
                  </td>
                  <td className="py-3.5 text-right font-mono font-bold">
                    <span
                      className={
                        deltaCard === 0
                          ? "text-muted-foreground"
                          : deltaCard > 0
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-rose-600 dark:text-rose-400"
                      }
                    >
                      {deltaCard > 0 ? `+${formatCurrency(deltaCard)}` : formatCurrency(deltaCard)}
                    </span>
                  </td>
                </tr>

                {/* UPI Tender */}
                <tr>
                  <td className="py-3.5 font-medium flex items-center gap-2">
                    <QrCode className="h-4 w-4 text-indigo-500" />
                    <span>UPI & Digital QR Settlements</span>
                  </td>
                  <td className="py-3.5 font-mono text-muted-foreground">
                    {formatCurrency(expectedUpi)}
                  </td>
                  <td className="py-3.5">
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={physicalUpi}
                      onChange={(e) => setPhysicalUpi(e.target.value)}
                      className="h-8 text-xs font-mono font-semibold"
                    />
                  </td>
                  <td className="py-3.5 text-right font-mono font-bold">
                    <span
                      className={
                        deltaUpi === 0
                          ? "text-muted-foreground"
                          : deltaUpi > 0
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-rose-600 dark:text-rose-400"
                      }
                    >
                      {deltaUpi > 0 ? `+${formatCurrency(deltaUpi)}` : formatCurrency(deltaUpi)}
                    </span>
                  </td>
                </tr>

                {/* Other Tender */}
                <tr>
                  <td className="py-3.5 font-medium flex items-center gap-2">
                    <Layers className="h-4 w-4 text-slate-500" />
                    <span>Other Tenders (Cheques, Gift Vouchers)</span>
                  </td>
                  <td className="py-3.5 font-mono text-muted-foreground">
                    {formatCurrency(expectedOther)}
                  </td>
                  <td className="py-3.5">
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={physicalOther}
                      onChange={(e) => setPhysicalOther(e.target.value)}
                      className="h-8 text-xs font-mono font-semibold"
                    />
                  </td>
                  <td className="py-3.5 text-right font-mono font-bold">
                    <span
                      className={
                        deltaOther === 0
                          ? "text-muted-foreground"
                          : deltaOther > 0
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-rose-600 dark:text-rose-400"
                      }
                    >
                      {deltaOther > 0 ? `+${formatCurrency(deltaOther)}` : formatCurrency(deltaOther)}
                    </span>
                  </td>
                </tr>
              </tbody>
              <tfoot>
                <tr className="font-bold text-xs pt-3">
                  <td className="pt-4">Total Net Tender Collections</td>
                  <td className="pt-4 font-mono text-muted-foreground">
                    {formatCurrency(totalExpected)}
                  </td>
                  <td className="pt-4 font-mono text-foreground">
                    {formatCurrency(totalCounted)}
                  </td>
                  <td className="pt-4 text-right font-mono text-sm">
                    <span
                      className={
                        totalDelta === 0
                          ? "text-muted-foreground"
                          : totalDelta > 0
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-rose-600 dark:text-rose-400"
                      }
                    >
                      {totalDelta > 0 ? `+${formatCurrency(totalDelta)}` : formatCurrency(totalDelta)}
                    </span>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Real-time Status Card & Discrepancy Justification */}
        {requiresReason ? (
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/25 space-y-3">
            <div className="flex items-start gap-2 text-amber-800 dark:text-amber-300">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <div className="space-y-0.5 text-xs">
                <span className="font-semibold block">
                  Amount Difference Detected
                </span>
                <p>
                  The counted amounts do not exactly match the system collections for this business date.
                  Please explain why there is a difference (e.g. unswiped card slip, shortage in change, delayed UPI confirmation).
                </p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Reason for Amount Difference *
              </label>
              <Textarea
                placeholder="Explain the reason for this shortage or surplus in everyday language..."
                value={discrepancyReason}
                onChange={(e) => setDiscrepancyReason(e.target.value)}
                rows={2}
                className="text-xs"
                required
              />
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-2 text-xs text-emerald-800 dark:text-emerald-300 font-semibold">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <span>Perfect Match: Every counted tender matches the system record exactly.</span>
          </div>
        )}

        {/* Confirmation & Submit */}
        <div className="p-4 rounded-2xl bg-muted/20 border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="text-xs text-muted-foreground">
            Once submitted, counted amounts become permanently read-only and will await manager review.
          </div>

          <Button
            type="submit"
            disabled={submitMutation.isPending || isLoading}
            className="text-xs font-semibold h-9 px-6"
          >
            {submitMutation.isPending ? "Submitting Register..." : "Submit Day Closure"}
          </Button>
        </div>
      </form>
    </div>
  );
}
