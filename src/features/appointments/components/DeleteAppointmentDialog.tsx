"use client";

import React, { useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MutationBranchSelector } from "@/components/branch/MutationBranchSelector";
import { useBranchContext } from "@/hooks/useBranchContext";
import { toast } from "sonner";
import { AlertTriangle } from "lucide-react";
import type { Appointment } from "../types/appointment.types";

interface DeleteAppointmentDialogProps {
  appointment: Appointment | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (id: string, branchId: string) => Promise<void>;
  isLoading: boolean;
}

export function DeleteAppointmentDialog({
  appointment,
  isOpen,
  onClose,
  onConfirm,
  isLoading,
}: DeleteAppointmentDialogProps) {
  const { currentBranchId, isAllBranchesSelected, availableBranches } = useBranchContext();
  const [selectedBranchId, setSelectedBranchId] = useState<string>(appointment?.branchId || currentBranchId || "");

  const activeBranches = availableBranches.map((b) => ({
    id: b.id,
    name: b.name,
    isActive: b.isActive,
  }));

  if (!appointment) return null;

  const handleConfirm = async () => {
    const branchIdToUse = isAllBranchesSelected ? selectedBranchId : appointment.branchId;
    if (!branchIdToUse) {
      toast.error("Explicit branch selection is required for deletion.");
      return;
    }
    try {
      await onConfirm(appointment.id, branchIdToUse);
      toast.success("Appointment deleted successfully.");
      onClose();
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { message?: string } } };
      toast.error(axiosError.response?.data?.message || "Failed to delete appointment.");
    }
  };

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title="Administrative Soft-Delete">
      <div className="space-y-4 text-left">
        <p className="text-xs text-muted-foreground">
          Are you sure you want to administratively delete appointment{" "}
          <span className="font-semibold text-foreground">#{appointment.id.slice(-6)}</span> for{" "}
          <span className="font-semibold text-foreground">{appointment.customer?.name || "Customer"}</span>?
        </p>

        <p className="text-xs text-muted-foreground bg-amber-500/10 p-2 rounded-md border border-amber-500/20 text-amber-700 dark:text-amber-400 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
          <span>
            Note: Delete is an administrative action. For routine customer cancellations, please use <span className="font-semibold">Cancel Status</span> instead.
          </span>
        </p>

        {isAllBranchesSelected && (
          <div className="pt-2">
            <MutationBranchSelector
              value={selectedBranchId}
              onChange={setSelectedBranchId}
              branches={activeBranches}
            />
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={handleConfirm}
            disabled={isLoading || (isAllBranchesSelected && !selectedBranchId)}
          >
            {isLoading ? "Deleting..." : "Confirm Delete"}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
