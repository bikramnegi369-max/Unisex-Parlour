"use client";

import React from "react";
import { useForm, useWatch, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { CreditCard, Banknote, QrCode, MoreHorizontal } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency } from "@/lib/formatters";
import { useRecordPayment } from "../hooks/useBillingMutations";
import {
  recordPaymentSchema,
  type RecordPaymentFormValues,
} from "../schemas/billing.schema";
import type { Invoice, PaymentMethod } from "../types/billing.types";

interface RecordPaymentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: Invoice | null;
}

const PAYMENT_METHODS: { id: PaymentMethod; label: string; icon: React.ReactNode }[] = [
  { id: "cash", label: "Cash", icon: <Banknote className="h-4 w-4" /> },
  { id: "card", label: "Card", icon: <CreditCard className="h-4 w-4" /> },
  { id: "upi", label: "UPI", icon: <QrCode className="h-4 w-4" /> },
  { id: "other", label: "Other", icon: <MoreHorizontal className="h-4 w-4" /> },
];

function generateIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `pay_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

export function RecordPaymentDialog({
  isOpen,
  onClose,
  invoice,
}: RecordPaymentDialogProps) {
  const recordPaymentMutation = useRecordPayment();

  // Stable idempotency key for the current logical payment attempt
  const idempotencyKeyRef = React.useRef<string | null>(null);
  // Track the payload submitted with the active idempotency key
  const lastSubmittedPayloadRef = React.useRef<{
    amount: number;
    paymentMethod: PaymentMethod;
    invoiceId: string;
  } | null>(null);

  // Initialize or reset idempotency key when dialog opens
  React.useEffect(() => {
    if (isOpen) {
      if (!idempotencyKeyRef.current) {
        idempotencyKeyRef.current = generateIdempotencyKey();
      }
    } else {
      idempotencyKeyRef.current = null;
      lastSubmittedPayloadRef.current = null;
    }
  }, [isOpen]);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<RecordPaymentFormValues>({
    resolver: zodResolver(recordPaymentSchema) as unknown as Resolver<RecordPaymentFormValues>,
    defaultValues: {
      amount: invoice?.amountDue || 0,
      paymentMethod: "cash",
      referenceNote: "",
    },
    values: invoice
      ? {
          amount: invoice.amountDue,
          paymentMethod: "cash",
          referenceNote: "",
        }
      : undefined,
  });

  const selectedMethod = useWatch({
    control,
    name: "paymentMethod",
  });

  const watchAmount = useWatch({
    control,
    name: "amount",
  });

  // Store explicit user override if they type into the cash tendered input
  const [tenderedCashOverride, setTenderedCashOverride] = React.useState<number | null>(null);

  // Derive active tenderedCash: fallback to invoice.amountDue when user hasn't typed an override
  const tenderedCash = tenderedCashOverride ?? (invoice?.amountDue ?? 0);
  const setTenderedCash = (val: number) => setTenderedCashOverride(val);

  const handleFormSubmit = async (values: RecordPaymentFormValues) => {
    if (!invoice) return;

    // Check if the user materially changed the payload compared to previous attempt
    if (
      lastSubmittedPayloadRef.current &&
      (lastSubmittedPayloadRef.current.amount !== values.amount ||
        lastSubmittedPayloadRef.current.paymentMethod !== values.paymentMethod ||
        lastSubmittedPayloadRef.current.invoiceId !== invoice.id)
    ) {
      // Different payload constitutes a genuinely new logical payment attempt
      idempotencyKeyRef.current = generateIdempotencyKey();
    }

    if (!idempotencyKeyRef.current) {
      idempotencyKeyRef.current = generateIdempotencyKey();
    }

    const currentKey = idempotencyKeyRef.current;
    lastSubmittedPayloadRef.current = {
      amount: values.amount,
      paymentMethod: values.paymentMethod,
      invoiceId: invoice.id,
    };

    try {
      const result = await recordPaymentMutation.mutateAsync({
        invoiceId: invoice.id,
        payload: {
          amount: values.amount,
          paymentMethod: values.paymentMethod,
          referenceNote: values.referenceNote,
          idempotencyKey: currentKey,
        },
      });

      if (result?.isIdempotentReplay) {
        toast.info(
          `Existing payment of ${formatCurrency(values.amount)} replayed successfully (idempotent submission).`
        );
      } else {
        toast.success(
          `Manual payment of ${formatCurrency(values.amount)} recorded successfully.`
        );
      }
      idempotencyKeyRef.current = null;
      lastSubmittedPayloadRef.current = null;
      reset();
      onClose();
    } catch (err: unknown) {
      const axiosError = err as {
        response?: { status?: number; data?: { message?: string } };
        code?: string;
        message?: string;
      };

      if (axiosError.response?.status === 409) {
        toast.error(
          axiosError.response?.data?.message ||
            "Payment conflict: This transaction was already processed or submitted with conflicting details."
        );
        return;
      }

      // Check for timeout or network uncertainty where transaction might have been received by backend
      const isNetworkUncertainty =
        axiosError.code === "ECONNABORTED" ||
        axiosError.code === "ERR_NETWORK" ||
        !axiosError.response;

      if (isNetworkUncertainty) {
        toast.error(
          "Network connectivity error. The payment status may be uncertain. Please verify payment history before retrying.",
          { duration: 6000 }
        );
        return;
      }

      const msg =
        axiosError.response?.data?.message ||
        axiosError.message ||
        "Failed to record payment.";
      toast.error(msg);
    }
  };

  if (!invoice) return null;

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Record Payment"
      className="max-w-md"
    >
      <div className="space-y-4">
        <p className="text-xs text-muted-foreground">
          Record manual receipt of payment for Invoice {invoice.invoiceNumber}.
        </p>
        <form
          onSubmit={(e) => {
            handleSubmit(handleFormSubmit)(e);
          }}
          className="space-y-4"
        >
        {/* Outstanding summary */}
        <div className="p-3 bg-muted/40 rounded-xl border border-border flex items-center justify-between text-xs">
          <div>
            <span className="text-muted-foreground block">Amount Due</span>
            <span className="text-base font-black text-primary">
              {formatCurrency(invoice.amountDue)}
            </span>
          </div>
          <div className="text-right">
            <span className="text-muted-foreground block">Total Payable</span>
            <span className="font-semibold text-foreground">
              {formatCurrency(invoice.payableAmount)}
            </span>
          </div>
        </div>

        {/* Amount Input */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label htmlFor="amount-received-input" className="text-xs font-semibold text-foreground">
              Amount Received (₹)
            </label>
            <button
              type="button"
              onClick={() => {
                setValue("amount", invoice.amountDue);
                setTenderedCash(invoice.amountDue);
              }}
              className="text-[11px] text-primary hover:underline font-semibold"
            >
              Pay Full Due ({formatCurrency(invoice.amountDue)})
            </button>
          </div>
          <Input
            id="amount-received-input"
            type="number"
            step="any"
            min="0.01"
            max={invoice.amountDue}
            {...register("amount")}
            className="text-xs font-semibold"
          />
          {errors.amount && (
            <p className="text-[10px] text-destructive">
              {errors.amount.message}
            </p>
          )}

          {/* Quick-Cash Buttons (Especially useful for POS Cash / Counter Checkout) */}
          <div className="space-y-1.5 pt-1">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">
              Quick Cash / Preset Amounts
            </span>
            <div className="flex flex-wrap gap-1.5">
              {[
                { label: "Exact", val: invoice.amountDue },
                { label: "+₹100", val: Math.min(invoice.amountDue, (watchAmount || 0) + 100) },
                { label: "+₹500", val: Math.min(invoice.amountDue, (watchAmount || 0) + 500) },
                { label: "₹500", val: Math.min(invoice.amountDue, 500) },
                { label: "₹1,000", val: Math.min(invoice.amountDue, 1000) },
                { label: "₹2,000", val: Math.min(invoice.amountDue, 2000) },
              ].map((chip, idx) => (
                <button
                  key={`${chip.label}-${idx}`}
                  type="button"
                  onClick={() => {
                    setValue("amount", chip.val);
                    if (selectedMethod === "cash") {
                      setTenderedCash(chip.val);
                    }
                  }}
                  className="px-2 py-1 text-[11px] font-semibold rounded-md border border-border bg-muted/40 hover:bg-muted text-foreground transition-colors active:scale-95"
                >
                  {chip.label}
                </button>
              ))}
            </div>
          </div>

          {/* Cash Change Calculator (when paying via cash) */}
          {selectedMethod === "cash" && (
            <div className="p-2.5 bg-muted/30 border border-border/80 rounded-lg space-y-2 mt-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground font-medium">Customer Tendered (₹):</span>
                <input
                  type="number"
                  step="any"
                  min={watchAmount || 0}
                  value={tenderedCash || ""}
                  onChange={(e) => setTenderedCash(parseFloat(e.target.value) || 0)}
                  placeholder="Enter cash given"
                  className="w-28 text-right px-2 py-1 bg-background border border-border rounded text-xs font-semibold focus:outline-hidden focus:ring-1 focus:ring-primary"
                />
              </div>
              {tenderedCash > 0 && (
                <div className="flex items-center justify-between pt-1 border-t border-border/60 text-xs">
                  <span className="font-semibold text-muted-foreground">Change to Return:</span>
                  <span
                    className={`font-bold ${
                      tenderedCash >= (watchAmount || 0)
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-destructive"
                    }`}
                  >
                    {tenderedCash >= (watchAmount || 0)
                      ? formatCurrency(tenderedCash - (watchAmount || 0))
                      : `Short by ${formatCurrency((watchAmount || 0) - tenderedCash)}`}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Payment Method Selector */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-foreground">
            Payment Method
          </label>
          <div className="grid grid-cols-2 gap-2">
            {PAYMENT_METHODS.map((method) => {
              const isSelected = selectedMethod === method.id;
              return (
                <button
                  key={method.id}
                  type="button"
                  onClick={() => setValue("paymentMethod", method.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium transition-colors ${
                    isSelected
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-card text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                  }`}
                >
                  {method.icon}
                  <span>{method.label}</span>
                </button>
              );
            })}
          </div>
          {errors.paymentMethod && (
            <p className="text-[10px] text-destructive">
              {errors.paymentMethod.message}
            </p>
          )}
        </div>

        {/* Reference Note */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-foreground">
            Reference Note (Optional)
          </label>
          <Textarea
            rows={2}
            placeholder="e.g. Transaction ID, Check #, Cash register memo..."
            {...register("referenceNote")}
            className="text-xs resize-none"
          />
          {errors.referenceNote && (
            <p className="text-[10px] text-destructive">
              {errors.referenceNote.message}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={isSubmitting || recordPaymentMutation.isPending}
            className="text-xs"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            size="sm"
            disabled={isSubmitting || recordPaymentMutation.isPending}
            className="text-xs font-semibold"
          >
            {isSubmitting || recordPaymentMutation.isPending
              ? "Recording..."
              : "Record Payment"}
          </Button>
        </div>
      </form>
    </div>
    </Dialog>
  );
}
