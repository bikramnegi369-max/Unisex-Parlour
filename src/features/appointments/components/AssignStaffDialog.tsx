"use client";

import React, { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MutationBranchSelector } from "@/components/branch/MutationBranchSelector";
import { assignStaffSchema, type AssignStaffSchemaType } from "../schemas/appointment.schema";
import { useEmployees } from "@/features/employees/hooks/useEmployees";
import { useBranchContext } from "@/hooks/useBranchContext";
import { toast } from "sonner";
import { AlertTriangle } from "lucide-react";
import type { Appointment } from "../types/appointment.types";

interface AssignStaffDialogProps {
  appointment: Appointment | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (id: string, payload: AssignStaffSchemaType) => Promise<void>;
  isLoading: boolean;
}

export function AssignStaffDialog({
  appointment,
  isOpen,
  onClose,
  onSubmit,
  isLoading,
}: AssignStaffDialogProps) {
  const { isAllBranchesSelected, availableBranches } = useBranchContext();
  const [conflictError, setConflictError] = useState<string | null>(null);

  const activeBranches = availableBranches.map((b) => ({
    id: b.id,
    name: b.name,
    isActive: b.isActive,
  }));

  const { data: employeesData, isLoading: isLoadingEmployees } = useEmployees({ limit: 100 });
  const employees = employeesData?.data || [];

  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<AssignStaffSchemaType>({
    resolver: zodResolver(assignStaffSchema),
    defaultValues: {
      branchId: appointment?.branchId || "",
      staffId: appointment?.staffId || null,
    },
  });

  useEffect(() => {
    if (isOpen && appointment) {
      setConflictError(null);
      reset({
        branchId: appointment.branchId,
        staffId: appointment.staffId || null,
      });
    }
  }, [isOpen, appointment, reset]);

  const handleFormSubmit = async (data: AssignStaffSchemaType) => {
    if (!appointment) return;
    setConflictError(null);
    try {
      await onSubmit(appointment.id, data);
      toast.success("Staff allocation updated successfully.");
      onClose();
    } catch (err: unknown) {
      const axiosError = err as { response?: { status?: number; data?: { message?: string } } };
      if (axiosError.response?.status === 409) {
        const msg =
          axiosError.response.data?.message ||
          "Scheduling conflict: The assigned staff member has a conflicting booking or leave.";
        setConflictError(msg);
        toast.error(msg);
      } else {
        toast.error(axiosError.response?.data?.message || "Failed to update staff allocation.");
      }
    }
  };

  if (!appointment) return null;

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title="Assign / Reassign Staff">
      <div className="space-y-4 text-left">
        {conflictError && (
          <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg flex items-start gap-2 text-xs text-destructive">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold">Staff Conflict (409): </span>
              {conflictError}
            </div>
          </div>
        )}

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
              Select Staff Member
            </label>
            <select
              value={watch("staffId") || ""}
              onChange={(e) => setValue("staffId", e.target.value ? e.target.value : null)}
              className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              disabled={isLoadingEmployees}
            >
              <option value="">-- Unassigned --</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name} {e.designation ? `(${e.designation})` : ""}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={isLoading}>
              {isLoading ? "Saving..." : "Save Staff Assignment"}
            </Button>
          </div>
        </form>
      </div>
    </Dialog>
  );
}
