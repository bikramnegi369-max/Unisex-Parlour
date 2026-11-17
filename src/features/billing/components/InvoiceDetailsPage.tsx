"use client";

import React, { useMemo, useState } from "react";
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
  Sparkles,
  Phone,
  Mail,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { ErrorState } from "@/components/ui/error-state";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useBranchContext } from "@/hooks/useBranchContext";
import { hasPermission } from "@/lib/permissions";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/formatters";
import { useInvoice, useInvoicePayments } from "../hooks/useBillingQueries";
import {
  useFinalizeInvoice,
  useCancelInvoice,
  useCorrectInvoiceAttribution,
  useConfirmWalkInServiceFulfillment,
  useRefundUnusedMembership,
} from "../hooks/useBillingMutations";
import {
  InvoiceStatusBadge,
  PaymentStatusBadge,
  InvoiceTypeBadge,
} from "./InvoiceStatusBadge";
import { EditDraftInvoiceDialog } from "./EditDraftInvoiceDialog";
import { ApplyDiscountDialog } from "./ApplyDiscountDialog";
import { ModifyDiscountDialog } from "./ModifyDiscountDialog";
import { RemoveDiscountDialog } from "./RemoveDiscountDialog";
import { DiscountHistoryDialog } from "./DiscountHistoryDialog";
import { RecordPaymentDialog } from "./RecordPaymentDialog";
import { InvoicePaymentHistory } from "./InvoicePaymentHistory";
import { PrintableInvoiceReceipt } from "./PrintableInvoiceReceipt";
import { InvoiceCouponSection } from "./InvoiceCouponSection";
import {
  downloadInvoicePdf,
  getWalkInFulfillmentStatus,
} from "../api/billing.api";
import { useSubscriptions } from "@/features/subscriptions/hooks/useSubscriptions";
import type {
  InvoiceLineItem,
  AppliedDiscount,
  PaymentMethod,
} from "../types/billing.types";
import { StaffAttributionSelect } from "@/features/employees/components/StaffAttributionSelect";
import {
  Tag,
  History,
  Trash2,
  Edit3,
  Plus,
  Percent,
  IndianRupee,
  Layers,
  FileSpreadsheet,
} from "lucide-react";

interface InvoiceDetailsPageProps {
  id: string;
}

