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
  MoreHorizontal,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { hasPermission } from "@/lib/permissions";
import {
  useAppointment,
  useTriggerAppointmentReminder,
  useUpsellAppointmentSubscription,
} from "../hooks/useAppointments";
import Link from "next/link";
import { toast } from "sonner";
import { CreateInvoiceDialog } from "@/features/billing/components/CreateInvoiceDialog";
import { useSubscriptions } from "@/features/subscriptions/hooks/useSubscriptions";
import { CreateSubscriptionDialog } from "@/features/subscriptions/components/CreateSubscriptionDialog";
import type {
  Appointment,
  AppointmentServiceSnapshot,
} from "../types/appointment.types";
import { calculateLateDelayMins } from "../utils/appointmentTime";

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
  canEdit,
  canStatus,
  canDelete,
}: AppointmentDetailsDialogProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [showSendConfirmation, setShowSendConfirmation] = useState(false);
  const [isCreateInvoiceOpen, setIsCreateInvoiceOpen] = useState(false);
  const [isSellSubscriptionOpen, setIsSellSubscriptionOpen] = useState(false);
  const [isActionsMenuOpen, setIsActionsMenuOpen] = useState(false);
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
  const canCheckout = hasPermission(user, "billing.checkout");
  const canSellSubscriptions = hasPermission(user, "subscriptions.sell");

  // Fetch real-time fresh single appointment details from GET /appointments/:id
  // Enabled only when the dialog is open and we have an appointment ID.
  const { data: fetchedAppointment, isLoading: isFetchingDetails } =
    useAppointment(
      isOpen ? initialAppointment?.id : undefined,
      initialAppointment?.branchId
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
        const planName = typeof sub.planId === "object" ? sub.planId?.name : undefined;
        map.set(sub.id, {
          code: sub.subscriptionCode,
          planName,
          id: sub.id,
          paymentStatus: sub.paymentStatus,
          amountDue: sub.amountDue,
          invoiceId: sub.invoiceId,
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

  // Pricing & Subscription Calculations
  const grossSubtotal =
    appointment.pricing?.subtotal ??
    appointment.services?.reduce(
      (sum: number, s: AppointmentServiceSnapshot) => sum + (s.price || 0),
      0,
    ) ??
    0;

  const subscriptionWaivedAmount =
    appointment.services?.reduce(
      (sum: number, s: AppointmentServiceSnapshot) => {
        return sum + (s.appliedSubscriptionId ? s.price || 0 : 0);
      },
      0,
    ) ?? 0;

  const manualDiscount = appointment.pricing?.discount || 0;

  // The true net payable amount taking subscription waiver into account
  const netPayableTotal =
    appointment.pricing?.total !== undefined
      ? subscriptionWaivedAmount > 0 &&
        appointment.pricing.total === grossSubtotal
        ? Math.max(0, grossSubtotal - subscriptionWaivedAmount - manualDiscount)
        : appointment.pricing.total
      : Math.max(0, grossSubtotal - subscriptionWaivedAmount - manualDiscount);

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
    <Dialog isOpen={isOpen} onClose={onClose} title={dialogTitle}>
      <div className="space-y-4 text-left">
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
            {appointment.status === "completed" && appointment.completedAt && (
              (() => {
                const { lateDelayMins, actualCompletedTimeStr } = calculateLateDelayMins({
                  date: appointment.date,
                  endTime: appointment.endTime,
                  completedAt: appointment.completedAt,
                  branchTimezone,
                });

                return (
                  <div className="text-[11px] text-muted-foreground pl-5 flex items-center gap-1.5 pt-0.5 flex-wrap">
                    <span className="font-medium text-emerald-700 dark:text-emerald-400">
                      Actual Completion: {actualCompletedTimeStr ? `${actualCompletedTimeStr} (${branchTimezone})` : formatDate(appointment.completedAt, "hh:mm a")}
                    </span>
                    {lateDelayMins !== null && lateDelayMins > 0 && (
                      <span className="text-[9px] font-semibold text-amber-700 dark:text-amber-300 bg-amber-500/10 border border-amber-500/30 px-1.5 py-0.2 rounded-full">
                        +{lateDelayMins}m late
                      </span>
                    )}
                  </div>
                );
              })()
            )}
          </div>

          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
              Assigned Staff
            </span>
            <div className="text-xs font-semibold text-foreground">
              {appointment.staff?.name || (
                <span className="text-muted-foreground italic">Unassigned</span>
              )}
            </div>
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
                    key={srv.serviceId || srv._id || srv.id || `srv-idx-${idx}`}
                    className="p-2.5 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <Scissors className="h-3.5 w-3.5 text-primary" />
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-semibold text-foreground">
                            {srv.name}
                          </span>
                          {(srv.isCustom || srv.serviceType === "custom" || !srv.serviceId) && (
                            <span className="text-[9px] bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/30 px-1.5 py-0.2 rounded font-semibold whitespace-nowrap">
                              Custom Service
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-muted-foreground flex flex-col gap-0.5 mt-0.5">
                          <span>{srv.duration} mins</span>
                          {isCoveredBySub && (
                            (() => {
                              const subInfo = srv.appliedSubscriptionId
                                ? subscriptionMap.get(srv.appliedSubscriptionId)
                                : undefined;
                              const displayCode =
                                srv.subscriptionCode ||
                                subInfo?.code ||
                                (srv.appliedSubscriptionId !== "auto" && srv.appliedSubscriptionId
                                  ? `#${srv.appliedSubscriptionId.slice(-6)}`
                                  : null);
                              const subTargetId =
                                subInfo?.id ||
                                (srv.appliedSubscriptionId !== "auto" ? srv.appliedSubscriptionId : null);

                              return (
                                <div className="whitespace-nowrap text-[11px] font-medium flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
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
                                  {subInfo?.paymentStatus === "unpaid" || subInfo?.paymentStatus === "pending_payment" ? (
                                    <span className="text-[9px] bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30 px-1 py-0.2 rounded font-bold uppercase tracking-wider">
                                      Payment Pending{subInfo?.amountDue != null && subInfo.amountDue > 0 ? ` (₹${subInfo.amountDue})` : ""}
                                    </span>
                                  ) : subInfo?.paymentStatus === "partially_paid" ? (
                                    <span className="text-[9px] bg-orange-500/20 text-orange-700 dark:text-orange-300 border border-orange-500/30 px-1 py-0.2 rounded font-bold uppercase tracking-wider">
                                      Partially Paid{subInfo?.amountDue != null && subInfo.amountDue > 0 ? ` (Due: ₹${subInfo.amountDue})` : ""}
                                    </span>
                                  ) : null}
                                </div>
                              );
                            })()
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
                    This will trigger an immediate notification dispatch through{" "}
                    {appointment.reminder?.channel === "both"
                      ? "SMS and Email"
                      : (
                          appointment.reminder?.channel || "configured channel"
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
        <div className="p-3 bg-muted/40 rounded-lg border border-border space-y-1.5 text-xs">
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

          {manualDiscount > 0 && (
            <div className="flex items-center justify-between text-muted-foreground">
              <span>Additional Discount</span>
              <span>-{formatCurrency(manualDiscount)}</span>
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
            Created: {formatDate(appointment.createdAt, "dd MMM yyyy, hh:mm a")}
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

          {/* Right / Top on Mobile: Secondary actions grouped into More Actions + Primary Lifecycle CTA */}
          <div className="flex flex-wrap items-center justify-end gap-2">
            {/* Operational Management Actions grouped in a compact Popover */}
            {((canEdit && !isTerminal) || (canSellSubscriptions && customerId)) && (
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
                  </div>
                )}
              </div>
            )}

            {/* Quick Status Shift if in progress */}
            {canStatus && !isTerminal && appointment.status === "in_progress" && (
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
            {canStatus && !isTerminal && appointment.status === "in_progress" && onCompleteAppointment && (
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

            {/* PRIMARY CTA: General Status Transition when not yet in-progress or completed */}
            {canStatus && !isTerminal && appointment.status !== "in_progress" && (
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

            {/* PRIMARY CTA: Completed -> Create Invoice */}
            {canCheckout && appointment.status === "completed" && (
              <Button
                variant="default"
                size="sm"
                onClick={() => setIsCreateInvoiceOpen(true)}
                className="text-xs h-8 gap-1.5 font-semibold bg-primary text-primary-foreground shadow-xs"
                title="Generate final invoice for completed appointment"
              >
                <Receipt className="h-3.5 w-3.5" />
                <span>Create Invoice</span>
              </Button>
            )}
          </div>
        </div>
      </div>

      <CreateInvoiceDialog
        isOpen={isCreateInvoiceOpen}
        onClose={() => setIsCreateInvoiceOpen(false)}
        appointment={appointment}
        onSuccess={(invoiceId) => {
          onClose();
          router.push(`/billing/${invoiceId}`);
        }}
      />

      {/* Subscription Upsell Dialog from Appointment Context */}
      <Dialog
        isOpen={isSellSubscriptionOpen}
        onClose={() => setIsSellSubscriptionOpen(false)}
        title="Sell Subscription Package (Appointment Upsell)"
      >
        <CreateSubscriptionDialog
          isOpen={isSellSubscriptionOpen}
          onClose={() => setIsSellSubscriptionOpen(false)}
          initialCustomerId={customerId}
          isLoading={upsellSubMutation.isPending}
          onSubmit={async (values) => {
            try {
              const res = await upsellSubMutation.mutateAsync({
                appointmentId: appointment.id,
                payload: {
                  branchId: appointment.branchId,
                  planId: values.planId,
                  price: values.price,
                  entitlements: values.entitlements,
                  permittedBranchIds: values.permittedBranchIds,
                  startDate: values.startDate,
                  endDate: values.endDate,
                  notes: values.notes,
                },
              });

              setIsSellSubscriptionOpen(false);

              // Surface the separate subscription invoice distinctly from appointment
              const invoiceId = res.invoiceId || res.invoice?.id || res.subscription?.invoiceId;
              const invoiceNum = res.invoice?.invoiceNumber || res.subscription?.invoiceNumber || "";

              if (invoiceId) {
                toast.success(
                  `Subscription package sold! Separate invoice ${invoiceNum} generated for package sale.`,
                  {
                    action: {
                      label: "Open Invoice",
                      onClick: () => router.push(`/billing/${invoiceId}`),
                    },
                    duration: 6000,
                  }
                );
                router.push(`/billing/${invoiceId}`);
              } else {
                toast.success("Subscription package sold successfully.");
              }
            } catch (err: unknown) {
              const errorObj = err as Record<string, unknown> | null;
              const responseObj = errorObj?.response as Record<string, unknown> | null;
              const msg =
                ((responseObj?.data as Record<string, unknown> | null)?.message as string) ||
                (errorObj?.message as string) ||
                "Failed to sell subscription package.";
              toast.error(msg);
            }
          }}
        />
      </Dialog>
    </Dialog>
  );
}
