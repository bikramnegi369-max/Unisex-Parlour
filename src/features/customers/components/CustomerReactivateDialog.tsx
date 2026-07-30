"use client";

import React from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, UserCheck } from "lucide-react";
import axios from "axios";

interface CustomerReactivateDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isLoading: boolean;
  error: Error | null;
  customerName: string;
}

export default function CustomerReactivateDialog({
  isOpen,
  onClose,
  onConfirm,
  isLoading,
  error,
  customerName,
}: CustomerReactivateDialogProps) {
  const getErrorMessage = (err: Error | null) => {
    if (!err) return null;
    if (axios.isAxiosError(err)) {
      const status = err.response?.status;
      if (status === 404 || status === 405) {
        return "Customer reactivation is not yet supported by the server. Please contact your system administrator.";
      }
      const message = err.response?.data?.message;
      return message || "An unexpected error occurred. Please try again.";
    }
    return err.message || "An unexpected error occurred. Please try again.";
  };

  const errorMessage = getErrorMessage(error);

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title="Reactivate Customer Profile">
      <div className="space-y-4 text-left">
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex gap-3 text-emerald-600 dark:text-emerald-500">
          <UserCheck className="shrink-0 h-5 w-5 mt-0.5" />
          <div>
            <p className="text-sm font-semibold">Status Restoration</p>
            <p className="text-xs mt-0.5 leading-relaxed opacity-90">
              Reactivating this customer will restore their active status and make them available for future bookings, appointments, and other normal operations.
            </p>
          </div>
        </div>

        <p className="text-sm text-foreground">
          Are you sure you want to reactivate the profile of <strong>{customerName}</strong>?
        </p>

        {errorMessage && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-xs text-destructive font-medium">
            {errorMessage}
          </div>
        )}

        <div className="flex justify-end gap-3 pt-4 border-t border-border/80">
          <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white dark:bg-emerald-500 dark:hover:bg-emerald-600"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Reactivating...
              </>
            ) : (
              "Reactivate"
            )}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
