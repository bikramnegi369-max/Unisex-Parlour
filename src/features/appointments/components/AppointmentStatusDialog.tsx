"use client";

import React, { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MutationBranchSelector } from "@/components/branch/MutationBranchSelector";
import { updateStatusSchema, type UpdateStatusSchemaType } from "../schemas/appointment.schema";
import { useBranchContext } from "@/hooks/useBranchContext";
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
  const { isAllBranchesSelected, availableBranches } = useBranchContext();

  const activeBranches = availableBranches.map((b) => ({
    id: b.id,
    name: b.name,
    isActive: b.isActive,
  }));

  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    formState: { errors },
  } = useForm<UpdateStatusSchemaType>({
    resolver: zodResolver(updateStatusSchema),
    defaultValues: {
      branchId: appointment?.branchId || "",
      status: appointment?.status || "scheduled",
      cancellationReason: "",
    },
  });

  const selectedStatus = watch("status");

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
      toast.error(axiosError.response?.data?.message || "Failed to update appointment status.");
    }
  };

  if (!appointment) return null;

  const isTerminal = ["completed", "cancelled", "no_show"].includes(appointment.status);

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title="Update Appointment Status">
      <div className="space-y-4 text-left">
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
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
              Status <span className="text-destructive">*</span>
            </label>
            <select
              {...register("status")}
              className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              disabled={isTerminal}
            >
              <option value="scheduled">Scheduled</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
              <option value="no_show">No Show</option>
            </select>
            {isTerminal && (
              <p className="text-[11px] text-amber-600 font-medium">
                This appointment is in a terminal state ({appointment.status}) and cannot transition status further.
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
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isLoading}>
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
