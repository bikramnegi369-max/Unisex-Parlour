"use client";

import React, { useState } from "react";
import { formatCurrency, formatDateTime } from "@/lib/formatters";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { hasPermission } from "@/lib/permissions";
import { PaymentRecordStatusBadge } from "./InvoiceStatusBadge";
import { VoidPaymentDialog } from "./VoidPaymentDialog";
import { Button } from "@/components/ui/button";
import { Ban, CreditCard } from "lucide-react";
import type { PaymentRecord } from "../types/billing.types";

interface InvoicePaymentHistoryProps {
  payments: PaymentRecord[];
  invoiceId: string;
  isInvoiceCancelled?: boolean;
  isFullyRefunded?: boolean;
}

export function InvoicePaymentHistory({
  payments,
  invoiceId,
  isInvoiceCancelled,
  isFullyRefunded = false,
}: InvoicePaymentHistoryProps) {
  const { user } = useAuth();
  const canVoid = hasPermission(user, "payments.refund");
  const [selectedPaymentForVoid, setSelectedPaymentForVoid] = useState<PaymentRecord | null>(null);

  if (!payments || payments.length === 0) {
    return (
      <div className="p-8 text-center bg-card border border-border/80 rounded-xl space-y-2">
        <CreditCard className="h-8 w-8 text-muted-foreground/60 mx-auto" />
        <p className="text-sm font-semibold text-foreground">No Payments Recorded</p>
        <p className="text-xs text-muted-foreground">
          No payment records have been added to this invoice yet.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="border border-border/80 rounded-xl overflow-hidden bg-card shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-muted/40 border-b border-border text-muted-foreground font-semibold">
                <th className="px-4 py-3">Payment #</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Method</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Recorded By</th>
                <th className="px-4 py-3">Reference / Void Reason</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {payments.map((p) => {
                const recordedByName =
                  typeof p.recordedBy === "object" && p.recordedBy !== null
                    ? p.recordedBy.name
                    : typeof p.recordedBy === "string"
                    ? p.recordedBy
                    : "Staff";

                const isVoided = p.status === "voided";
                const isRefundRecord = Number(p.amount) < 0;
                const isReversedByFullRefund =
                  isFullyRefunded && !isVoided && !isRefundRecord;

                return (
                  <tr
                    key={p.id}
                    className={`transition-colors ${
                      isVoided || isReversedByFullRefund
                        ? "bg-muted/20 opacity-75"
                        : "hover:bg-muted/30"
                    }`}
                  >
                    <td className="px-4 py-3 font-semibold text-foreground">
                      {p.paymentNumber}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                      {formatDateTime(p.paidAt)}
                    </td>
                    <td className="px-4 py-3 capitalize font-medium">
                      {p.paymentMethod}
                    </td>
                    <td
                      className={`px-4 py-3 text-right font-bold ${
                        isVoided || isReversedByFullRefund
                          ? "line-through text-muted-foreground"
                          : isRefundRecord
                            ? "text-rose-600"
                            : "text-foreground"
                      }`}
                    >
                      {formatCurrency(p.amount)}
                    </td>
                    <td className="px-4 py-3">
                      {isRefundRecord ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-400">
                          Refund
                        </span>
                      ) : isReversedByFullRefund ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400">
                          Reversed by refund
                        </span>
                      ) : (
                        <PaymentRecordStatusBadge status={p.status} />
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {recordedByName}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground max-w-xs truncate">
                      {isVoided ? (
                        <span className="text-destructive font-medium">
                          Void: {p.voidReason || "Reversed"}
                        </span>
                      ) : (
                        p.referenceNote || "—"
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {!isVoided &&
                        !isRefundRecord &&
                        !isReversedByFullRefund &&
                        !isInvoiceCancelled &&
                        canVoid && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedPaymentForVoid(p)}
                          className="h-7 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive gap-1 px-2"
                          title="Void payment record"
                        >
                          <Ban className="h-3 w-3" />
                          <span>Void</span>
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <VoidPaymentDialog
        isOpen={Boolean(selectedPaymentForVoid)}
        onClose={() => setSelectedPaymentForVoid(null)}
        payment={selectedPaymentForVoid}
        invoiceId={invoiceId}
      />
    </>
  );
}
