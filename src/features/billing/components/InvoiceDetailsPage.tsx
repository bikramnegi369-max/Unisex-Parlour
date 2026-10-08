"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Receipt,
  ArrowLeft,
  User,
  Calendar,
  CheckCircle2,
  XCircle,
  Edit,
  CreditCard,
  Building,
  ShieldCheck,
  Scissors,
  Printer,
  FileText,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { ErrorState } from "@/components/ui/error-state";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useBranchContext } from "@/hooks/useBranchContext";
import { hasPermission } from "@/lib/permissions";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/formatters";
import { useInvoice, useInvoicePayments } from "../hooks/useBillingQueries";
import {
  useFinalizeInvoice,
  useCancelInvoice,
} from "../hooks/useBillingMutations";
import { InvoiceStatusBadge, PaymentStatusBadge } from "./InvoiceStatusBadge";
import { EditDraftInvoiceDialog } from "./EditDraftInvoiceDialog";
import { RecordPaymentDialog } from "./RecordPaymentDialog";
import { InvoicePaymentHistory } from "./InvoicePaymentHistory";
import { PrintableInvoiceReceipt } from "./PrintableInvoiceReceipt";
import { downloadInvoicePdf } from "../api/billing.api";
import { useSubscriptions } from "@/features/subscriptions/hooks/useSubscriptions";
import type { InvoiceLineItem } from "../types/billing.types";

interface InvoiceDetailsPageProps {
  id: string;
}

