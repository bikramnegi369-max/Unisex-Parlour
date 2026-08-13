"use client";

import React, { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { MutationBranchSelector } from "@/components/branch/MutationBranchSelector";
import { rescheduleAppointmentSchema, type RescheduleAppointmentSchemaType } from "../schemas/appointment.schema";
import { useBranchContext } from "@/hooks/useBranchContext";
import { toast } from "sonner";
import { AlertTriangle } from "lucide-react";
import type { Appointment } from "../types/appointment.types";

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
  const { isAllBranchesSelected, availableBranches } = useBranchContext();
  const [conflictError, setConflictError] = useState<string | null>(null);

  const activeBranches = availableBranches.map((b) => ({
    id: b.id,
    name: b.name,
    isActive: b.isActive,
  }));

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

  useEffect(() => {
    if (isOpen && appointment) {
      setConflictError(null);
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

          {isAllBranchesSelected ? (
            <Controller
              name="branchId"
              control={control}
              render={({ field }) => (
                <MutationBranchSelector
                  value={field.value}
                  onChange={field.onChange}
                  branches={activeBranches}
                  error={errors.branchId?.message}
                />
              )}
            />
          ) : (
            <input type="hidden" {...register("branchId")} />
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
