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
} from "lucide-react";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { hasPermission } from "@/lib/permissions";
import {
  useAppointment,
  useTriggerAppointmentReminder,
} from "../hooks/useAppointments";
import { toast } from "sonner";
import type {
  Appointment,
  AppointmentServiceSnapshot,
} from "../types/appointment.types";

interface AppointmentDetailsDialogProps {
  appointment: Appointment | null;
  isOpen: boolean;
  onClose: () => void;
  onReschedule: () => void;
  onAssignStaff: () => void;
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
  onChangeStatus,
  onDelete,
  onCompleteAppointment,
  canEdit,
  canStatus,
  canDelete,
}: AppointmentDetailsDialogProps) {
  const { user } = useAuth();
  const [showSendConfirmation, setShowSendConfirmation] = useState(false);

  // Fetch real-time fresh single appointment details from GET /appointments/:id
  // Enabled only when the dialog is open and we have an appointment ID.
  const { data: fetchedAppointment, isLoading: isFetchingDetails } =
    useAppointment(isOpen ? initialAppointment?.id : undefined);

  // Use fresh fetched single appointment data, falling back to initial list item snapshot
  const appointment = fetchedAppointment || initialAppointment;

  const triggerReminderMutation = useTriggerAppointmentReminder();

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
              {appointment.startTime}{" "}
              {appointment.endTime ? `- ${appointment.endTime}` : ""}
            </div>
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
                    key={srv.serviceId || idx}
                    className="p-2.5 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <Scissors className="h-3.5 w-3.5 text-primary" />
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-foreground">
                            {srv.name}
                          </span>
                          {isCoveredBySub && (
                            <span
                              className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border flex items-center gap-1 ${
                                isRedeemed
                                  ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                                  : "bg-primary/10 text-primary border-primary/20"
                              }`}
                            >
                              <ShieldCheck className="h-3 w-3" />
                              {isRedeemed
                                ? "Subscription Redeemed"
                                : "Subscription Covered"}
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          {srv.duration} mins
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

          <AppointmentReminderStatus reminder={appointment.reminder} />

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
        <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-3.5 border-t border-border mt-3">
          {/* Left / Bottom on Mobile: Destructive Action isolated from primary actions */}
          <div>
            {canDelete ? (
              <Button
                variant="destructive"
                size="sm"
                onClick={onDelete}
                className="text-xs h-8 gap-1.5 w-full sm:w-auto"
                title="Cancel or delete this appointment record"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Delete Appointment</span>
              </Button>
            ) : null}
          </div>

          {/* Right / Top on Mobile: Operational Secondary Actions + Primary Lifecycle Action */}
          <div className="flex flex-wrap items-center justify-end gap-2">
            {canEdit && !isTerminal && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onReschedule}
                  className="text-xs h-8 gap-1.5"
                  title="Change appointment date or time slot"
                >
                  <CalendarClock className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>Reschedule</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onAssignStaff}
                  className="text-xs h-8 gap-1.5"
                  title="Assign or reassign staff member"
                >
                  <UserCheck className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>Assign Staff</span>
                </Button>
              </>
            )}

            {canStatus && !isTerminal && (
              <>
                {appointment.status === "in_progress" &&
                onCompleteAppointment ? (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => onCompleteAppointment(appointment)}
                    className="text-xs h-8 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs font-semibold"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>Complete Appointment</span>
                  </Button>
                ) : null}
                <Button
                  variant={
                    appointment.status === "in_progress" ? "outline" : "default"
                  }
                  size="sm"
                  onClick={onChangeStatus}
                  className="text-xs h-8 gap-1.5 shadow-2xs font-semibold"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span>Change Status</span>
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </Dialog>
  );
}
