"use client";

import { useState, type FormEvent } from "react";
import { AlertTriangle, CheckCircle2, CreditCard, RotateCcw, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { getErrorMessage } from "@/lib/api/errors";
import type {
  IncentiveRecoveryObligation,
  IncentiveRecoveryPaymentAttempt,
} from "../types/incentives.types";

type RecoveryPaymentMethod = IncentiveRecoveryPaymentAttempt["paymentMethod"];

interface ManualRecoveryPaymentDialogProps {
  isOpen: boolean;
  obligation: IncentiveRecoveryObligation | null;
  attempt: IncentiveRecoveryPaymentAttempt | null;
  history: IncentiveRecoveryPaymentAttempt[];
  canReverse: boolean;
  isRecording: boolean;
  isConfirming: boolean;
  isFailing: boolean;
  isReversing: boolean;
  onClose: () => void;
  onAttemptChange: (attempt: IncentiveRecoveryPaymentAttempt | null) => void;
  onRecord: (data: {
    amountInPaise: number;
    paymentMethod: RecoveryPaymentMethod;
    paymentReference: string;
    paymentDate: string;
    reason: string;
    idempotencyKey: string;
  }) => Promise<IncentiveRecoveryPaymentAttempt>;
  onConfirm: (paymentId: string) => Promise<IncentiveRecoveryPaymentAttempt>;
  onFail: (paymentId: string, reason: string) => Promise<IncentiveRecoveryPaymentAttempt>;
  onReverse: (paymentId: string, reason: string) => Promise<IncentiveRecoveryPaymentAttempt>;
}

const localDate = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

const formatPaise = (paise: number) =>
  `₹${(paise / 100).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const staffName = (obligation: IncentiveRecoveryObligation) =>
  typeof obligation.staffId === "object" ? obligation.staffId.name : "Staff member";

export function ManualRecoveryPaymentDialog({
  isOpen,
  obligation,
  attempt,
  history,
  canReverse,
  isRecording,
  isConfirming,
  isFailing,
  isReversing,
  onClose,
  onAttemptChange,
  onRecord,
  onConfirm,
  onFail,
  onReverse,
}: ManualRecoveryPaymentDialogProps) {
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<RecoveryPaymentMethod>("bank_transfer");
  const [paymentReference, setPaymentReference] = useState("");
  const [paymentDate, setPaymentDate] = useState(localDate);
  const [reason, setReason] = useState("");
  const [failureReason, setFailureReason] = useState("");
  const [reversalReason, setReversalReason] = useState("");
  const [confirmPayment, setConfirmPayment] = useState(false);
  const [confirmReversal, setConfirmReversal] = useState(false);
  const [actionError, setActionError] = useState("");

  if (!obligation) return null;

  const availableInPaise = obligation.collectibleAvailableInPaise || 0;
  const parsedAmount = Number(amount);
  const amountInPaise = Math.round(parsedAmount * 100);
  const validAmount = Number.isFinite(parsedAmount)
    && Math.abs(parsedAmount * 100 - amountInPaise) < 0.000001
    && amountInPaise > 0
    && amountInPaise <= availableInPaise;

  const recordPayment = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isRecording || !validAmount || !paymentReference.trim() || reason.trim().length < 3) return;
    try {
      const created = await onRecord({
        amountInPaise,
        paymentMethod,
        paymentReference: paymentReference.trim(),
        paymentDate: new Date(`${paymentDate}T00:00:00.000Z`).toISOString(),
        reason: reason.trim(),
        idempotencyKey: crypto.randomUUID(),
      });
      onAttemptChange(created);
      setConfirmPayment(false);
      setActionError("");
    } catch (error) {
      setActionError(getErrorMessage(error, "Unable to record the recovery payment."));
    }
  };

  const confirmAttempt = async () => {
    if (!attempt || isConfirming) return;
    try {
      onAttemptChange(await onConfirm(attempt._id));
      setActionError("");
    } catch (error) {
      setActionError(getErrorMessage(error, "Unable to confirm the recovery payment."));
    }
  };

  const failAttempt = async () => {
    if (!attempt || isFailing || failureReason.trim().length < 3) return;
    try {
      onAttemptChange(await onFail(attempt._id, failureReason.trim()));
      setFailureReason("");
      setActionError("");
    } catch (error) {
      setActionError(getErrorMessage(error, "Unable to record the failed attempt."));
    }
  };

  const reverseAttempt = async () => {
    if (!attempt || isReversing || reversalReason.trim().length < 3) return;
    try {
      onAttemptChange(await onReverse(attempt._id, reversalReason.trim()));
      setConfirmReversal(false);
      setActionError("");
    } catch (error) {
      setActionError(getErrorMessage(error, "Unable to reverse the recovery payment."));
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={attempt?.status === "recorded" ? "Confirm recovery payment" : "Manual recovery settlement"}
      maxWidth="lg"
    >
      <div className="space-y-4">
        {actionError && (
          <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            {actionError}
          </p>
        )}

        <div className="rounded-lg border bg-muted/30 p-3 text-sm">
          <div className="font-semibold">{staffName(obligation)}</div>
          <div className="mt-2 grid grid-cols-1 gap-1 text-muted-foreground sm:grid-cols-2">
            <span>Original clawback: <strong className="text-foreground">{formatPaise(obligation.originalClawbackInPaise)}</strong></span>
            <span>Recovered: <strong className="text-foreground">{formatPaise(obligation.totalRecoveredInPaise)}</strong></span>
            <span>Outstanding obligation: <strong className="text-foreground">{formatPaise(obligation.remainingAvailableInPaise)}</strong></span>
            <span>Currently collectible: <strong className="text-foreground">{formatPaise(availableInPaise)}</strong></span>
          </div>
        </div>

        {history.length > 0 && (
          <section aria-label="Recovery payment history" className="rounded-lg border p-3">
            <h3 className="mb-2 text-sm font-semibold">Audited payment history</h3>
            <div className="max-h-40 space-y-2 overflow-y-auto">
              {history.map((item) => (
                <div key={item._id} className="rounded-md bg-muted/30 p-2 text-xs">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-semibold capitalize">{item.status}</span>
                    <span className="font-mono">{formatPaise(item.amountInPaise)}</span>
                  </div>
                  <div className="mt-1 text-muted-foreground">
                    {item.paymentMethod.replace("_", " ")} · {item.paymentReference} · {new Date(item.paymentDate).toLocaleDateString("en-IN")}
                  </div>
                  <div className="mt-1 text-muted-foreground">{item.reason}</div>
                  {item.confirmedAt && (
                    <div className="mt-1 text-emerald-700">
                      Confirmed {new Date(item.confirmedAt).toLocaleString("en-IN")}
                    </div>
                  )}
                  {item.failureReason && <div className="mt-1 text-red-700">{item.failureReason}</div>}
                  {item.reversalReason && <div className="mt-1 text-amber-700">{item.reversalReason}</div>}
                </div>
              ))}
            </div>
          </section>
        )}

        {attempt?.status === "confirmed" ? (
          <div className="space-y-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
            <div className="flex items-center gap-2 font-semibold">
              <CheckCircle2 className="h-4 w-4" />
              Actual recovery confirmed
            </div>
            <p>
              {attempt.paymentMethod.replace("_", " ")} · {attempt.paymentReference} · {formatPaise(attempt.amountInPaise)}
            </p>
            <p>Confirmed {attempt.confirmedAt ? new Date(attempt.confirmedAt).toLocaleString("en-IN") : "—"}</p>
            {canReverse && (
              <div className="space-y-2 border-t border-emerald-200 pt-3">
                <label className="block space-y-1">
                  <span className="font-medium">Reason for reversing this confirmed recovery</span>
                  <Input
                    value={reversalReason}
                    onChange={(event) => setReversalReason(event.target.value)}
                    maxLength={500}
                    placeholder="Explain why the money was returned or the confirmation was incorrect"
                  />
                </label>
                <label className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    checked={confirmReversal}
                    onChange={(event) => setConfirmReversal(event.target.checked)}
                    className="mt-1"
                  />
                  <span>I verified the actual return of this recovery payment.</span>
                </label>
                <Button
                  type="button"
                  variant="destructive"
                  disabled={!confirmReversal || reversalReason.trim().length < 3 || isReversing}
                  onClick={reverseAttempt}
                >
                  <RotateCcw className="mr-2 h-4 w-4" />
                  {isReversing ? "Reversing..." : "Confirm recovery reversal"}
                </Button>
              </div>
            )}
          </div>
        ) : attempt?.status === "recorded" ? (
          <div className="space-y-4">
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
              <div className="flex items-center gap-2 font-semibold">
                <AlertTriangle className="h-4 w-4" />
                Recorded is not recovered
              </div>
              <p className="mt-2">
                {attempt.paymentMethod.replace("_", " ")} · {attempt.paymentReference} · {formatPaise(attempt.amountInPaise)}
              </p>
              <p className="mt-2">Reason: {attempt.reason}</p>
              <p className="mt-2">
                Confirm only after independently verifying that this recovery payment was received.
              </p>
            </div>
            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                checked={confirmPayment}
                onChange={(event) => setConfirmPayment(event.target.checked)}
                className="mt-1"
              />
              <span>I verified the actual recovery amount, reference and receipt above.</span>
            </label>
            <Button
              type="button"
              disabled={!confirmPayment || isConfirming}
              onClick={confirmAttempt}
              className="w-full"
            >
              <ShieldCheck className="mr-2 h-4 w-4" />
              {isConfirming ? "Confirming..." : "Confirm actual recovery"}
            </Button>
            <div className="border-t pt-3">
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Failure reason (if the recovery was not received)
              </label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  value={failureReason}
                  onChange={(event) => setFailureReason(event.target.value)}
                  placeholder="Explain why this attempt failed"
                  maxLength={500}
                />
                <Button
                  type="button"
                  variant="outline"
                  disabled={failureReason.trim().length < 3 || isFailing}
                  onClick={failAttempt}
                >
                  {isFailing ? "Saving..." : "Mark failed"}
                </Button>
              </div>
            </div>
          </div>
        ) : attempt?.status === "reversed" ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            This recovery confirmation was reversed. {attempt.reversalReason}
          </div>
        ) : (
          <form onSubmit={recordPayment} className="space-y-4">
            {attempt?.status === "failed" && (
              <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                Previous attempt failed: {attempt.failureReason}. Record a new attempt after correcting the issue.
              </div>
            )}
            {availableInPaise <= 0 ? (
              <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                This clawback is not currently collectible. The source commission must be confirmed paid in payroll, and it must not already have been reflected as a pre-payment reversal.
              </div>
            ) : (
              <>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="space-y-1 text-sm">
                    <span className="font-medium">Recovery method</span>
                    <select
                      value={paymentMethod}
                      onChange={(event) => setPaymentMethod(event.target.value as RecoveryPaymentMethod)}
                      className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    >
                      <option value="bank_transfer">Bank transfer</option>
                      <option value="upi">UPI</option>
                      <option value="cheque">Cheque</option>
                      <option value="cash">Cash</option>
                    </select>
                  </label>
                  <label className="space-y-1 text-sm">
                    <span className="font-medium">Actual payment date</span>
                    <Input
                      type="date"
                      value={paymentDate}
                      onChange={(event) => setPaymentDate(event.target.value)}
                      required
                    />
                  </label>
                </div>
                <label className="block space-y-1 text-sm">
                  <span className="font-medium">Payment reference</span>
                  <Input
                    value={paymentReference}
                    onChange={(event) => setPaymentReference(event.target.value)}
                    placeholder="Bank UTR, cheque number or cash receipt"
                    maxLength={200}
                    required
                  />
                </label>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block space-y-1 text-sm">
                    <span className="font-medium">Amount (₹)</span>
                    <Input
                      type="number"
                      min="0.01"
                      max={(availableInPaise / 100).toFixed(2)}
                      step="0.01"
                      value={amount}
                      onChange={(event) => setAmount(event.target.value)}
                      required
                    />
                  </label>
                  <label className="block space-y-1 text-sm">
                    <span className="font-medium">Reason</span>
                    <Input
                      value={reason}
                      onChange={(event) => setReason(event.target.value)}
                      placeholder="Reason for this recovery"
                      maxLength={500}
                      required
                    />
                  </label>
                </div>
                {amount && !validAmount && (
                  <p role="alert" className="text-sm text-destructive">
                    Enter an amount with at most two decimal places, not exceeding {formatPaise(availableInPaise)}.
                  </p>
                )}
                <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-xs text-blue-900">
                  Recording reserves this amount but does not reduce the outstanding balance. Only an authorized confirmation after actual receipt marks it recovered.
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
                  <Button
                    type="submit"
                    disabled={
                      !validAmount ||
                      !paymentReference.trim() ||
                      reason.trim().length < 3 ||
                      !paymentDate ||
                      isRecording
                    }
                  >
                    <CreditCard className="mr-2 h-4 w-4" />
                    {isRecording ? "Recording..." : "Record recovery attempt"}
                  </Button>
                </div>
              </>
            )}
          </form>
        )}
      </div>
    </Dialog>
  );
}
