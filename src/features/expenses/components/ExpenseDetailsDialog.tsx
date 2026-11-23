"use client";

import React, { useState } from "react";
import { useApproveExpense, useRejectExpense } from "../hooks";
import { Expense } from "../types/expense.types";
import { EXPENSES_CONFIG } from "../config/expenses.config";
import { formatCurrency } from "@/lib/formatters";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { hasPermission } from "@/lib/permissions";
import { getErrorMessage } from "@/lib/api/errors";
import Link from "next/link";
import Image from "next/image";
import {
  CheckCircle2,
  XCircle,
  Clock,
  User,
  AlertTriangle,
  ExternalLink,
  ShieldCheck,
  Truck,
} from "lucide-react";

interface ExpenseDetailsDialogProps {
  expense: Expense;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export default function ExpenseDetailsDialog({
  expense,
  open,
  onOpenChange,
  onSuccess,
}: ExpenseDetailsDialogProps) {
  const { user } = useAuth();

  const canApprove = hasPermission(user, EXPENSES_CONFIG.permissions.approve);
  const canReject = hasPermission(user, EXPENSES_CONFIG.permissions.reject);

  const [isRejecting, setIsRejecting] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);

  // Canonical hooks
  const approveMutation = useApproveExpense();
  const rejectMutation = useRejectExpense();

  const handleApprove = () => {
    setActionError(null);
    approveMutation.mutate(expense.id, {
      onSuccess: () => {
        onSuccess();
        onOpenChange(false);
      },
      onError: (err: unknown) => {
        setActionError(getErrorMessage(err, "Failed to approve expense."));
      },
    });
  };

  const handleReject = () => {
    if (!rejectReason.trim()) {
      setActionError(
        "Please provide an explanation for rejecting this expense.",
      );
      return;
    }
    setActionError(null);
    rejectMutation.mutate(
      { id: expense.id, reason: rejectReason },
      {
        onSuccess: () => {
          onSuccess();
          onOpenChange(false);
        },
        onError: (err: unknown) => {
          setActionError(getErrorMessage(err, "Failed to reject expense."));
        },
      },
    );
  };

  const isPending = expense.approvalStatus === "pending_approval";
  const isApproved = expense.approvalStatus === "approved";
  const isRejected = expense.approvalStatus === "rejected";

