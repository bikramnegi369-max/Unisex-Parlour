"use client";

import React, { useEffect } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  updateStatusSchema,
  type UpdateStatusSchemaType,
} from "../schemas/appointment.schema";
import { requiresSubscriptionVerification } from "../utils/appointmentSubscription";
import { toast } from "sonner";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { hasPermission } from "@/lib/permissions";
import { ShieldCheck, AlertTriangle } from "lucide-react";
import type { Appointment } from "../types/appointment.types";

interface AppointmentStatusDialogProps {
  appointment: Appointment | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (id: string, payload: UpdateStatusSchemaType) => Promise<void>;
  onRequireSubscriptionVerification?: (appointment: Appointment) => void;
  isLoading: boolean;
}

export function AppointmentStatusDialog({
  appointment,
  isOpen,
  onClose,
  onSubmit,
  onRequireSubscriptionVerification,
  isLoading,
}: AppointmentStatusDialogProps) {
  const { user } = useAuth();
  const canForceEarlyStart = hasPermission(user, "appointments.force_early_start");

  const {
    register,
    handleSubmit,
    control,
    reset,
  } = useForm<UpdateStatusSchemaType>({
    resolver: zodResolver(updateStatusSchema),
    defaultValues: {
      branchId: appointment?.branchId || "",
      status: appointment?.status || "scheduled",
      cancellationReason: "",
      forceEarlyStart: false,
    },
  });

  const selectedStatus = useWatch({
    control,
    name: "status",
  });

  // Early start calculation: is appointment scheduled start > 15 minutes ahead of current time?
  const isEarlyStart = React.useMemo(() => {
    if (!appointment?.date || !appointment.startTime) return false;
    try {
      const branchTz = appointment.branch?.timezone || "Asia/Kolkata";
      const nowInTz = new Date(new Date().toLocaleString("en-US", { timeZone: branchTz }));
      const [apptY, apptM, apptD] = appointment.date.split("-").map(Number);
      const [apptH, apptMin] = appointment.startTime.split(":").map(Number);
      const apptDate = new Date(apptY, apptM - 1, apptD, apptH, apptMin, 0);

      const diffMs = apptDate.getTime() - nowInTz.getTime();
      const diffMinutes = diffMs / 60000;
      return diffMinutes > 15;
    } catch {
      return false;
    }
  }, [appointment]);

  useEffect(() => {
    if (isOpen && appointment) {
      reset({
        branchId: appointment.branchId,
        status: appointment.status,
        cancellationReason: appointment.cancellationReason || "",
        forceEarlyStart: false,
      });
    }
  }, [isOpen, appointment, reset]);

  const handleFormSubmit = async (data: UpdateStatusSchemaType) => {
    if (!appointment) return;

    // Check if transitioning to completed requires subscription OTP verification
    if (
      data.status === "completed" &&
      requiresSubscriptionVerification(appointment)
    ) {
      if (appointment.status !== "in_progress") {
        toast.error(
          "Subscription-covered appointments must be moved to In Progress before they can be completed."
        );
        return;
      }
      if (onRequireSubscriptionVerification) {
        onClose();
        onRequireSubscriptionVerification(appointment);
        return;
      }
    }

    const submissionPayload: UpdateStatusSchemaType = {
      branchId: data.branchId,
      status: data.status,
      cancellationReason: data.cancellationReason,
      reason: data.reason || data.cancellationReason,
    };

    // Include forceEarlyStart: true ONLY for an explicitly authorized override; otherwise omit it
    if (canForceEarlyStart && isEarlyStart && data.forceEarlyStart === true) {
      submissionPayload.forceEarlyStart = true;
    }

    try {
      await onSubmit(appointment.id, submissionPayload);
      toast.success("Appointment status updated successfully.");
      onClose();
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { message?: string } } };
      toast.error(
        axiosError.response?.data?.message ||
          "Failed to update appointment status.",
      );
    }
  };

  if (!appointment) return null;

  const isTerminal = ["completed", "cancelled", "no_show"].includes(
    appointment.status,
  );

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title="Update Appointment Status">
      <div className="space-y-4 text-left">
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          <div className="space-y-1 text-xs">
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Target Branch (Originating Branch)
            </label>
            <div className="p-2 bg-muted/50 rounded-md border border-border text-foreground font-semibold flex items-center justify-between">
              <span>{appointment.branch?.name || appointment.branchId}</span>
              <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-normal">
                Read-Only
              </span>
            </div>
          </div>
          <input type="hidden" {...register("branchId")} />

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Status <span className="text-destructive">*</span>
            </label>
            <Select
              {...register("status")}
              className="w-full h-9 text-xs"
              disabled={isTerminal}
            >
              <option value="scheduled">Scheduled</option>
              <option value="in_progress" disabled={!appointment.staffId}>
                In Progress{" "}
                {!appointment.staffId ? "(Requires assigned staff)" : ""}
              </option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
              <option value="no_show">No Show</option>
            </Select>
            {!appointment.staffId && (
              <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                💡 This appointment is unassigned. Please assign a staff member
                before starting service.
              </p>
            )}
            {isTerminal && (
              <p className="text-[11px] text-amber-600 font-medium">
                This appointment is in a terminal state ({appointment.status})
                and cannot transition status further.
              </p>
            )}
            {/* Early Start Restriction & Override */}
            {selectedStatus === "in_progress" && isEarlyStart && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg text-xs space-y-2 text-amber-900 dark:text-amber-200">
                <div className="flex items-center gap-1.5 font-semibold text-amber-800 dark:text-amber-300">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>Early Start Notice (&gt; 15 mins before schedule)</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  This appointment is scheduled for <strong className="font-mono">{appointment.startTime}</strong> ({appointment.date}).
                  Backend rules restrict starting service more than 15 minutes before the scheduled time without explicit authorization.
                </p>

                {canForceEarlyStart ? (
                  <label className="flex items-center gap-2 cursor-pointer pt-1 text-[11px] font-semibold text-primary">
                    <input
                      type="checkbox"
                      {...register("forceEarlyStart")}
                      className="rounded border-input text-primary focus:ring-primary h-4 w-4"
                    />
                    <span>Authorize early start override (requires force_early_start permission)</span>
                  </label>
                ) : (
                  <div className="text-[11px] text-destructive bg-destructive/10 p-2 rounded border border-destructive/20 font-medium">
                    ⚠️ You do not have the required permission (<code>appointments.force_early_start</code>) to start this appointment more than 15 minutes early.
                  </div>
                )}
              </div>
            )}
            {selectedStatus === "completed" && requiresSubscriptionVerification(appointment) && (
              appointment.status !== "in_progress" ? (
                <div className="flex items-start gap-2 p-2 bg-amber-500/10 border border-amber-500/20 rounded-md text-xs text-foreground">
                  <ShieldCheck className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <p className="font-semibold text-amber-700 dark:text-amber-400">Appointment must be In Progress</p>
                    <p className="text-[11px] text-muted-foreground">
                      This appointment includes prepaid subscription services. It must first be moved to &quot;In Progress&quot; before customer verification and completion can be performed.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-2 p-2 bg-primary/10 border border-primary/20 rounded-md text-xs text-foreground">
                  <ShieldCheck className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <p className="font-semibold text-primary">Customer verification required</p>
                    <p className="text-[11px] text-muted-foreground">
                      This appointment includes prepaid subscription services. Clicking update will open customer OTP verification.
                    </p>
                  </div>
                </div>
              )
            )}
          </div>

          {selectedStatus === "cancelled" && (
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Cancellation Reason
              </label>
              <Textarea
                {...register("cancellationReason")}
                placeholder="Reason for cancellation..."
                className="text-xs resize-none h-16"
              />
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={isLoading || isTerminal}>
              {isLoading ? "Updating..." : "Update Status"}
            </Button>
          </div>
        </form>
      </div>
    </Dialog>
  );
}
