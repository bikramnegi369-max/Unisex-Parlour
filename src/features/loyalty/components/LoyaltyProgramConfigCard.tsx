"use client";

import React from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Settings, CheckCircle2, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { hasPermission } from "@/lib/permissions";
import { useLoyaltyProgram } from "../hooks/useLoyaltyQueries";
import { useUpdateLoyaltyProgram } from "../hooks/useLoyaltyMutations";
import {
  loyaltyProgramConfigSchema,
  type LoyaltyProgramConfigFormValues,
} from "../schemas/loyalty.schema";

export function LoyaltyProgramConfigCard() {
  const { user } = useAuth();
  const canConfigure = hasPermission(user, "loyalty.configure");

  const { data: config, isLoading, isError, refetch } = useLoyaltyProgram();
  const updateMutation = useUpdateLoyaltyProgram();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isDirty },
    reset,
  } = useForm<LoyaltyProgramConfigFormValues>({
    resolver: zodResolver(
      loyaltyProgramConfigSchema,
    ) as unknown as Resolver<LoyaltyProgramConfigFormValues>,
    defaultValues: {
      isEnabled: true,
      earnThresholdAmount: 100,
      earnPointsPerUnit: 1,
      redemptionRate: 1,
      minRedemptionPoints: 20,
      maxRedemptionPercentage: 20,
    },
    values: config
      ? {
          isEnabled: config.isEnabled,
          earnThresholdAmount: config.earnThresholdAmount,
          earnPointsPerUnit: config.earnPointsPerUnit,
          redemptionRate: config.redemptionRate,
          minRedemptionPoints: config.minRedemptionPoints,
          maxRedemptionPercentage: config.maxRedemptionPercentage,
        }
      : undefined,
  });

  const onSubmit = async (values: LoyaltyProgramConfigFormValues) => {
    if (!canConfigure) {
      toast.error(
        "You do not have permission to modify loyalty program settings.",
      );
      return;
    }

    try {
      await updateMutation.mutateAsync({
        isEnabled: values.isEnabled,
        earnThresholdAmount: values.earnThresholdAmount,
        earnPointsPerUnit: values.earnPointsPerUnit,
        redemptionRate: values.redemptionRate,
        minRedemptionPoints: values.minRedemptionPoints,
        maxRedemptionPercentage: values.maxRedemptionPercentage,
      });
      toast.success("Loyalty program configuration updated successfully.");
      reset(values);
    } catch (err: unknown) {
      const axiosError = err as {
        response?: { data?: { message?: string } };
        message?: string;
      };
      const msg =
        axiosError.response?.data?.message ||
        axiosError.message ||
        "Failed to update loyalty program configuration.";
      toast.error(msg);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 bg-card border border-border/80 rounded-2xl animate-pulse space-y-4">
        <div className="h-6 w-48 bg-muted rounded" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-10 bg-muted rounded" />
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-6 bg-card border border-border/80 rounded-2xl text-center space-y-3">
        <p className="text-xs text-muted-foreground">
          Unable to load loyalty program configuration or program has not been
          initialized.
        </p>
        <Button
          size="sm"
          variant="outline"
          onClick={() => refetch()}
          className="text-xs"
        >
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border/80 rounded-2xl p-5 shadow-2xs space-y-4">
      <div className="flex items-center justify-between border-b border-border/60 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-primary/10 text-primary rounded-xl">
            <Settings className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-foreground">
              Program Configuration
            </h2>
            <p className="text-xs text-muted-foreground">
              Define organization-wide point accrual rules, value ratios, and
              redemption limits.
            </p>
          </div>
        </div>

        {!canConfigure && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/50 px-2.5 py-1 rounded-lg">
            <ShieldAlert className="h-3.5 w-3.5 text-amber-500" />
            <span>Read-Only</span>
          </div>
        )}
      </div>

      {/* Backend Formula Explanation Banner */}
      <div className="p-3 bg-muted/30 border border-border/70 rounded-xl text-xs space-y-1">
        <span className="font-semibold text-foreground block">
          Earning Policy Formula:
        </span>
        <p className="text-muted-foreground text-[11px]">
          Points Earned ={" "}
          <code className="bg-muted px-1 py-0.5 rounded font-mono text-primary font-bold">
            floor(Eligible Spend / Earning Threshold) × Points Per Unit
          </code>
          . Subscription-covered portions do not earn loyalty points.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {/* Earning Threshold */}
          <div className="space-y-1.5">
            <label
              htmlFor="earnThresholdAmount"
              className="text-xs font-semibold text-foreground"
            >
              Earning Threshold (₹ Spend Unit)
            </label>
            <Input
              id="earnThresholdAmount"
              type="number"
              step="1"
              min="1"
              disabled={!canConfigure}
              {...register("earnThresholdAmount")}
              className="text-xs"
            />
            {errors.earnThresholdAmount && (
              <p className="text-[10px] text-destructive">
                {errors.earnThresholdAmount.message}
              </p>
            )}
            <p className="text-[10px] text-muted-foreground">
              Default: ₹100 eligible spend
            </p>
          </div>

          {/* Points Per Unit */}
          <div className="space-y-1.5">
            <label
              htmlFor="earnPointsPerUnit"
              className="text-xs font-semibold text-foreground"
            >
              Points Awarded Per Unit
            </label>
            <Input
              id="earnPointsPerUnit"
              type="number"
              step="1"
              min="0"
              disabled={!canConfigure}
              {...register("earnPointsPerUnit")}
              className="text-xs"
            />
            {errors.earnPointsPerUnit && (
              <p className="text-[10px] text-destructive">
                {errors.earnPointsPerUnit.message}
              </p>
            )}
            <p className="text-[10px] text-muted-foreground">
              Default: 1 point per threshold
            </p>
          </div>

          {/* Redemption Rate (₹ per point) */}
          <div className="space-y-1.5">
            <label
              htmlFor="redemptionRate"
              className="text-xs font-semibold text-foreground"
            >
              Redemption Rate (₹ Value / Pt)
            </label>
            <Input
              id="redemptionRate"
              type="number"
              step="any"
              min="0.01"
              disabled={!canConfigure}
              {...register("redemptionRate")}
              className="text-xs"
            />
            {errors.redemptionRate && (
              <p className="text-[10px] text-destructive">
                {errors.redemptionRate.message}
              </p>
            )}
            <p className="text-[10px] text-muted-foreground">
              Default: ₹1.00 per point
            </p>
          </div>

          {/* Min Points to Redeem */}
          <div className="space-y-1.5">
            <label
              htmlFor="minRedemptionPoints"
              className="text-xs font-semibold text-foreground"
            >
              Min Redemption Points
            </label>
            <Input
              id="minRedemptionPoints"
              type="number"
              min="1"
              step="1"
              disabled={!canConfigure}
              {...register("minRedemptionPoints")}
              className="text-xs"
            />
            {errors.minRedemptionPoints && (
              <p className="text-[10px] text-destructive">
                {errors.minRedemptionPoints.message}
              </p>
            )}
            <p className="text-[10px] text-muted-foreground">
              Default: 20 points minimum
            </p>
          </div>

          {/* Max Redemption Percentage */}
          <div className="space-y-1.5">
            <label
              htmlFor="maxRedemptionPercentage"
              className="text-xs font-semibold text-foreground"
            >
              Max Redemption Percentage (%)
            </label>
            <Input
              id="maxRedemptionPercentage"
              type="number"
              min="1"
              max="100"
              disabled={!canConfigure}
              {...register("maxRedemptionPercentage")}
              className="text-xs"
            />
            {errors.maxRedemptionPercentage && (
              <p className="text-[10px] text-destructive">
                {errors.maxRedemptionPercentage.message}
              </p>
            )}
            <p className="text-[10px] text-muted-foreground">
              Default: 20% max bill coverage
            </p>
          </div>
        </div>

        {/* Master Switch Toggle & Submit */}
        <div className="flex items-center justify-between pt-3 border-t border-border/60">
          <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
            <input
              type="checkbox"
              disabled={!canConfigure}
              {...register("isEnabled")}
              className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
            />
            <span className="font-semibold text-foreground">
              Enable Loyalty Program
            </span>
          </label>

          {canConfigure && (
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting || updateMutation.isPending || !isDirty}
              className="text-xs font-semibold gap-1.5"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              {isSubmitting || updateMutation.isPending
                ? "Saving..."
                : "Save Settings"}
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}
