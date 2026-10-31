"use client";

import React from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useBranchContext } from "@/hooks/useBranchContext";
import { useModifyInvoiceDiscount } from "../hooks/useBillingMutations";
import {
  modifyDiscountSchema,
  type ModifyDiscountFormValues,
} from "../schemas/discount.schema";
import type { Invoice, AppliedDiscount } from "../types/billing.types";
import { Edit3 } from "lucide-react";

interface ModifyDiscountDialogProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: Invoice | null;
  discount: AppliedDiscount | null;
  onConflictRefresh?: () => void;
}

export function ModifyDiscountDialog({
  isOpen,
  onClose,
  invoice,
  discount,
  onConflictRefresh,
}: ModifyDiscountDialogProps) {
  const { currentBranchId } = useBranchContext();
  const modifyMutation = useModifyInvoiceDiscount();

  const activeBranchId =
    invoice?.branchId ||
    invoice?.branch?.id ||
    (currentBranchId && currentBranchId !== "all" ? currentBranchId : "");

  const initialType = discount?.type || discount?.discountType || "fixed";
  const initialValue = discount?.enteredValue ?? 0;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ModifyDiscountFormValues>({
    resolver: zodResolver(modifyDiscountSchema) as unknown as Resolver<ModifyDiscountFormValues>,
    defaultValues: {
      branchId: activeBranchId,
      discountType: initialType,
      enteredValue: initialValue,
      reason: "",
    },
  });

  React.useEffect(() => {
    if (isOpen && discount) {
      reset({
        branchId: activeBranchId,
        discountType: discount.type || discount.discountType || "fixed",
        enteredValue: discount.enteredValue ?? 0,
        reason: "",
      });
    }
  }, [isOpen, discount, activeBranchId, reset]);

  const onSubmit = async (values: ModifyDiscountFormValues) => {
    if (!invoice?.id || !discount?.id) return;

    if (!values.branchId || values.branchId === "all") {
      toast.error("An active branch is required to modify discounts.");
      return;
    }

    try {
      await modifyMutation.mutateAsync({
        invoiceId: invoice.id,
        discountId: discount.id,
        payload: {
          branchId: values.branchId,
          enteredValue: Number(values.enteredValue),
          reason: values.reason.trim(),
        },
      });

      toast.success("Discount modified successfully");
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
        error.response?.data?.message || error.message || "Failed to modify discount.";
      toast.error(msg);
    }
  };

  const isPercentage = initialType === "percentage";

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title="Modify Discount Value" maxWidth="sm">
      {discount && (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
          <input type="hidden" {...register("branchId")} />
          <input type="hidden" {...register("discountType")} />

          <div className="p-3 bg-muted/40 rounded-xl space-y-1 text-xs">
            <div className="flex justify-between text-muted-foreground">
              <span>Discount Name:</span>
              <span className="font-semibold text-foreground">
                {discount.name || (discount.level === "line" ? "Line Item Discount" : "Invoice Discount")}
              </span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Type:</span>
              <span className="font-semibold uppercase text-foreground">
                {initialType}
              </span>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">
              {isPercentage ? "New Percentage (0 - 100%)" : "New Amount (₹)"}{" "}
              <span className="text-destructive">*</span>
            </label>
            <Input
              type="number"
              step="any"
              min="0"
              max={isPercentage ? 100 : undefined}
              placeholder={isPercentage ? "10" : "100"}
              {...register("enteredValue", { valueAsNumber: true })}
              className="text-xs h-9"
            />
            {errors.enteredValue && (
              <p className="text-[11px] text-destructive">{errors.enteredValue.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">
              Reason for Modification <span className="text-destructive">*</span>
            </label>
            <Textarea
              placeholder="Mandatory reason for updating discount value (min 3 chars)..."
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
              disabled={isSubmitting || modifyMutation.isPending}
              className="text-xs h-8"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting || modifyMutation.isPending}
              className="text-xs h-8 font-semibold gap-1.5"
            >
              <Edit3 className="h-3.5 w-3.5" />
              <span>{modifyMutation.isPending ? "Updating..." : "Update Discount"}</span>
            </Button>
          </div>
        </form>
      )}
    </Dialog>
  );
}
