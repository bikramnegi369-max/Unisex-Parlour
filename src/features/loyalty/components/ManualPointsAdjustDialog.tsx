"use client";

import React, { useId, useState } from "react";
import { useForm, useWatch, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAdjustCustomerLoyaltyPoints } from "../hooks/useLoyaltyMutations";
import {
  manualPointsAdjustSchema,
  type ManualPointsAdjustFormValues,
} from "../schemas/loyalty.schema";

interface ManualPointsAdjustDialogProps {
  isOpen: boolean;
  onClose: () => void;
  customerId: string;
  customerName: string;
  currentPoints: number;
  currentDebt?: number;
}

function generateIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `adj-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function ManualPointsAdjustDialog({
  isOpen,
  onClose,
  customerId,
  customerName,
  currentPoints,
  currentDebt = 0,
}: ManualPointsAdjustDialogProps) {
  const mutation = useAdjustCustomerLoyaltyPoints();
  const formComponentId = useId();
  // Generate a fresh idempotency key per dialog open session
  const [idempotencyKey, setIdempotencyKey] = useState<string>(generateIdempotencyKey);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ManualPointsAdjustFormValues>({
    resolver: zodResolver(manualPointsAdjustSchema) as unknown as Resolver<ManualPointsAdjustFormValues>,
    defaultValues: {
      operation: "CREDIT",
      points: 10,
      reason: "",
    },
  });

  const selectedOperation = useWatch({ control, name: "operation" });
  const enteredPoints = useWatch({ control, name: "points" }) || 0;

  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingValues, setPendingValues] = useState<ManualPointsAdjustFormValues | null>(null);

  const handleClose = () => {
    reset();
    setShowConfirm(false);
    setPendingValues(null);
    setIdempotencyKey(generateIdempotencyKey());
    onClose();
  };

  const handleInitialSubmit = (values: ManualPointsAdjustFormValues) => {
    // Frontend safety check: prevent debits greater than spendable points
    if (values.operation === "DEBIT" && values.points > currentPoints) {
      toast.error(
        `Cannot debit ${values.points} points. Customer only has ${currentPoints} spendable points.`
      );
      return;
    }
    setPendingValues(values);
    setShowConfirm(true);
  };

  const handleConfirmedSubmit = async () => {
    if (!pendingValues) return;
    try {
      const response = await mutation.mutateAsync({
        customerId,
        payload: {
          operation: pendingValues.operation,
          points: pendingValues.points,
          reason: pendingValues.reason.trim(),
          idempotencyKey,
        },
      });

      if (response?.isIdempotentReplay) {
        toast.info(
          `Adjustment of ${pendingValues.points} points already processed (idempotent replay).`
        );
      } else {
        toast.success(
          `Successfully ${pendingValues.operation === "CREDIT" ? "credited" : "debited"} ${pendingValues.points} loyalty points.`
        );
      }
      handleClose();
    } catch (err: unknown) {
      const axiosError = err as {
        response?: { data?: { message?: string } };
        message?: string;
      };
      const msg =
        axiosError.response?.data?.message ||
        axiosError.message ||
        "Failed to adjust loyalty points.";
      toast.error(msg);
      setShowConfirm(false);
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={handleClose}
      title={`Adjust Loyalty Points — ${customerName}`}
      className="max-w-md"
    >
      {showConfirm && pendingValues ? (
        <div className="space-y-4">
          <div className="p-4 bg-muted/50 rounded-xl border border-border space-y-3 text-xs">
            <h4 className="font-semibold text-foreground text-sm">
              Confirm Loyalty Adjustment
            </h4>
            <p className="text-muted-foreground">
              Please double check the details below. This action updates financial and loyalty ledgers and cannot be automatically undone.
            </p>
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border">
              <div>
                <span className="text-muted-foreground block text-[11px]">Operation:</span>
                <span className={`font-bold uppercase ${pendingValues.operation === "CREDIT" ? "text-emerald-600" : "text-destructive"}`}>
                  {pendingValues.operation}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[11px]">Points:</span>
                <span className="font-bold text-foreground">{pendingValues.points} pts</span>
              </div>
              <div className="col-span-2 pt-1">
                <span className="text-muted-foreground block text-[11px]">Customer:</span>
                <span className="font-medium text-foreground">{customerName}</span>
              </div>
              <div className="col-span-2 pt-1">
                <span className="text-muted-foreground block text-[11px]">Reason:</span>
                <span className="font-medium text-foreground italic">{pendingValues.reason}</span>
              </div>
            </div>
            {pendingValues.operation === "DEBIT" && (
              <div className="p-2.5 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-[11px]">
                <strong>Warning:</strong> You are deducting <strong>{pendingValues.points} points</strong> from this customer&apos;s balance.
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowConfirm(false)}
              disabled={mutation.isPending}
              className="text-xs"
            >
              Back to Edit
            </Button>
            <Button
              type="button"
              variant={pendingValues.operation === "DEBIT" ? "destructive" : "default"}
              size="sm"
              onClick={handleConfirmedSubmit}
              disabled={mutation.isPending}
              className="text-xs font-semibold"
            >
              {mutation.isPending ? "Applying..." : "Confirm & Apply"}
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit(handleInitialSubmit)} className="space-y-4">
          {/* Customer Balance Summary */}
          <div className="p-3 bg-muted/40 rounded-xl border border-border text-xs space-y-1.5">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Current Spendable Points:</span>
              <span className="font-bold text-foreground">{currentPoints} pts</span>
            </div>
            {currentDebt > 0 && (
              <div className="flex justify-between text-amber-700 dark:text-amber-400 font-semibold">
                <span>Outstanding Debt:</span>
                <span>{currentDebt} pts</span>
              </div>
            )}
            {selectedOperation === "CREDIT" && currentDebt > 0 && (
              <p className="text-[10px] text-amber-800 dark:text-amber-300 pt-1 border-t border-border/60">
                Note: Crediting points will first offset outstanding debt before increasing spendable balance.
              </p>
            )}
          </div>

          {/* Adjustment Type Selection */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">
              Operation
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label
                className={`flex items-center justify-center p-2.5 rounded-lg border text-xs font-medium cursor-pointer transition-colors ${
                  selectedOperation === "CREDIT"
                    ? "bg-primary/10 border-primary text-primary font-bold"
                    : "border-border bg-card text-muted-foreground hover:bg-muted"
                }`}
              >
                <input
                  type="radio"
                  value="CREDIT"
                  {...register("operation")}
                  className="sr-only"
                />
                Credit (Add Points)
              </label>
              <label
                className={`flex items-center justify-center p-2.5 rounded-lg border text-xs font-medium cursor-pointer transition-colors ${
                  selectedOperation === "DEBIT"
                    ? "bg-destructive/10 border-destructive text-destructive font-bold"
                    : "border-border bg-card text-muted-foreground hover:bg-muted"
                }`}
              >
                <input
                  type="radio"
                  value="DEBIT"
                  {...register("operation")}
                  className="sr-only"
                />
                Debit (Deduct Points)
              </label>
            </div>
            {errors.operation && (
              <p className="text-[10px] text-destructive">{errors.operation.message}</p>
            )}
          </div>

          {/* Points Input */}
          <div className="space-y-1.5">
            <label
              htmlFor={`${formComponentId}-points`}
              className="text-xs font-semibold text-foreground"
            >
              Number of Points
            </label>
            <Input
              id={`${formComponentId}-points`}
              type="number"
              min="1"
              step="1"
              {...register("points")}
              className="text-xs"
            />
            {errors.points && (
              <p className="text-[10px] text-destructive">{errors.points.message}</p>
            )}
            {selectedOperation === "DEBIT" && enteredPoints > currentPoints && (
              <p className="text-[10px] text-destructive font-medium">
                Points to deduct exceed available spendable points ({currentPoints}).
              </p>
            )}
          </div>

          {/* Mandatory Reason Input */}
          <div className="space-y-1.5">
            <label
              htmlFor={`${formComponentId}-reason`}
              className="text-xs font-semibold text-foreground"
            >
              Reason for Adjustment <span className="text-destructive">*</span>
            </label>
            <Textarea
              id={`${formComponentId}-reason`}
              rows={2}
              placeholder="e.g., Promotional goodwill credit, manual correction, etc."
              {...register("reason")}
              className="text-xs resize-none"
            />
            {errors.reason && (
              <p className="text-[10px] text-destructive">{errors.reason.message}</p>
            )}
          </div>

          {/* Dialog Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleClose}
              disabled={isSubmitting || mutation.isPending}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={
                isSubmitting ||
                mutation.isPending ||
                (selectedOperation === "DEBIT" && enteredPoints > currentPoints)
              }
              className="text-xs font-semibold"
            >
              Review Adjustment
            </Button>
          </div>
        </form>
      )}
    </Dialog>
  );
}
