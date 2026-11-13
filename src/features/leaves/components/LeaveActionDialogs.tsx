"use client";
import React, { useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AlertTriangle, CheckCircle2, ExternalLink, Loader2, RefreshCw } from "lucide-react";
import { useLeaveConflicts } from "../hooks/useLeaves";
import type { Leave } from "../types/leaves.types";

interface ActionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reasonOrNote: string) => void;
  isSubmitting: boolean;
  leaveCode: string;
}

interface ApproveActionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reasonOrNote: string) => void;
  isSubmitting: boolean;
  leave?: Leave | null;
  leaveCode?: string;
}

export function ApproveLeaveDialog({
  isOpen,
  onClose,
  onConfirm,
  isSubmitting,
  leave,
  leaveCode: fallbackLeaveCode,
}: ApproveActionDialogProps) {
  const [note, setNote] = useState("");
  const leaveId = leave?.id;
  const leaveCode = leave?.leaveCode || fallbackLeaveCode || "";

  const {
    data: conflictsData,
    isLoading: isLoadingConflicts,
    isFetching: isFetchingConflicts,
    refetch: refetchConflicts,
  } = useLeaveConflicts(leaveId, {
    enabled: isOpen && Boolean(leaveId),
  });

  const conflicts = conflictsData?.conflicts || [];
  const hasConflicts = conflicts.length > 0;

  const handleConfirm = () => {
    onConfirm(note);
    setNote("");
  };

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title="Approve Leave Request">
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Are you sure you want to approve the leave request{" "}
          <strong>{leaveCode}</strong>?
        </p>

        {/* Conflict Check Section */}
        {isLoadingConflicts ? (
          <div className="flex items-center gap-2 p-3 rounded-md bg-muted/50 border border-border/50 text-xs text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            <span>Checking appointment schedule for potential conflicts...</span>
          </div>
        ) : hasConflicts ? (
          <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3.5 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 text-destructive font-semibold text-xs tracking-tight">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>
                  Approval Blocked: {conflicts.length} Conflicting Appointment{conflicts.length > 1 ? "s" : ""} Detected
                </span>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs text-destructive hover:bg-destructive/20 gap-1"
                onClick={() => refetchConflicts()}
                disabled={isFetchingConflicts}
              >
                <RefreshCw className={`h-3 w-3 ${isFetchingConflicts ? "animate-spin" : ""}`} />
                Re-check
              </Button>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              This staff member has active appointments scheduled during their requested leave interval.
              Salons cannot leave clients unattended. Please reschedule or reassign each appointment before approving.
            </p>

            <div className="max-h-48 overflow-y-auto rounded border border-border/50 bg-background/80 text-xs">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border/40 bg-muted/40 text-[10px] uppercase text-muted-foreground">
                    <th className="p-2">Code</th>
                    <th className="p-2">Customer</th>
                    <th className="p-2">Services</th>
                    <th className="p-2">Time Slot</th>
                    <th className="p-2 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {conflicts.map((c) => (
                    <tr key={c.id} className="hover:bg-muted/20">
                      <td className="p-2 font-mono font-medium">{c.appointmentCode}</td>
                      <td className="p-2 font-medium">{c.customerName}</td>
                      <td className="p-2 text-muted-foreground">
                        {c.serviceNames?.length ? c.serviceNames.join(", ") : "—"}
                      </td>
                      <td className="p-2 text-muted-foreground whitespace-nowrap">
                        {c.appointmentDate ? `${c.appointmentDate} ` : ""}
                        {c.startTime} - {c.endTime}
                      </td>
                      <td className="p-2 text-right">
                        <a
                          href={`/appointments?search=${encodeURIComponent(c.appointmentCode)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
                        >
                          Resolve
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          conflictsData && (
            <div className="flex items-center gap-2 p-2.5 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>No conflicting appointments found. Staff schedule is clear.</span>
            </div>
          )
        )}

        <div className="py-2">
          <label className="block text-[10px] uppercase font-semibold tracking-wider text-muted-foreground mb-1.5">
            Review Note (Optional)
          </label>
          <Textarea
            placeholder="Provide comments or details about the approval..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
            disabled={isSubmitting}
            className="min-h-20"
          />
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-border/40">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isSubmitting || isLoadingConflicts || hasConflicts}
            className="cursor-pointer"
          >
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
          Are you sure you want to reject the leave request{" "}
          <strong>{leaveCode}</strong>? A review note explaining the rejection
          is required.
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
            className={`min-h-20 ${error ? "border-destructive focus-visible:ring-destructive" : ""}`}
          />
          {error && (
            <p className="mt-1.5 text-xs font-medium text-destructive">
              {error}
            </p>
          )}
        </div>
        <div className="flex justify-end gap-3 pt-4 border-t border-border/40">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={isSubmitting}
            className="cursor-pointer"
          >
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
          Are you sure you want to cancel the leave request{" "}
          <strong>{leaveCode}</strong>? A cancellation reason is required.
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
            className={`min-h-20 ${error ? "border-destructive focus-visible:ring-destructive" : ""}`}
          />
          {error && (
            <p className="mt-1.5 text-xs font-medium text-destructive">
              {error}
            </p>
          )}
        </div>
        <div className="flex justify-end gap-3 pt-4 border-t border-border/40">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={isSubmitting}
            className="cursor-pointer"
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Cancel Leave
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