export function InvoiceDetailsPage({ id }: InvoiceDetailsPageProps) {
  const router = useRouter();
  const { user } = useAuth();
  const { getBranchName } = useBranchContext();

  const [isEditDraftOpen, setIsEditDraftOpen] = useState(false);
  const [isApplyDiscountOpen, setIsApplyDiscountOpen] = useState(false);
  const [selectedDiscountForEdit, setSelectedDiscountForEdit] =
    useState<AppliedDiscount | null>(null);
  const [selectedDiscountForRemove, setSelectedDiscountForRemove] =
    useState<AppliedDiscount | null>(null);
  const [selectedLineForDiscount, setSelectedLineForDiscount] = useState<
    string | null
  >(null);
  const [isDiscountHistoryOpen, setIsDiscountHistoryOpen] = useState(false);
  const [isRecordPaymentOpen, setIsRecordPaymentOpen] = useState(false);
  const [isFinalizeConfirmOpen, setIsFinalizeConfirmOpen] = useState(false);
  const [isCancelConfirmOpen, setIsCancelConfirmOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [isAttributionDialogOpen, setIsAttributionDialogOpen] = useState(false);
  const [attributionLine, setAttributionLine] = useState<InvoiceLineItem | null>(null);
  const [attributionRole, setAttributionRole] = useState<
    "seller" | "renewal_handler"
  >("seller");
  const [attributionStaffId, setAttributionStaffId] = useState<string | null>(null);
  const [attributionReason, setAttributionReason] = useState("");
  const [isWalkInFulfillmentDialogOpen, setIsWalkInFulfillmentDialogOpen] = useState(false);
  const [walkInFulfillmentReason, setWalkInFulfillmentReason] = useState("");
  const [isMembershipRefundOpen, setIsMembershipRefundOpen] = useState(false);
  const [membershipRefundLine, setMembershipRefundLine] =
    useState<InvoiceLineItem | null>(null);
  const [membershipRefundReason, setMembershipRefundReason] = useState("");
  const [membershipRefundMethod, setMembershipRefundMethod] =
    useState<PaymentMethod>("cash");

  const queryClient = useQueryClient();
  const { data: invoice, isLoading, isError, refetch } = useInvoice(id);
  const { data: payments = [] } = useInvoicePayments(id);

  const finalizeMutation = useFinalizeInvoice();
  const cancelMutation = useCancelInvoice();
  const attributionMutation = useCorrectInvoiceAttribution();
  const walkInFulfillmentMutation = useConfirmWalkInServiceFulfillment();
  const membershipRefundMutation = useRefundUnusedMembership();

  const canCheckout = hasPermission(user, "billing.checkout");
  const canApplyCoupons = hasPermission(user, "coupons.apply");
  const canManageCoupons = canCheckout && canApplyCoupons;
  const canVoid = hasPermission(user, "billing.void");
  const canReceivePayment = hasPermission(user, "payments.receive");
  const canCorrectAttribution = hasPermission(user, "billing.attribution.correct");
  const canConfirmFulfillment = hasPermission(user, "incentives.fulfillment.confirm");
  const canRefundPayments = hasPermission(user, "payments.refund");

  // Optional customer subscription lookup to resolve human-readable subscription codes
  // MUST be called unconditionally before any early returns to satisfy React Rules of Hooks
  const customerId = invoice?.customerId || invoice?.customer?.id;
  const { data: customerSubsData } = useSubscriptions(
    { customerId: customerId || undefined, limit: 50 },
    { enabled: Boolean(customerId) },
  );
  const walkInFulfillmentQuery = useQuery({
    queryKey: ["incentives", "fulfillment", invoice?.id, invoice?.branchId],
    queryFn: () =>
      getWalkInFulfillmentStatus(invoice!.id, invoice!.branchId),
    enabled: Boolean(
      invoice &&
        canConfirmFulfillment &&
        !invoice.appointmentId &&
        invoice.branchId &&
        (invoice.lines || invoice.items).some((line) => line.lineType === "service"),
    ),
  });

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

  const handleRefundUnusedMembership = async () => {
    if (!invoice) return;
    const branchId = invoice.branchId || invoice.branch?.id;
    const lineId = membershipRefundLine?.id || membershipRefundLine?._id;
    if (!branchId || !lineId || membershipRefundReason.trim().length < 3) {
      toast.error("Provide a refund reason before continuing.");
      return;
    }
    try {
      await membershipRefundMutation.mutateAsync({
        invoiceId: invoice.id,
        payload: {
          branchId,
          lineId,
          refundPaymentMethod: membershipRefundMethod,
          reason: membershipRefundReason.trim(),
          idempotencyKey: `membership-refund:${invoice.id}:${lineId}`,
        },
      });
      toast.success(
        "Membership refund recorded. No payment processor was called.",
      );
      setIsMembershipRefundOpen(false);
      setMembershipRefundLine(null);
      setMembershipRefundReason("");
      await refetch();
    } catch (error: unknown) {
      const axiosError = error as {
        response?: { data?: { message?: string } };
        message?: string;
      };
      toast.error(
        axiosError.response?.data?.message ||
          axiosError.message ||
          "Unable to record the membership refund.",
      );
    }
  };

  const walkInServiceLines = useMemo(
    () =>
      (invoice?.lines || invoice?.items || []).filter(
        (line) => line.lineType === "service" && Boolean(line.id || line._id),
      ),
    [invoice?.lines, invoice?.items],
  );
  const refundableMembershipLines = useMemo(
    () =>
      (invoice?.lines || invoice?.items || []).filter(
        (line) =>
          line.lineType === "membership" &&
          Boolean(line.customerMembershipId) &&
          Number(line.returnedQuantity || 0) < Number(line.quantity || 1),
      ),
    [invoice?.lines, invoice?.items],
  );
  const confirmedWalkInLineIds = new Set(
    walkInFulfillmentQuery.data?.confirmedLineIds || [],
  );
  const pendingWalkInLineIds = walkInServiceLines
    .map((line) => line.id || line._id || "")
    .filter((lineId) => lineId && !confirmedWalkInLineIds.has(lineId));

  const handleConfirmWalkInFulfillment = async () => {
    if (!invoice) return;
    const branchId = invoice.branchId || invoice.branch?.id;
    if (!branchId || pendingWalkInLineIds.length === 0 || walkInFulfillmentReason.trim().length < 3) {
      toast.error("Choose service lines and provide a fulfillment reason.");
      return;
    }
    try {
      await walkInFulfillmentMutation.mutateAsync({
        invoiceId: invoice.id,
        lineIds: pendingWalkInLineIds,
        reason: walkInFulfillmentReason.trim(),
        branchId,
      });
      toast.success("Walk-in service fulfillment recorded.");
      setIsWalkInFulfillmentDialogOpen(false);
      setWalkInFulfillmentReason("");
      await walkInFulfillmentQuery.refetch();
    } catch (error: unknown) {
      const axiosError = error as {
        response?: { data?: { message?: string } };
        message?: string;
      };
      toast.error(
        axiosError.response?.data?.message ||
          axiosError.message ||
          "Unable to confirm service fulfillment.",
      );
    }
  };

  const handleDownloadPdf = async () => {
    if (!invoice) return;
    setIsDownloadingPdf(true);
    const targetBranchId = invoice.branchId || invoice.branch?.id;
    try {
      await downloadInvoicePdf(
        invoice.id,
        invoice.invoiceNumber,
        "open",
        targetBranchId,
      );
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
  const getAttributionRoles = (item: InvoiceLineItem) => {
    const roles: ("seller" | "renewal_handler")[] = [];
    if (["product", "membership", "subscription"].includes(item.lineType || "")) {
      roles.push("seller");
    }
    if (item.lineType === "subscription" && item.subscriptionId) {
      roles.push("renewal_handler");
    }
    return roles;
  };
  const openAttributionDialog = (item: InvoiceLineItem) => {
    const roles = getAttributionRoles(item);
    if (!roles.length) return;
    const currentRole = item.attribution?.renewalHandler
      ? "renewal_handler"
      : "seller";
    const role = roles.includes(currentRole) ? currentRole : roles[0];
    setAttributionLine(item);
    setAttributionRole(role);
    setAttributionStaffId(
      role === "renewal_handler"
        ? item.attribution?.renewalHandler?.staffId || null
        : item.attribution?.soldBy?.staffId || null,
    );
    setAttributionReason("");
    setIsAttributionDialogOpen(true);
  };
  const handleCorrectAttribution = async () => {
    const branchId = invoice.branchId || invoice.branch?.id;
    if (!branchId || !attributionLine?.id || attributionReason.trim().length < 3) {
      toast.error("Choose a branch, invoice line, and provide a correction reason.");
      return;
    }
    try {
      await attributionMutation.mutateAsync({
        id: invoice.id,
        payload: {
          branchId,
          lineId: attributionLine.id,
          sourceRole: attributionRole,
          staffId: attributionStaffId,
          reason: attributionReason.trim(),
        },
      });
      toast.success("Invoice source attribution corrected.");
      setIsAttributionDialogOpen(false);
      await refetch();
    } catch (error: unknown) {
      const axiosError = error as {
        response?: { data?: { message?: string } };
        message?: string;
      };
      toast.error(
        axiosError.response?.data?.message ||
          axiosError.message ||
          "Unable to correct invoice attribution.",
      );
    }
  };

  const handleFinalize = async () => {
    try {
      const targetBranchId = invoice.branchId || invoice.branch?.id;
      await finalizeMutation.mutateAsync({
        id: invoice.id,
        branchId: targetBranchId,
      });
      toast.success(`Invoice ${invoice.invoiceNumber} finalized successfully.`);
      setIsFinalizeConfirmOpen(false);
    } catch (err: unknown) {
      const axiosError = err as {
        response?: { status?: number; data?: { message?: string } };
        message?: string;
      };

      if (axiosError.response?.status === 409) {
        toast.error(
          "This subscription entitlement was recently used by another terminal. Refreshing draft...",
          { duration: 6000 },
        );
        setIsFinalizeConfirmOpen(false);
        // Refresh invoice and subscription caches immediately to display authoritative state
        await refetch();
        queryClient.invalidateQueries({
          predicate: (query) => {
            const key = query.queryKey[0];
            return (
              key === "invoices" ||
              key === "subscriptions" ||
              key === "checkout-queue" ||
              key === "invoice"
            );
          },
        });
        return;
      }

      const msg =
        axiosError.response?.data?.message ||
        axiosError.message ||
        "Failed to finalize invoice.";
      toast.error(msg);
    }
  };

  const handleCancel = async () => {
    try {
      const targetBranchId = invoice.branchId || invoice.branch?.id;
      await cancelMutation.mutateAsync({
        id: invoice.id,
        payload: {
          reason: cancelReason.trim() || undefined,
          ...(targetBranchId ? { branchId: targetBranchId } : {}),
        },
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
    <div className="space-y-6 w-full">
      {/* Professional ERP Page Header */}
      <div className="bg-card border border-border/80 rounded-2xl p-5 shadow-xs flex flex-col gap-4">
        {/* Row 1: Identification & Primary Lifecycle CTAs */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Identity & Status */}
          <div className="flex items-center gap-3.5 min-w-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push("/billing")}
              className="h-9 w-9 p-0 shrink-0 rounded-xl border-border/80 hover:bg-muted cursor-pointer"
              title="Return to Invoices List"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground font-mono truncate">
                  {invoice.invoiceNumber}
                </h1>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <InvoiceTypeBadge type={invoice.invoiceType} />
                  <InvoiceStatusBadge status={invoice.status} />
                  <PaymentStatusBadge status={invoice.paymentStatus} />
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Created {formatDateTime(invoice.createdAt)} • Branch:{" "}
                {invoice.branch?.name || getBranchName(invoice.branchId)}
              </p>
            </div>
          </div>

          {/* Primary Lifecycle CTAs */}
          <div className="flex items-center gap-2.5 flex-wrap self-start lg:self-auto shrink-0">
            {isDraft && canCheckout && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedLineForDiscount(null);
                    setIsApplyDiscountOpen(true);
                  }}
                  className="text-xs h-9 px-3.5 gap-1.5 font-semibold text-primary border-primary/30 hover:bg-primary/10 rounded-xl cursor-pointer"
                >
                  <Tag className="h-3.5 w-3.5" />
                  <span>Apply Discount</span>
                </Button>

                <Button
                  size="sm"
                  onClick={() => setIsFinalizeConfirmOpen(true)}
                  className="text-xs h-9 px-4 gap-1.5 font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs cursor-pointer"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>Finalize Invoice</span>
                </Button>
              </>
            )}
            {isFinalized &&
              invoice.paymentStatus === "paid" &&
              canRefundPayments &&
              refundableMembershipLines.map((line) => (
                <Button
                  key={line.id || line._id || line.customerMembershipId}
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setMembershipRefundLine(line);
                    setMembershipRefundReason("");
                    setIsMembershipRefundOpen(true);
                  }}
                  className="text-xs h-9 px-3.5 gap-1.5 font-semibold rounded-xl"
                >
                  <XCircle className="h-3.5 w-3.5" />
                  <span>Refund Membership</span>
                </Button>
              ))}
            {isFinalized &&
              !invoice.appointmentId &&
              walkInServiceLines.length > 0 &&
              canConfirmFulfillment &&
              (pendingWalkInLineIds.length > 0 ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsWalkInFulfillmentDialogOpen(true)}
                  disabled={walkInFulfillmentQuery.isLoading}
                  className="text-xs h-9 px-3.5 gap-1.5 font-semibold rounded-xl"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>Confirm Service Fulfillment</span>
                </Button>
              ) : (
                <span className="text-xs font-semibold text-emerald-700">
                  Service fulfillment confirmed
                </span>
              ))}

            {isFinalized && invoice.amountDue > 0 && canReceivePayment && (
              <Button
                size="sm"
                onClick={() => setIsRecordPaymentOpen(true)}
                className="text-xs h-9 px-4 gap-1.5 font-bold shadow-xs rounded-xl cursor-pointer bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <CreditCard className="h-3.5 w-3.5" />
                <span>Record Payment</span>
              </Button>
            )}
          </div>
        </div>

        {/* Row 2: Secondary Utilities Toolbar */}
        <div className="pt-3 border-t border-border/60 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-muted-foreground">
            <span className="font-medium text-foreground">
              Customer: {invoice.customer?.name || "Walk-in Guest"}
            </span>
            <span>•</span>
            <span>
              {invoice.items.length}{" "}
              {invoice.items.length === 1 ? "service" : "services"}
            </span>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {isDraft && canCheckout && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditDraftOpen(true)}
                className="text-xs h-8 px-2.5 gap-1.5 text-muted-foreground hover:text-foreground rounded-lg cursor-pointer"
              >
                <Edit className="h-3 w-3" />
                <span>Edit Notes</span>
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsDiscountHistoryOpen(true)}
              className="text-xs h-8 px-2.5 gap-1.5 text-muted-foreground hover:text-foreground rounded-lg cursor-pointer"
              title="View discount audit history"
            >
              <History className="h-3 w-3" />
              <span>Discount History</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadPdf}
              disabled={isDownloadingPdf}
              className="text-xs h-8 px-2.5 gap-1.5 text-muted-foreground hover:text-foreground rounded-lg cursor-pointer"
              title="Download or preview official invoice PDF"
            >
              {isDownloadingPdf ? (
                <Loader2 className="h-3 w-3 animate-spin text-primary" />
              ) : (
                <FileText className="h-3 w-3 text-primary" />
              )}
              <span>{isDownloadingPdf ? "Opening..." : "Official PDF"}</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              className="text-xs h-8 px-2.5 gap-1.5 text-muted-foreground hover:text-foreground rounded-lg cursor-pointer"
              title="Fast print receipt on local thermal/POS printer"
            >
              <Printer className="h-3 w-3" />
              <span>Print Receipt</span>
            </Button>

            {!isCancelled && canCancelInvoice && canVoid && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsCancelConfirmOpen(true)}
                className="text-xs h-8 px-2.5 gap-1.5 text-destructive border-destructive/20 hover:bg-destructive/10 hover:text-destructive rounded-lg cursor-pointer"
              >
                <XCircle className="h-3 w-3" />
                <span>Cancel Invoice</span>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Main Details Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Customer & Appointment Info Card */}
        <div className="bg-card border border-border/80 rounded-2xl p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-border/60">
            <h2 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <User className="h-3.5 w-3.5" />
              </div>
              Customer Info
            </h2>
            <Badge variant="outline" className="text-[10px] font-mono">
              Profile
            </Badge>
          </div>

          <div className="space-y-3">
            <div>
              <p className="font-bold text-foreground text-base tracking-tight">
                {invoice.customer?.name || "Customer"}
              </p>
              <div className="mt-2 space-y-1.5 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Phone className="h-3.5 w-3.5 text-muted-foreground/70 shrink-0" />
                  <span>{invoice.customer?.phone || "—"}</span>
                </div>
                {invoice.customer?.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-3.5 w-3.5 text-muted-foreground/70 shrink-0" />
                    <span className="truncate">{invoice.customer.email}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="pt-3 border-t border-border/60 space-y-2.5">
              <span className="text-[11px] font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-primary" />
                Appointment Context
              </span>
              <div className="bg-muted/40 rounded-xl p-3 space-y-2 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Code</span>
                  <span className="font-mono font-bold text-foreground">
                    {invoice.appointmentCode ||
                      invoice.appointment?.appointmentCode ||
                      `#${invoice.appointmentId.slice(-6)}`}
                  </span>
                </div>
                {invoice.appointment?.date && (
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Scheduled</span>
                    <span className="font-medium text-foreground">
                      {formatDate(invoice.appointment.date, "dd MMM yyyy")}{" "}
                      {invoice.appointment.startTime
                        ? `at ${invoice.appointment.startTime}`
                        : ""}
                    </span>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Location</span>
                  <span className="font-medium text-foreground flex items-center gap-1">
                    <Building className="h-3 w-3 text-muted-foreground" />
                    {invoice.branch?.name || getBranchName(invoice.branchId)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Financial Summary Card */}
        <div className="lg:col-span-2 bg-card border border-border/80 rounded-2xl p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-border/60">
            <h2 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <Receipt className="h-3.5 w-3.5" />
              </div>
              Financial Breakdown
            </h2>
            <div className="text-[11px] font-medium text-muted-foreground">
              Authoritative Backend Calculations
            </div>
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="flex justify-between text-muted-foreground items-center py-0.5">
              <span>Subtotal (Sum of items)</span>
              <span className="font-semibold text-foreground text-sm font-mono">
                {formatCurrency(invoice.subtotal)}
              </span>
            </div>

            {/* Granular Breakdown of Discounts & Coupons */}
            {invoice.coupon && invoice.coupon.calculatedDiscountAmount > 0 && (
              <div className="flex justify-between text-emerald-600 dark:text-emerald-400 pl-3 text-xs items-center py-0.5 bg-emerald-500/10 rounded-md font-medium">
                <span className="flex items-center gap-1 font-mono">
                  ↳ Coupon ({invoice.coupon.codeUpper || invoice.coupon.code})
                </span>
                <span className="font-semibold font-mono">
                  -{formatCurrency(invoice.coupon.calculatedDiscountAmount)}
                </span>
              </div>
            )}

            {invoice.lineDiscountsTotal !== undefined &&
              invoice.lineDiscountsTotal > 0 && (
                <div className="flex justify-between text-muted-foreground pl-3 text-xs items-center py-0.5 bg-muted/20 rounded-md">
                  <span>↳ Line Item Discounts</span>
                  <span className="font-medium text-foreground font-mono">
                    -{formatCurrency(invoice.lineDiscountsTotal)}
                  </span>
                </div>
              )}

            {invoice.invoiceDiscountsTotal !== undefined &&
              invoice.invoiceDiscountsTotal > 0 && (
                <div className="flex justify-between text-muted-foreground pl-3 text-xs items-center py-0.5 bg-muted/20 rounded-md">
                  <span>↳ Invoice Level Discounts</span>
                  <span className="font-medium text-foreground font-mono">
                    -{formatCurrency(invoice.invoiceDiscountsTotal)}
                  </span>
                </div>
              )}

            {invoice.discountTotal > 0 && (
              <div className="flex justify-between text-muted-foreground items-center py-0.5">
                <span className="font-medium">Total Discounts</span>
                <span className="font-bold text-sm font-mono text-emerald-600 dark:text-emerald-400">
                  -{formatCurrency(invoice.discountTotal)}
                </span>
              </div>
            )}

            <div className="flex justify-between text-muted-foreground items-center py-0.5">
              <span>Gross Payable</span>
              <span className="font-semibold text-foreground font-mono">
                {formatCurrency(invoice.grossPayable)}
              </span>
            </div>

            {invoice.subscriptionCoveredAmount > 0 && (
              <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-medium items-center py-1 px-2.5 bg-emerald-500/10 rounded-lg">
                <span className="flex items-center gap-1.5 font-semibold">
                  <ShieldCheck className="h-4 w-4" />
                  Subscription Covered Amount
                </span>
                <span className="font-bold font-mono">
                  -{formatCurrency(invoice.subscriptionCoveredAmount)}
                </span>
              </div>
            )}

            {invoice.loyaltyDiscountAmount !== undefined &&
              invoice.loyaltyDiscountAmount > 0 && (
                <div className="flex justify-between text-primary font-medium items-center py-1 px-2.5 bg-primary/10 rounded-lg">
                  <span className="flex items-center gap-1.5 font-semibold">
                    <Sparkles className="h-4 w-4" />
                    Loyalty Points Redeemed (
                    {invoice.loyaltyRedeemedPoints ??
                      invoice.redeemLoyaltyPoints ??
                      0}{" "}
                    pts)
                  </span>
                  <span className="font-bold font-mono">
                    -{formatCurrency(invoice.loyaltyDiscountAmount)}
                  </span>
                </div>
              )}

            {/* Total Payable Headline Banner */}
            <div className="flex justify-between items-center pt-3 border-t border-border/80 text-sm font-bold text-foreground">
              <span className="text-sm uppercase tracking-wide">
                Payable Amount
              </span>
              <span className="text-xl sm:text-2xl text-primary font-black font-mono">
                {formatCurrency(invoice.payableAmount)}
              </span>
            </div>

            {/* Paid vs Due KPI Metric Cards */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="p-3 bg-muted/40 border border-border/60 rounded-xl space-y-1">
                <span className="text-[11px] font-semibold text-muted-foreground block uppercase tracking-wider">
                  Amount Paid
                </span>
                <span className="text-base sm:lg font-black text-foreground font-mono block">
                  {formatCurrency(invoice.amountPaid)}
                </span>
              </div>
              <div
                className={`p-3 border rounded-xl space-y-1 ${
                  invoice.amountDue > 0
                    ? "bg-amber-500/10 border-amber-500/30 text-amber-900 dark:text-amber-200"
                    : "bg-emerald-500/10 border-emerald-500/30 text-emerald-900 dark:text-emerald-200"
                }`}
              >
                <span className="text-[11px] font-semibold block uppercase tracking-wider opacity-80">
                  Outstanding Due
                </span>
                <span className="text-base sm:text-lg font-black font-mono block">
                  {formatCurrency(invoice.amountDue)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Invoice Line Items (Fully responsive: Desktop/1024 Table + Tablet/Mobile Card Layout) */}
      <div className="bg-card border border-border/80 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-border/60">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Scissors className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-xs font-bold text-foreground uppercase tracking-wider">
                Service Line Items ({invoice.items.length})
              </h2>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Itemized services, subscription entitlements, and line
                calculations
              </p>
            </div>
          </div>
          <div className="text-[11px] font-medium text-muted-foreground">
            {invoice.items.reduce(
              (acc: number, it: InvoiceLineItem) => acc + (it.quantity || 1),
              0,
            )}{" "}
            total {invoice.items.length === 1 ? "service" : "services"}
          </div>
        </div>

        {/* Desktop & Tablet Table (Scrollable container ensures columns never compress or collide at 1024) */}
        <div className="hidden lg:block border border-border/80 rounded-xl overflow-x-auto shadow-2xs bg-background/50">
          <table className="w-full text-left border-collapse min-w-195">
            <thead>
              <tr className="border-b border-border/80 bg-muted/60 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                <th className="py-3 px-3 text-center w-12 font-mono">#</th>
                <th className="py-3 px-4 min-w-65">Service Description</th>
                <th className="py-3 px-4 text-right w-28 whitespace-nowrap">
                  Unit Price
                </th>
                <th className="py-3 px-4 text-right w-32 whitespace-nowrap">
                  Sub. Waived
                </th>
                <th className="py-3 px-4 text-right w-36 whitespace-nowrap">
                  Customer Payable
                </th>
                <th className="py-3 px-4 text-center w-28 whitespace-nowrap">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60 text-xs">
              {invoice.items.map((item: InvoiceLineItem, idx: number) => {
                const isRedeemed = Boolean(
                  item.isRedeemedViaSubscription || item.appliedSubscriptionId,
                );
                const quantity = item.quantity || 1;
                const itemDiscounts = item.appliedDiscounts || [];
                const hasLineDiscounts = itemDiscounts.length > 0;
                const subCoveredAmount = item.subscriptionCoveredAmount || 0;
                const customerPayable =
                  item.customerPayable !== undefined
                    ? item.customerPayable
                    : Math.max(0, item.lineTotal - subCoveredAmount);

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
                  <tr
                    key={item.id || idx}
                    className="hover:bg-muted/30 transition-colors"
                  >
                    {/* Index */}
                    <td className="py-3.5 px-3 text-center align-middle">
                      <span className="w-6 h-6 mx-auto rounded-md bg-muted text-muted-foreground font-mono font-semibold text-[11px] flex items-center justify-center border border-border/60">
                        {idx + 1}
                      </span>
                    </td>

                    {/* Service / Product Description with modern sub-capsule badge styling */}
                    <td className="py-3.5 px-4 align-middle">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-foreground text-sm tracking-tight">
                            {item.name || item.productName || item.serviceName}
                          </span>
                          {item.lineType === "product" && (
                            <Badge
                              variant="outline"
                              className="text-[10px] bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 px-1.5 py-0"
                            >
                              Retail Product
                            </Badge>
                          )}
                          {item.lineType === "subscription" && (
                            <Badge
                              variant="outline"
                              className="text-[10px] bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20 px-1.5 py-0"
                            >
                              Subscription Package
                            </Badge>
                          )}
                          {item.lineType === "membership" && (
                            <Badge
                              variant="outline"
                              className="text-[10px] bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 px-1.5 py-0"
                            >
                              Membership ({item.membershipTierSnapshot || "VIP"}
                              )
                            </Badge>
                          )}
                          {item.isDiscountedByMembership && (
                            <Badge
                              variant="outline"
                              className="text-[10px] bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20 px-1.5 py-0"
                            >
                              Member Benefit: -
                              {formatCurrency(
                                item.membershipDiscountAmount || 0,
                              )}
                            </Badge>
                          )}
                          {item.sku && (
                            <span className="text-[11px] text-muted-foreground font-mono">
                              SKU: {item.sku}
                            </span>
                          )}
                          {item.stockUnit && (
                            <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                              {item.stockUnit}
                            </span>
                          )}
                          {quantity > 1 && (
                            <Badge
                              variant="secondary"
                              className="text-[10px] px-1.5 py-0 font-mono"
                            >
                              x{quantity}
                            </Badge>
                          )}
                          {item.duration && (
                            <span className="text-[11px] text-muted-foreground font-mono">
                              ({item.duration}m)
                            </span>
                          )}
                        </div>

                        {/* Subscription & Discount Capsule Badges */}
                        {(isRedeemed || hasLineDiscounts) && (
                          <div className="flex items-center gap-2 flex-wrap">
                            {/* Subscription Capsule */}
                            {isRedeemed && (
                              <div className="inline-flex items-center gap-1.5 text-[10px] text-emerald-700 dark:text-emerald-300 font-semibold bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md">
                                <ShieldCheck className="h-3 w-3 shrink-0" />
                                <span>
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
                              </div>
                            )}

                            {/* Line Discount Capsule */}
                            {hasLineDiscounts &&
                              itemDiscounts.map((disc, dIdx) => (
                                <div
                                  key={disc.id || dIdx}
                                  className="inline-flex items-center gap-1.5 text-[10px] text-purple-700 dark:text-purple-300 font-semibold bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded-md"
                                >
                                  <Tag className="h-3 w-3 shrink-0" />
                                  <span>
                                    {disc.name || "Discount"}:{" "}
                                    <strong className="font-mono">
                                      -
                                      {formatCurrency(
                                        disc.calculatedDiscount ??
                                          disc.amount ??
                                          0,
                                      )}
                                    </strong>
                                  </span>
                                </div>
                              ))}
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Unit Price */}
                    <td className="py-3.5 px-4 text-right align-middle whitespace-nowrap">
                      <span className="font-semibold text-foreground font-mono block text-xs sm:text-sm">
                        {formatCurrency(item.unitPrice)}
                      </span>
                      {quantity > 1 && (
                        <span className="text-[10px] text-muted-foreground block font-mono">
                          Total: {formatCurrency(item.lineTotal)}
                        </span>
                      )}
                    </td>

                    {/* Subscription Waived Amount */}
                    <td className="py-3.5 px-4 text-right align-middle whitespace-nowrap">
                      {subCoveredAmount > 0 ? (
                        <div className="space-y-0.5">
                          <span className="text-emerald-600 dark:text-emerald-400 font-bold font-mono text-xs sm:text-sm block">
                            -{formatCurrency(subCoveredAmount)}
                          </span>
                          <span className="text-[10px] text-emerald-600/80 font-medium block">
                            100% Waived
                          </span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground/50 text-xs font-mono">
                          —
                        </span>
                      )}
                    </td>

                    {/* Customer Payable (Dedicated spacing, never collides) */}
                    <td className="py-3.5 px-4 text-right align-middle whitespace-nowrap">
                      <div className="space-y-0.5">
                        <span
                          className={`font-black font-mono text-sm sm:text-base block ${
                            customerPayable === 0
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-foreground"
                          }`}
                        >
                          {formatCurrency(customerPayable)}
                        </span>
                        {customerPayable === 0 && subCoveredAmount > 0 && (
                          <span className="text-[9px] uppercase tracking-wider font-semibold text-emerald-600/90 block">
                            Fully Covered
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Action Column (Dedicated spacing, isolated) */}
                    <td className="py-3.5 px-4 text-center align-middle whitespace-nowrap">
                      {isDraft && (canCorrectAttribution || (canCheckout && !isRedeemed)) ? (
                        <div className="flex items-center justify-center gap-1">
                          {canCorrectAttribution &&
                            getAttributionRoles(item).length > 0 && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openAttributionDialog(item)}
                                className="text-[10px] h-7 px-2"
                              >
                                Source
                              </Button>
                            )}
                          {canCheckout && !isRedeemed && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedLineForDiscount(item.id || null);
                                setIsApplyDiscountOpen(true);
                              }}
                              className="text-[11px] h-7 px-2.5 text-primary border-primary/25 hover:bg-primary/10 hover:text-primary gap-1 rounded-lg cursor-pointer shadow-2xs font-semibold inline-flex items-center"
                              title="Apply discount specifically to this line item"
                            >
                              <Plus className="h-3 w-3" />
                              <span>Discount</span>
                            </Button>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground/40 text-[11px] font-mono">
                          —
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Tablet (<1024px) & Mobile Card-Based Line Item Layout */}
        <div className="block lg:hidden space-y-3">
          {invoice.items.map((item: InvoiceLineItem, idx: number) => {
            const isRedeemed = Boolean(
              item.isRedeemedViaSubscription || item.appliedSubscriptionId,
            );
            const quantity = item.quantity || 1;
            const itemDiscounts = item.appliedDiscounts || [];
            const hasLineDiscounts = itemDiscounts.length > 0;
            const subCoveredAmount = item.subscriptionCoveredAmount || 0;
            const customerPayable =
              item.customerPayable !== undefined
                ? item.customerPayable
                : Math.max(0, item.lineTotal - subCoveredAmount);

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
              <div
                key={item.id || idx}
                className="bg-background border border-border/80 rounded-xl p-3.5 space-y-3 shadow-2xs"
              >
                {/* Header: Sequence, Title, Badges & Action */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    <span className="w-6 h-6 shrink-0 rounded-md bg-muted text-muted-foreground font-mono font-semibold text-[11px] flex items-center justify-center border border-border/60 mt-0.5">
                      {idx + 1}
                    </span>
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-foreground text-sm">
                          {item.serviceName}
                        </span>
                        {quantity > 1 && (
                          <Badge
                            variant="secondary"
                            className="text-[10px] px-1.5 py-0 font-mono"
                          >
                            x{quantity}
                          </Badge>
                        )}
                        {item.duration && (
                          <span className="text-[11px] text-muted-foreground font-mono">
                            ({item.duration}m)
                          </span>
                        )}
                      </div>

                      {/* Subscription Note */}
                      {isRedeemed && (
                        <div className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium flex items-center gap-1.5 mt-1">
                          <ShieldCheck className="h-3 w-3 shrink-0" />
                          <span>
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
                        </div>
                      )}

                      {/* Line Discount Note */}
                      {hasLineDiscounts && (
                        <div className="space-y-0.5 mt-1">
                          {itemDiscounts.map((disc, dIdx) => (
                            <div
                              key={disc.id || dIdx}
                              className="text-[11px] text-purple-700 dark:text-purple-300 font-medium flex items-center gap-1.5"
                            >
                              <Tag className="h-3 w-3 shrink-0" />
                              <span>
                                {disc.name || "Discount"}:{" "}
                                <strong className="font-mono">
                                  -
                                  {formatCurrency(
                                    disc.calculatedDiscount ?? disc.amount ?? 0,
                                  )}
                                </strong>
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {isDraft && (
                    <div className="flex items-center gap-1 shrink-0">
                      {canCorrectAttribution &&
                        getAttributionRoles(item).length > 0 && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openAttributionDialog(item)}
                            className="text-[10px] h-7 px-2"
                          >
                            Source
                          </Button>
                        )}
                      {canCheckout && !isRedeemed && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedLineForDiscount(item.id || null);
                            setIsApplyDiscountOpen(true);
                          }}
                          className="text-[11px] h-7 px-2 text-primary border-primary/25 hover:bg-primary/10 hover:text-primary gap-1 rounded-lg cursor-pointer shadow-2xs font-semibold shrink-0"
                          title="Apply discount specifically to this line item"
                        >
                          <Plus className="h-3 w-3" />
                          <span>Discount</span>
                        </Button>
                      )}
                    </div>
                  )}
                </div>

                {/* Financial Metric Row */}
                <div className="grid grid-cols-3 gap-2 pt-2.5 border-t border-border/60 text-xs bg-muted/20 p-2 rounded-lg">
                  <div>
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider block font-medium">
                      Unit Price
                    </span>
                    <span className="font-semibold text-foreground font-mono">
                      {formatCurrency(item.unitPrice)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider block font-medium">
                      Sub. Waived
                    </span>
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400 font-mono">
                      {subCoveredAmount > 0
                        ? `-${formatCurrency(subCoveredAmount)}`
                        : "—"}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider block font-medium">
                      Payable
                    </span>
                    <span
                      className={`font-black font-mono ${
                        customerPayable === 0
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-foreground"
                      }`}
                    >
                      {formatCurrency(customerPayable)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Applied Discounts Section */}
      <div className="bg-card border border-border/80 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Tag className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-xs font-bold text-foreground uppercase tracking-wider">
                Applied Discounts ({invoice.appliedDiscounts?.length || 0})
              </h2>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Sequential discount timeline applied to this invoice
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsDiscountHistoryOpen(true)}
              className="text-xs h-8 px-3 gap-1.5 font-medium border-border/80 hover:bg-muted"
            >
              <History className="h-3.5 w-3.5 text-muted-foreground" />
              <span>Audit History</span>
            </Button>

            {isDraft && canCheckout && (
              <Button
                variant="default"
                size="sm"
                onClick={() => {
                  setSelectedLineForDiscount(null);
                  setIsApplyDiscountOpen(true);
                }}
                className="text-xs h-8 px-3.5 gap-1.5 font-bold shadow-xs cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add Discount</span>
              </Button>
            )}
          </div>
        </div>

        {!invoice.appliedDiscounts || invoice.appliedDiscounts.length === 0 ? (
          <div className="p-8 text-center bg-muted/20 border border-dashed border-border/80 rounded-xl space-y-2">
            <Tag className="h-8 w-8 text-muted-foreground/40 mx-auto" />
            <p className="text-xs font-medium text-foreground">
              No discounts applied
            </p>
            <p className="text-[11px] text-muted-foreground max-w-sm mx-auto">
              No promotions, customer courtesies, or line-item adjustments have
              been added to this draft invoice yet.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {invoice.appliedDiscounts.map(
              (disc: AppliedDiscount, idx: number) => {
                const targetLine = disc.lineId
                  ? invoice.items.find(
                      (it: InvoiceLineItem) => it.id === disc.lineId,
                    )
                  : undefined;

                const targetLinesNames =
                  disc.lineIds && disc.lineIds.length > 0
                    ? disc.lineIds
                        .map(
                          (id: string) =>
                            invoice.items.find(
                              (it: InvoiceLineItem) => it.id === id,
                            )?.serviceName,
                        )
                        .filter(Boolean)
                        .join(", ")
                    : undefined;

                const isPercentage =
                  disc.type === "percentage" ||
                  disc.discountType === "percentage";
                const isSelectedLines =
                  disc.level === "selected_lines" ||
                  disc.discountLevel === "selected_lines";
                const isLineLevel =
                  disc.level === "line" || disc.discountLevel === "line";
                const isInvoiceLevel = !isSelectedLines && !isLineLevel;

                const deductionAmount =
                  disc.calculatedDiscount ?? disc.amount ?? 0;

                return (
                  <div
                    key={disc.id || idx}
                    className="group relative bg-background border border-border/80 hover:border-primary/40 rounded-xl p-3.5 transition-all shadow-2xs hover:shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3"
                  >
                    {/* Left Column: Sequence Badge, Name, Scope, Target info & Reason */}
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      {/* Sequence Step Marker (1, 2, 3...) */}
                      <div className="flex flex-col items-center justify-center shrink-0 w-7 h-7 rounded-lg bg-muted text-foreground font-mono font-bold text-xs border border-border/80 mt-0.5 shadow-2xs">
                        #{idx + 1}
                      </div>

                      <div className="space-y-1 min-w-0 flex-1">
                        {/* Name & Scope Badges */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-xs text-foreground tracking-tight">
                            {disc.name ||
                              (isSelectedLines
                                ? "Selected Services Discount"
                                : isLineLevel
                                  ? "Line Item Discount"
                                  : "Invoice Discount")}
                          </span>

                          {/* Level Badge */}
                          <span
                            className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md border ${
                              isSelectedLines
                                ? "bg-purple-500/10 border-purple-500/20 text-purple-700 dark:text-purple-400"
                                : isLineLevel
                                  ? "bg-blue-500/10 border-blue-500/20 text-blue-700 dark:text-blue-400"
                                  : "bg-amber-500/10 border-amber-500/20 text-amber-700 dark:text-amber-400"
                            }`}
                          >
                            {isSelectedLines ? (
                              <Layers className="h-2.5 w-2.5 shrink-0" />
                            ) : isLineLevel ? (
                              <Tag className="h-2.5 w-2.5 shrink-0" />
                            ) : (
                              <FileSpreadsheet className="h-2.5 w-2.5 shrink-0" />
                            )}
                            <span>
                              {isSelectedLines
                                ? "Selected Services"
                                : isLineLevel
                                  ? "Single Line"
                                  : "Invoice-Wide"}
                            </span>
                          </span>

                          {/* Calculation Type Badge */}
                          <span className="inline-flex items-center gap-1 text-[10px] font-mono font-medium px-1.5 py-0.5 rounded bg-muted text-muted-foreground border border-border/60">
                            {isPercentage ? (
                              <Percent className="h-2.5 w-2.5" />
                            ) : (
                              <IndianRupee className="h-2.5 w-2.5" />
                            )}
                            <span>{isPercentage ? "Rate" : "Fixed"}</span>
                          </span>
                        </div>

                        {/* Target Info */}
                        {targetLinesNames ? (
                          <p className="text-[11px] text-muted-foreground truncate">
                            <span className="font-medium text-foreground">
                              Services:
                            </span>{" "}
                            {targetLinesNames}
                          </p>
                        ) : targetLine ? (
                          <p className="text-[11px] text-muted-foreground truncate">
                            <span className="font-medium text-foreground">
                              Service:
                            </span>{" "}
                            {targetLine.serviceName}
                          </p>
                        ) : isInvoiceLevel ? (
                          <p className="text-[11px] text-muted-foreground">
                            Distributed proportionally across eligible uncovered
                            services
                          </p>
                        ) : null}

                        {/* Operational Reason */}
                        {disc.reason && (
                          <p
                            className="text-[11px] text-muted-foreground/90 italic truncate max-w-xl"
                            title={disc.reason}
                          >
                            &ldquo;{disc.reason}&rdquo;
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Right Column: Values & Actions (Perfect desktop & tablet alignment) */}
                    <div className="flex items-center justify-between md:justify-end gap-3.5 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-border/60">
                      {/* Rate / Entered Value */}
                      <div className="text-left md:text-right">
                        <span className="text-[10px] uppercase font-semibold text-muted-foreground block tracking-wider">
                          Entered Rate
                        </span>
                        <span className="text-xs font-semibold text-foreground font-mono">
                          {isPercentage
                            ? `${disc.enteredValue}%`
                            : formatCurrency(disc.enteredValue)}
                        </span>
                      </div>

                      {/* Final Calculated Deduction */}
                      <div className="text-right pl-2 md:border-l md:border-border/60">
                        <span className="text-[10px] uppercase font-semibold text-muted-foreground block tracking-wider">
                          Deduction
                        </span>
                        <span className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">
                          -{formatCurrency(deductionAmount)}
                        </span>
                      </div>

                      {/* Mutation Actions */}
                      {isDraft && canCheckout && (
                        <div className="flex items-center gap-1 pl-2 md:border-l md:border-border/60">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedDiscountForEdit(disc)}
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground rounded-lg cursor-pointer"
                            title="Modify discount value"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedDiscountForRemove(disc)}
                            className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10 rounded-lg cursor-pointer"
                            title="Remove discount"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              },
            )}
          </div>
        )}
      </div>

      {/* Applied Coupon & Campaign Section */}
      <InvoiceCouponSection
        invoice={invoice}
        canManageCoupons={canManageCoupons}
      />

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

      <Dialog
        isOpen={isAttributionDialogOpen}
        onClose={() => setIsAttributionDialogOpen(false)}
        title="Correct source attribution"
        className="max-w-md"
      >
        {attributionLine && (
          <div className="space-y-4 pt-2">
            <p className="text-xs text-muted-foreground">
              This change is allowed only while the invoice is a draft and is
              recorded in the audit log.
            </p>
            {getAttributionRoles(attributionLine).length > 1 && (
              <label className="block space-y-1">
                <span className="text-xs font-medium text-foreground">
                  Attribution role
                </span>
                <select
                  value={attributionRole}
                  onChange={(event) => {
                    const role = event.target.value as
                      | "seller"
                      | "renewal_handler";
                    setAttributionRole(role);
                    setAttributionStaffId(
                      role === "renewal_handler"
                        ? attributionLine.attribution?.renewalHandler?.staffId ||
                            null
                        : attributionLine.attribution?.soldBy?.staffId || null,
                    );
                  }}
                  className="w-full h-9 rounded-md border border-input bg-background px-2 text-sm text-foreground"
                >
                  {getAttributionRoles(attributionLine).map((role) => (
                    <option key={role} value={role}>
                      {role === "seller" ? "Seller" : "Renewal handler"}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <StaffAttributionSelect
              branchId={invoice.branchId || invoice.branch?.id}
              label={
                attributionRole === "seller" ? "Seller" : "Renewal handler"
              }
              value={attributionStaffId}
              onChange={setAttributionStaffId}
              disabled={attributionMutation.isPending}
            />
            <div className="space-y-1.5">
              <label
                htmlFor="invoice-attribution-reason"
                className="text-xs font-semibold text-foreground"
              >
                Correction reason
              </label>
              <Textarea
                id="invoice-attribution-reason"
                rows={3}
                maxLength={500}
                value={attributionReason}
                onChange={(event) => setAttributionReason(event.target.value)}
                placeholder="Explain why this draft attribution is being corrected."
                className="text-xs resize-none"
                disabled={attributionMutation.isPending}
              />
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-border pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsAttributionDialogOpen(false)}
                disabled={attributionMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleCorrectAttribution}
                disabled={
                  attributionMutation.isPending ||
                  attributionReason.trim().length < 3
                }
              >
                {attributionMutation.isPending
                  ? "Saving..."
                  : "Save correction"}
              </Button>
            </div>
          </div>
        )}
      </Dialog>

      <Dialog
        isOpen={isWalkInFulfillmentDialogOpen}
        onClose={() => setIsWalkInFulfillmentDialogOpen(false)}
        title="Confirm Walk-in Service Fulfillment"
        className="max-w-md"
      >
        <div className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Confirm only services physically completed on this invoice. The
            event is recorded separately from payment and cashier attribution;
            commission remains gated on full settlement and fulfillment.
          </p>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">
              Confirmation reason
            </label>
            <Textarea
              rows={3}
              maxLength={1000}
              placeholder="Describe the completed service..."
              value={walkInFulfillmentReason}
              onChange={(event) => setWalkInFulfillmentReason(event.target.value)}
              className="text-xs"
            />
          </div>
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsWalkInFulfillmentDialogOpen(false)}
              disabled={walkInFulfillmentMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleConfirmWalkInFulfillment}
              disabled={
                walkInFulfillmentMutation.isPending ||
                walkInFulfillmentReason.trim().length < 3 ||
                pendingWalkInLineIds.length === 0
              }
            >
              {walkInFulfillmentMutation.isPending ? "Recording..." : "Confirm Service"}
            </Button>
          </div>
        </div>
      </Dialog>

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

      <Dialog
        isOpen={isMembershipRefundOpen}
        onClose={() => {
          if (!membershipRefundMutation.isPending) {
            setIsMembershipRefundOpen(false);
          }
        }}
        title="Record Unused Membership Refund"
        className="max-w-md"
      >
        <div className="space-y-4">
          <div className="rounded-lg border border-amber-300/70 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
            This records the refund and cancels the membership in this system.
            It does not send money or contact a payment processor. Only continue
            after the refund has been issued through your approved payment method.
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">
              Refund method
            </label>
            <select
              value={membershipRefundMethod}
              onChange={(event) =>
                setMembershipRefundMethod(event.target.value as PaymentMethod)
              }
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              disabled={membershipRefundMutation.isPending}
            >
              <option value="cash">Cash</option>
              <option value="card">Card</option>
              <option value="upi">UPI</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">
              Reason
            </label>
            <Textarea
              rows={3}
              maxLength={500}
              placeholder="Explain why this unused membership is being refunded..."
              value={membershipRefundReason}
              onChange={(event) => setMembershipRefundReason(event.target.value)}
              className="text-xs resize-none"
              disabled={membershipRefundMutation.isPending}
            />
          </div>
          <div className="flex items-center justify-end gap-2 border-t border-border pt-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsMembershipRefundOpen(false)}
              disabled={membershipRefundMutation.isPending}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleRefundUnusedMembership}
              disabled={
                membershipRefundMutation.isPending ||
                membershipRefundReason.trim().length < 3
              }
              className="text-xs font-semibold"
            >
              {membershipRefundMutation.isPending
                ? "Recording..."
                : "Confirm Refund Record"}
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Hidden print receipt for standard browser print / POS roll thermal printer */}
      <PrintableInvoiceReceipt
        invoice={invoice}
        branchName={invoice.branch?.name || getBranchName(invoice.branchId)}
      />

      {/* Apply Discount Dialog */}
      <ApplyDiscountDialog
        isOpen={isApplyDiscountOpen}
        onClose={() => {
          setIsApplyDiscountOpen(false);
          setSelectedLineForDiscount(null);
        }}
        invoice={invoice}
        defaultLineId={selectedLineForDiscount}
        onConflictRefresh={() => refetch()}
      />

      {/* Modify Discount Dialog */}
      <ModifyDiscountDialog
        isOpen={Boolean(selectedDiscountForEdit)}
        onClose={() => setSelectedDiscountForEdit(null)}
        invoice={invoice}
        discount={selectedDiscountForEdit}
        onConflictRefresh={() => refetch()}
      />

      {/* Remove Discount Dialog */}
      <RemoveDiscountDialog
        isOpen={Boolean(selectedDiscountForRemove)}
        onClose={() => setSelectedDiscountForRemove(null)}
        invoice={invoice}
        discount={selectedDiscountForRemove}
        onConflictRefresh={() => refetch()}
      />

      {/* Discount History Audit Trail Dialog */}
      <DiscountHistoryDialog
        isOpen={isDiscountHistoryOpen}
        onClose={() => setIsDiscountHistoryOpen(false)}
        invoiceId={invoice.id}
        invoiceNumber={invoice.invoiceNumber}
        branchId={invoice.branchId}
      />
    </div>
  );
}
