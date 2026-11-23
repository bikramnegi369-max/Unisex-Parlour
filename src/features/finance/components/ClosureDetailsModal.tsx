"use client";

import React, { useState } from "react";
import { useApproveDayClosure } from "../hooks";
import { DayClosure } from "../types/finance.types";
import { FINANCE_CONFIG } from "../config/finance.config";
import { formatCurrency } from "@/lib/formatters";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { hasPermission } from "@/lib/permissions";
import { getErrorMessage } from "@/lib/api/errors";
import {
  CheckCircle2,
  AlertCircle,
  Calendar,
  Clock,
  User,
  CreditCard,
  Banknote,
  QrCode,
  Layers,
  ShieldCheck,
  Lock,
} from "lucide-react";

interface ClosureDetailsModalProps {
  closure: DayClosure;
  isOpen: boolean;
  onClose: () => void;
  onUpdated: () => void;
}

export default function ClosureDetailsModal({
  closure,
  isOpen,
  onClose,
  onUpdated,
}: ClosureDetailsModalProps) {
  const { user } = useAuth();
  const canApprove = hasPermission(user, FINANCE_CONFIG.permissions.edit);

  const [managerNotes, setManagerNotes] = useState(closure.managerNotes || "");
  const [error, setError] = useState<string | null>(null);

  // Canonical Mutation Hook
  const approveMutation = useApproveDayClosure();

  const isApproved = closure.status === "approved";
  const isBalanced = closure.reconciliationResult === "balanced";

  const handleApprove = () => {
    setError(null);
    approveMutation.mutate(
      { id: closure.id, managerNotes },
      {
        onSuccess: () => {
          onUpdated();
        },
        onError: (err: unknown) => {
          setError(getErrorMessage(err, "Failed to approve day closure"));
        },
      }
    );
  };

  const renderTenderRow = (
    label: string,
    icon: React.ReactNode,
    system: number,
    counted: number,
    delta: number
  ) => {
    return (
      <tr className="border-b border-border/60 text-xs">
        <td className="py-2.5 font-medium flex items-center gap-2">
          {icon}
          <span>{label}</span>
        </td>
        <td className="py-2.5 font-mono text-muted-foreground">{formatCurrency(system)}</td>
        <td className="py-2.5 font-mono font-medium">{formatCurrency(counted)}</td>
        <td className="py-2.5 font-mono font-bold text-right">
          <span
            className={
              delta === 0
                ? "text-muted-foreground"
                : delta > 0
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-rose-600 dark:text-rose-400"
            }
          >
            {delta > 0 ? `+${formatCurrency(delta)}` : formatCurrency(delta)}
          </span>
        </td>
      </tr>
    );
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={`Register Drawer Audit — ${closure.businessDate}`}
      maxWidth="2xl"
    >
      <div className="p-6 space-y-6">
        {/* Verification Overview Banner */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-muted/40 rounded-xl border border-border">
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                isBalanced
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                  : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
              }`}
            >
              {isBalanced ? (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Exact Match (Balanced)
                </>
              ) : (
                <>
                  <AlertCircle className="h-3.5 w-3.5" />
                  Amount Difference (Discrepant)
                </>
              )}
            </span>

            <span
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                isApproved
                  ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20"
                  : "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border border-yellow-500/20"
              }`}
            >
              {isApproved ? "Approved by Manager" : "Submitted (Pending Review)"}
            </span>
          </div>

          <div className="text-xs text-muted-foreground font-mono">
            {closure.branchTimezone}
          </div>
        </div>

        {/* Tender-by-tender Reconciliation Table */}
        <div className="border border-border rounded-xl overflow-hidden bg-card">
          <div className="bg-muted/40 px-4 py-2 border-b border-border text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Tender-by-Tender Breakdown
          </div>
          <div className="p-4">
            <table className="w-full">
              <thead>
                <tr className="text-left text-[11px] text-muted-foreground uppercase border-b border-border pb-1">
                  <th className="pb-2">Payment Tender</th>
                  <th className="pb-2">System Expected</th>
                  <th className="pb-2">Physical Counted</th>
                  <th className="pb-2 text-right">Difference</th>
                </tr>
              </thead>
              <tbody>
                {renderTenderRow(
                  "Physical Cash in Drawer",
                  <Banknote className="h-4 w-4 text-emerald-500" />,
                  closure.systemTotals?.cash || 0,
                  closure.physicalCounts?.cash || 0,
                  closure.discrepancy?.cashDelta || 0
                )}
                {renderTenderRow(
                  "Credit / Debit Card Slips",
                  <CreditCard className="h-4 w-4 text-blue-500" />,
                  closure.systemTotals?.card || 0,
                  closure.physicalCounts?.card || 0,
                  closure.discrepancy?.cardDelta || 0
                )}
                {renderTenderRow(
                  "UPI & QR Settlements",
                  <QrCode className="h-4 w-4 text-indigo-500" />,
                  closure.systemTotals?.upi || 0,
                  closure.physicalCounts?.upi || 0,
                  closure.discrepancy?.upiDelta || 0
                )}
                {renderTenderRow(
                  "Other Tenders",
                  <Layers className="h-4 w-4 text-slate-500" />,
                  closure.systemTotals?.other || 0,
                  closure.physicalCounts?.other || 0,
                  closure.discrepancy?.otherDelta || 0
                )}
              </tbody>
              <tfoot>
                <tr className="font-bold text-xs pt-2">
                  <td className="pt-3">Total Net Drawer Collections</td>
                  <td className="pt-3 font-mono text-muted-foreground">
                    {formatCurrency(closure.systemTotals?.netExpected || 0)}
                  </td>
                  <td className="pt-3 font-mono text-foreground">
                    {formatCurrency(closure.physicalCounts?.totalCounted || 0)}
                  </td>
                  <td className="pt-3 font-mono text-right font-bold text-sm">
                    <span
                      className={
                        (closure.discrepancy?.totalDelta || 0) === 0
                          ? "text-muted-foreground"
                          : (closure.discrepancy?.totalDelta || 0) > 0
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-rose-600 dark:text-rose-400"
                      }
                    >
                      {(closure.discrepancy?.totalDelta || 0) > 0
                        ? `+${formatCurrency(closure.discrepancy?.totalDelta || 0)}`
                        : formatCurrency(closure.discrepancy?.totalDelta || 0)}
                    </span>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Cashier Discrepancy Justification */}
        {closure.discrepancy?.reason && (
          <div className="bg-amber-500/10 border border-amber-500/25 rounded-xl p-4 text-xs space-y-1">
            <span className="font-semibold text-amber-800 dark:text-amber-300 block">
              Cashier's Difference Explanation:
            </span>
            <p className="text-amber-900 dark:text-amber-200 whitespace-pre-wrap">
              {closure.discrepancy.reason}
            </p>
          </div>
        )}

        {/* Audit Sign-Off Details */}
        <div className="bg-muted/20 border border-border rounded-xl p-4 space-y-2 text-xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <User className="h-3.5 w-3.5" />
              <span>Submitted By:</span>
            </span>
            <span className="font-medium text-foreground">
              {closure.submittedBy?.name || "Cashier"} ({closure.submittedBy?.email || ""})
            </span>
          </div>
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              <span>Submitted At:</span>
            </span>
            <span className="font-mono text-foreground">
              {new Date(closure.submittedAt).toLocaleString()}
            </span>
          </div>

          {isApproved && (
            <>
              <div className="pt-2 border-t border-border flex items-center justify-between text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-blue-500" />
                  <span>Approved By Manager:</span>
                </span>
                <span className="font-medium text-foreground">
                  {closure.approvedBy?.name || "Manager"} ({closure.approvedBy?.email || ""})
                </span>
              </div>
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-blue-500" />
                  <span>Approved At:</span>
                </span>
                <span className="font-mono text-foreground">
                  {closure.approvedAt ? new Date(closure.approvedAt).toLocaleString() : "—"}
                </span>
              </div>
              {closure.managerNotes && (
                <div className="pt-2 text-xs">
                  <span className="font-medium text-muted-foreground block mb-0.5">Manager Notes:</span>
                  <p className="text-foreground italic">{closure.managerNotes}</p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Manager Sign-Off Section */}
        {!isApproved && canApprove && (
          <div className="p-4 bg-blue-500/5 border border-blue-500/20 rounded-xl space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-blue-900 dark:text-blue-200">
              <Lock className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <span>Manager Final Sign-Off & Lock</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Signing off permanently locks this register closure record. Counted amounts and
              any explanation given by the cashier are permanently preserved for audit.
            </p>

            <div>
              <label className="block text-xs font-medium text-foreground mb-1">
                Manager Review Remarks (Optional)
              </label>
              <Textarea
                value={managerNotes}
                onChange={(e) => setManagerNotes(e.target.value)}
                placeholder="Add physical safe confirmation notes or review comments..."
                rows={2}
                className="text-xs"
              />
            </div>

            {error && (
              <div className="text-xs text-destructive bg-destructive/10 p-2.5 rounded-lg">
                {error}
              </div>
            )}

            <div className="flex justify-end pt-2">
              <Button
                variant="default"
                size="sm"
                onClick={handleApprove}
                disabled={approveMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs"
              >
                {approveMutation.isPending ? "Locking Closure..." : "Approve & Lock Register"}
              </Button>
            </div>
          </div>
        )}

        <div className="flex justify-end pt-2">
          <Button variant="outline" size="sm" onClick={onClose} className="text-xs">
            Close
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