  return (
    <Dialog
      isOpen={open}
      onClose={() => {
        setIsRejecting(false);
        setActionError(null);
        onOpenChange(false);
      }}
      title={`Expense Details — ${expense.expenseCode}`}
      maxWidth="2xl"
    >
      <div className="p-6 space-y-6">
        {/* Top Summary Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-muted/40 border border-border">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold font-mono tracking-tight text-foreground">
                {formatCurrency(expense.amount)}
              </span>
              <span className="text-xs uppercase px-2 py-0.5 rounded-md font-semibold bg-primary/10 text-primary">
                {expense.category}
              </span>
            </div>
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <User className="h-3.5 w-3.5" />
              Paid to:{" "}
              <strong className="text-foreground">{expense.payeeName}</strong>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Approval Status Chip */}
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                isApproved
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                  : isRejected
                    ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                    : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
              }`}
            >
              {isApproved && <CheckCircle2 className="h-3.5 w-3.5" />}
              {isRejected && <XCircle className="h-3.5 w-3.5" />}
              {isPending && <Clock className="h-3.5 w-3.5" />}
              {isApproved
                ? "Approved"
                : isRejected
                  ? "Rejected"
                  : "Waiting for Manager Approval"}
            </span>

            {/* Payment Settlement Status Chip */}
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                expense.paymentStatus === "settled"
                  ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20"
                  : "bg-muted text-muted-foreground border border-border"
              }`}
            >
              {expense.paymentStatus === "settled"
                ? "Disbursed / Paid"
                : "Unpaid"}
            </span>
          </div>
        </div>

        {actionError && (
          <div className="p-3 bg-destructive/10 text-destructive text-xs rounded-xl border border-destructive/20 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{actionError}</span>
          </div>
        )}

        {/* ERP Cross-Module Linkages Section */}
        {expense.sourceType && expense.sourceType !== "manual" && (
          <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 space-y-2.5 text-xs">
            <div className="flex items-center justify-between font-semibold text-foreground">
              <span className="flex items-center gap-1.5 text-primary">
                <Truck className="h-4 w-4" />
                Linked ERP Source Transaction
              </span>
              <span className="text-[11px] font-mono uppercase text-muted-foreground">
                {expense.sourceType.replace("_", " ")}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-muted-foreground pt-1">
              {expense.supplierId && (
                <div>
                  <span className="block text-[11px] font-medium text-foreground">
                    Connected Supplier:
                  </span>
                  <span>
                    {expense.supplierId.name} (
                    {expense.supplierId.phone || "No phone"})
                  </span>
                </div>
              )}

              {expense.supplierInvoiceId && (
                <div>
                  <span className="block text-[11px] font-medium text-foreground">
                    Linked Supplier Bill:
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-foreground">
                      {expense.supplierInvoiceId.invoiceNumber}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      ({formatCurrency(expense.supplierInvoiceId.totalAmount)})
                    </span>
                  </div>
                </div>
              )}

              {expense.sourceReference && (
                <div className="sm:col-span-2">
                  <span className="block text-[11px] font-medium text-foreground">
                    Origin Reference:
                  </span>
                  <span className="font-mono">{expense.sourceReference}</span>
                </div>
              )}
            </div>

            <div className="pt-2 flex justify-end">
              <Link
                href="/procurement"
                className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline font-semibold"
              >
                Open Procurement Hub
                <ExternalLink className="h-3 w-3" />
              </Link>
            </div>
          </div>
        )}

        {/* Grid Information Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="space-y-3 p-4 rounded-xl border border-border bg-card/40">
            <h4 className="font-semibold text-foreground uppercase tracking-wider text-[11px] border-b border-border pb-1.5">
              Financial Information
            </h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Expense Date:</span>
                <span className="font-medium text-foreground">
                  {new Date(expense.expenseDate).toLocaleDateString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Payment Tender:</span>
                <span className="font-medium text-foreground uppercase font-mono">
                  {expense.paymentMethod.replace("_", " ")}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  Bill / Invoice Number:
                </span>
                <span className="font-medium font-mono text-foreground">
                  {expense.invoiceNumber || "—"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  Threshold at Creation:
                </span>
                <span className="font-mono text-muted-foreground">
                  {formatCurrency(expense.approvalThresholdAtCreation)}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-3 p-4 rounded-xl border border-border bg-card/40">
            <h4 className="font-semibold text-foreground uppercase tracking-wider text-[11px] border-b border-border pb-1.5">
              Audit & Sign-Off History
            </h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Recorded By:</span>
                <span className="font-medium text-foreground">
                  {expense.recordedBy?.name || "Cashier"}
                </span>
              </div>
              {expense.approvedBy && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Approved By:</span>
                  <span className="font-medium text-emerald-600 dark:text-emerald-400">
                    {expense.approvedBy.name} (
                    {new Date(expense.approvedAt!).toLocaleDateString()})
                  </span>
                </div>
              )}
              {expense.rejectedBy && (
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Rejected By:</span>
                    <span className="font-medium text-rose-600 dark:text-rose-400">
                      {expense.rejectedBy.name}
                    </span>
                  </div>
                  {expense.rejectionReason && (
                    <p className="text-[11px] text-rose-800 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/30 p-2 rounded-lg">
                      Reason: {expense.rejectionReason}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Description Note */}
        {expense.description && (
          <div className="p-3.5 rounded-xl border border-border bg-muted/20 text-xs">
            <span className="font-semibold text-muted-foreground block mb-1">
              Description & Notes:
            </span>
            <p className="text-foreground whitespace-pre-wrap">
              {expense.description}
            </p>
          </div>
        )}

        {/* Receipt Photo Preview */}
        {expense.receiptUrl && (
          <div className="space-y-2">
            <span className="text-xs font-semibold text-foreground block">
              Attached Receipt Document:
            </span>
            <div className="p-2 border border-border rounded-xl bg-card max-w-sm">
              <a
                href={expense.receiptUrl}
                target="_blank"
                rel="noreferrer"
                className="group relative block overflow-hidden rounded-lg w-full h-44"
              >
                <Image
                  src={expense.receiptUrl}
                  alt="Receipt bill"
                  fill
                  unoptimized
                  className="object-cover group-hover:scale-105 transition-transform duration-200"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-semibold gap-1.5 z-10">
                  <ExternalLink className="h-4 w-4" />
                  View Original Bill
                </div>
              </a>
            </div>
          </div>
        )}

        {/* Manager Action Area: Approve or Reject */}
        {isPending && (canApprove || canReject) && (
          <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/5 space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-amber-800 dark:text-amber-300">
              <ShieldCheck className="h-4.5 w-4.5 text-amber-600 dark:text-amber-400" />
              <span>Manager Review & Decision</span>
            </div>
            <p className="text-xs text-muted-foreground">
              This expense exceeded the branch creation threshold of{" "}
              {formatCurrency(expense.approvalThresholdAtCreation)}. Approving
              will sign off on this expense and immediately disburse cash if
              paid from the Cash Drawer.
            </p>

            {isRejecting ? (
              <div className="space-y-3 pt-2">
                <Textarea
                  placeholder="Explain why this expense is being rejected (mandatory for audit log)..."
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  className="text-xs"
                  rows={2}
                />
                <div className="flex items-center justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsRejecting(false)}
                    className="text-xs"
                  >
                    Back
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleReject}
                    disabled={rejectMutation.isPending}
                    className="text-xs font-semibold"
                  >
                    {rejectMutation.isPending
                      ? "Rejecting..."
                      : "Confirm Rejection"}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-end gap-2.5 pt-2">
                {canReject && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsRejecting(true)}
                    className="text-xs text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900/50 hover:bg-rose-50"
                  >
                    Reject Expense
                  </Button>
                )}
                {canApprove && (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={handleApprove}
                    disabled={approveMutation.isPending}
                    className="text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    {approveMutation.isPending
                      ? "Approving..."
                      : "Approve & Disburse"}
                  </Button>
                )}
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
