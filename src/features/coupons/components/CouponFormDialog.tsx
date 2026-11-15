"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useForm, useWatch, Controller } from "react-hook-form";
import { AxiosError } from "axios";
import { zodResolver } from "@hookform/resolvers/zod";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Ticket,
  Percent,
  IndianRupee,
  Calendar,
  Lock,
  GitBranch,
  AlertCircle,
  Users,
  Check,
  CheckCircle2,
} from "lucide-react";
import { useBranches } from "@/features/branches/hooks/useBranches";
import {
  couponFormSchema,
  type CouponFormValues,
  type CouponFormInput,
} from "../schemas/coupon.schema";
import type {
  Coupon,
  CreateCouponPayload,
  UpdateCouponPayload,
} from "../types/coupon.types";
import type { Branch } from "@/types/branch";

interface CouponFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  couponToEdit?: Coupon | null;
  onSubmit: (
    payload: CreateCouponPayload | UpdateCouponPayload,
  ) => Promise<void>;
  isLoading: boolean;
}

export function CouponFormDialog({
  isOpen,
  onClose,
  couponToEdit,
  onSubmit,
  isLoading,
}: CouponFormDialogProps) {
  const isEditMode = Boolean(couponToEdit);
  const isUsed = Boolean(couponToEdit && couponToEdit.usageCount > 0);

  const { branches } = useBranches();
  const activeBranches = branches.filter((b: Branch) => b.isActive);

  const [formError, setFormError] = useState<string | null>(null);

  const handleClose = () => {
    setFormError(null);
    onClose();
  };
  // Format date string to YYYY-MM-DDTHH:mm for datetime-local input
  const formatForDateTimeInput = (isoDateString?: string | null) => {
    if (!isoDateString) return "";
    const date = new Date(isoDateString);
    if (isNaN(date.getTime())) return "";
    const pad = (n: number) => n.toString().padStart(2, "0");
    const yyyy = date.getFullYear();
    const mm = pad(date.getMonth() + 1);
    const dd = pad(date.getDate());
    const hh = pad(date.getHours());
    const min = pad(date.getMinutes());
    return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
  };

  // Initial default values lazy generator to maintain component purity during render
  const getDefaultValues = useCallback((): CouponFormInput => {
    const now = new Date();
    const future = new Date(now.getTime() + 30 * 86400000);
    return {
      code: "",
      description: "",
      discountType: "percentage",
      discountValue: 10,
      validFrom: formatForDateTimeInput(now.toISOString()),
      validUntil: formatForDateTimeInput(future.toISOString()),
      status: "active",
      enableTotalUsageLimit: false,
      totalUsageLimit: null,
      enablePerCustomerLimit: false,
      perCustomerLimit: null,
      excludedBranchIds: [],
    };
  }, []);

  const [initialDefaults] = useState<CouponFormInput>(getDefaultValues);

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm<CouponFormInput, unknown, CouponFormValues>({
    resolver: zodResolver(couponFormSchema),
    defaultValues: initialDefaults,
  });

  const discountType = useWatch({ control, name: "discountType" });
  const enableTotalUsageLimit = useWatch({
    control,
    name: "enableTotalUsageLimit",
  });
  const enablePerCustomerLimit = useWatch({
    control,
    name: "enablePerCustomerLimit",
  });
  const excludedBranchIds =
    useWatch({ control, name: "excludedBranchIds" }) || [];
  const status = useWatch({ control, name: "status" });

  // Reset or fill form when opening or couponToEdit changes
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    if (couponToEdit) {
      const excludedIds = (couponToEdit.excludedBranchIds || []).map((b) =>
        typeof b === "string" ? b : b.id || b._id || "",
      );

      reset({
        code: couponToEdit.code,
        description: couponToEdit.description || "",
        discountType: couponToEdit.discountType,
        discountValue: couponToEdit.discountValue,
        validFrom: formatForDateTimeInput(couponToEdit.validFrom),
        validUntil: formatForDateTimeInput(couponToEdit.validUntil),
        status: couponToEdit.status,
        enableTotalUsageLimit: Boolean(
          couponToEdit.totalUsageLimit !== null &&
          couponToEdit.totalUsageLimit !== undefined,
        ),
        totalUsageLimit: couponToEdit.totalUsageLimit ?? null,
        enablePerCustomerLimit: Boolean(
          couponToEdit.perCustomerLimit !== null &&
          couponToEdit.perCustomerLimit !== undefined,
        ),
        perCustomerLimit: couponToEdit.perCustomerLimit ?? null,
        excludedBranchIds: excludedIds.filter(Boolean),
      });
    } else {
      reset(getDefaultValues());
    }
  }, [isOpen, couponToEdit, reset, getDefaultValues]);

  const handleBranchToggle = (branchId: string) => {
    const current = excludedBranchIds || [];
    if (current.includes(branchId)) {
      setValue(
        "excludedBranchIds",
        current.filter((id) => id !== branchId),
        { shouldValidate: true },
      );
    } else {
      setValue("excludedBranchIds", [...current, branchId], {
        shouldValidate: true,
      });
    }
  };

  const handleFormSubmit = async (values: CouponFormValues) => {
    setFormError(null);
    try {
      if (isEditMode) {
        // UPDATE MODE
        const updatePayload: UpdateCouponPayload = {
          description: values.description?.trim() || undefined,
          validFrom: new Date(values.validFrom).toISOString(),
          validUntil: new Date(values.validUntil).toISOString(),
          status: values.status,
          totalUsageLimit: values.enableTotalUsageLimit
            ? values.totalUsageLimit
            : null,
          perCustomerLimit: values.enablePerCustomerLimit
            ? values.perCustomerLimit
            : null,
          excludedBranchIds: values.excludedBranchIds,
        };

        // If coupon has NEVER been used, allow updating discount parameters
        if (!isUsed) {
          updatePayload.discountType = values.discountType;
          updatePayload.discountValue = values.discountValue;
        }

        await onSubmit(updatePayload);
      } else {
        // CREATE MODE
        const createPayload: CreateCouponPayload = {
          code: values.code.trim().toUpperCase(),
          description: values.description?.trim() || undefined,
          discountType: values.discountType,
          discountValue: values.discountValue,
          validFrom: new Date(values.validFrom).toISOString(),
          validUntil: new Date(values.validUntil).toISOString(),
          status: values.status,
          totalUsageLimit: values.enableTotalUsageLimit
            ? values.totalUsageLimit
            : null,
          perCustomerLimit: values.enablePerCustomerLimit
            ? values.perCustomerLimit
            : null,
          excludedBranchIds: values.excludedBranchIds,
        };

        await onSubmit(createPayload);
      }
      handleClose();
    } catch (err: unknown) {
      let msg = "An unexpected error occurred while saving the coupon.";
      if (err instanceof AxiosError) {
        msg = err.response?.data?.message || err.message || msg;
      } else if (err instanceof Error) {
        msg = err.message;
      }
      setFormError(msg);
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={handleClose}
      title={
        isEditMode
          ? `Edit Coupon: ${couponToEdit?.code}`
          : "Create Promotional Coupon"
      }
      maxWidth="3xl"
    >
      <form
        onSubmit={handleSubmit(handleFormSubmit)}
        className="space-y-6 text-left"
      >
        {formError && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex items-start gap-2.5 text-destructive text-sm">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <div className="flex-1 font-medium">{formError}</div>
          </div>
        )}

        {/* Section 1: Campaign Identity */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 border-b border-border/60 pb-1.5">
            <Ticket className="w-3.5 h-3.5 text-primary" />
            Campaign Identity
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Coupon Code */}
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Coupon Code <span className="text-destructive">*</span>
              </label>
              <div className="relative">
                <Input
                  {...register("code")}
                  placeholder="e.g. SUMMER25"
                  disabled={isEditMode || isLoading || isSubmitting}
                  className={`font-mono uppercase tracking-wider ${isEditMode ? "bg-muted cursor-not-allowed" : ""}`}
                />
                {isEditMode && (
                  <div
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                    title="Code is immutable after creation"
                  >
                    <Lock className="w-3.5 h-3.5" />
                  </div>
                )}
              </div>
              {errors.code ? (
                <p className="text-[11px] text-destructive mt-1">
                  {errors.code.message}
                </p>
              ) : (
                <p className="text-[11px] text-muted-foreground mt-1">
                  Unique code clients enter or redeem. Uppercase letters,
                  numbers, and hyphens.
                </p>
              )}
            </div>

            {/* Campaign Status Toggle */}
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Administrative Status
              </label>
              <div className="flex items-center justify-between p-2.5 rounded-lg border border-border/60 bg-muted/20">
                <div className="space-y-0.5">
                  <span className="text-xs font-medium text-foreground">
                    {status === "active" ? "Active" : "Inactive"}
                  </span>
                  <p className="text-[11px] text-muted-foreground">
                    {status === "active"
                      ? "Coupon is active for usage."
                      : "Coupon is administratively paused."}
                  </p>
                </div>
                <Controller
                  name="status"
                  control={control}
                  render={({ field }) => (
                    <Switch
                      checked={field.value === "active"}
                      onCheckedChange={(checked) =>
                        field.onChange(checked ? "active" : "inactive")
                      }
                      disabled={isLoading || isSubmitting}
                    />
                  )}
                />
              </div>
            </div>

            {/* Description */}
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-foreground mb-1">
                Description / Staff Notes{" "}
                <span className="text-muted-foreground font-normal">
                  (Optional)
                </span>
              </label>
              <Textarea
                {...register("description")}
                placeholder="e.g. 25% discount for Monsoon campaign across all city outlets"
                rows={2}
                disabled={isLoading || isSubmitting}
                className="text-sm resize-none"
              />
              {errors.description && (
                <p className="text-[11px] text-destructive mt-1">
                  {errors.description.message}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Section 2: Discount Structure */}
        <div className="space-y-3">
          <div className="flex items-center justify-between border-b border-border/60 pb-1.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Percent className="w-3.5 h-3.5 text-primary" />
              Discount Structure
            </h4>
            {isUsed && (
              <span className="text-[11px] text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1">
                <Lock className="w-3 h-3" />
                Locked (Recorded usage: {couponToEdit?.usageCount})
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Discount Type Radio / Toggle Cards */}
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">
                Discount Type <span className="text-destructive">*</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={isUsed || isLoading || isSubmitting}
                  onClick={() =>
                    setValue("discountType", "percentage", {
                      shouldValidate: true,
                    })
                  }
                  className={`flex items-center justify-center gap-2 p-2.5 rounded-lg border text-xs font-medium transition-all ${
                    discountType === "percentage"
                      ? "border-primary bg-primary/10 text-primary font-semibold ring-1 ring-primary"
                      : "border-border/60 bg-card text-muted-foreground hover:bg-muted/30"
                  } ${isUsed ? "cursor-not-allowed opacity-75" : ""}`}
                >
                  <Percent className="w-4 h-4" />
                  Percentage (%)
                </button>

                <button
                  type="button"
                  disabled={isUsed || isLoading || isSubmitting}
                  onClick={() =>
                    setValue("discountType", "fixed", { shouldValidate: true })
                  }
                  className={`flex items-center justify-center gap-2 p-2.5 rounded-lg border text-xs font-medium transition-all ${
                    discountType === "fixed"
                      ? "border-primary bg-primary/10 text-primary font-semibold ring-1 ring-primary"
                      : "border-border/60 bg-card text-muted-foreground hover:bg-muted/30"
                  } ${isUsed ? "cursor-not-allowed opacity-75" : ""}`}
                >
                  <IndianRupee className="w-4 h-4" />
                  Fixed Amount (₹)
                </button>
              </div>
            </div>

            {/* Discount Value */}
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Discount Value <span className="text-destructive">*</span>
              </label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {discountType === "percentage" ? (
                    <Percent className="w-4 h-4" />
                  ) : (
                    <IndianRupee className="w-4 h-4" />
                  )}
                </div>
                <Input
                  type="number"
                  step="any"
                  {...register("discountValue", { valueAsNumber: true })}
                  disabled={isUsed || isLoading || isSubmitting}
                  placeholder={
                    discountType === "percentage" ? "e.g. 20" : "e.g. 500"
                  }
                  className={`pl-9 text-sm font-semibold ${isUsed ? "bg-muted cursor-not-allowed" : ""}`}
                />
              </div>
              {errors.discountValue ? (
                <p className="text-[11px] text-destructive mt-1">
                  {errors.discountValue.message}
                </p>
              ) : (
                <p className="text-[11px] text-muted-foreground mt-1">
                  {discountType === "percentage"
                    ? "Enter percentage (1% to 100%) deducted from eligible items."
                    : "Enter fixed amount in ₹ deducted from eligible total."}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Section 3: Campaign Validity Period */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 border-b border-border/60 pb-1.5">
            <Calendar className="w-3.5 h-3.5 text-primary" />
            Campaign Validity Period
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Valid From <span className="text-destructive">*</span>
              </label>
              <Input
                type="datetime-local"
                {...register("validFrom")}
                disabled={isLoading || isSubmitting}
                className="text-xs font-medium"
              />
              {errors.validFrom ? (
                <p className="text-[11px] text-destructive mt-1">
                  {errors.validFrom.message}
                </p>
              ) : (
                <p className="text-[11px] text-muted-foreground mt-1">
                  Start of coupon eligibility.
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Valid Until (Expiry) <span className="text-destructive">*</span>
              </label>
              <Input
                type="datetime-local"
                {...register("validUntil")}
                disabled={isLoading || isSubmitting}
                className="text-xs font-medium"
              />
              {errors.validUntil ? (
                <p className="text-[11px] text-destructive mt-1">
                  {errors.validUntil.message}
                </p>
              ) : (
                <p className="text-[11px] text-muted-foreground mt-1">
                  End of eligibility. Must be strictly after start date.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Section 4: Redemption & Usage Limits */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 border-b border-border/60 pb-1.5">
            <Users className="w-3.5 h-3.5 text-primary" />
            Redemption & Usage Limits
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Total Campaign Redemptions Limit */}
            <div className="p-3 rounded-lg border border-border/60 bg-card space-y-2.5">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-foreground">
                    Total Usage Cap
                  </span>
                  <p className="text-[11px] text-muted-foreground">
                    Maximum total claims for campaign
                  </p>
                </div>
                <Controller
                  name="enableTotalUsageLimit"
                  control={control}
                  render={({ field }) => (
                    <Switch
                      checked={Boolean(field.value)}
                      onCheckedChange={(checked) => {
                        field.onChange(checked);
                        if (!checked) setValue("totalUsageLimit", null);
                      }}
                      disabled={isLoading || isSubmitting}
                    />
                  )}
                />
              </div>

              {enableTotalUsageLimit && (
                <div className="pt-2 border-t border-border/40">
                  <Input
                    type="number"
                    min="1"
                    placeholder="e.g. 500 total redemptions"
                    {...register("totalUsageLimit", { valueAsNumber: true })}
                    disabled={isLoading || isSubmitting}
                    className="text-sm font-semibold"
                  />
                  {errors.totalUsageLimit && (
                    <p className="text-[11px] text-destructive mt-1">
                      {errors.totalUsageLimit.message}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Per-Customer Limit */}
            <div className="p-3 rounded-lg border border-border/60 bg-card space-y-2.5">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-foreground">
                    Per-Client Cap
                  </span>
                  <p className="text-[11px] text-muted-foreground">
                    Limit times one customer may redeem
                  </p>
                </div>
                <Controller
                  name="enablePerCustomerLimit"
                  control={control}
                  render={({ field }) => (
                    <Switch
                      checked={Boolean(field.value)}
                      onCheckedChange={(checked) => {
                        field.onChange(checked);
                        if (!checked) setValue("perCustomerLimit", null);
                      }}
                      disabled={isLoading || isSubmitting}
                    />
                  )}
                />
              </div>

              {enablePerCustomerLimit && (
                <div className="pt-2 border-t border-border/40">
                  <Input
                    type="number"
                    min="1"
                    placeholder="e.g. 1 per client"
                    {...register("perCustomerLimit", { valueAsNumber: true })}
                    disabled={isLoading || isSubmitting}
                    className="text-sm font-semibold"
                  />
                  {errors.perCustomerLimit && (
                    <p className="text-[11px] text-destructive mt-1">
                      {errors.perCustomerLimit.message}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Section 5: Branch Exclusions */}
        <div className="space-y-3">
          <div className="flex items-center justify-between border-b border-border/60 pb-1.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <GitBranch className="w-3.5 h-3.5 text-primary" />
              Branch Availability & Exclusions
            </h4>
            <span className="text-[11px] text-muted-foreground">
              {excludedBranchIds.length === 0
                ? "Available at all branches"
                : `${excludedBranchIds.length} branch(es) excluded`}
            </span>
          </div>

          <p className="text-xs text-muted-foreground">
            By default, promotional coupons are valid at all salon outlets.
            Select specific branches below if this campaign must{" "}
            <strong>not</strong> be redeemable there.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-48 overflow-y-auto p-1">
            {activeBranches.map((branch: Branch) => {
              const isExcluded = excludedBranchIds.includes(branch.id);
              return (
                <div
                  key={branch.id}
                  onClick={() => handleBranchToggle(branch.id)}
                  className={`flex items-center justify-between p-2.5 rounded-lg border text-xs cursor-pointer select-none transition-all ${
                    isExcluded
                      ? "border-amber-500/50 bg-amber-500/10 text-amber-900 dark:text-amber-200"
                      : "border-border/60 bg-card hover:bg-muted/40 text-foreground"
                  }`}
                >
                  <div className="truncate mr-2 font-medium">{branch.name}</div>
                  <div
                    className={`h-4 w-4 rounded flex items-center justify-center shrink-0 border ${
                      isExcluded
                        ? "bg-amber-500 text-white border-amber-600"
                        : "border-muted-foreground/30 bg-muted/20"
                    }`}
                  >
                    {isExcluded && <Check className="h-3 w-3" />}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Dialog Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-border/80">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleClose}
            disabled={isLoading || isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            size="sm"
            disabled={isLoading || isSubmitting}
            className="gap-2 font-semibold"
          >
            {isSubmitting || isLoading ? (
              <span className="animate-spin">⏳</span>
            ) : (
              <CheckCircle2 className="w-4 h-4" />
            )}
            {isEditMode ? "Save Changes" : "Create Coupon"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
