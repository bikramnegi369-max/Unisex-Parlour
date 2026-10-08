"use client";

import React, { useState, useId } from "react";
import { toast } from "sonner";
import {
  KeyRound,
  Send,
  CheckCircle2,
  AlertCircle,
  Loader2,
  AlertTriangle,
  Info,
  Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSendSubscriptionOtp } from "../hooks/useSendSubscriptionOtp";
import { useRedeemSubscription } from "../hooks/useRedeemSubscription";
import { useAppointments } from "@/features/appointments/hooks/useAppointmentQueries";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { hasPermission } from "@/lib/permissions";
import type { Appointment } from "@/features/appointments/types/appointment.types";
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
  const { user } = useAuth();
  const componentInstanceId = useId();
  const canRedeem = hasPermission(user, "subscriptions.redeem");
  // Step 1: select quantities for entitlements with remainingQuantity > 0
  // Defensively resolve string ID and display name whether populated or string.
  type PopulatedService = { _id?: string; id?: string; name?: string };

  const resolveEntitlement = (
    ent: (typeof subscription.entitlements)[number],
    idx: number,
  ) => {
    const raw = ent.serviceId as unknown;
    const srvObj =
      typeof raw === "object" && raw !== null
        ? (raw as PopulatedService)
        : undefined;
    const resolvedId =
      srvObj?._id ||
      srvObj?.id ||
      (typeof ent.serviceId === "string" ? ent.serviceId : "") ||
      `ent-${idx}`;
    const resolvedName =
      ent.serviceName || srvObj?.name || `Service #${idx + 1}`;
    return { resolvedId, resolvedName };
  };

  const usableEntitlements = (subscription.entitlements || []).filter(
    (e) => e.remainingQuantity > 0,
  );

  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [isManual, setIsManual] = useState(false);
  const [reason, setReason] = useState("");
  const [otp, setOtp] = useState("");
  const [selectedAppointmentId, setSelectedAppointmentId] = useState(
    initialAppointmentId || "",
  );
  const [otpSent, setOtpSent] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const sendOtpMutation = useSendSubscriptionOtp();
  const redeemMutation = useRedeemSubscription();

  // Load customer appointments for convenient association rather than typing opaque IDs
  const customerId =
    typeof subscription.customerId === "string"
      ? subscription.customerId
      : subscription.customer?.id || "";

  const { data: appointmentsData } = useAppointments(
    customerId ? { customerId, limit: 20 } : { limit: 20 },
  );
  // Filter appointments: ensure belonging to customer and not in terminal states (completed/cancelled)
  const appointmentsList = (appointmentsData?.data || []).filter(
    (apt: Appointment) =>
      apt.status !== "completed" && apt.status !== "cancelled",
  );

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

  const handleRedeem = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    setValidationError(null);

    if (!canRedeem) {
      setValidationError(
        "You do not have permission to redeem subscription entitlements (subscriptions.redeem required).",
      );
      toast.error("Permission denied: subscriptions.redeem required.");
      return;
    }

    if (selectedServices.length === 0) {
      setValidationError("Please select at least 1 service unit to redeem");
      return;
    }

    if (isManual) {
      if (!reason.trim()) {
        setValidationError("A reason is mandatory for manual redemptions.");
        return;
      }
    } else {
      if (!otp.trim()) {
        setValidationError("Please enter the customer OTP");
        return;
      }
    }

    // Generate unique idempotency key to prevent double submissions
    const idempotencyKey = `manual-redeem-${subscription.id}-${Date.now()}-${componentInstanceId}`;

    try {
      await redeemMutation.mutateAsync({
        id: subscription.id,
        payload: {
          isManual,
          reason: isManual ? reason.trim() : undefined,
          otp: isManual ? undefined : otp.trim(),
          services: selectedServices,
          appointmentId: selectedAppointmentId.trim() || undefined,
          idempotencyKey,
        },
      });

      toast.success(
        isManual
          ? "Manual redemption recorded and audited successfully!"
          : "Subscription entitlements redeemed successfully via OTP!",
      );
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const errorObj = err as Record<string, unknown> | null;
      const responseObj = errorObj?.response as Record<string, unknown> | null;
      const msg =
        ((responseObj?.data as Record<string, unknown> | null)
          ?.message as string) ||
        (errorObj?.message as string) ||
        "Redemption failed. Please verify input and try again.";
      setValidationError(msg);
      toast.error(msg);
    }
  };

  return (
    <form onSubmit={handleRedeem} className="space-y-4">
      {/* Important Workflow Notice */}
      <div className="p-3 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-200 text-xs space-y-1">
        <div className="flex items-center gap-1.5 font-bold">
          <Info className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
          <span>Manual / Recovery Redemption Workflow</span>
        </div>
        <p className="text-[11px] leading-relaxed text-amber-800 dark:text-amber-300">
          Normal subscription usage occurs automatically when completing a scheduled appointment.
          Use this modal only for walk-in adjustments, non-appointment sessions, or administrative recovery.
        </p>
      </div>

      {!canRedeem && (
        <div className="p-3 rounded-xl border border-destructive/30 bg-destructive/10 text-destructive text-xs flex items-start gap-2">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Permission Restricted</p>
            <p className="text-[11px] text-destructive/90">
              You lack the <code className="font-mono bg-destructive/20 px-1 rounded">subscriptions.redeem</code> permission required to redeem entitlements.
            </p>
          </div>
        </div>
      )}

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
            {usableEntitlements.map((ent, idx) => {
              const { resolvedId, resolvedName } = resolveEntitlement(ent, idx);
              const currentQty = quantities[resolvedId] || 0;
              return (
                <div
                  key={resolvedId}
                  className="flex items-center justify-between p-2.5 rounded-lg border border-border bg-card text-xs"
                >
                  <div className="flex flex-col min-w-0 pr-2">
                    <span className="font-semibold text-foreground truncate">
                      {resolvedName}
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
                            resolvedId,
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
                            resolvedId,
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

      {/* Appointment Association (Searchable Selector + Custom input fallback) */}
      <div className="space-y-1.5">
        <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Link to Appointment (Optional)
        </label>
        {appointmentsList.length > 0 ? (
          <select
            value={selectedAppointmentId}
            onChange={(e) => setSelectedAppointmentId(e.target.value)}
            disabled={redeemMutation.isPending}
            className="w-full h-9 text-xs rounded-md border border-input bg-background px-2 text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="">-- No linked appointment (Standalone session) --</option>
            {appointmentsList.map((apt: Appointment) => (
              <option key={apt.id} value={apt.id}>
                {apt.appointmentCode || apt.id} • {apt.date} {apt.startTime} ({apt.status})
              </option>
            ))}
          </select>
        ) : (
          <div className="relative">
            <Input
              type="text"
              placeholder="e.g. apt_12345 (if linking to an appointment session)"
              value={selectedAppointmentId}
              onChange={(e) => setSelectedAppointmentId(e.target.value)}
              disabled={redeemMutation.isPending}
              className="h-9 text-xs pl-8"
            />
            <Calendar className="h-4 w-4 text-muted-foreground absolute left-2.5 top-2.5" />
          </div>
        )}
      </div>

      {/* Verification Mode Selector */}
      <div className="p-3 rounded-xl border border-border bg-muted/30 space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-foreground">
            Redemption Method
          </label>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-1.5 text-xs cursor-pointer">
              <input
                type="radio"
                name="verificationMode"
                checked={!isManual}
                onChange={() => {
                  setIsManual(false);
                  setValidationError(null);
                }}
                disabled={redeemMutation.isPending}
                className="text-primary"
              />
              <span>Customer SMS OTP</span>
            </label>
            <label className="flex items-center gap-1.5 text-xs cursor-pointer">
              <input
                type="radio"
                name="verificationMode"
                checked={isManual}
                onChange={() => {
                  setIsManual(true);
                  setValidationError(null);
                }}
                disabled={redeemMutation.isPending}
                className="text-amber-600"
              />
              <span className="font-semibold text-amber-700 dark:text-amber-400">
                Staff Override (Manual)
              </span>
            </label>
          </div>
        </div>

        {/* Branch 1: Manual Reason Input */}
        {isManual ? (
          <div className="space-y-2 pt-2 border-t border-border/60">
            <div className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              <span className="font-semibold">
                Audit Trail Notice: Manual redemption bypasses OTP and requires justification.
              </span>
            </div>
            <div className="space-y-1">
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Reason / Note <span className="text-destructive">*</span>
              </label>
              <textarea
                placeholder="Explain why manual override is being performed (e.g. customer phone unavailable, network outage, manager approved)..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                maxLength={1000}
                rows={3}
                disabled={redeemMutation.isPending}
                className="w-full text-xs rounded-md border border-input bg-background p-2 text-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none"
              />
              <span className="text-[10px] text-muted-foreground block text-right">
                {reason.length} / 1000 chars
              </span>
            </div>
          </div>
        ) : (
          /* Branch 2: Standard OTP Flow */
          <div className="space-y-3 pt-2 border-t border-border/60">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-primary" />
                <span className="text-xs font-medium text-foreground">
                  Send one-time password to customer
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
                    Enter Verification OTP <span className="text-destructive">*</span>
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
            !canRedeem ||
            redeemMutation.isPending ||
            totalSelectedUnits === 0 ||
            (isManual ? !reason.trim() : !otpSent || !otp.trim())
          }
          className={`h-9 text-xs cursor-pointer gap-1.5 ${
            isManual
              ? "bg-amber-600 hover:bg-amber-700 text-white"
              : ""
          }`}
        >
          {redeemMutation.isPending && (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          )}
          {isManual ? "Submit Manual Redemption" : "Complete Redemption"}
        </Button>
      </div>
    </form>
  );
}
