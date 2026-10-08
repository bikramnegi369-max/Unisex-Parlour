"use client";

import React from "react";
import { useForm, useWatch, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency } from "@/lib/formatters";
import { useUpdateDraftInvoice } from "../hooks/useBillingMutations";
import {
  updateDraftInvoiceSchema,
  type UpdateDraftInvoiceFormValues,
} from "../schemas/billing.schema";
import type { Invoice } from "../types/billing.types";

interface EditDraftInvoiceDialogProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: Invoice | null;
}

export function EditDraftInvoiceDialog({
  isOpen,
  onClose,
  invoice,
}: EditDraftInvoiceDialogProps) {
  const updateMutation = useUpdateDraftInvoice();

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<UpdateDraftInvoiceFormValues>({
    resolver: zodResolver(updateDraftInvoiceSchema) as unknown as Resolver<UpdateDraftInvoiceFormValues>,
    defaultValues: {
      discountTotal: invoice?.discountTotal || 0,
      notes: invoice?.notes || "",
    },
    values: invoice
      ? {
          discountTotal: invoice.discountTotal,
          notes: invoice.notes || "",
        }
      : undefined,
  });

  const enteredDiscount =
    useWatch({
      control,
      name: "discountTotal",
    }) || 0;
  const subtotal = invoice?.subtotal || 0;
  const subscriptionCovered = invoice?.subscriptionCoveredAmount || 0;
  const grossPayable = Math.max(0, subtotal - (Number(enteredDiscount) || 0));
  const estimatedPayable = Math.max(0, grossPayable - subscriptionCovered);

  const onSubmit = async (values: UpdateDraftInvoiceFormValues) => {
    if (!invoice) return;
    try {
      await updateMutation.mutateAsync({
        id: invoice.id,
        payload: {
          discountTotal: values.discountTotal,
          notes: values.notes,
        },
      });

      toast.success("Draft invoice updated successfully.");
      onClose();
    } catch (err: unknown) {
      const axiosError = err as {
        response?: { data?: { message?: string } };
        message?: string;
      };
      const msg =
        axiosError.response?.data?.message ||
        axiosError.message ||
        "Failed to update draft invoice.";
      toast.error(msg);
    }
  };

  if (!invoice) return null;

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={`Edit Draft Invoice ${invoice.invoiceNumber}`}
      className="max-w-md"
    >
      <div className="space-y-4">
        <p className="text-xs text-muted-foreground">
          Update invoice discount and notes. Line items and service pricing are immutable.
        </p>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="p-3 bg-muted/40 rounded-lg border border-border text-xs space-y-2">
          <div className="flex justify-between text-muted-foreground">
            <span>Subtotal</span>
            <span className="font-semibold text-foreground">
              {formatCurrency(subtotal)}
            </span>
          </div>
          {subscriptionCovered > 0 && (
            <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
              <span>Subscription Coverage</span>
              <span className="font-semibold">
                -{formatCurrency(subscriptionCovered)}
              </span>
            </div>
          )}
          <div className="flex justify-between pt-1 border-t border-border font-bold text-foreground">
            <span>Estimated Payable</span>
            <span className="text-primary font-black">
              {formatCurrency(estimatedPayable)}
            </span>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-foreground">
            Discount Total (₹)
          </label>
          <Input
            type="number"
            step="any"
            min="0"
            {...register("discountTotal")}
            className="text-xs"
          />
          {errors.discountTotal && (
            <p className="text-[10px] text-destructive">
              {errors.discountTotal.message}
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-foreground">
            Notes
          </label>
          <Textarea
            rows={2}
            placeholder="Invoice notes..."
            {...register("notes")}
            className="text-xs resize-none"
          />
          {errors.notes && (
            <p className="text-[10px] text-destructive">
              {errors.notes.message}
            </p>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={isSubmitting || updateMutation.isPending}
            className="text-xs"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            size="sm"
            disabled={isSubmitting || updateMutation.isPending}
            className="text-xs font-semibold"
          >
            {isSubmitting || updateMutation.isPending
              ? "Saving..."
              : "Save Changes"}
          </Button>
        </div>
      </form>
    </div>
    </Dialog>
  );
}
