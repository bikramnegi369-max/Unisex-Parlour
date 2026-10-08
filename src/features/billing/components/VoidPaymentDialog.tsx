"use client";

import React from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { AlertTriangle } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency } from "@/lib/formatters";
import { useVoidPayment } from "../hooks/useBillingMutations";
import {
  voidPaymentSchema,
  type VoidPaymentFormValues,
} from "../schemas/billing.schema";
import type { PaymentRecord } from "../types/billing.types";

interface VoidPaymentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  payment: PaymentRecord | null;
  invoiceId: string;
}

export function VoidPaymentDialog({
  isOpen,
  onClose,
  payment,
  invoiceId,
}: VoidPaymentDialogProps) {
  const voidMutation = useVoidPayment();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<VoidPaymentFormValues>({
    resolver: zodResolver(voidPaymentSchema) as unknown as Resolver<VoidPaymentFormValues>,
    defaultValues: {
      reason: "",
    },
  });

  const onSubmit = async (values: VoidPaymentFormValues) => {
    if (!payment) return;
    try {
      await voidMutation.mutateAsync({
        paymentId: payment.id,
        invoiceId,
        payload: {
          reason: values.reason,
        },
      });

      toast.success(
        `Payment ${payment.paymentNumber} of ${formatCurrency(payment.amount)} voided.`
      );
      reset();
      onClose();
    } catch (err: unknown) {
      const axiosError = err as {
        response?: { data?: { message?: string } };
        message?: string;
      };
      const msg =
        axiosError.response?.data?.message ||
        axiosError.message ||
        "Failed to void payment.";
      toast.error(msg);
    }
  };

  if (!payment) return null;

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={`Void Payment ${payment.paymentNumber}`}
      className="max-w-md"
    >
      <div className="space-y-4">
        <p className="text-xs text-muted-foreground">
          This is an audit-preserving reversal action. The payment record will remain in history as voided and the invoice amount due will be adjusted accordingly.
        </p>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-start gap-3 text-xs text-amber-800 dark:text-amber-300">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold block">Reversal Notice</span>
            You are voiding a payment of{" "}
            <strong>{formatCurrency(payment.amount)}</strong> recorded on{" "}
            {new Date(payment.paidAt).toLocaleDateString()}.
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-foreground">
            Void Reason (Required)
          </label>
          <Textarea
            rows={2}
            placeholder="Explain why this payment record is being voided..."
            {...register("reason")}
            className="text-xs resize-none"
          />
          {errors.reason && (
            <p className="text-[10px] text-destructive">
              {errors.reason.message}
            </p>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={isSubmitting || voidMutation.isPending}
            className="text-xs"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="destructive"
            size="sm"
            disabled={isSubmitting || voidMutation.isPending}
            className="text-xs font-semibold"
          >
            {isSubmitting || voidMutation.isPending
              ? "Voiding..."
              : "Confirm Void"}
          </Button>
        </div>
      </form>
    </div>
    </Dialog>
  );
}
