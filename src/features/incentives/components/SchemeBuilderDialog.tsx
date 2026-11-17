"use client";

import React, { useEffect, useMemo } from "react";
import { useForm, useFieldArray, useWatch, Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";
import {
  schemeFormSchema,
  SchemeFormValues,
} from "../schemas/incentives.schema";
import {
  CreateIncentiveSchemeRequest,
  IncentiveScheme,
} from "../types/incentives.types";

interface SchemeBuilderDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (values: CreateIncentiveSchemeRequest) => Promise<void>;
  initialData?: IncentiveScheme | null;
  isSubmitting?: boolean;
}

export const SchemeBuilderDialog: React.FC<SchemeBuilderDialogProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  isSubmitting = false,
}) => {
  const isEditing = Boolean(initialData);

  const defaultValues = useMemo<Partial<SchemeFormValues>>(
    () => ({
      name: initialData?.name || "",
      code: initialData?.code || "",
      description: initialData?.description || "",
      schemeType: initialData?.schemeType === "ATTENDANCE_BONUS" ? "ATTENDANCE_BONUS" : "COMMISSION",
      calculationBasis:
        initialData?.schemeType === "ATTENDANCE_BONUS"
          ? "ATTENDANCE_DAYS"
          : initialData?.calculationBasis === "SUBSCRIPTION_NET_REVENUE" ||
              initialData?.calculationBasis === "MEMBERSHIP_NET_REVENUE" ||
              initialData?.calculationBasis === "PRODUCT_NET_REVENUE"
            ? initialData.calculationBasis
            : "SERVICE_NET_REVENUE",
      fixedAmountRupees: (initialData?.rules?.fixedAmountPaise || 0) / 100,
      minimumAttendanceDays: initialData?.rules?.minimumAttendanceDays || 0,
      tiers: (initialData?.rules?.tiers || []).map((t) => ({
        minRupees: t.minPaise / 100,
        maxRupees: t.maxPaise !== null && t.maxPaise !== undefined ? t.maxPaise / 100 : null,
        percentage: t.percentage,
        fixedRupees: t.fixedPaise / 100,
      })),
    }),
    [initialData],
  );

  const {
    register,
    setValue,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<SchemeFormValues>({
    resolver: zodResolver(schemeFormSchema) as unknown as Resolver<SchemeFormValues>,
    defaultValues,
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "tiers",
  });
  const selectedSchemeType = useWatch({ control, name: "schemeType" });
  const selectedCalculationBasis = useWatch({ control, name: "calculationBasis" });
  const commissionCategoryLabel =
    selectedCalculationBasis === "SUBSCRIPTION_NET_REVENUE"
      ? "subscription sale"
      : selectedCalculationBasis === "MEMBERSHIP_NET_REVENUE"
        ? "membership sale"
        : selectedCalculationBasis === "PRODUCT_NET_REVENUE"
          ? "retail product sale"
        : "service";

  useEffect(() => {
    if (isOpen) {
      reset(defaultValues);
    }
  }, [defaultValues, isOpen, reset]);

  const handleFormSubmit = async (data: SchemeFormValues) => {
    const identity = {
      name: data.name,
      code: data.code,
      description: data.description || "",
    };
    const fixedAmountPaise = Math.round(Number(data.fixedAmountRupees || 0) * 100);
    if (data.schemeType === "ATTENDANCE_BONUS") {
      await onSubmit({
        ...identity,
        schemeType: "ATTENDANCE_BONUS",
        calculationBasis: "ATTENDANCE_DAYS",
        rules: {
          fixedAmountPaise,
          minimumAttendanceDays: Number(data.minimumAttendanceDays),
          tiers: [],
        },
      });
      return;
    }
    if (data.calculationBasis === "ATTENDANCE_DAYS") {
      throw new Error("Commission schemes cannot use an attendance-day basis.");
    }

    const payload: CreateIncentiveSchemeRequest = {
      ...identity,
      schemeType: "COMMISSION",
      calculationBasis: data.calculationBasis,
      rules: {
        fixedAmountPaise,
        tiers: (data.tiers || []).map((t) => ({
          minPaise: Math.round(Number(t.minRupees || 0) * 100),
          maxPaise: t.maxRupees == null ? null : Math.round(t.maxRupees * 100),
          percentage: Number(t.percentage || 0),
          fixedPaise: Math.round(Number(t.fixedRupees || 0) * 100),
        })),
      },
    };

    await onSubmit(payload);
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? "Edit Incentive Scheme" : "Create Incentive Scheme"}
      maxWidth="2xl"
    >
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-bold text-zinc-900">
            {isEditing ? "Edit Incentive Scheme" : "Create Incentive Scheme"}
          </h3>
          <p className="text-xs text-muted-foreground">
            Configure service, subscription-sale, membership-sale, or retail-sale commissions, or a
            biometric-verified attendance bonus. Subscription renewal/redemption,
            revenue-target, and service-count awards are not enabled. All amounts are stored in
            integer paise.
          </p>
        </div>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-5">
          {/* General Information */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b pb-1">
              1. General Information
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-zinc-700">Scheme Name *</label>
                <Input
                  placeholder="e.g. Senior Stylist Commission 10%"
                  {...register("name")}
                />
                {errors.name && (
                  <p className="text-[11px] text-destructive">{errors.name.message}</p>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-zinc-700">Scheme Code *</label>
                <Input
                  disabled={isEditing}
                  placeholder="e.g. STYLIST_COMM_10"
                  className="uppercase font-mono text-xs"
                  {...register("code")}
                />
                {errors.code && (
                  <p className="text-[11px] text-destructive">{errors.code.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-zinc-700">Description</label>
              <Textarea
                rows={2}
                placeholder="Optional description of the incentive rules..."
                {...register("description")}
              />
            </div>
          </div>

          {/* Scheme Type & Basis */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b pb-1">
              2. Incentive Type & Category
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-zinc-700">Scheme Type *</label>
                <Select
                  disabled={isEditing}
                  {...register("schemeType", {
                    onChange: (event) => {
                      const attendance = event.target.value === "ATTENDANCE_BONUS";
                      setValue(
                        "calculationBasis",
                        attendance ? "ATTENDANCE_DAYS" : "SERVICE_NET_REVENUE",
                      );
                      if (attendance) setValue("tiers", []);
                    },
                  })}
                >
                  <option value="COMMISSION">Revenue Commission</option>
                  <option value="ATTENDANCE_BONUS">Attendance Bonus</option>
                </Select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-zinc-700">Commission category *</label>
                <Select
                  disabled={isEditing || selectedSchemeType === "ATTENDANCE_BONUS"}
                  {...register("calculationBasis")}
                >
                  {selectedSchemeType === "ATTENDANCE_BONUS" ? (
                    <option value="ATTENDANCE_DAYS">Verified Attendance Days</option>
                  ) : (
                    <>
                      <option value="SERVICE_NET_REVENUE">Service sale</option>
                      <option value="SUBSCRIPTION_NET_REVENUE">Subscription sale / upsell</option>
                      <option value="MEMBERSHIP_NET_REVENUE">Membership sale</option>
                      <option value="PRODUCT_NET_REVENUE">Retail product sale</option>
                    </>
                  )}
                </Select>
                <p className="text-[11px] text-muted-foreground">
                  {selectedSchemeType === "ATTENDANCE_BONUS"
                    ? "Attendance basis is set by the selected scheme type."
                    : isEditing
                      ? "Category is fixed when the scheme is created."
                      : "Each category has its own rules and assignment. Retail commission requires paid invoices and recorded stock issue; renewals and redemptions are not included."}
                </p>
              </div>
            </div>
          </div>

          {selectedSchemeType === "ATTENDANCE_BONUS" ? (
            <div className="space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b pb-1">
                3. Verified Attendance Rule
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-zinc-700">Minimum verified days *</label>
                  <Input type="number" step="1" min="1" max="31" {...register("minimumAttendanceDays")} />
                  {errors.minimumAttendanceDays && (
                    <p className="text-[11px] text-destructive">{errors.minimumAttendanceDays.message}</p>
                  )}
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-zinc-700">Fixed attendance bonus (₹) *</label>
                  <Input type="number" step="0.01" min="0.01" {...register("fixedAmountRupees")} />
                  {errors.fixedAmountRupees && (
                    <p className="text-[11px] text-destructive">{errors.fixedAmountRupees.message}</p>
                  )}
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Incomplete or disputed attendance blocks finalization. Approved leave is separate;
                a verified half-day leave exception contributes 0.5 day. Finalization adds an
                immutable ledger accrual; payroll includes finalized amounts, while payment still
                requires settlement evidence.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-zinc-700">
                  Base fixed commission per eligible {commissionCategoryLabel} line (₹)
                </label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  {...register("fixedAmountRupees")}
                />
                {errors.fixedAmountRupees && (
                  <p className="text-[11px] text-destructive">{errors.fixedAmountRupees.message}</p>
                )}
                <p className="text-[11px] text-muted-foreground">
                  Added once per eligible {commissionCategoryLabel} line when the configured tier does not match or has no percentage/fixed award.
                </p>
              </div>

              <div className="flex items-center justify-between border-b pb-1">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Graduated commission tiers
                </h4>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    append({ minRupees: 0, maxRupees: null, percentage: 5, fixedRupees: 0 })
                  }
                  className="h-7 text-xs gap-1"
                >
                  <Plus className="w-3 h-3" /> Add Tier
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground">
                The matching tier uses the attributed net revenue for one eligible {commissionCategoryLabel} line.
                Its percentage and tier fixed amount are added to the base fixed commission.
              </p>
              {selectedCalculationBasis === "SERVICE_NET_REVENUE" ? (
                <p className="text-[11px] text-muted-foreground">
                  Service commission requires full invoice payment and verified physical fulfillment.
                </p>
              ) : (
                <p className="text-[11px] text-muted-foreground">
                  Sale commission requires the invoice to be fully paid and the subscription or membership
                  to be issued. It uses line net after allocated discounts, before tax, and requires a
                  recorded Sold by staff member. Unallocated loyalty discounts block accrual.
                </p>
              )}

              {fields.length === 0 ? (
                <div className="p-3 rounded-lg border border-dashed text-center text-xs text-muted-foreground">
                  No tiers configured. Add a tier to set revenue thresholds and commission rates.
                </div>
              ) : (
                <div className="space-y-2">
                  {fields.map((field, idx) => (
                    <div
                      key={field.id}
                      className="p-2.5 bg-zinc-50 border rounded-lg grid grid-cols-1 sm:grid-cols-12 gap-2 items-end text-xs"
                    >
                      <div className="sm:col-span-3 space-y-1">
                        <label className="text-[11px] text-zinc-600 font-medium" htmlFor={`tier-${idx}-min`}>Minimum line revenue (₹)</label>
                        <Input
                          id={`tier-${idx}-min`}
                          type="number"
                          step="0.01"
                          min="0"
                          {...register(`tiers.${idx}.minRupees` as const)}
                        />
                        {errors.tiers?.[idx]?.minRupees && (
                          <p className="text-[11px] text-destructive">{errors.tiers[idx]?.minRupees?.message}</p>
                        )}
                      </div>
                      <div className="sm:col-span-3 space-y-1">
                        <label className="text-[11px] text-zinc-600 font-medium" htmlFor={`tier-${idx}-max`}>Maximum line revenue (₹)</label>
                        <Input
                          id={`tier-${idx}-max`}
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="Blank = no upper limit"
                          aria-label={`Tier ${idx + 1} maximum line revenue in rupees`}
                          {...register(`tiers.${idx}.maxRupees` as const)}
                        />
                        {errors.tiers?.[idx]?.maxRupees && (
                          <p className="text-[11px] text-destructive">{errors.tiers[idx]?.maxRupees?.message}</p>
                        )}
                      </div>
                      <div className="sm:col-span-2 space-y-1">
                        <label className="text-[11px] text-zinc-600 font-medium" htmlFor={`tier-${idx}-percentage`}>Commission rate (%)</label>
                        <Input
                          id={`tier-${idx}-percentage`}
                          type="number"
                          step="0.01"
                          min="0"
                          max="100"
                          {...register(`tiers.${idx}.percentage` as const)}
                        />
                        {errors.tiers?.[idx]?.percentage && (
                          <p className="text-[11px] text-destructive">{errors.tiers[idx]?.percentage?.message}</p>
                        )}
                      </div>
                      <div className="sm:col-span-3 space-y-1">
                        <label className="text-[11px] text-zinc-600 font-medium" htmlFor={`tier-${idx}-fixed`}>Additional fixed commission (₹)</label>
                        <Input
                          id={`tier-${idx}-fixed`}
                          type="number"
                          step="0.01"
                          min="0"
                          {...register(`tiers.${idx}.fixedRupees` as const)}
                        />
                        {errors.tiers?.[idx]?.fixedRupees && (
                          <p className="text-[11px] text-destructive">{errors.tiers[idx]?.fixedRupees?.message}</p>
                        )}
                      </div>
                      <div className="sm:col-span-1 flex justify-end">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label={`Remove tier ${idx + 1}`}
                          onClick={() => remove(idx)}
                          className="text-destructive hover:bg-destructive/10 h-8 w-8"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-3 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : isEditing ? "Update Scheme" : "Save as Draft"}
            </Button>
          </div>
        </form>
      </div>
    </Dialog>
  );
};
