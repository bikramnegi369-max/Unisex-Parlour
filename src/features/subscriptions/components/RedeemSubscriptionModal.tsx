"use client";

import React, { useState } from "react";
import { toast } from "sonner";
import {
  KeyRound,
  Send,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSendSubscriptionOtp } from "../hooks/useSendSubscriptionOtp";
import { useRedeemSubscription } from "../hooks/useRedeemSubscription";
import type { Subscription } from "../types/subscription.types";

interface RedeemSubscriptionModalProps {
  subscription: Subscription;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialAppointmentId?: string;
}

export function RedeemSubscriptionModal({
  subscription,
  isOpen,
  onClose,
  onSuccess,
  initialAppointmentId,
}: RedeemSubscriptionModalProps) {
  // Step 1: select quantities for entitlements with remainingQuantity > 0
  const usableEntitlements = (subscription.entitlements || []).filter(
    (e) => e.remainingQuantity > 0,
  );

  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [otp, setOtp] = useState("");
  const [appointmentId, setAppointmentId] = useState(
    initialAppointmentId || "",
  );
  const [otpSent, setOtpSent] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const sendOtpMutation = useSendSubscriptionOtp();
  const redeemMutation = useRedeemSubscription();

  if (!isOpen) return null;

  const handleQuantityChange = (
    serviceId: string,
    val: number,
    max: number,
  ) => {
    setValidationError(null);
    const clamped = Math.max(0, Math.min(val, max));
    setQuantities((prev) => ({
      ...prev,
      [serviceId]: clamped,
    }));
  };

  const selectedServices = Object.entries(quantities)
    .filter(([, qty]) => qty > 0)
    .map(([serviceId, quantity]) => ({ serviceId, quantity }));

  const totalSelectedUnits = selectedServices.reduce(
    (sum, s) => sum + s.quantity,
    0,
  );

  const handleSendOtp = async () => {
    setValidationError(null);
    if (selectedServices.length === 0) {
      setValidationError("Please select at least 1 service unit to redeem");
      return;
    }

    try {
      await sendOtpMutation.mutateAsync(subscription.id);
      setOtpSent(true);
      toast.success("Customer OTP sent successfully via SMS.");
    } catch (err: unknown) {
      const errorObj = err as Record<string, unknown> | null;
      const responseObj = errorObj?.response as Record<string, unknown> | null;
      const msg =
        ((responseObj?.data as Record<string, unknown> | null)
          ?.message as string) ||
        (errorObj?.message as string) ||
        "Failed to send customer OTP.";
      setValidationError(msg);
      toast.error(msg);
    }
  };

  const handleRedeem = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (selectedServices.length === 0) {
      setValidationError("Please select at least 1 service unit to redeem");
      return;
    }

    if (!otp.trim()) {
      setValidationError("Please enter the customer OTP");
      return;
    }

    try {
      await redeemMutation.mutateAsync({
        id: subscription.id,
        payload: {
          otp: otp.trim(),
          services: selectedServices,
          appointmentId: appointmentId.trim() || undefined,
        },
      });

      toast.success("Subscription entitlements redeemed successfully!");
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const errorObj = err as Record<string, unknown> | null;
      const responseObj = errorObj?.response as Record<string, unknown> | null;
      const msg =
        ((responseObj?.data as Record<string, unknown> | null)
          ?.message as string) ||
        (errorObj?.message as string) ||
        "Redemption failed. Please verify the OTP and try again.";
      setValidationError(msg);
      toast.error(msg);
    }
  };

  return (
    <form onSubmit={handleRedeem} className="space-y-4">
      {/* Step 1: Select services & quantity */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Available Service Entitlements
          </label>
          {totalSelectedUnits > 0 && (
            <span className="text-xs font-bold text-primary">
              {totalSelectedUnits} {totalSelectedUnits === 1 ? "unit" : "units"}{" "}
              selected
            </span>
          )}
        </div>

        {usableEntitlements.length === 0 ? (
          <div className="p-4 text-center text-xs text-muted-foreground bg-muted/40 rounded-xl">
            No service entitlements remaining to redeem.
          </div>
        ) : (
          <div className="space-y-2 max-h-56 overflow-y-auto p-1 scrollbar-thin">
            {usableEntitlements.map((ent) => {
              const currentQty = quantities[ent.serviceId] || 0;
              return (
                <div
                  key={ent.serviceId}
                  className="flex items-center justify-between p-2.5 rounded-lg border border-border bg-card text-xs"
                >
                  <div className="flex flex-col min-w-0 pr-2">
                    <span className="font-semibold text-foreground truncate">
                      {ent.serviceName || ent.serviceId}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      Remaining:{" "}
                      <strong className="text-primary">
                        {ent.remainingQuantity}
                      </strong>{" "}
                      of {ent.totalQuantity}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <label className="text-[10px] font-semibold text-muted-foreground uppercase">
                      Qty:
                    </label>
                    <div className="flex items-center border border-input rounded-md overflow-hidden bg-background">
                      <button
                        type="button"
                        aria-label="Decrease quantity"
                        onClick={() =>
                          handleQuantityChange(
                            ent.serviceId,
                            currentQty - 1,
                            ent.remainingQuantity,
                          )
                        }
                        disabled={currentQty <= 0 || redeemMutation.isPending}
                        className="px-2 py-1 text-xs hover:bg-muted font-bold disabled:opacity-30 cursor-pointer"
                      >
                        -
                      </button>
                      <span className="px-2 text-xs font-semibold text-center min-w-6">
                        {currentQty}
                      </span>
                      <button
                        type="button"
                        aria-label="Increase quantity"
                        onClick={() =>
                          handleQuantityChange(
                            ent.serviceId,
                            currentQty + 1,
                            ent.remainingQuantity,
                          )
                        }
                        disabled={
                          currentQty >= ent.remainingQuantity ||
                          redeemMutation.isPending
                        }
                        className="px-2 py-1 text-xs hover:bg-muted font-bold disabled:opacity-30 cursor-pointer"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Optional Appointment ID linkage */}
      <div className="space-y-1">
        <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Appointment ID (Optional)
        </label>
        <Input
          type="text"
          placeholder="e.g. apt_12345 (if linking to an appointment session)"
          value={appointmentId}
          onChange={(e) => setAppointmentId(e.target.value)}
          disabled={redeemMutation.isPending}
          className="h-9 text-xs"
        />
      </div>

      {/* Step 2 & 3: OTP Verification */}
      <div className="p-3 rounded-xl border border-primary/20 bg-primary/5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-primary" />
            <span className="text-xs font-bold text-foreground">
              Customer SMS Verification
            </span>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleSendOtp}
            disabled={sendOtpMutation.isPending || totalSelectedUnits === 0}
            className="h-8 text-xs gap-1 border-primary/30 hover:bg-primary/10 text-primary cursor-pointer"
          >
            {sendOtpMutation.isPending ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Send className="h-3 w-3" />
            )}
            {otpSent ? "Resend OTP" : "Send Customer OTP"}
          </Button>
        </div>

        {otpSent && (
          <div className="space-y-2 animate-in fade-in duration-200">
            <div className="text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-medium">
              <CheckCircle2 className="h-3.5 w-3.5" />
              OTP has been sent to customer{" "}
              {subscription.customer?.phone
                ? `(${subscription.customer.phone})`
                : ""}
              .
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Enter Verification OTP{" "}
                <span className="text-destructive">*</span>
              </label>
              <Input
                type="text"
                placeholder="Enter 4-6 digit SMS OTP..."
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                maxLength={8}
                disabled={redeemMutation.isPending}
                className="h-9 text-xs font-mono tracking-widest"
              />
            </div>
          </div>
        )}
      </div>

      {validationError && (
        <div className="p-2.5 rounded-lg bg-destructive/10 text-destructive text-xs flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{validationError}</span>
        </div>
      )}

      {/* Modal Actions */}
      <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onClose}
          disabled={redeemMutation.isPending}
          className="h-9 text-xs cursor-pointer"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          size="sm"
          disabled={
            redeemMutation.isPending ||
            totalSelectedUnits === 0 ||
            !otpSent ||
            !otp.trim()
          }
          className="h-9 text-xs cursor-pointer gap-1.5"
        >
          {redeemMutation.isPending && (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          )}
          Complete Redemption
        </Button>
      </div>
    </form>
  );
}
