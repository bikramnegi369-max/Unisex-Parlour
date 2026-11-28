"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { rescheduleAppointmentSchema, type RescheduleAppointmentSchemaType } from "../schemas/appointment.schema";
import { toast } from "sonner";
import { AlertTriangle } from "lucide-react";
import type { Appointment } from "../types/appointment.types";
import { useStaffAvailability } from "../hooks/useStaffAvailability";
import {
  REASON_LABELS,
  type AvailabilityReasonCode,
  type StaffSlotEvaluation,
} from "../api/staffAvailability.api";

interface RescheduleAppointmentDialogProps {
  appointment: Appointment | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (id: string, payload: RescheduleAppointmentSchemaType) => Promise<void>;
  isLoading: boolean;
}

export function RescheduleAppointmentDialog({
  appointment,
  isOpen,
  onClose,
  onSubmit,
  isLoading,
}: RescheduleAppointmentDialogProps) {
  const [conflictError, setConflictError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<RescheduleAppointmentSchemaType>({
    resolver: zodResolver(rescheduleAppointmentSchema),
    defaultValues: {
      branchId: appointment?.branchId || "",
      date: appointment?.date || "",
      startTime: appointment?.startTime || "",
      reason: "",
    },
  });

  const watchedDate = useWatch({ control, name: "date" });
  const watchedStartTime = useWatch({ control, name: "startTime" });

  const { data: slotAvailabilityData } = useStaffAvailability(
    {
      branchId: appointment?.branchId,
      staffId: appointment?.staffId || undefined,
      date: watchedDate || "",
      startTime: watchedStartTime || "",
      duration: appointment?.totalDuration || 30,
      excludeAppointmentId: appointment?.id,
    },
    {
      enabled: Boolean(
        isOpen &&
        appointment &&
        appointment.staffId &&
        watchedDate &&
        watchedStartTime,
      ),
    },
  );

  const assignedStaffId = appointment?.staffId;
  const liveStaffEval: StaffSlotEvaluation | null = useMemo(() => {
    const staffData = slotAvailabilityData?.staff;
    if (!staffData || !assignedStaffId) return null;
    if (Array.isArray(staffData)) {
      return (
        staffData.find(
          (s: StaffSlotEvaluation) => s.staffId === assignedStaffId,
        ) || null
      );
    }
    const singleStaff = staffData as unknown as StaffSlotEvaluation;
    return singleStaff.staffId === assignedStaffId ? singleStaff : null;
  }, [slotAvailabilityData, assignedStaffId]);

  const [prevKey, setPrevKey] = useState<string | null>(null);
  const currentKey = isOpen && appointment ? `${appointment.id}-${isOpen}` : null;

  if (currentKey !== prevKey) {
    setPrevKey(currentKey);
    if (conflictError !== null) {
      setConflictError(null);
    }
  }

  useEffect(() => {
    if (isOpen && appointment) {
      reset({
        branchId: appointment.branchId,
        date: appointment.date,
        startTime: appointment.startTime,
        reason: "",
      });
    }
  }, [isOpen, appointment, reset]);

  const handleFormSubmit = async (data: RescheduleAppointmentSchemaType) => {
    if (!appointment) return;
    setConflictError(null);

    if (liveStaffEval?.status === "requires_review") {
      const reasons = liveStaffEval.reasons?.map((r: AvailabilityReasonCode) => REASON_LABELS[r] || r).join(", ");
      const msg = `Assigned stylist availability requires review (${reasons || "Attendance Review Required"}). Cannot reschedule without manager approval.`;
      setConflictError(msg);
      toast.error(msg);
      return;
    }

    if (liveStaffEval?.status === "unavailable") {
      const reasons = liveStaffEval.reasons?.map((r: AvailabilityReasonCode) => REASON_LABELS[r] || r).join(", ");
      const msg = `Assigned stylist is unavailable for the selected slot (${reasons || "Unavailable"}). Cannot reschedule to this slot.`;
      setConflictError(msg);
      toast.error(msg);
      return;
    }

    try {
      await onSubmit(appointment.id, data);
      toast.success("Appointment rescheduled successfully.");
      onClose();
    } catch (err: unknown) {
      const axiosError = err as { response?: { status?: number; data?: { message?: string } } };
      if (axiosError.response?.status === 409) {
        const msg =
          axiosError.response.data?.message ||
          "Scheduling conflict: The selected time slot or staff is unavailable for the new schedule.";
        setConflictError(msg);
        toast.error(msg);
      } else {
        toast.error(axiosError.response?.data?.message || "Failed to reschedule appointment.");
      }
    }
  };

  if (!appointment) return null;

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title="Reschedule Appointment">
      <div className="space-y-4 text-left">
        {conflictError && (
          <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg flex items-start gap-2 text-xs text-destructive">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold">Scheduling Conflict (409): </span>
              {conflictError}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          <div className="text-xs text-muted-foreground bg-muted p-2 rounded-md border border-border">
            Rescheduling is restricted to the same branch (
            <span className="font-semibold text-foreground">
              {appointment.branch?.name || appointment.branchId}
            </span>
            ).
          </div>

          <div className="space-y-1 text-xs">
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Target Branch (Originating Branch)
            </label>
            <div className="p-2 bg-muted/50 rounded-md border border-border text-foreground font-semibold flex items-center justify-between">
              <span>{appointment.branch?.name || appointment.branchId}</span>
              <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-normal">Read-Only</span>
            </div>
          </div>
          <input type="hidden" {...register("branchId")} />

          {liveStaffEval && liveStaffEval.status === "requires_review" && (
            <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-lg flex items-start gap-2 text-xs text-amber-700 dark:text-amber-400">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold">Staff Attendance Review Required: </span>
                Assigned stylist {appointment.staff?.name || "staff"} requires review for this slot (
                {liveStaffEval.reasons.map((r: AvailabilityReasonCode) => REASON_LABELS[r] || r).join(", ") || "Attendance Review Required"}
                ). Cannot confirm reschedule without resolution.
              </div>
            </div>
          )}

          {liveStaffEval && liveStaffEval.status === "unavailable" && (
            <div className="p-2.5 bg-destructive/10 border border-destructive/30 rounded-lg flex items-start gap-2 text-xs text-destructive">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold">Staff Conflict Warning: </span>
                Assigned stylist {appointment.staff?.name || "staff"} is marked unavailable for this slot (
                {liveStaffEval.reasons.map((r: AvailabilityReasonCode) => REASON_LABELS[r] || r).join(", ")}
                ).
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              New Date <span className="text-destructive">*</span>
            </label>
            <Input type="date" {...register("date")} className="h-9 text-xs" />
            {errors.date && (
              <span className="text-[11px] text-destructive">{errors.date.message}</span>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              New Start Time <span className="text-destructive">*</span>
            </label>
            <Input type="time" {...register("startTime")} className="h-9 text-xs" />
            {errors.startTime && (
              <span className="text-[11px] text-destructive">{errors.startTime.message}</span>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Reason for Rescheduling
            </label>
            <Textarea
              {...register("reason")}
              placeholder="Add optional reason for schedule change..."
              className="text-xs resize-none h-16"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={isLoading}>
              {isLoading ? "Rescheduling..." : "Confirm Reschedule"}
            </Button>
          </div>
        </form>
      </div>
    </Dialog>
  );
}
