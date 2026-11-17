"use client";

import { useState, type FormEvent } from "react";
import { AlertTriangle, CheckCircle2, CreditCard, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { getErrorMessage } from "@/lib/api/errors";
import type {
  PayrollPaymentAttempt,
  PayrollRecord,
} from "../api/payroll.api";

interface PayrollPaymentDialogProps {
  isOpen: boolean;
  record: PayrollRecord | null;
  initialAttempt?: PayrollPaymentAttempt | null;
  isRecording: boolean;
  isConfirming: boolean;
  isFailing: boolean;
  onClose: () => void;
  onRecord: (data: {
    paymentMethod: "bank_transfer" | "cash" | "cheque" | "upi";
    paymentReference: string;
    amountInPaise: number;
    paymentDate: string;
    idempotencyKey: string;
  }) => Promise<PayrollPaymentAttempt>;
  onConfirm: (paymentId: string) => Promise<void>;
  onFail: (
    paymentId: string,
    failureReason: string,
  ) => Promise<PayrollPaymentAttempt>;
}

const localDate = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

const newIdempotencyKey = () => crypto.randomUUID();

export function PayrollPaymentDialog({
  isOpen,
  record,
  initialAttempt = null,
  isRecording,
  isConfirming,
  isFailing,
  onClose,
  onRecord,
  onConfirm,
  onFail,
}: PayrollPaymentDialogProps) {
  const [paymentMethod, setPaymentMethod] =
    useState<"bank_transfer" | "cash" | "cheque" | "upi">("bank_transfer");
  const [paymentReference, setPaymentReference] = useState("");
  const [amount, setAmount] = useState(() => record?.calculations.netPayable.toFixed(2) || "");
  const [paymentDate, setPaymentDate] = useState(localDate);
  const [failureReason, setFailureReason] = useState("");
  const [confirmActualPayment, setConfirmActualPayment] = useState(false);
  const [actionError, setActionError] = useState("");
  const [attempt, setAttempt] = useState<PayrollPaymentAttempt | null>(initialAttempt || null);
  const [idempotencyKey, setIdempotencyKey] = useState(newIdempotencyKey);

  if (!record) return null;

  const expectedAmountInPaise = Math.round(record.calculations.netPayable * 100);
  const enteredAmountInPaise = Number.isFinite(Number(amount))
    ? Math.round(Number(amount) * 100)
    : 0;
  const isExactAmount = enteredAmountInPaise === expectedAmountInPaise;
  const isAwaitingConfirmation = attempt?.status === "recorded";
  const isConfirmed = attempt?.status === "confirmed";
  const isFailed = attempt?.status === "failed";
  const isReversed = attempt?.status === "reversed";

  const recordAttempt = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isRecording || !isExactAmount || !paymentReference.trim() || !paymentDate) return;
    try {
      const created = await onRecord({
        paymentMethod,
        paymentReference: paymentReference.trim(),
        amountInPaise: enteredAmountInPaise,
        paymentDate: new Date(`${paymentDate}T00:00:00.000Z`).toISOString(),
        idempotencyKey,
      });
      setAttempt(created);
      setConfirmActualPayment(false);
      setActionError("");
    } catch (error) {
      setActionError(getErrorMessage(error, "Unable to record payment attempt."));
    }
  };

  const confirmAttempt = async () => {
    if (!attempt || isConfirming) return;
    try {
      await onConfirm(attempt._id);
      setActionError("");
    } catch (error) {
      setActionError(getErrorMessage(error, "Unable to confirm payroll settlement."));
    }
  };

  const markFailed = async () => {
    if (!attempt || isFailing || failureReason.trim().length < 3) return;
    try {
      const updated = await onFail(attempt._id, failureReason.trim());
      setAttempt(updated);
      setFailureReason("");
      setIdempotencyKey(newIdempotencyKey());
      setActionError("");
    } catch (error) {
      setActionError(getErrorMessage(error, "Unable to record payment failure."));
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={isAwaitingConfirmation ? "Confirm payroll payment" : "Record payroll payment"}
      maxWidth="md"
    >
      <div className="space-y-4">
        {actionError && (
          <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            {actionError}
          </p>
        )}
        <div className="rounded-lg border bg-muted/30 p-3 text-sm">
          <div className="font-semibold">
            {typeof record.staffId === "object" ? record.staffId.name : "Staff member"}
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            Payroll period {record.monthYear}
          </div>
          <div className="mt-1 flex justify-between text-muted-foreground">
            <span>Payroll payable</span>
            <span className="font-mono font-semibold text-foreground">
              ₹{record.calculations.netPayable.toLocaleString("en-IN", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
          </div>
          {(record.incentiveLedgerGrossInPaise || 0) > 0 && (
            <div className="mt-3 space-y-1 border-t pt-2 text-xs">
              <div className="flex justify-between">
                <span>Commission before reversals</span>
                <span className="font-mono">
                  ₹{((record.incentiveLedgerGrossInPaise || 0) / 100).toLocaleString("en-IN", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>
              {(record.incentiveLedgerClawbackInPaise || 0) > 0 && (
                <div className="flex justify-between text-amber-700">
                  <span>Commission reversals</span>
                  <span className="font-mono">
                    −₹{((record.incentiveLedgerClawbackInPaise || 0) / 100).toLocaleString("en-IN", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </div>
              )}
              <div className="flex justify-between font-semibold">
                <span>Commission included in payroll</span>
                <span className="font-mono">
                  ₹{((record.incentiveLedgerAmountInPaise || 0) / 100).toLocaleString("en-IN", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>
            </div>
          )}
        </div>

        {isConfirmed ? (
          <div className="space-y-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
            <div className="flex items-center gap-2 font-semibold">
              <CheckCircle2 className="h-4 w-4" />
              Payment confirmed; payroll is settled.
            </div>
            <p>
              {attempt?.paymentMethod.replace("_", " ")} · {attempt?.paymentReference}
            </p>
          </div>
        ) : isReversed ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            This confirmed payment was reversed. {attempt?.reversalReason}
          </div>
        ) : isAwaitingConfirmation ? (
          <div className="space-y-4">
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
              <div className="flex items-center gap-2 font-semibold">
                <AlertTriangle className="h-4 w-4" />
                Recorded is not paid
              </div>
              <p className="mt-2">
                {attempt?.paymentMethod.replace("_", " ")} · {attempt?.paymentReference}
                {" · "}₹{((attempt?.amountInPaise || 0) / 100).toLocaleString("en-IN", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </p>
              <p className="mt-2">
                Confirm only after you have independently verified that the payment completed.
                This manual confirmation does not contact a bank or payment provider.
              </p>
            </div>
            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                checked={confirmActualPayment}
                onChange={(event) => setConfirmActualPayment(event.target.checked)}
                className="mt-1"
              />
              <span>I verified the actual payment settlement and reference above.</span>
            </label>
            <Button
              type="button"
              disabled={!confirmActualPayment || isConfirming}
              onClick={confirmAttempt}
              className="w-full"
            >
              <ShieldCheck className="mr-2 h-4 w-4" />
              {isConfirming ? "Confirming..." : "Confirm actual payment"}
            </Button>
            <div className="border-t pt-3">
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Failure reason (if settlement did not complete)
              </label>
              <div className="flex gap-2">
                <Input
                  value={failureReason}
                  onChange={(event) => setFailureReason(event.target.value)}
                  placeholder="Explain why this payment attempt failed"
                  maxLength={500}
                />
                <Button
                  type="button"
                  variant="outline"
                  disabled={failureReason.trim().length < 3 || isFailing}
                  onClick={markFailed}
                >
                  {isFailing ? "Saving..." : "Mark failed"}
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <form onSubmit={recordAttempt} className="space-y-4">
            {isFailed && (
              <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                Previous attempt failed: {attempt?.failureReason}. Record a new attempt only after
                correcting the payment issue.
              </div>
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-1 text-sm">
                <span className="font-medium">Payment method</span>
                <select
                  value={paymentMethod}
                  onChange={(event) => setPaymentMethod(event.target.value as typeof paymentMethod)}
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
                placeholder="Bank UTR, cheque number, or internal cash receipt"
                maxLength={200}
                required
              />
            </label>
            <label className="block space-y-1 text-sm">
              <span className="font-medium">Amount (₹)</span>
              <Input
                type="number"
                min="0.01"
                step="0.01"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                required
              />
            </label>
            {amount && !isExactAmount && (
              <p role="alert" className="text-sm text-destructive">
                Enter the exact payroll payable amount. Partial payroll payments are not supported.
              </p>
            )}
            <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-xs text-blue-900">
              Recording creates an auditable payment attempt only. It does not mark payroll paid.
              Payroll becomes settled only after an authorized user separately confirms the actual
              completed payment.
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={
                  !isExactAmount ||
                  !paymentReference.trim() ||
                  !paymentDate ||
                  isRecording
                }
              >
                <CreditCard className="mr-2 h-4 w-4" />
                {isRecording ? "Recording..." : "Record payment attempt"}
              </Button>
            </div>
          </form>
        )}
      </div>
    </Dialog>
  );
}
