"use client";

import React, { useEffect } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency } from "@/lib/formatters";
import { useBranchContext } from "@/hooks/useBranchContext";
import { useRemoveInvoiceDiscount } from "../hooks/useBillingMutations";
import {
  removeDiscountSchema,
  type RemoveDiscountFormValues,
} from "../schemas/discount.schema";
import type { Invoice, AppliedDiscount } from "../types/billing.types";
import { Trash2, AlertTriangle } from "lucide-react";

interface RemoveDiscountDialogProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: Invoice | null;
  discount: AppliedDiscount | null;
  onConflictRefresh?: () => void;
}

export function RemoveDiscountDialog({
  isOpen,
  onClose,
  invoice,
  discount,
  onConflictRefresh,
}: RemoveDiscountDialogProps) {
  const { currentBranchId } = useBranchContext();
  const removeMutation = useRemoveInvoiceDiscount();

  const activeBranchId =
    invoice?.branchId ||
    invoice?.branch?.id ||
    (currentBranchId && currentBranchId !== "all" ? currentBranchId : "");

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<RemoveDiscountFormValues>({
    resolver: zodResolver(removeDiscountSchema) as unknown as Resolver<RemoveDiscountFormValues>,
    defaultValues: {
      branchId: activeBranchId,
      reason: "",
    },
  });

  useEffect(() => {
    if (isOpen) {
      const initialBranch =
        invoice?.branchId ||
        invoice?.branch?.id ||
        (currentBranchId && currentBranchId !== "all" ? currentBranchId : "");

      reset({
        branchId: initialBranch,
        reason: "",
      });
    }
  }, [isOpen, invoice, currentBranchId, reset]);

  const onSubmit = async (values: RemoveDiscountFormValues) => {
    if (!invoice?.id || !discount?.id) return;

    if (!values.branchId || values.branchId === "all") {
      toast.error("An active branch is required to remove discounts.");
      return;
    }

    try {
      await removeMutation.mutateAsync({
        invoiceId: invoice.id,
        discountId: discount.id,
        payload: {
          branchId: values.branchId,
          reason: values.reason.trim(),
        },
      });

      toast.success("Discount removed successfully");
      onClose();
    } catch (err: unknown) {
      const error = err as {
        response?: { status?: number; data?: { message?: string } };
        message?: string;
      };

      if (error.response?.status === 409) {
        toast.error("Concurrency conflict: The invoice was modified. Refreshing latest data.");
        onConflictRefresh?.();
        onClose();
        return;
      }

      const msg =
        error.response?.data?.message || error.message || "Failed to remove discount.";
      toast.error(msg);
    }
  };

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title="Remove Discount" maxWidth="sm">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
        <input type="hidden" {...register("branchId")} />

        <div className="flex items-start gap-3 p-3 bg-destructive/10 border border-destructive/20 rounded-xl text-xs text-destructive">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold">Are you sure you want to remove this discount?</p>
            <p className="text-[11px] opacity-90">
              Discount: <strong>{discount?.name || "Applied Discount"}</strong> (
              {discount?.type === "percentage"
                ? `${discount.enteredValue}% (${formatCurrency(discount.calculatedDiscount)})`
                : formatCurrency(discount?.calculatedDiscount ?? 0)}
              )
            </p>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-foreground">
            Reason for Removal <span className="text-destructive">*</span>
          </label>
          <Textarea
            placeholder="Mandatory justification for audit trail (min 3 chars)..."
            rows={2}
            {...register("reason")}
            className="text-xs resize-none"
          />
          {errors.reason && (
            <p className="text-[11px] text-destructive">{errors.reason.message}</p>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-border/80">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            disabled={isSubmitting || removeMutation.isPending}
            className="text-xs h-8"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="destructive"
            size="sm"
            disabled={isSubmitting || removeMutation.isPending}
            className="text-xs h-8 font-semibold gap-1.5"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>{removeMutation.isPending ? "Removing..." : "Remove Discount"}</span>
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