export function InvoiceDetailsPage({ id }: InvoiceDetailsPageProps) {
  const router = useRouter();
  const { user } = useAuth();
  const { getBranchName } = useBranchContext();

  const [isEditDraftOpen, setIsEditDraftOpen] = useState(false);
  const [isRecordPaymentOpen, setIsRecordPaymentOpen] = useState(false);
  const [isFinalizeConfirmOpen, setIsFinalizeConfirmOpen] = useState(false);
  const [isCancelConfirmOpen, setIsCancelConfirmOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  const { data: invoice, isLoading, isError, refetch } = useInvoice(id);
  const { data: payments = [] } = useInvoicePayments(id);

  const finalizeMutation = useFinalizeInvoice();
  const cancelMutation = useCancelInvoice();

  const canCheckout = hasPermission(user, "billing.checkout");
  const canVoid = hasPermission(user, "billing.void");
  const canReceivePayment = hasPermission(user, "payments.receive");

  // Optional customer subscription lookup to resolve human-readable subscription codes
  // MUST be called unconditionally before any early returns to satisfy React Rules of Hooks
  const customerId = invoice?.customerId || invoice?.customer?.id;
  const { data: customerSubsData } = useSubscriptions(
    { customerId: customerId || undefined, limit: 50 },
    { enabled: Boolean(customerId) },
  );

  const subscriptionMap = React.useMemo(() => {
    const map = new Map<
      string,
      { code: string; planName?: string; id: string }
    >();
    if (customerSubsData?.data) {
      for (const sub of customerSubsData.data) {
        const planName =
          typeof sub.planId === "object" ? sub.planId?.name : undefined;
        map.set(sub.id, { code: sub.subscriptionCode, planName, id: sub.id });
      }
    }
    return map;
  }, [customerSubsData]);

  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = async () => {
    if (!invoice) return;
    setIsDownloadingPdf(true);
    try {
      await downloadInvoicePdf(invoice.id, invoice.invoiceNumber, "open");
      toast.success("Invoice PDF opened for viewing / printing.");
    } catch (err: unknown) {
      const axiosError = err as {
        response?: { data?: { message?: string } };
        message?: string;
      };
      const msg =
        axiosError.response?.data?.message ||
        axiosError.message ||
        "Failed to download invoice PDF. (Backend PDF service may still be generating).";
      toast.error(msg);
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-9 w-48 bg-muted rounded-lg" />
        <div className="h-32 bg-card border border-border rounded-xl" />
        <div className="h-64 bg-card border border-border rounded-xl" />
      </div>
    );
  }

  if (isError || !invoice) {
    return (
      <ErrorState
        title="Invoice Not Found"
        description="The requested invoice could not be retrieved or you do not have permission to view it."
        retryAction={{
          label: "Try Again",
          onClick: () => refetch(),
        }}
      />
    );
  }

  const isDraft = invoice.status === "draft";
  const isFinalized = invoice.status === "finalized";
  const isCancelled = invoice.status === "cancelled";
  const canCancelInvoice = isDraft || (isFinalized && invoice.amountPaid === 0);

  const handleFinalize = async () => {
    try {
      await finalizeMutation.mutateAsync(invoice.id);
      toast.success(`Invoice ${invoice.invoiceNumber} finalized successfully.`);
      setIsFinalizeConfirmOpen(false);
    } catch (err: unknown) {
      const axiosError = err as {
        response?: { data?: { message?: string } };
        message?: string;
      };
      const msg =
        axiosError.response?.data?.message ||
        axiosError.message ||
        "Failed to finalize invoice.";
      toast.error(msg);
    }
  };

  const handleCancel = async () => {
    try {
      await cancelMutation.mutateAsync({
        id: invoice.id,
        payload: { reason: cancelReason.trim() || undefined },
      });
      toast.success(`Invoice ${invoice.invoiceNumber} cancelled.`);
      setIsCancelConfirmOpen(false);
    } catch (err: unknown) {
      const axiosError = err as {
        response?: { data?: { message?: string } };
        message?: string;
      };
      const msg =
        axiosError.response?.data?.message ||
        axiosError.message ||
        "Failed to cancel invoice.";
      toast.error(msg);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Top Bar Navigation & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/billing")}
            className="h-8 w-8 p-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-foreground">
                {invoice.invoiceNumber}
              </h1>
              <InvoiceStatusBadge status={invoice.status} />
              <PaymentStatusBadge status={invoice.paymentStatus} />
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Created on {formatDateTime(invoice.createdAt)}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Draft Actions */}
          {isDraft && canCheckout && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditDraftOpen(true)}
                className="text-xs h-8 gap-1.5"
              >
                <Edit className="h-3.5 w-3.5 text-muted-foreground" />
                <span>Edit Discount / Notes</span>
              </Button>

              <Button
                size="sm"
                onClick={() => setIsFinalizeConfirmOpen(true)}
                className="text-xs h-8 gap-1.5 font-semibold bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Finalize Invoice</span>
              </Button>
            </>
          )}

          {/* Payment Recording (Only when finalized and amountDue > 0) */}
          {isFinalized && invoice.amountDue > 0 && canReceivePayment && (
            <Button
              size="sm"
              onClick={() => setIsRecordPaymentOpen(true)}
              className="text-xs h-8 gap-1.5 font-bold shadow-xs"
            >
              <CreditCard className="h-3.5 w-3.5" />
              <span>Record Payment</span>
            </Button>
          )}

          {/* Official PDF Document Action */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadPdf}
            disabled={isDownloadingPdf}
            className="text-xs h-8 gap-1.5 font-medium"
            title="Download or preview official tax invoice PDF"
          >
            {isDownloadingPdf ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
            ) : (
              <FileText className="h-3.5 w-3.5 text-primary" />
            )}
            <span>{isDownloadingPdf ? "Opening PDF..." : "Official PDF"}</span>
          </Button>

          {/* Quick Print Receipt Action */}
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrint}
            className="text-xs h-8 gap-1.5 text-muted-foreground hover:text-foreground"
            title="Fast print receipt on local thermal/POS printer"
          >
            <Printer className="h-3.5 w-3.5" />
            <span>Print Receipt</span>
          </Button>

          {/* Cancellation Action */}
          {!isCancelled && canCancelInvoice && canVoid && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsCancelConfirmOpen(true)}
              className="text-xs h-8 gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              <XCircle className="h-3.5 w-3.5" />
              <span>Cancel Invoice</span>
            </Button>
          )}
        </div>
      </div>

      {/* Main Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Customer & Appointment Info Card */}
        <div className="bg-card border border-border/80 rounded-2xl p-4 shadow-2xs space-y-3">
          <h2 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
            <User className="h-3.5 w-3.5 text-primary" />
            Customer Info
          </h2>
          <div className="text-xs space-y-1">
            <p className="font-semibold text-foreground text-sm">
              {invoice.customer?.name || "Customer"}
            </p>
            <p className="text-muted-foreground">
              Phone: {invoice.customer?.phone || "—"}
            </p>
            {invoice.customer?.email && (
              <p className="text-muted-foreground">
                Email: {invoice.customer.email}
              </p>
            )}
          </div>

          <div className="pt-3 border-t border-border/60 text-xs space-y-1.5">
            <span className="font-semibold text-foreground flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-primary" />
              Appointment Context
            </span>
            <p className="text-muted-foreground">
              Code:{" "}
              {invoice.appointmentCode ||
                invoice.appointment?.appointmentCode ||
                `#${invoice.appointmentId.slice(-6)}`}
            </p>
            {invoice.appointment?.date && (
              <p className="text-muted-foreground">
                Date: {formatDate(invoice.appointment.date, "dd MMM yyyy")}{" "}
                {invoice.appointment.startTime
                  ? `at ${invoice.appointment.startTime}`
                  : ""}
              </p>
            )}
            <p className="text-muted-foreground flex items-center gap-1">
              <Building className="h-3 w-3" />
              Branch: {invoice.branch?.name || getBranchName(invoice.branchId)}
            </p>
          </div>
        </div>

        {/* Financial Summary Card */}
        <div className="md:col-span-2 bg-card border border-border/80 rounded-2xl p-4 shadow-2xs space-y-3">
          <h2 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
            <Receipt className="h-3.5 w-3.5 text-primary" />
            Financial Breakdown
          </h2>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between text-muted-foreground">
              <span>Subtotal (Sum of items)</span>
              <span className="font-semibold text-foreground">
                {formatCurrency(invoice.subtotal)}
              </span>
            </div>

            {invoice.discountTotal > 0 && (
              <div className="flex justify-between text-muted-foreground">
                <span>Discount Applied</span>
                <span className="font-semibold text-foreground">
                  -{formatCurrency(invoice.discountTotal)}
                </span>
              </div>
            )}

            <div className="flex justify-between text-muted-foreground">
              <span>Gross Payable</span>
              <span className="font-semibold text-foreground">
                {formatCurrency(invoice.grossPayable)}
              </span>
            </div>

            {invoice.subscriptionCoveredAmount > 0 && (
              <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-medium">
                <span className="flex items-center gap-1">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Subscription Covered Amount
                </span>
                <span className="font-bold">
                  -{formatCurrency(invoice.subscriptionCoveredAmount)}
                </span>
              </div>
            )}

            <div className="flex justify-between pt-2 border-t border-border/60 text-sm font-bold text-foreground">
              <span>Payable Amount</span>
              <span className="text-base text-primary font-black">
                {formatCurrency(invoice.payableAmount)}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border/60">
              <div className="p-2.5 bg-muted/40 rounded-xl">
                <span className="text-[11px] text-muted-foreground block">
                  Amount Paid
                </span>
                <span className="text-sm font-extrabold text-foreground">
                  {formatCurrency(invoice.amountPaid)}
                </span>
              </div>
              <div className="p-2.5 bg-muted/40 rounded-xl">
                <span className="text-[11px] text-muted-foreground block">
                  Outstanding Due
                </span>
                <span
                  className={`text-sm font-extrabold ${invoice.amountDue > 0 ? "text-primary" : "text-emerald-600 dark:text-emerald-400"}`}
                >
                  {formatCurrency(invoice.amountDue)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Invoice Line Items Table */}
      <div className="bg-card border border-border/80 rounded-2xl p-4 shadow-2xs space-y-3">
        <h2 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
          <Scissors className="h-3.5 w-3.5 text-primary" />
          Service Line Items
        </h2>

        <div className="border border-border/80 rounded-xl overflow-hidden divide-y divide-border/60">
          <div className="grid grid-cols-12 px-4 py-2.5 bg-muted/40 text-[11px] font-semibold text-muted-foreground">
            <span className="col-span-5">Service</span>
            <span className="col-span-2 text-right">Unit Price</span>
            <span className="col-span-2 text-right">Subscription Waived</span>
            <span className="col-span-3 text-right">Customer Payable</span>
          </div>

          {invoice.items.map((item: InvoiceLineItem, idx: number) => {
            const isRedeemed = Boolean(
              item.isRedeemedViaSubscription || item.appliedSubscriptionId,
            );
            return (
              <div
                key={item.id || idx}
                className="grid grid-cols-12 px-4 py-3 text-xs items-center gap-2"
              >
                <div className="col-span-5">
                  <span className="font-semibold text-foreground block">
                    {item.serviceName}
                  </span>
                  {item.duration && (
                    <span className="text-[10px] text-muted-foreground">
                      {item.duration} mins
                    </span>
                  )}
                  {isRedeemed &&
                    (() => {
                      const subInfo = item.appliedSubscriptionId
                        ? subscriptionMap.get(item.appliedSubscriptionId)
                        : undefined;
                      const displayCode =
                        item.subscriptionCode ||
                        subInfo?.code ||
                        (item.appliedSubscriptionId &&
                        item.appliedSubscriptionId !== "auto"
                          ? `#${item.appliedSubscriptionId.slice(-6)}`
                          : null);
                      const subTargetId =
                        subInfo?.id ||
                        (item.appliedSubscriptionId &&
                        item.appliedSubscriptionId !== "auto"
                          ? item.appliedSubscriptionId
                          : null);

                      return (
                        <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-500/10 px-1.5 py-0.5 rounded mt-1">
                          <ShieldCheck className="h-3 w-3" />
                          Redeemed via{" "}
                          {displayCode && subTargetId ? (
                            <Link
                              href={`/subscriptions/${subTargetId}`}
                              className="underline hover:opacity-80 font-bold"
                            >
                              {displayCode}
                            </Link>
                          ) : (
                            <span>{displayCode || "Subscription"}</span>
                          )}
                        </span>
                      );
                    })()}
                </div>

                <div className="col-span-2 text-right font-medium text-foreground">
                  {formatCurrency(item.unitPrice)}
                </div>

                <div className="col-span-2 text-right">
                  {item.subscriptionCoveredAmount &&
                  item.subscriptionCoveredAmount > 0 ? (
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                      -{formatCurrency(item.subscriptionCoveredAmount)}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </div>

                <div className="col-span-3 text-right font-bold text-foreground">
                  {formatCurrency(
                    item.customerPayable !== undefined
                      ? item.customerPayable
                      : Math.max(
                          0,
                          item.lineTotal -
                            (item.subscriptionCoveredAmount || 0),
                        ),
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Notes & Cancellation Section */}
      {(invoice.notes || invoice.cancellationReason) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {invoice.notes && (
            <div className="p-3.5 bg-card border border-border/80 rounded-xl text-xs space-y-1">
              <span className="font-semibold text-foreground">Notes:</span>
              <p className="text-muted-foreground">{invoice.notes}</p>
            </div>
          )}
          {invoice.cancellationReason && (
            <div className="p-3.5 bg-destructive/10 border border-destructive/20 rounded-xl text-xs space-y-1 text-destructive">
              <span className="font-semibold">Cancellation Reason:</span>
              <p>{invoice.cancellationReason}</p>
            </div>
          )}
        </div>
      )}

      {/* Payment History Section */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-primary" />
            Manual Payment Records
          </h2>
          {isFinalized && invoice.amountDue > 0 && canReceivePayment && (
            <Button
              size="sm"
              onClick={() => setIsRecordPaymentOpen(true)}
              className="text-xs h-7 gap-1 font-semibold"
            >
              <CreditCard className="h-3 w-3" />
              <span>Record Payment</span>
            </Button>
          )}
        </div>

        <InvoicePaymentHistory
          payments={payments}
          invoiceId={invoice.id}
          isInvoiceCancelled={isCancelled}
        />
      </div>

      {/* Modals & Dialogs */}
      <EditDraftInvoiceDialog
        isOpen={isEditDraftOpen}
        onClose={() => setIsEditDraftOpen(false)}
        invoice={invoice}
      />

      <RecordPaymentDialog
        isOpen={isRecordPaymentOpen}
        onClose={() => setIsRecordPaymentOpen(false)}
        invoice={invoice}
      />

      {/* Finalize Confirmation Dialog */}
      <Dialog
        isOpen={isFinalizeConfirmOpen}
        onClose={() => setIsFinalizeConfirmOpen(false)}
        title={`Finalize Invoice ${invoice.invoiceNumber}`}
        className="max-w-md"
      >
        <div className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Finalizing will permanently lock the invoice line items, pricing,
            and discount. Once finalized, you can record customer payments
            against this invoice.
          </p>
          <div className="p-3 bg-muted/40 rounded-xl border border-border text-xs space-y-1">
            <div className="flex justify-between font-semibold text-foreground">
              <span>Final Payable Amount:</span>
              <span className="text-primary font-black">
                {formatCurrency(invoice.payableAmount)}
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              No further price edits or discount modifications can be made after
              finalization.
            </p>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsFinalizeConfirmOpen(false)}
              disabled={finalizeMutation.isPending}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleFinalize}
              disabled={finalizeMutation.isPending}
              className="text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {finalizeMutation.isPending
                ? "Finalizing..."
                : "Confirm & Finalize"}
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Cancel Confirmation Dialog */}
      <Dialog
        isOpen={isCancelConfirmOpen}
        onClose={() => setIsCancelConfirmOpen(false)}
        title={`Cancel Invoice ${invoice.invoiceNumber}`}
        className="max-w-md"
      >
        <div className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Are you sure you want to cancel this invoice? Cancellation is only
            allowed when amount paid is zero. The historical record will be
            preserved.
          </p>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">
              Cancellation Reason (Optional)
            </label>
            <Textarea
              rows={2}
              placeholder="Explain reason for invoice cancellation..."
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              className="text-xs resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsCancelConfirmOpen(false)}
              disabled={cancelMutation.isPending}
              className="text-xs"
            >
              Keep Invoice
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleCancel}
              disabled={cancelMutation.isPending}
              className="text-xs font-semibold"
            >
              {cancelMutation.isPending ? "Cancelling..." : "Confirm Cancel"}
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Hidden print receipt for standard browser print / POS roll thermal printer */}
      <PrintableInvoiceReceipt
        invoice={invoice}
        branchName={invoice.branch?.name || getBranchName(invoice.branchId)}
      />
    </div>
  );
}
