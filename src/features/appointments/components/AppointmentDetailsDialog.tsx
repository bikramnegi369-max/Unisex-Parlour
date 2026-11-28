"use client";

import React, { useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  AppointmentStatusBadge,
  BookingTypeBadge,
} from "./AppointmentStatusBadge";
import { AppointmentReminderStatus } from "./AppointmentReminderStatus";
import {
  formatDate,
  formatCurrency,
  formatInBranchTimezone,
} from "@/lib/formatters";
import {
  Calendar,
  Clock,
  User,
  Scissors,
  MapPin,
  Send,
  AlertCircle,
  Loader2,
  CheckCircle2,
  ShieldCheck,
  Trash2,
  CalendarClock,
  UserCheck,
  RefreshCw,
  Receipt,
  CreditCard,
  Sparkles,
  MoreHorizontal,
  ChevronUp,
  ChevronDown,
  Tag,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { hasPermission } from "@/lib/permissions";
import {
  useAppointment,
  useTriggerAppointmentReminder,
  useUpsellAppointmentSubscription,
  useUpsellAppointmentMembership,
} from "../hooks/useAppointments";
import Link from "next/link";
import { toast } from "sonner";
import { useDispatch } from "react-redux";
import { setBasketAppointment } from "@/store/slices/saleBasketSlice";
import { useSubscriptions } from "@/features/subscriptions/hooks/useSubscriptions";
import { CreateSubscriptionDialog } from "@/features/subscriptions/components/CreateSubscriptionDialog";
import { buildSubscriptionPurchasePayload } from "@/features/subscriptions/utils/buildSubscriptionPurchasePayload";
import { useCreateMembershipPlan } from "@/features/memberships/hooks/useMemberships";
import {
  useCustomerActiveBenefits,
  useMembershipPlans,
} from "@/features/memberships/hooks/useMemberships";
import { SellMembershipDialog } from "@/features/memberships/components/SellMembershipDialog";
import type {
  Appointment,
  AppointmentServiceSnapshot,
} from "../types/appointment.types";
import { calculateLateDelayMins } from "../utils/appointmentTime";
import {
  computeAppointmentFinancialBreakdown,
  resolveServiceMembershipCode,
  resolveServiceSubscriptionCode,
} from "../utils/appointmentPricing";

interface AppointmentDetailsDialogProps {
  appointment: Appointment | null;
  isOpen: boolean;
  onClose: () => void;
  onReschedule: () => void;
  onAssignStaff: () => void;
  onEditServices?: () => void;
  onChangeStatus: () => void;
  onDelete: () => void;
  onCompleteAppointment?: (appointment: Appointment) => void;
  onStartAppointment?: (appointment: Appointment) => Promise<void> | void;
  canEdit: boolean;
  canStatus: boolean;
  canDelete: boolean;
}

export function AppointmentDetailsDialog({
  appointment: initialAppointment,
  isOpen,
  onClose,
  onReschedule,
  onAssignStaff,
  onEditServices,
  onChangeStatus,
  onDelete,
  onCompleteAppointment,
  onStartAppointment,
  canEdit,
  canStatus,
  canDelete,
}: AppointmentDetailsDialogProps) {
  const router = useRouter();
  const dispatch = useDispatch();
  const { user } = useAuth();
  const [showSendConfirmation, setShowSendConfirmation] = useState(false);
  const [isSellSubscriptionOpen, setIsSellSubscriptionOpen] = useState(false);
  const [isSellMembershipOpen, setIsSellMembershipOpen] = useState(false);
  const [isActionsMenuOpen, setIsActionsMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "overview" | "services" | "benefits" | "activity"
  >("overview");
  const actionsMenuRef = React.useRef<HTMLDivElement>(null);

  // Close "More Actions" popover menu when clicking outside or pressing Escape
  React.useEffect(() => {
    if (!isActionsMenuOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (
        actionsMenuRef.current &&
        !actionsMenuRef.current.contains(event.target as Node)
      ) {
        setIsActionsMenuOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsActionsMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isActionsMenuOpen]);

  const upsellSubMutation = useUpsellAppointmentSubscription();
  const upsellMembershipMutation = useUpsellAppointmentMembership();
  const createMembershipPlanMutation = useCreateMembershipPlan();
  const canCheckout = hasPermission(user, "billing.checkout");
  const canSellSubscriptions = hasPermission(user, "subscriptions.sell");
  const canSellMemberships =
    hasPermission(user, "memberships.sell") ||
    hasPermission(user, "memberships.configure") ||
    hasPermission(user, "billing.checkout");

  // Fetch real-time fresh single appointment details from GET /appointments/:id
  // Enabled only when the dialog is open and we have an appointment ID.
  const { data: fetchedAppointment, isLoading: isFetchingDetails } =
    useAppointment(
      isOpen ? initialAppointment?.id : undefined,
      initialAppointment?.branchId,
    );

  // Use fresh fetched single appointment data, falling back to initial list item snapshot
  const appointment = fetchedAppointment || initialAppointment;

  const triggerReminderMutation = useTriggerAppointmentReminder();

  // MUST be called unconditionally at top level to satisfy React Rules of Hooks
  const customerId = appointment?.customerId || appointment?.customer?.id;
  const { data: customerSubsData } = useSubscriptions(
    { customerId: customerId || undefined, limit: 50 },
    { enabled: Boolean(isOpen && customerId) },
  );

  // Active membership benefits for appointment customer
  const { data: activeMembershipBenefits } = useCustomerActiveBenefits(
    customerId || "",
    appointment?.branchId,
  );
  const { data: membershipPlansData } = useMembershipPlans({ limit: 100 });
  const membershipPlans = membershipPlansData?.data || [];

  const subsList = customerSubsData?.data;
  const subscriptionMap = React.useMemo(() => {
    const map = new Map<
      string,
      {
        code: string;
        planName?: string;
        id: string;
        paymentStatus?: string;
        amountDue?: number;
        invoiceId?: string;
      }
    >();
    if (subsList) {
      for (const sub of subsList) {
        const planName =
          typeof sub.planId === "object" ? sub.planId?.name : undefined;
        const subInvoiceId =
          typeof sub.invoiceId === "object" && sub.invoiceId !== null
            ? (sub.invoiceId as { id?: string; _id?: string }).id ||
              (sub.invoiceId as { id?: string; _id?: string })._id
            : sub.invoiceId || undefined;

        map.set(sub.id, {
          code: sub.subscriptionCode,
          planName,
          id: sub.id,
          paymentStatus: sub.paymentStatus,
          amountDue: sub.amountDue,
          invoiceId: subInvoiceId,
        });
      }
    }
    return map;
  }, [subsList]);

  if (!appointment) return null;

  const canSendReminder = hasPermission(user, "appointments.reminders.send");
  const isTerminal = ["completed", "cancelled", "no_show"].includes(
    appointment.status,
  );

  // Authoritative Financial Breakdown
  const financialBreakdown = computeAppointmentFinancialBreakdown(appointment);
  const grossSubtotal = financialBreakdown.grossSubtotal;
  const subscriptionWaivedAmount = financialBreakdown.subscriptionWaivedAmount;
  const membershipSavingsAmount = financialBreakdown.membershipDiscountAmount;
  const manualDiscount = financialBreakdown.manualDiscountAmount;
  const netPayableTotal = financialBreakdown.netPayable;

  const branchTimezone = appointment.branch?.timezone || "Asia/Kolkata";
  const appointmentCodeDisplay =
    appointment.appointmentCode || `#${appointment.id.slice(-6)}`;
  const dialogTitle = `Appointment ${appointmentCodeDisplay.startsWith("#") ? appointmentCodeDisplay : `#${appointmentCodeDisplay}`}`;

  const handleTriggerReminder = async () => {
    if (!appointment.branchId || appointment.branchId === "all") {
      toast.error("An explicit branch is required to trigger reminders.");
      return;
    }

    try {
      await triggerReminderMutation.mutateAsync({
        id: appointment.id,
        payload: { branchId: appointment.branchId },
      });
      toast.success("Appointment reminder triggered successfully.");
      setShowSendConfirmation(false);
    } catch (err: unknown) {
      const axiosError = err as {
        response?: { status?: number; data?: { message?: string } };
      };
      const status = axiosError.response?.status;
      if (status === 403) {
        toast.error("You don't have permission to send appointment reminders.");
      } else if (status === 400) {
        toast.error(
          axiosError.response?.data?.message ||
            "Invalid reminder state or configuration.",
        );
      } else if (status === 409) {
        toast.error(
          axiosError.response?.data?.message || "Reminder trigger conflict.",
        );
      } else {
        toast.error(
          axiosError.response?.data?.message ||
            "Failed to trigger appointment reminder.",
        );
      }
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={dialogTitle}
      maxWidth="5xl"
      className="w-[95vw] max-w-6xl"
    >
      <div className="space-y-5 text-left">
        {/* Appointment Identity Header */}
        <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2 min-w-0">
              <span className="font-mono text-xs font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-md border border-primary/20 flex items-center gap-1.5 break-all">
                {appointmentCodeDisplay}
                {isFetchingDetails && (
                  <Loader2 className="h-3 w-3 animate-spin text-primary shrink-0" />
                )}
              </span>
              <BookingTypeBadge bookingType={appointment.bookingType} />
              <AppointmentStatusBadge
                status={appointment.status}
                isUnassignedQueue={!appointment.staffId}
              />
            </div>
            <div className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
              <span>{appointment.branch?.name || "Branch"}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-border/60 text-xs">
            <div className="min-w-0">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block">
                Customer
              </span>
              <p className="font-bold text-foreground wrap-break-word">
                {appointment.customer?.name || "Walk-in Guest"}
              </p>
              {appointment.customer?.phone && (
                <p className="text-muted-foreground font-mono text-[11px]">
                  {appointment.customer.phone}
                </p>
              )}
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block">
                Schedule
              </span>
              <p className="font-semibold text-foreground">
                {formatDate(appointment.date, "dd MMM yyyy")}
              </p>
              <p className="text-muted-foreground text-[11px]">
                {appointment.startTime ||
                  formatDate(appointment.date, "hh:mm a")}{" "}
                · {appointment.totalDuration || 0} mins
              </p>
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block">
                Assigned Staff
              </span>
              <p className="font-semibold text-foreground wrap-break-word">
                {appointment.staff?.name || "Unassigned"}
              </p>
            </div>
          </div>
        </div>

        {/* Dedicated Workflow & Management Action Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl border border-border bg-card p-3">
          <div className="flex flex-wrap items-center gap-2">
            {appointment.status === "scheduled" && onStartAppointment && (
              <Button
                type="button"
                size="sm"
                onClick={() => onStartAppointment(appointment)}
                className="h-9 px-4 text-xs font-semibold gap-1.5 cursor-pointer bg-blue-600 hover:bg-blue-700 text-white shadow-xs"
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>Start Appointment</span>
              </Button>
            )}
            {appointment.status === "in_progress" && onCompleteAppointment && (
              <Button
                type="button"
                size="sm"
                onClick={() => onCompleteAppointment(appointment)}
                className="h-9 px-4 text-xs font-semibold gap-1.5 cursor-pointer bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>Complete Appointment</span>
              </Button>
            )}
            {appointment.status === "completed" && (
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  onClose();
                  router.push(`/billing?appointmentId=${appointment.id}`);
                }}
                className="h-9 px-4 text-xs font-semibold gap-1.5 cursor-pointer bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs"
              >
                <CreditCard className="h-4 w-4" />
                <span>POS Checkout</span>
              </Button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {canEdit && !isTerminal && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onReschedule}
                  className="h-8 text-xs gap-1.5 cursor-pointer border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20"
                >
                  <CalendarClock className="h-3.5 w-3.5" />
                  <span>Reschedule</span>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onAssignStaff}
                  className="h-8 text-xs gap-1.5 cursor-pointer border-teal-500/40 bg-teal-500/10 text-teal-700 dark:text-teal-300 hover:bg-teal-500/20"
                >
                  <UserCheck className="h-3.5 w-3.5" />
                  <span>Assign Staff</span>
                </Button>
                {onEditServices && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={onEditServices}
                    className="h-8 text-xs gap-1.5 cursor-pointer border-slate-500/40 bg-slate-500/10 text-slate-700 dark:text-slate-300 hover:bg-slate-500/20"
                  >
                    <Scissors className="h-3.5 w-3.5" />
                    <span>Edit Services</span>
                  </Button>
                )}
              </>
            )}
            {canStatus && !isTerminal && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onChangeStatus}
                className="h-8 text-xs gap-1.5 cursor-pointer border-violet-500/40 bg-violet-500/10 text-violet-700 dark:text-violet-300 hover:bg-violet-500/20"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Change Status</span>
              </Button>
            )}
            {!isTerminal && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowSendConfirmation(true)}
                className="h-8 text-xs gap-1.5 cursor-pointer border-cyan-500/40 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 hover:bg-cyan-500/20"
              >
                <Send className="h-3.5 w-3.5" />
                <span>Send Reminder</span>
              </Button>
            )}
          </div>
        </div>

        {/* 70/30 Workspace Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Main Information Area (~70%) */}
          <div className="lg:col-span-8 min-w-0 flex flex-col space-y-4">
            {/* Navigation Tabs */}
            <div
              role="tablist"
              aria-label="Appointment details sections"
              className="flex items-center gap-1 border-b border-border overflow-x-auto"
            >
              {(
                [
                  { id: "overview", label: "Overview" },
                  {
                    id: "services",
                    label: `Services (${appointment.services?.length || 0})`,
                  },
                  { id: "benefits", label: "Benefits" },
                  { id: "activity", label: "Payments & Activity" },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={activeTab === tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3 py-2 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
                    activeTab === tab.id
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Scrollable Tab Content */}
            <div className="max-h-[55vh] overflow-y-auto pr-1 space-y-4">
              {activeTab === "overview" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl border border-border bg-card">
                    <div className="space-y-1 min-w-0">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                        Customer Details
                      </span>
                      <p className="text-sm font-bold text-foreground wrap-break-word">
                        {appointment.customer?.name || "Walk-in Guest"}
                      </p>
                      {appointment.customer?.phone && (
                        <p className="text-xs text-muted-foreground font-mono">
                          {appointment.customer.phone}
                        </p>
                      )}
                      {appointment.customer?.email && (
                        <p className="text-xs text-muted-foreground break-all">
                          {appointment.customer.email}
                        </p>
                      )}
                    </div>
                    <div className="space-y-1 min-w-0">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                        Appointment Timing
                      </span>
                      <p className="text-xs font-semibold text-foreground">
                        {formatDate(appointment.date, "EEEE, dd MMM yyyy")}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Scheduled: {appointment.startTime || "—"} –{" "}
                        {appointment.endTime || "—"} (
                        {appointment.totalDuration || 0} mins)
                      </p>
                      {appointment.completedAt && (
                        <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                          Completed:{" "}
                          {formatDate(appointment.completedAt, "hh:mm a")}
                        </p>
                      )}
                    </div>
                  </div>

                  {appointment.notes && (
                    <div className="p-4 rounded-xl border border-border bg-card space-y-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                        Notes & Instructions
                      </span>
                      <p className="text-xs text-foreground whitespace-pre-wrap wrap-break-word leading-relaxed">
                        {appointment.notes}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === "services" && (
                <div className="space-y-3">
                  <div className="divide-y divide-border border border-border rounded-xl bg-card">
                    {(appointment.services || []).length === 0 ? (
                      <div className="p-6 text-center text-xs text-muted-foreground">
                        No services recorded for this appointment.
                      </div>
                    ) : (
                      (appointment.services || []).map(
                        (srv: AppointmentServiceSnapshot, idx: number) => {
                          const isCovered = Boolean(
                            srv.isRedeemedViaSubscription ||
                            srv.subscriptionUsageId ||
                            srv.appliedSubscriptionId,
                          );
                          const subCode = resolveServiceSubscriptionCode(srv);
                          const memCode = resolveServiceMembershipCode(srv);
                          const memDiscount = isCovered
                            ? 0
                            : srv.membershipDiscountAmount || 0;
                          const finalPrice = isCovered
                            ? 0
                            : Math.max(0, (srv.price || 0) - memDiscount);

                          return (
                            <div
                              key={
                                srv.serviceId ||
                                srv._id ||
                                srv.id ||
                                `srv-${idx}`
                              }
                              className="p-3.5 flex items-start justify-between gap-3 text-xs min-w-0"
                            >
                              <div className="flex items-start gap-2.5 min-w-0 flex-1">
                                <Scissors className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                                <div className="min-w-0 flex-1 space-y-1">
                                  <p className="font-semibold text-foreground wrap-break-word">
                                    {srv.name}
                                  </p>
                                  <p className="text-[11px] text-muted-foreground">
                                    {srv.duration} mins
                                  </p>
                                  {isCovered && (
                                    <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-medium text-purple-600 dark:text-purple-400 break-all">
                                      <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
                                      <span>
                                        Subscription Redeemed
                                        {subCode ? ` (${subCode})` : ""}
                                      </span>
                                    </div>
                                  )}
                                  {!isCovered && memDiscount > 0 && (
                                    <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-medium text-amber-600 dark:text-amber-400 break-all">
                                      <Sparkles className="h-3.5 w-3.5 shrink-0" />
                                      <span>
                                        Membership Discount
                                        {srv.membershipDiscountPercentage
                                          ? ` (${srv.membershipDiscountPercentage}%)`
                                          : ""}
                                        {memCode ? ` · ${memCode}` : ""}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className="text-right shrink-0 tabular-nums">
                                {(isCovered || memDiscount > 0) && (
                                  <span className="block text-[10px] text-muted-foreground line-through">
                                    {formatCurrency(srv.price || 0)}
                                  </span>
                                )}
                                <span className="font-bold text-foreground">
                                  {formatCurrency(finalPrice)}
                                </span>
                              </div>
                            </div>
                          );
                        },
                      )
                    )}
                  </div>
                </div>
              )}

              {activeTab === "benefits" && (
                <div className="space-y-3">
                  {canSellSubscriptions && customerId && (
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setIsSellSubscriptionOpen(true)}
                        className="h-8 text-xs gap-1.5 cursor-pointer border-purple-500/40 bg-purple-500/10 text-purple-700 dark:text-purple-300 hover:bg-purple-500/20"
                      >
                        <ShieldCheck className="h-3.5 w-3.5" />
                        <span>Upsell Subscription</span>
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setIsSellMembershipOpen(true)}
                        className="h-8 text-xs gap-1.5 cursor-pointer border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20"
                      >
                        <Sparkles className="h-3.5 w-3.5" />
                        <span>Upsell Membership</span>
                      </Button>
                    </div>
                  )}
                  {financialBreakdown.membershipCodes.length > 0 ||
                  membershipSavingsAmount > 0 ? (
                    <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/5 space-y-1.5 text-xs">
                      <div className="flex items-center gap-1.5 font-bold text-amber-700 dark:text-amber-300">
                        <Sparkles className="h-4 w-4" />
                        <span>Applied Membership</span>
                      </div>
                      {financialBreakdown.membershipCodes.length > 0 && (
                        <p className="font-mono text-foreground break-all">
                          Membership Number:{" "}
                          {financialBreakdown.membershipCodes.join(", ")}
                        </p>
                      )}
                      <p className="text-muted-foreground tabular-nums">
                        Total Membership Savings:{" "}
                        <span className="font-semibold text-foreground">
                          {formatCurrency(membershipSavingsAmount)}
                        </span>
                      </p>
                    </div>
                  ) : null}

                  {subscriptionWaivedAmount > 0 ? (
                    <div className="p-4 rounded-xl border border-purple-500/30 bg-purple-500/5 space-y-1.5 text-xs">
                      <div className="flex items-center gap-1.5 font-bold text-purple-700 dark:text-purple-300">
                        <ShieldCheck className="h-4 w-4" />
                        <span>Applied Subscription</span>
                      </div>
                      <p className="text-muted-foreground tabular-nums">
                        Total Subscription Covered:{" "}
                        <span className="font-semibold text-foreground">
                          {formatCurrency(subscriptionWaivedAmount)}
                        </span>
                      </p>
                    </div>
                  ) : null}

                  {subscriptionWaivedAmount === 0 &&
                    membershipSavingsAmount === 0 && (
                      <div className="p-6 rounded-xl border border-border bg-card text-center text-xs text-muted-foreground">
                        No membership or subscription benefits applied to this
                        appointment.
                      </div>
                    )}
                </div>
              )}

              {activeTab === "activity" && (
                <div className="p-4 rounded-xl border border-border bg-card space-y-3 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Created</span>
                    <span className="font-medium text-foreground">
                      {appointment.createdAt
                        ? formatDate(
                            appointment.createdAt,
                            "dd MMM yyyy, hh:mm a",
                          )
                        : "—"}
                    </span>
                  </div>
                  {appointment.updatedAt && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">
                        Last Updated
                      </span>
                      <span className="font-medium text-foreground">
                        {formatDate(
                          appointment.updatedAt,
                          "dd MMM yyyy, hh:mm a",
                        )}
                      </span>
                    </div>
                  )}
                  {appointment.completedAt && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Completed</span>
                      <span className="font-medium text-emerald-600 dark:text-emerald-400">
                        {formatDate(
                          appointment.completedAt,
                          "dd MMM yyyy, hh:mm a",
                        )}
                      </span>
                    </div>
                  )}
                  <div className="pt-2 border-t border-border">
                    <AppointmentReminderStatus
                      reminder={appointment.reminder}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Dedicated Financial Sidebar (~30%) */}
          <aside className="lg:col-span-4 min-w-0 lg:sticky lg:top-0">
            <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-3 tabular-nums">
              <div className="flex items-center justify-between border-b border-border pb-2.5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                  Financial Summary
                </h3>
                <Receipt className="h-4 w-4 text-muted-foreground" />
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span>Gross Service Subtotal</span>
                  <span className="font-medium text-foreground">
                    {formatCurrency(grossSubtotal)}
                  </span>
                </div>

                {subscriptionWaivedAmount > 0 && (
                  <div className="flex items-center justify-between text-purple-600 dark:text-purple-400">
                    <span>Subscription Waiver</span>
                    <span className="font-semibold">
                      -{formatCurrency(subscriptionWaivedAmount)}
                    </span>
                  </div>
                )}

                {membershipSavingsAmount > 0 && (
                  <div className="flex items-center justify-between text-amber-600 dark:text-amber-400">
                    <span>Membership Discount</span>
                    <span className="font-semibold">
                      -{formatCurrency(membershipSavingsAmount)}
                    </span>
                  </div>
                )}

                {manualDiscount > 0 && (
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span>Front-Desk Concession</span>
                    <span className="font-semibold text-foreground">
                      -{formatCurrency(manualDiscount)}
                    </span>
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-border flex items-baseline justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-foreground">
                  Net Payable
                </span>
                <span className="text-lg font-black text-foreground">
                  {formatCurrency(netPayableTotal)}
                </span>
              </div>

              {financialBreakdown.membershipCodes.length > 0 && (
                <div className="pt-2 border-t border-border/60 text-[11px] text-muted-foreground break-all">
                  Membership:{" "}
                  <span className="font-mono font-semibold text-foreground">
                    {financialBreakdown.membershipCodes.join(", ")}
                  </span>
                </div>
              )}
            </div>
          </aside>
        </div>

        {canDelete && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="text-xs">
              <span className="font-bold text-destructive block">
                Danger Zone
              </span>
              <span className="text-muted-foreground">
                Permanently remove this appointment record.
              </span>
            </div>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={onDelete}
              className="h-8 text-xs font-semibold gap-1.5 cursor-pointer shrink-0"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Delete Appointment</span>
            </Button>
          </div>
        )}

        {/* Legacy Details Anchor (hidden; preserves existing sub-dialogs & footer below) */}
        <div className="hidden">
          <div className="flex items-center justify-between border-b border-border pb-2">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20 flex items-center gap-1.5">
                {appointmentCodeDisplay}
                {isFetchingDetails && (
                  <Loader2 className="h-3 w-3 animate-spin text-primary" />
                )}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <BookingTypeBadge bookingType={appointment.bookingType} />
              <AppointmentStatusBadge
                status={appointment.status}
                isUnassignedQueue={!appointment.staffId}
              />
            </div>
          </div>

          {/* Customer & Branch */}
          <div className="grid grid-cols-2 gap-3 p-3 bg-muted/30 rounded-lg border border-border">
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                Customer
              </span>
              <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                <User className="h-3.5 w-3.5 text-primary" />
                {appointment.customer?.name ||
                  (appointment.customerId
                    ? "Customer #" + appointment.customerId.slice(-6)
                    : "Guest Customer")}
              </div>
              {appointment.customer?.phone && (
                <div className="text-[11px] text-muted-foreground pl-5">
                  {appointment.customer.phone}
                </div>
              )}
              {activeMembershipBenefits?.hasActiveMembership && (
                <div className="pl-5 pt-1">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30">
                    <CreditCard className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                    {activeMembershipBenefits.planSnapshot?.name ||
                      "Active Member"}{" "}
                    (
                    {activeMembershipBenefits.planSnapshot?.benefits
                      ?.serviceDiscountPercentage ?? 0}
                    % Service Off)
                  </span>
                </div>
              )}
            </div>

            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                Branch & Timezone
              </span>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                <MapPin className="h-3.5 w-3.5 text-primary" />
                {appointment.branch?.name || appointment.branchId}
              </div>
              <div className="text-[11px] text-muted-foreground pl-5">
                {branchTimezone}
              </div>
            </div>
          </div>

          {/* Schedule & Staff */}
          <div className="grid grid-cols-2 gap-3 p-3 bg-card rounded-lg border border-border">
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                Date & Time
              </span>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                <Calendar className="h-3.5 w-3.5 text-primary" />
                {formatDate(appointment.date)}
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground pl-5">
                <Clock className="h-3 w-3" />
                <span>
                  {appointment.startTime}{" "}
                  {appointment.endTime ? `- ${appointment.endTime}` : ""}
                </span>
              </div>
              {appointment.status === "completed" &&
                appointment.completedAt &&
                (() => {
                  const { lateDelayMins, actualCompletedTimeStr } =
                    calculateLateDelayMins({
                      date: appointment.date,
                      endTime: appointment.endTime,
                      completedAt: appointment.completedAt,
                      branchTimezone,
                    });

                  return (
                    <div className="text-[11px] text-muted-foreground pl-5 flex items-center gap-1.5 pt-0.5 flex-wrap">
                      <span className="font-medium text-emerald-700 dark:text-emerald-400">
                        Actual Completion:{" "}
                        {actualCompletedTimeStr
                          ? `${actualCompletedTimeStr} (${branchTimezone})`
                          : formatDate(appointment.completedAt, "hh:mm a")}
                      </span>
                      {lateDelayMins !== null && lateDelayMins > 0 && (
                        <span className="text-[9px] font-semibold text-amber-700 dark:text-amber-300 bg-amber-500/10 border border-amber-500/30 px-1.5 py-0.2 rounded-full">
                          +{lateDelayMins}m late
                        </span>
                      )}
                    </div>
                  );
                })()}
            </div>

            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                Assigned Staff
              </span>
              <div className="text-xs font-semibold text-foreground">
                {appointment.staff?.name || (
                  <span className="text-muted-foreground italic">
                    Unassigned
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Appointment Overview Summary Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 p-3 rounded-lg border border-border bg-muted/25 tabular-nums">
            <div className="min-w-0">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block">
                Services
              </span>
              <span className="text-xs font-bold text-foreground">
                {appointment.services?.length || 0} ·{" "}
                {appointment.totalDuration || 0}m
              </span>
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block">
                Gross Subtotal
              </span>
              <span className="text-xs font-bold text-foreground">
                {formatCurrency(grossSubtotal)}
              </span>
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block">
                Subscription
              </span>
              <span className="text-xs font-bold text-purple-600 dark:text-purple-400">
                {subscriptionWaivedAmount > 0
                  ? `-${formatCurrency(subscriptionWaivedAmount)}`
                  : formatCurrency(0)}
              </span>
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block">
                Membership
              </span>
              <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
                {membershipSavingsAmount > 0
                  ? `-${formatCurrency(membershipSavingsAmount)}`
                  : formatCurrency(0)}
              </span>
            </div>
            <div className="min-w-0 col-span-2 sm:col-span-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block">
                Net Payable
              </span>
              <span className="text-sm font-black text-foreground">
                {formatCurrency(netPayableTotal)}
              </span>
            </div>
          </div>

          {/* Services List */}
          <div className="space-y-1.5">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
              Services ({appointment.services?.length || 0})
            </span>
            <div className="divide-y divide-border border border-border rounded-md bg-card">
              {appointment.services?.map(
                (srv: AppointmentServiceSnapshot, idx: number) => {
                  const isCoveredBySub = Boolean(srv.appliedSubscriptionId);
                  const isRedeemed = srv.isRedeemedViaSubscription;

                  return (
                    <div
                      key={
                        srv.serviceId || srv._id || srv.id || `srv-idx-${idx}`
                      }
                      className="p-3 flex items-start justify-between gap-3 text-xs min-w-0"
                    >
                      <div className="flex items-start gap-2.5 min-w-0 flex-1">
                        <Scissors className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-semibold text-foreground">
                              {srv.name}
                            </span>
                            {(srv.isCustom ||
                              srv.serviceType === "custom" ||
                              !srv.serviceId) && (
                              <span className="text-[9px] bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/30 px-1.5 py-0.2 rounded font-semibold whitespace-nowrap">
                                Custom Service
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-muted-foreground flex flex-col gap-0.5 mt-0.5">
                            <span>{srv.duration} mins</span>
                            {isCoveredBySub &&
                              (() => {
                                const subInfo = srv.appliedSubscriptionId
                                  ? subscriptionMap.get(
                                      srv.appliedSubscriptionId,
                                    )
                                  : undefined;
                                const displayCode =
                                  resolveServiceSubscriptionCode(srv) ||
                                  subInfo?.code ||
                                  (srv.appliedSubscriptionId !== "auto" &&
                                  typeof srv.appliedSubscriptionId === "string"
                                    ? `#${srv.appliedSubscriptionId.slice(-6)}`
                                    : null);
                                const subTargetId =
                                  subInfo?.id ||
                                  (srv.appliedSubscriptionId !== "auto"
                                    ? srv.appliedSubscriptionId
                                    : null);

                                return (
                                  <div className="flex flex-wrap items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400 break-all">
                                    <ShieldCheck className="h-3 w-3 shrink-0" />
                                    <span>
                                      {isRedeemed ? "Redeemed:" : "Covered:"}
                                    </span>
                                    {displayCode && subTargetId ? (
                                      <Link
                                        href={`/subscriptions/${subTargetId}`}
                                        className="font-bold underline hover:opacity-85"
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        [{displayCode}]
                                      </Link>
                                    ) : (
                                      <span className="font-bold">
                                        [{displayCode || "Subscription"}]
                                      </span>
                                    )}
                                    {subInfo?.paymentStatus === "unpaid" ||
                                    subInfo?.paymentStatus ===
                                      "pending_payment" ? (
                                      <span className="text-[9px] bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30 px-1 py-0.2 rounded font-bold uppercase tracking-wider">
                                        Payment Pending
                                        {subInfo?.amountDue != null &&
                                        subInfo.amountDue > 0
                                          ? ` (₹${subInfo.amountDue})`
                                          : ""}
                                      </span>
                                    ) : subInfo?.paymentStatus ===
                                      "partially_paid" ? (
                                      <span className="text-[9px] bg-orange-500/20 text-orange-700 dark:text-orange-300 border border-orange-500/30 px-1 py-0.2 rounded font-bold uppercase tracking-wider">
                                        Partially Paid
                                        {subInfo?.amountDue != null &&
                                        subInfo.amountDue > 0
                                          ? ` (Due: ₹${subInfo.amountDue})`
                                          : ""}
                                      </span>
                                    ) : null}
                                  </div>
                                );
                              })()}
                            {!isCoveredBySub &&
                              (srv.membershipDiscountAmount || 0) > 0 && (
                                <div className="whitespace-nowrap text-[11px] font-medium flex items-center gap-1 text-amber-600 dark:text-amber-400">
                                  <Sparkles className="h-3 w-3 shrink-0" />
                                  <span>Member Privilege:</span>
                                  <span className="font-bold">
                                    [
                                    {srv.membershipDiscountPercentage
                                      ? `-${srv.membershipDiscountPercentage}%`
                                      : "Discount"}
                                    ]
                                  </span>
                                </div>
                              )}
                          </div>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        {isCoveredBySub ? (
                          <div className="flex flex-col items-end">
                            <span className="line-through text-muted-foreground text-[10px] font-normal leading-tight">
                              {formatCurrency(srv.price)}
                            </span>
                            <span className="text-emerald-600 dark:text-emerald-400 font-extrabold text-xs leading-tight">
                              ₹0.00
                            </span>
                          </div>
                        ) : (srv.membershipDiscountAmount || 0) > 0 ? (
                          <div className="flex flex-col items-end">
                            <span className="line-through text-muted-foreground text-[10px] font-normal leading-tight">
                              {formatCurrency(srv.price)}
                            </span>
                            <span className="text-amber-600 dark:text-amber-400 font-extrabold text-xs leading-tight">
                              {formatCurrency(
                                Math.max(
                                  0,
                                  srv.price -
                                    (srv.membershipDiscountAmount || 0),
                                ),
                              )}
                            </span>
                          </div>
                        ) : (
                          <div className="font-bold text-foreground">
                            {formatCurrency(srv.price)}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                },
              )}
            </div>
          </div>

          {/* Section: Prominent Membership & Subscription Upsell Banner */}
          {(canSellMemberships || canSellSubscriptions) &&
            customerId &&
            !isTerminal && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {/* Membership Card */}
                {canSellMemberships && (
                  <div className="p-3 bg-linear-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/30 rounded-lg space-y-2 text-xs flex flex-col justify-between">
                    <div className="flex items-start gap-2">
                      <div className="p-1.5 rounded-md bg-amber-500/20 text-amber-700 dark:text-amber-300 shrink-0 mt-0.5">
                        <Sparkles className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="font-bold text-foreground block">
                          {activeMembershipBenefits?.hasActiveMembership
                            ? `Membership: ${activeMembershipBenefits.planSnapshot?.name || "Active"}`
                            : "Membership Privileges"}
                        </span>
                        <span className="text-[11px] text-muted-foreground block line-clamp-2">
                          {activeMembershipBenefits?.hasActiveMembership
                            ? `Customer receives ${activeMembershipBenefits.planSnapshot?.benefits?.serviceDiscountPercentage ?? 0}% off salon services.`
                            : "Sell catalogue or customized tier. Applies discounts to this appointment."}
                        </span>
                      </div>
                    </div>

                    <div className="pt-1 flex justify-end">
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => setIsSellMembershipOpen(true)}
                        className="text-xs h-7 gap-1.5 bg-amber-600 hover:bg-amber-700 text-white shadow-2xs font-semibold cursor-pointer"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        {activeMembershipBenefits?.hasActiveMembership
                          ? "Upgrade / Add Plan"
                          : "Upsell Membership"}
                      </Button>
                    </div>
                  </div>
                )}

                {/* Subscription Upsell Card */}
                {canSellSubscriptions && (
                  <div className="p-3 bg-linear-to-r from-emerald-500/10 via-emerald-500/5 to-transparent border border-emerald-500/30 rounded-lg space-y-2 text-xs flex flex-col justify-between">
                    <div className="flex items-start gap-2">
                      <div className="p-1.5 rounded-md bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 shrink-0 mt-0.5">
                        <CreditCard className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="font-bold text-foreground block">
                          Subscription Packages
                        </span>
                        <span className="text-[11px] text-muted-foreground block line-clamp-2">
                          {customerSubsData &&
                          customerSubsData.data &&
                          customerSubsData.data.length > 0
                            ? `${customerSubsData.data.length} package(s) on file. Upsell a new package or session quota.`
                            : "Sell pre-bundled session packages with automated service coverage."}
                        </span>
                      </div>
                    </div>

                    <div className="pt-1 flex justify-end">
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => setIsSellSubscriptionOpen(true)}
                        className="text-xs h-7 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs font-semibold cursor-pointer"
                      >
                        <CreditCard className="w-3.5 h-3.5" />
                        Sell Subscription
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

          {/* Section A: Automated Scheduled Reminder */}
          <div className="space-y-2 border-t border-border pt-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
                Automated Scheduled Reminder
              </span>
              <span className="text-[10px] text-muted-foreground font-medium">
                Backend Automatic Workflow
              </span>
            </div>

            <AppointmentReminderStatus
              reminder={appointment.reminder}
              timeZone={branchTimezone}
            />

            {/* Render sendAt in branch timezone if scheduled */}
            {appointment.reminder?.enabled && appointment.reminder.sendAt && (
              <div className="text-[11px] bg-muted/30 p-2 rounded border border-border text-muted-foreground flex items-center justify-between">
                <span>Scheduled Delivery Time ({branchTimezone}):</span>
                <span className="font-semibold text-foreground">
                  {formatInBranchTimezone(
                    appointment.reminder.sendAt,
                    branchTimezone,
                  )}
                </span>
              </div>
            )}

            {isTerminal && (
              <div className="text-[11px] text-muted-foreground italic flex items-center gap-1 pt-1">
                <AlertCircle className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                Reminders are unavailable for completed, cancelled, or no-show
                appointments.
              </div>
            )}
          </div>

          {/* Section B: Manual "Send Reminder Now" Action */}
          {canSendReminder &&
            !isTerminal &&
            appointment.branchId &&
            appointment.branchId !== "all" && (
              <div className="p-3 bg-muted/20 border border-border rounded-lg space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-bold text-foreground block">
                      Manual Action
                    </span>
                    <span className="text-[10px] text-muted-foreground block">
                      Explicit immediate notification override
                    </span>
                  </div>
                  {!showSendConfirmation && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowSendConfirmation(true)}
                      disabled={triggerReminderMutation.isPending}
                      className="text-xs h-7 gap-1 border-primary/40 text-primary hover:bg-primary/10"
                    >
                      {triggerReminderMutation.isPending ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Send className="h-3 w-3" />
                      )}
                      Send Reminder Now
                    </Button>
                  )}
                </div>

                {/* Send Reminder Confirmation Alert Banner */}
                {showSendConfirmation && (
                  <div className="p-2.5 bg-primary/10 border border-primary/30 rounded-md space-y-2 text-xs">
                    <div className="font-bold text-foreground flex items-center gap-1.5">
                      <Send className="h-3.5 w-3.5 text-primary" />
                      Send reminder now to this customer?
                    </div>
                    <p className="text-muted-foreground text-[11px]">
                      This will trigger an immediate notification dispatch
                      through{" "}
                      {appointment.reminder?.channel === "both"
                        ? "SMS and Email"
                        : (
                            appointment.reminder?.channel ||
                            "configured channel"
                          ).toUpperCase()}{" "}
                      for branch{" "}
                      <span className="font-semibold text-foreground">
                        {appointment.branch?.name || appointment.branchId}
                      </span>
                      .
                    </p>
                    <div className="flex items-center justify-end gap-2 pt-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setShowSendConfirmation(false)}
                        disabled={triggerReminderMutation.isPending}
                        className="text-xs h-7"
                      >
                        Cancel
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        onClick={handleTriggerReminder}
                        disabled={triggerReminderMutation.isPending}
                        className="text-xs h-7 bg-primary text-primary-foreground"
                      >
                        {triggerReminderMutation.isPending
                          ? "Sending..."
                          : "Confirm & Send"}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

          {/* Pricing Breakdown */}
          <div className="p-3 bg-muted/40 rounded-lg border border-border space-y-1.5 text-xs tabular-nums">
            <div className="flex items-center justify-between text-muted-foreground">
              <span>Gross Subtotal</span>
              <span>{formatCurrency(grossSubtotal)}</span>
            </div>

            {subscriptionWaivedAmount > 0 && (
              <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 font-medium">
                <span className="flex items-center gap-1">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Subscription Plan Waived
                </span>
                <span className="font-semibold">
                  -{formatCurrency(subscriptionWaivedAmount)}
                </span>
              </div>
            )}

            {membershipSavingsAmount > 0 && (
              <div className="flex items-center justify-between text-amber-600 dark:text-amber-400 font-medium">
                <span className="flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>
                    Membership Privilege
                    {activeMembershipBenefits?.planSnapshot?.name
                      ? ` (${activeMembershipBenefits.planSnapshot.name})`
                      : " Discount"}
                  </span>
                </span>
                <span className="font-semibold">
                  -{formatCurrency(membershipSavingsAmount)}
                </span>
              </div>
            )}

            {manualDiscount > 0 && (
              <div className="flex items-center justify-between text-muted-foreground">
                <span
                  className="flex items-center gap-1.5"
                  title="Direct price concession applied during appointment creation or service checkout"
                >
                  <Tag className="h-3.5 w-3.5 text-blue-500/80" />
                  <span>Front-Desk / Special Concession</span>
                </span>
                <span className="font-semibold text-foreground/90">
                  -{formatCurrency(manualDiscount)}
                </span>
              </div>
            )}

            <div className="flex items-center justify-between font-bold text-foreground pt-1.5 border-t border-border/60">
              <span>Net Payable Total</span>
              <span className="text-sm font-extrabold text-primary">
                {formatCurrency(netPayableTotal)}
              </span>
            </div>
          </div>

          {/* Notes & Reason */}
          {appointment.notes && (
            <div className="text-xs space-y-1 bg-card p-2.5 rounded-md border border-border">
              <span className="font-semibold text-foreground">Notes:</span>
              <p className="text-muted-foreground">{appointment.notes}</p>
            </div>
          )}

          {appointment.cancellationReason && (
            <div className="text-xs space-y-1 bg-destructive/10 p-2.5 rounded-md border border-destructive/20 text-destructive">
              <span className="font-semibold">Cancellation Reason:</span>
              <p>{appointment.cancellationReason}</p>
            </div>
          )}

          {/* Timestamps */}
          <div className="text-[11px] text-muted-foreground space-y-0.5 pt-2 border-t border-border">
            {appointment.completedAt && (
              <div>
                Completed at:{" "}
                {formatDate(appointment.completedAt, "dd MMM yyyy, hh:mm a")}
              </div>
            )}
            {appointment.cancelledAt && (
              <div>
                Cancelled at:{" "}
                {formatDate(appointment.cancelledAt, "dd MMM yyyy, hh:mm a")}
              </div>
            )}
            <div>
              Created:{" "}
              {formatDate(appointment.createdAt, "dd MMM yyyy, hh:mm a")}
            </div>
          </div>

          {/* Action Controls */}
          <div className="flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-3 pt-3.5 border-t border-border mt-3">
            {/* Left / Bottom on Mobile: Destructive Action cleanly isolated and vertically aligned */}
            <div className="flex items-center">
              {canDelete ? (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={onDelete}
                  className="text-xs h-8 gap-1.5 w-full sm:w-auto font-medium"
                  title="Cancel or delete this appointment record"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Delete</span>
                </Button>
              ) : null}
            </div>
          </div>
          {/* Right / Top on Mobile: Secondary actions grouped into More Actions + Primary Lifecycle CTA */}
          <div className="flex flex-wrap items-center justify-end gap-2">
            {/* Operational Management Actions grouped in a compact Popover */}
            {((canEdit && !isTerminal) ||
              (canSellSubscriptions && customerId)) && (
              <div className="relative" ref={actionsMenuRef}>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsActionsMenuOpen((prev) => !prev)}
                  className="text-xs h-8 gap-1.5"
                  aria-haspopup="true"
                  aria-expanded={isActionsMenuOpen}
                >
                  <MoreHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>Actions</span>
                  {isActionsMenuOpen ? (
                    <ChevronUp className="h-3 w-3 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-3 w-3 text-muted-foreground" />
                  )}
                </Button>

                {isActionsMenuOpen && (
                  <div
                    role="menu"
                    className="absolute right-0 bottom-full mb-1.5 w-52 rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-lg z-50 animate-in fade-in-0 zoom-in-95"
                  >
                    {canEdit && !isTerminal && (
                      <>
                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => {
                            setIsActionsMenuOpen(false);
                            onReschedule();
                          }}
                          className="w-full flex items-center gap-2 rounded-sm px-2.5 py-1.5 text-xs text-left text-foreground hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer"
                        >
                          <CalendarClock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <span>Reschedule Appointment</span>
                        </button>
                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => {
                            setIsActionsMenuOpen(false);
                            onAssignStaff();
                          }}
                          className="w-full flex items-center gap-2 rounded-sm px-2.5 py-1.5 text-xs text-left text-foreground hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer"
                        >
                          <UserCheck className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <span>Assign / Change Staff</span>
                        </button>
                        {onEditServices && (
                          <button
                            type="button"
                            role="menuitem"
                            onClick={() => {
                              setIsActionsMenuOpen(false);
                              onEditServices();
                            }}
                            className="w-full flex items-center gap-2 rounded-sm px-2.5 py-1.5 text-xs text-left text-foreground hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer"
                          >
                            <Scissors className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            <span>Modify Services</span>
                          </button>
                        )}
                      </>
                    )}

                    {canSellSubscriptions && customerId && (
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setIsActionsMenuOpen(false);
                          setIsSellSubscriptionOpen(true);
                        }}
                        className="w-full flex items-center gap-2 rounded-sm px-2.5 py-1.5 text-xs text-left text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 transition-colors cursor-pointer font-medium"
                      >
                        <CreditCard className="h-3.5 w-3.5 shrink-0" />
                        <span>Sell Subscription</span>
                      </button>
                    )}

                    {canSellMemberships && customerId && (
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setIsActionsMenuOpen(false);
                          setIsSellMembershipOpen(true);
                        }}
                        className="w-full flex items-center gap-2 rounded-sm px-2.5 py-1.5 text-xs text-left text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 transition-colors cursor-pointer font-medium"
                      >
                        <CreditCard className="h-3.5 w-3.5 shrink-0" />
                        <span>Sell Membership</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Quick Status Shift if in progress */}
            {canStatus &&
              !isTerminal &&
              appointment.status === "in_progress" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onChangeStatus}
                  className="text-xs h-8 gap-1.5"
                  title="Change appointment status"
                >
                  <RefreshCw className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>Change Status</span>
                </Button>
              )}

            {/* PRIMARY CTA: In-Progress -> Complete Appointment */}
            {canStatus &&
              !isTerminal &&
              appointment.status === "in_progress" &&
              onCompleteAppointment && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => onCompleteAppointment(appointment)}
                  className="text-xs h-8 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs font-semibold"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>Complete Appointment</span>
                </Button>
              )}

            {/* PRIMARY CTA: Scheduled -> Start Service Now */}
            {canStatus &&
              !isTerminal &&
              appointment.status === "scheduled" &&
              onStartAppointment && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => onStartAppointment(appointment)}
                  className="text-xs h-8 gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs font-semibold"
                  title="Start service now"
                >
                  <Clock className="h-3.5 w-3.5" />
                  <span>Start Service Now</span>
                </Button>
              )}

            {/* SECONDARY / FALLBACK CTA: Change Status dropdown when not in_progress, completed, or scheduled with quick-start */}
            {canStatus &&
              !isTerminal &&
              appointment.status !== "in_progress" &&
              !(appointment.status === "scheduled" && onStartAppointment) && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={onChangeStatus}
                  className="text-xs h-8 gap-1.5 shadow-2xs font-semibold"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span>Change Status</span>
                </Button>
              )}

            {/* PRIMARY CTA: Completed -> Open in Sales Register */}
            {canCheckout && appointment.status === "completed" && (
              <Button
                variant="default"
                size="sm"
                onClick={() => {
                  const cust = {
                    id:
                      appointment.customerId || appointment.customer?.id || "",
                    name: appointment.customer?.name || "Walk-in Customer",
                    phone: appointment.customer?.phone || "",
                    email: appointment.customer?.email || null,
                  };

                  const appointmentCode =
                    appointment.appointmentCode ||
                    appointment.id.slice(-6).toUpperCase();

                  const services = (appointment.services || []).map(
                    (s: AppointmentServiceSnapshot) => {
                      let subCode = s.subscriptionCode || null;
                      const appliedSubId = s.appliedSubscriptionId || null;

                      if (!subCode && appliedSubId) {
                        const subInfo = subscriptionMap.get(appliedSubId);
                        if (subInfo?.code) {
                          subCode = subInfo.code;
                        }
                      }

                      const isCovered = Boolean(
                        appliedSubId ||
                        s.appliedSubscriptionId ||
                        s.subscriptionUsageId ||
                        subCode,
                      );

                      return {
                        appointmentId: appointment.id,
                        appointmentCode,
                        serviceId: s.serviceId || undefined,
                        name: s.name,
                        duration: s.duration,
                        unitPrice: s.price,
                        quantity: 1,
                        isCoveredBySubscription: isCovered,
                        appliedSubscriptionId: appliedSubId,
                        subscriptionCode: subCode,
                      };
                    },
                  );

                  const aptWithInvoice = appointment as Appointment & {
                    invoiceId?: string;
                    invoiceNumber?: string;
                  };
                  const existingDraft = aptWithInvoice.invoiceId
                    ? {
                        id: aptWithInvoice.invoiceId,
                        invoiceNumber: aptWithInvoice.invoiceNumber || "DRAFT",
                      }
                    : null;

                  dispatch(
                    setBasketAppointment({
                      appointmentId: appointment.id,
                      appointmentCode,
                      customer: cust,
                      services,
                      existingDraftInvoice: existingDraft,
                    }),
                  );

                  toast.info(
                    `Appointment #${appointmentCode} loaded into Sales Register.`,
                  );
                  onClose();
                  router.push("/billing/sales/new");
                }}
                className="text-xs h-8 gap-1.5 font-semibold bg-primary text-primary-foreground shadow-xs"
                title="Open appointment in Sales Workspace for checkout"
              >
                <Receipt className="h-3.5 w-3.5" />
                <span>Checkout in Register</span>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Subscription Upsell Dialog from Appointment Context */}
      <Dialog
        isOpen={isSellSubscriptionOpen}
        onClose={() => setIsSellSubscriptionOpen(false)}
        maxWidth="5xl"
        title="Sell Subscription Package (Appointment Upsell)"
      >
        <CreateSubscriptionDialog
          isOpen={isSellSubscriptionOpen}
          onClose={() => setIsSellSubscriptionOpen(false)}
          initialCustomerId={customerId}
          branchId={appointment.branchId}
          isLoading={upsellSubMutation.isPending}
          onSubmit={async (values) => {
            try {
              const canonicalPayload = buildSubscriptionPurchasePayload({
                values,
                effectiveBranchId: appointment.branchId,
                defaultCustomerId: customerId,
              });

              // Extract flat entitlements if present, or flatten member entitlements for appointment upsell endpoint compatibility
              const resolvedEntitlements =
                canonicalPayload.entitlements &&
                canonicalPayload.entitlements.length > 0
                  ? canonicalPayload.entitlements
                  : (canonicalPayload.members || []).flatMap(
                      (m) => m.entitlements || [],
                    );

              const res = await upsellSubMutation.mutateAsync({
                appointmentId: appointment.id,
                payload: {
                  branchId: appointment.branchId,
                  planId: canonicalPayload.planId,
                  soldByStaffId: canonicalPayload.soldByStaffId || undefined,
                  price: canonicalPayload.price,
                  entitlements: resolvedEntitlements,
                  permittedBranchIds: canonicalPayload.permittedBranchIds,
                  startDate: canonicalPayload.startDate,
                  endDate: canonicalPayload.endDate,
                  notes: canonicalPayload.notes,
                },
              });

              setIsSellSubscriptionOpen(false);

              // Surface the separate subscription invoice distinctly from appointment
              const invoiceId =
                res.invoiceId || res.invoice?.id || res.subscription?.invoiceId;
              const invoiceNum =
                res.invoice?.invoiceNumber ||
                res.subscription?.invoiceNumber ||
                "";

              if (invoiceId) {
                toast.success(
                  `Subscription package sold! Separate invoice ${invoiceNum} generated for package sale.`,
                  {
                    action: {
                      label: "Open Invoice",
                      onClick: () => router.push(`/billing/${invoiceId}`),
                    },
                    duration: 6000,
                  },
                );
                router.push(`/billing/${invoiceId}`);
              } else {
                toast.success("Subscription package sold successfully.");
              }
            } catch (err: unknown) {
              const errorObj = err as Record<string, unknown> | null;
              const responseObj = errorObj?.response as Record<
                string,
                unknown
              > | null;
              const msg =
                ((responseObj?.data as Record<string, unknown> | null)
                  ?.message as string) ||
                (errorObj?.message as string) ||
                "Failed to sell subscription package.";
              toast.error(msg);
            }
          }}
        />
      </Dialog>

      {/* Membership Upsell Dialog from Appointment Context */}
      <SellMembershipDialog
        isOpen={isSellMembershipOpen}
        onClose={() => setIsSellMembershipOpen(false)}
        isLoading={
          upsellMembershipMutation.isPending ||
          createMembershipPlanMutation.isPending
        }
        plans={membershipPlans}
        initialCustomerId={customerId}
        onCreateCustomPlanAndSell={async (customPlanPayload, checkoutData) => {
          try {
            // 1. Create custom plan
            const createdPlan =
              await createMembershipPlanMutation.mutateAsync(customPlanPayload);

            // 2. Upsell membership directly into appointment context
            const result = await upsellMembershipMutation.mutateAsync({
              appointmentId: appointment.id,
              payload: {
                planId: createdPlan.id,
                payerCustomerId: checkoutData.payerCustomerId,
                beneficiaryCustomerIds: checkoutData.beneficiaryCustomerIds,
                beneficiaries: checkoutData.beneficiaries,
                soldByStaffId: checkoutData.soldByStaffId || undefined,
                notes:
                  checkoutData.notes ||
                  `Custom membership upsold during appointment #${appointmentCodeDisplay}`,
                // Defer invoice generation to Unified Sales Workspace checkout
                billImmediately: false,
              },
            });

            setIsSellMembershipOpen(false);

            const invoiceId = result?.invoice?.id;
            if (invoiceId) {
              toast.success(
                `Custom membership created & discount applied to appointment! Invoice #${result.invoice?.invoiceNumber || ""} created.`,
                {
                  action: {
                    label: "Open Invoice",
                    onClick: () => router.push(`/billing/${invoiceId}`),
                  },
                  duration: 6000,
                },
              );
            } else {
              toast.success(
                "Custom membership upsold & discounts applied successfully.",
              );
            }
          } catch (err: unknown) {
            const errorObj = err as Record<string, unknown> | null;
            const responseObj = errorObj?.response as Record<
              string,
              unknown
            > | null;
            const msg =
              ((responseObj?.data as Record<string, unknown> | null)
                ?.message as string) ||
              (errorObj?.message as string) ||
              "Failed to process custom membership upsell.";
            toast.error(msg);
          }
        }}
        onSubmit={async (values) => {
          try {
            const result = await upsellMembershipMutation.mutateAsync({
              appointmentId: appointment.id,
              payload: {
                planId: values.membershipPlanId,
                payerCustomerId: values.payerCustomerId,
                beneficiaryCustomerIds: values.beneficiaryCustomerIds,
                beneficiaries: values.beneficiaries,
                soldByStaffId: values.soldByStaffId || undefined,
                notes:
                  values.notes ||
                  `Membership upsold during appointment #${appointmentCodeDisplay}`,
                // Defer invoice generation to Unified Sales Workspace checkout
                billImmediately: false,
              },
            });

            setIsSellMembershipOpen(false);

            const invoiceId = result?.invoice?.id;
            if (invoiceId) {
              toast.success(
                `Membership plan sold & discount applied to appointment! Invoice #${result.invoice?.invoiceNumber || ""} created.`,
                {
                  action: {
                    label: "Open Invoice",
                    onClick: () => router.push(`/billing/${invoiceId}`),
                  },
                  duration: 6000,
                },
              );
            } else {
              toast.success(
                "Membership upsold & discounts applied successfully.",
              );
            }
          } catch (err: unknown) {
            const errorObj = err as Record<string, unknown> | null;
            const responseObj = errorObj?.response as Record<
              string,
              unknown
            > | null;
            const msg =
              ((responseObj?.data as Record<string, unknown> | null)
                ?.message as string) ||
              (errorObj?.message as string) ||
              "Failed to process membership upsell.";
            toast.error(msg);
          }
        }}
      />
    </Dialog>
  );
}
