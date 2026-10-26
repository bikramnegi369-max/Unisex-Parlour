"use client";

import React, { useState } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format, addMonths } from "date-fns";
import { Building2, AlertCircle, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useBranchContext } from "@/hooks/useBranchContext";
import {
  renewSubscriptionSchema,
  type RenewSubscriptionFormValues,
} from "../schemas/subscription.schema";
import type { Subscription } from "../types/subscription.types";

interface RenewSubscriptionDialogProps {
  subscription: Subscription;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: RenewSubscriptionFormValues) => Promise<void>;
  isLoading: boolean;
}

export function RenewSubscriptionDialog({
  subscription,
  isOpen,
  onClose,
  onSubmit,
  isLoading,
}: RenewSubscriptionDialogProps) {
  const { currentBranch, currentBranchId, isAllBranchesSelected } = useBranchContext();
  const [branchValidationError, setBranchValidationError] = useState<string | null>(null);

  // Suggest default end date: 6 months after current end date (or 6 months after today if already expired)
  const baseDate = subscription.endDate ? new Date(subscription.endDate) : new Date();
  const validBaseDate = !isNaN(baseDate.getTime()) && baseDate > new Date() ? baseDate : new Date();
  const defaultNextEndDate = format(addMonths(validBaseDate, 6), "yyyy-MM-dd");

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<RenewSubscriptionFormValues>({
    resolver: zodResolver(renewSubscriptionSchema) as unknown as Resolver<RenewSubscriptionFormValues>,
    defaultValues: {
      endDate: defaultNextEndDate,
      price: subscription.price ?? 0,
      notes: "",
    },
  });

  React.useEffect(() => {
    if (isOpen) {
      const bDate = subscription.endDate ? new Date(subscription.endDate) : new Date();
      const vDate = !isNaN(bDate.getTime()) && bDate > new Date() ? bDate : new Date();
      reset({
        endDate: format(addMonths(vDate, 6), "yyyy-MM-dd"),
        price: subscription.price ?? 0,
        notes: "",
      });
    }
  }, [isOpen, subscription, reset]);

  const handleFormSubmit = async (data: RenewSubscriptionFormValues) => {
    setBranchValidationError(null);
    if (!currentBranchId || currentBranchId === "all" || isAllBranchesSelected) {
      setBranchValidationError(
        "Please select a specific selling branch before renewing a subscription. Renewal sale invoices cannot be issued under 'All Branches' or without an active branch selection."
      );
      return;
    }
    await onSubmit(data);
    reset();
  };

  if (!isOpen) return null;

  const isMissingBranch = !currentBranchId || currentBranchId === "all" || isAllBranchesSelected;

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
      {/* Active Selling Branch Notice / Missing Branch Error */}
      {isMissingBranch ? (
        <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-xl flex items-start gap-2 text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <p className="font-semibold">Active Selling Branch Required</p>
            <p className="text-[11px] leading-relaxed opacity-90">
              Subscription renewal and renewal invoice generation require an active branch selection. Please select your active selling branch using the top navigation header.
            </p>
          </div>
        </div>
      ) : (
        <div className="p-2.5 bg-muted/40 border border-border/80 rounded-xl flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Building2 className="h-3.5 w-3.5 text-primary" />
            <span className="font-semibold text-foreground">Selling Branch:</span>
            <span>{currentBranch?.name || `Branch #${currentBranchId.slice(-4)}`}</span>
          </div>
          <span className="text-[10px] bg-primary/10 text-primary border border-primary/20 px-1.5 py-0.5 rounded font-medium">
            Renewal Invoice Branch
          </span>
        </div>
      )}

      {branchValidationError && (
        <div className="p-2.5 bg-destructive/10 border border-destructive/30 rounded-lg text-xs text-destructive flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{branchValidationError}</span>
        </div>
      )}

      {/* Target Subscription Summary */}
      <div className="p-3 bg-muted/20 border border-border/70 rounded-xl text-xs space-y-1">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Subscription Code:</span>
          <span className="font-mono font-semibold text-foreground">
            {subscription.subscriptionCode || subscription.id}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Customer:</span>
          <span className="font-semibold text-foreground">
            {subscription.customer?.name || (typeof subscription.customerId === "string" ? subscription.customerId : "Customer")}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Current End Date:</span>
          <span className="text-foreground">
            {subscription.endDate ? subscription.endDate.split("T")[0] : "N/A"}
          </span>
        </div>
      </div>

      {/* Renewal Price */}
      <div className="space-y-1.5">
        <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Renewal Fee / Agreed Price (₹)
        </label>
        <Input
          type="number"
          min="0"
          step="0.01"
          placeholder="Enter renewal price..."
          disabled={isLoading}
          {...register("price", { valueAsNumber: true })}
          className="h-9 text-xs"
        />
        {errors.price && (
          <p className="text-[11px] text-destructive">{errors.price.message}</p>
        )}
        <p className="text-[10px] text-muted-foreground">
          Generates a sale invoice for this renewal amount under the active selling branch.
        </p>
      </div>

      {/* New End Date */}
      <div className="space-y-1">
        <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          New End Date <span className="text-destructive">*</span>
        </label>
        <Input
          type="date"
          disabled={isLoading}
          {...register("endDate")}
          className="h-9 text-xs"
        />
        {errors.endDate && (
          <p className="text-[11px] text-destructive">{errors.endDate.message}</p>
        )}
      </div>

      {/* Notes */}
      <div className="space-y-1">
        <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Renewal Notes (Optional)
        </label>
        <Textarea
          placeholder="Notes about this renewal, terms, or customer requests..."
          rows={2}
          disabled={isLoading}
          {...register("notes")}
          className="text-xs"
        />
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onClose}
          disabled={isLoading}
          className="h-9 text-xs cursor-pointer"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          size="sm"
          disabled={isLoading || isMissingBranch}
          className="h-9 text-xs cursor-pointer gap-1.5 bg-primary text-primary-foreground"
          title={isMissingBranch ? "Select an active branch to renew subscription" : undefined}
        >
          {isLoading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCw className="h-3.5 w-3.5" />
          )}
          Renew Subscription
        </Button>
      </div>
    </form>
  );
}
