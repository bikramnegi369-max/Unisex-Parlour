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
import { toast } from "sonner";
import type { Appointment } from "../types/appointment.types";

interface AppointmentStatusDialogProps {
  appointment: Appointment | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (id: string, payload: UpdateStatusSchemaType) => Promise<void>;
  isLoading: boolean;
}

export function AppointmentStatusDialog({
  appointment,
  isOpen,
  onClose,
  onSubmit,
  isLoading,
}: AppointmentStatusDialogProps) {
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
    },
  });

  const selectedStatus = useWatch({
    control,
    name: "status",
  });

  useEffect(() => {
    if (isOpen && appointment) {
      reset({
        branchId: appointment.branchId,
        status: appointment.status,
        cancellationReason: appointment.cancellationReason || "",
      });
    }
  }, [isOpen, appointment, reset]);

  const handleFormSubmit = async (data: UpdateStatusSchemaType) => {
    if (!appointment) return;
    try {
      await onSubmit(appointment.id, data);
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
