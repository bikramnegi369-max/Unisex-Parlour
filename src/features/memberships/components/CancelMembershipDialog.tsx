"use client";

import React, { useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AlertTriangle, Ban, Loader2 } from "lucide-react";
import type { CustomerMembership } from "../types/membership.types";

interface CancelMembershipDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void>;
  isLoading: boolean;
  membership: CustomerMembership | null;
}

export function CancelMembershipDialog({
  isOpen,
  onClose,
  onConfirm,
  isLoading,
  membership,
}: CancelMembershipDialogProps) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (!membership) return null;

  const beneficiaryName = membership.customer?.name || "Customer";
  const planName = membership.planSnapshot?.name || "Membership";

  const handleClose = () => {
    if (isLoading) return;
    setReason("");
    setError(null);
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = reason.trim();
    if (!trimmed) {
      setError("Please provide a reason for cancellation.");
      return;
    }
    setError(null);
    await onConfirm(trimmed);
    setReason("");
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={handleClose}
      title="Cancel Membership"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-left">
        <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex gap-3 text-destructive">
          <AlertTriangle className="shrink-0 h-5 w-5 mt-0.5" />
          <div>
            <p className="text-sm font-semibold">Confirm Membership Cancellation</p>
            <p className="text-xs mt-0.5 leading-relaxed opacity-90">
              Cancelling this membership will immediately revoke active benefits for{" "}
              <strong>{beneficiaryName}</strong> ({planName} &middot;{" "}
              <span className="font-mono">{membership.membershipCode}</span>).
              Historical records will remain intact.
            </p>
          </div>
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="cancel-membership-reason"
            className="text-sm font-medium text-foreground block"
          >
            Cancellation Reason <span className="text-destructive">*</span>
          </label>
          <Textarea
            id="cancel-membership-reason"
            placeholder="Enter the reason for cancelling this membership..."
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
              if (error) setError(null);
            }}
            rows={3}
            disabled={isLoading}
            className={error ? "border-destructive focus-visible:ring-destructive" : ""}
          />
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-border/80">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isLoading}
          >
            Keep Membership
          </Button>
          <Button
            type="submit"
            variant="destructive"
            disabled={isLoading}
            className="flex items-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Cancelling...
              </>
            ) : (
              <>
                <Ban className="h-4 w-4" />
                Cancel Membership
              </>
            )}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
