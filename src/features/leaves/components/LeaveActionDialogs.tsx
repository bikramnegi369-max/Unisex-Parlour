"use client";
import React, { useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";

interface ActionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reasonOrNote: string) => void;
  isSubmitting: boolean;
  leaveCode: string;
}

export function ApproveLeaveDialog({
  isOpen,
  onClose,
  onConfirm,
  isSubmitting,
  leaveCode,
}: ActionDialogProps) {
  const [note, setNote] = useState("");

  const handleConfirm = () => {
    onConfirm(note);
    setNote("");
  };

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title="Approve Leave Request">
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Are you sure you want to approve the leave request <strong>{leaveCode}</strong>? You can optionally add a review note.
        </p>
        <div className="py-2">
          <label className="block text-[10px] uppercase font-semibold tracking-wider text-muted-foreground mb-1.5">
            Review Note (Optional)
          </label>
          <Textarea
            placeholder="Provide comments or details about the approval..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
            disabled={isSubmitting}
            className="min-h-[80px]"
          />
        </div>
        <div className="flex justify-end gap-3 pt-4 border-t border-border/40">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={isSubmitting} className="cursor-pointer">
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Approve Leave
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

export function RejectLeaveDialog({
  isOpen,
  onClose,
  onConfirm,
  isSubmitting,
  leaveCode,
}: ActionDialogProps) {
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  const handleConfirm = () => {
    if (!note.trim()) {
      setError("Review note is required to reject a leave request.");
      return;
    }
    setError("");
    onConfirm(note);
    setNote("");
  };

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title="Reject Leave Request">
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Are you sure you want to reject the leave request <strong>{leaveCode}</strong>? A review note explaining the rejection is required.
        </p>
        <div className="py-2">
          <label className="block text-[10px] uppercase font-semibold tracking-wider text-muted-foreground mb-1.5">
            Review Note <span className="text-destructive">*</span>
          </label>
          <Textarea
            placeholder="Explain the reason for rejecting this leave request..."
            value={note}
            onChange={(e) => {
              setNote(e.target.value);
              if (e.target.value.trim()) setError("");
            }}
            disabled={isSubmitting}
            className={`min-h-[80px] ${error ? "border-destructive focus-visible:ring-destructive" : ""}`}
          />
          {error && <p className="mt-1.5 text-xs font-medium text-destructive">{error}</p>}
        </div>
        <div className="flex justify-end gap-3 pt-4 border-t border-border/40">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={isSubmitting} className="cursor-pointer">
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Reject Leave
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

export function CancelLeaveDialog({
  isOpen,
  onClose,
  onConfirm,
  isSubmitting,
  leaveCode,
}: ActionDialogProps) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");

  const handleConfirm = () => {
    if (!reason.trim()) {
      setError("Cancellation reason is required.");
      return;
    }
    setError("");
    onConfirm(reason);
    setReason("");
  };

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title="Cancel Leave Request">
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Are you sure you want to cancel the leave request <strong>{leaveCode}</strong>? A cancellation reason is required.
        </p>
        <div className="py-2">
          <label className="block text-[10px] uppercase font-semibold tracking-wider text-muted-foreground mb-1.5">
            Cancellation Reason <span className="text-destructive">*</span>
          </label>
          <Textarea
            placeholder="Explain the reason for cancelling this leave..."
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
              if (e.target.value.trim()) setError("");
            }}
            disabled={isSubmitting}
            className={`min-h-[80px] ${error ? "border-destructive focus-visible:ring-destructive" : ""}`}
          />
          {error && <p className="mt-1.5 text-xs font-medium text-destructive">{error}</p>}
        </div>
        <div className="flex justify-end gap-3 pt-4 border-t border-border/40">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={isSubmitting} className="cursor-pointer">
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Cancel Leave
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
