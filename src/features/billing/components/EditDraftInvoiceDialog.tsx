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

import { Award, Sparkles } from "lucide-react";
import { useCustomer } from "@/features/customers/hooks/useCustomer";
import { useRedemptionPreview } from "@/features/loyalty/hooks/useLoyaltyQueries";

import { useDebounce } from "@/hooks/useDebounce";

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

  const customerId = invoice?.customerId || invoice?.customer?.id;
  const { data: customer } = useCustomer(customerId || null);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<UpdateDraftInvoiceFormValues>({
    resolver: zodResolver(updateDraftInvoiceSchema) as unknown as Resolver<UpdateDraftInvoiceFormValues>,
    defaultValues: {
      discountTotal: invoice?.discountTotal || 0,
      redeemLoyaltyPoints: invoice?.redeemLoyaltyPoints ?? invoice?.loyaltyRedeemedPoints ?? 0,
      notes: invoice?.notes || "",
    },
    values: invoice
      ? {
          discountTotal: invoice.discountTotal,
          redeemLoyaltyPoints: invoice.redeemLoyaltyPoints ?? invoice.loyaltyRedeemedPoints ?? 0,
          notes: invoice.notes || "",
        }
      : undefined,
  });

  const enteredDiscount =
    useWatch({
      control,
      name: "discountTotal",
    }) || 0;

  const enteredLoyaltyPoints =
    Number(
      useWatch({
        control,
        name: "redeemLoyaltyPoints",
      })
    ) || 0;

  // Debounce the requested points to prevent racing API queries on each keystroke
  const debouncedLoyaltyPoints = useDebounce(enteredLoyaltyPoints, 350);

  // Read-only server-authoritative redemption preview
  const { data: previewData, isLoading: isPreviewLoading } = useRedemptionPreview(
    customerId && invoice?.id && debouncedLoyaltyPoints > 0
      ? {
          customerId,
          invoiceId: invoice.id,
          pointsRequested: debouncedLoyaltyPoints,
        }
      : null,
    { enabled: Boolean(isOpen && customerId && invoice?.id && debouncedLoyaltyPoints > 0) }
  );

  const subtotal = invoice?.subtotal || 0;
  const subscriptionCovered = invoice?.subscriptionCoveredAmount || 0;
  const grossPayable = Math.max(0, subtotal - (Number(enteredDiscount) || 0));

  // If preview returned authoritative appliedDiscount / effectivePayable, use it; otherwise compute provisional display
  const loyaltyDiscountValue = previewData?.appliedDiscount ?? (invoice?.loyaltyDiscountAmount || 0);
  const estimatedPayable = previewData?.effectivePayable ?? Math.max(0, grossPayable - subscriptionCovered - loyaltyDiscountValue);

  const onSubmit = async (values: UpdateDraftInvoiceFormValues) => {
    if (!invoice) return;
    try {
      const targetBranchId = invoice.branchId || invoice.branch?.id;
      await updateMutation.mutateAsync({
        id: invoice.id,
        payload: {
          discountTotal: values.discountTotal,
          redeemLoyaltyPoints: values.redeemLoyaltyPoints,
          notes: values.notes,
          ...(targetBranchId ? { branchId: targetBranchId } : {}),
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
          Update invoice discount, loyalty points redemption, and notes. Line items and service pricing are immutable.
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
          {loyaltyDiscountValue > 0 && (
            <div className="flex justify-between text-primary font-medium">
              <span className="flex items-center gap-1">
                <Sparkles className="h-3 w-3" />
                Loyalty Discount ({enteredLoyaltyPoints} pts)
              </span>
              <span className="font-semibold">
                -{formatCurrency(loyaltyDiscountValue)}
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

        {/* Loyalty Redemption Section */}
        {customer && (
          <div className="p-3 bg-primary/5 rounded-lg border border-primary/20 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-foreground flex items-center gap-1.5">
                <Award className="h-3.5 w-3.5 text-primary" />
                Loyalty Redemption
              </span>
              <span className="text-muted-foreground text-[11px]">
                Available: <strong>{customer.loyaltyPoints ?? 0} pts</strong>
              </span>
            </div>

            {(customer.loyaltyPointsDebt ?? 0) > 0 && (
              <p className="text-[10px] text-amber-700 dark:text-amber-400">
                Customer has {customer.loyaltyPointsDebt} pts debt.
              </p>
            )}

            <div className="space-y-1">
              <label className="text-[11px] font-medium text-foreground">
                Points to Redeem
              </label>
              <Input
                type="number"
                min="0"
                max={customer.loyaltyPoints ?? 0}
                step="1"
                placeholder="Enter points..."
                {...register("redeemLoyaltyPoints")}
                className="text-xs h-8"
              />
              {errors.redeemLoyaltyPoints && (
                <p className="text-[10px] text-destructive">
                  {errors.redeemLoyaltyPoints.message}
                </p>
              )}
            </div>

            {/* Server-authoritative preview feedback */}
            {isPreviewLoading && (
              <p className="text-[10px] text-muted-foreground italic">
                Calculating server redemption preview...
              </p>
            )}
            {previewData && !previewData.isEligible && (
              <p className="text-[10px] text-destructive font-medium">
                {previewData.reason || "Points cannot be redeemed for this invoice."}
              </p>
            )}
            {previewData && previewData.isEligible && previewData.maxRedeemablePoints < debouncedLoyaltyPoints && (
              <p className="text-[10px] text-amber-600 dark:text-amber-400">
                Notice: Program cap limits redemption to max {previewData.maxRedeemablePoints} points ({formatCurrency(previewData.maxRedemptionDiscount)} max discount).
              </p>
            )}
          </div>
        )}

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
