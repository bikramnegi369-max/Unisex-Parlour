"use client";

import React, { useState, useEffect, useRef } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { OtpInput } from "@/features/auth/components/OtpInput";
import { maskPhoneNumber } from "@/lib/formatters";
import {
  useRequestConsumptionOtp,
  useCompleteWithSubscription,
} from "../hooks/useAppointments";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { hasPermission } from "@/lib/permissions";
import { toast } from "sonner";
import { ShieldCheck, KeyRound, Loader2, RefreshCw, AlertCircle } from "lucide-react";
import { getUnredeemedSubscriptionServices } from "../utils/appointmentSubscription";
import type { Appointment } from "../types/appointment.types";

export interface SubscriptionVerificationModalProps {
  appointment: Appointment | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

type VerificationStep = "prompt" | "otp";

export function SubscriptionVerificationModal({
  appointment,
  isOpen,
  onClose,
  onSuccess,
}: SubscriptionVerificationModalProps) {
  const { user } = useAuth();
  const [step, setStep] = useState<VerificationStep>("prompt");
  const [otp, setOtp] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Dynamic countdown states from backend contract
  const [expiresIn, setExpiresIn] = useState<number>(0);
  const [resendAfter, setResendAfter] = useState<number>(0);

  const requestOtpMutation = useRequestConsumptionOtp();
  const completeMutation = useCompleteWithSubscription();

  // Reset state whenever modal is opened
  const prevIsOpenRef = useRef(isOpen);
  useEffect(() => {
    if (isOpen && !prevIsOpenRef.current) {
      setStep("prompt");
      setOtp("");
      setErrorMessage(null);
      setExpiresIn(0);
      setResendAfter(0);
    }
    prevIsOpenRef.current = isOpen;
  }, [isOpen]);

  // Timers countdown
  useEffect(() => {
    if (step !== "otp") return;

    const interval = setInterval(() => {
      setExpiresIn((prev) => (prev > 0 ? prev - 1 : 0));
      setResendAfter((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(interval);
  }, [step]);

  if (!appointment) return null;

  const canUpdateStatus = hasPermission(user, "appointments.update_status");
  const canRedeemSubscription = hasPermission(user, "subscriptions.redeem");
  const hasPermissions = canUpdateStatus && canRedeemSubscription;

  // Unredeemed subscription services
  const subscriptionServices = getUnredeemedSubscriptionServices(appointment);

  const customerPhone = appointment.customer?.phone;
  const maskedPhone = maskPhoneNumber(customerPhone);

  const handleSendOtp = async () => {
    if (!appointment.branchId || appointment.branchId === "all") {
      setErrorMessage("Authoritative branch ID is required for verification.");
      toast.error("Authoritative branch ID is required for verification.");
      return;
    }

    if (!hasPermissions) {
      const msg = "You do not have the required permissions to verify and complete subscription appointments.";
      setErrorMessage(msg);
      toast.error(msg);
      return;
    }

    setErrorMessage(null);

    try {
      const res = await requestOtpMutation.mutateAsync({
        id: appointment.id,
        payload: { branchId: appointment.branchId },
      });

      setExpiresIn(res.data.expiresIn);
      setResendAfter(res.data.resendAfter);
      setStep("otp");
      setOtp("");
      toast.success(res.message || "Verification code sent to customer phone.");
    } catch (err: unknown) {
      const axiosError = err as {
        response?: { status?: number; data?: { message?: string } };
      };
      const status = axiosError.response?.status;
      const backendMsg = axiosError.response?.data?.message;

      if (status === 403) {
        setErrorMessage("You do not have permission to request verification codes.");
        toast.error("You do not have permission to request verification codes.");
      } else if (status === 404) {
        setErrorMessage("Customer phone number or active appointment not found.");
        toast.error("Customer phone number or active appointment not found.");
      } else if (status === 409) {
        setErrorMessage(
          backendMsg || "Appointment status has changed or is no longer in progress."
        );
        toast.error(backendMsg || "Appointment is no longer in progress.");
      } else if (status === 429) {
        setErrorMessage(
          backendMsg || "Please wait for the cooldown before requesting another verification code."
        );
        toast.error("Please wait before requesting another code.");
      } else {
        const fallback = backendMsg || "Failed to send verification code. Please check your connection and try again.";
        setErrorMessage(fallback);
        toast.error(fallback);
      }
    }
  };

  const handleVerifyAndComplete = async (codeToVerify?: string) => {
    const code = (codeToVerify || otp).trim();
    if (!appointment.branchId || appointment.branchId === "all") {
      setErrorMessage("Authoritative branch ID is required.");
      return;
    }

    if (!code || code.length !== 6 || !/^\d{6}$/.test(code)) {
      setErrorMessage("Please enter the complete 6-digit numeric verification code.");
      return;
    }

    if (expiresIn === 0) {
      setErrorMessage("Verification code has expired. Please request a new code.");
      return;
    }

    setErrorMessage(null);

    try {
      await completeMutation.mutateAsync({
        id: appointment.id,
        payload: {
          branchId: appointment.branchId,
          otp: code,
        },
      });

      toast.success("Appointment completed", {
        description: "Subscription service usage has been recorded.",
      });
      onSuccess?.();
      onClose();
    } catch (err: unknown) {
      const axiosError = err as {
        response?: { status?: number; data?: { message?: string } };
      };
      const status = axiosError.response?.status;
      const backendMsg = (axiosError.response?.data?.message || "").toLowerCase();

      if (status === 400 || status === 422) {
        if (backendMsg.includes("expire")) {
          setErrorMessage("The verification code has expired. Please request a new code.");
        } else if (backendMsg.includes("attempt") || backendMsg.includes("maximum") || backendMsg.includes("limit")) {
          setErrorMessage("Maximum verification attempts reached. Please request a new verification code.");
        } else {
          setErrorMessage("That code is incorrect. Please check the code and try again.");
        }
      } else if (status === 403) {
        setErrorMessage("You do not have permission to complete subscription appointments.");
      } else if (status === 409) {
        if (backendMsg.includes("entitlement") || backendMsg.includes("balance") || backendMsg.includes("exhaust")) {
          setErrorMessage("Subscription entitlement is no longer available or exhausted. The appointment cannot be completed with this subscription.");
        } else {
          setErrorMessage("Appointment status has changed or is already completed. Please refresh the appointment.");
        }
      } else {
        setErrorMessage(
          axiosError.response?.data?.message ||
            "Unable to verify customer code right now. Please try again or request a new code."
        );
      }
    }
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const isPending = requestOtpMutation.isPending || completeMutation.isPending;

  return (
    <Dialog
      isOpen={isOpen}
      onClose={() => {
        if (!isPending) onClose();
      }}
      title={step === "prompt" ? "Customer verification required" : "Verify customer"}
    >
      <div className="space-y-4 text-left">
        {step === "prompt" ? (
          <>
            <div className="flex items-start gap-3 p-3 bg-primary/5 rounded-xl border border-primary/20">
              <ShieldCheck className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div className="space-y-1 text-xs">
                <p className="font-semibold text-foreground">
                  Subscription-backed service verification
                </p>
                <p className="text-muted-foreground leading-relaxed">
                  This appointment includes subscription-covered services. A 6-digit verification code will be sent to the customer&apos;s registered phone (
                  <span className="font-mono font-medium text-foreground">{maskedPhone}</span>) to authorize completion and record usage.
                </p>
              </div>
            </div>

            {/* List of covered services */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                Subscription Services ({subscriptionServices.length})
              </span>
              <div className="divide-y divide-border border border-border rounded-lg bg-card text-xs">
                {subscriptionServices.map((srv, idx) => (
                  <div key={srv.serviceId || idx} className="p-2.5 flex items-center justify-between">
                    <span className="font-medium text-foreground">{srv.name}</span>
                    <span className="text-[10px] font-semibold text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded">
                      Prepaid Covered
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {errorMessage && (
              <div className="p-2.5 rounded-lg border border-destructive/30 bg-destructive/10 text-destructive text-xs flex items-start gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span className="leading-snug">{errorMessage}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onClose}
                disabled={isPending}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleSendOtp}
                disabled={isPending}
                className="text-xs gap-1.5"
              >
                {requestOtpMutation.isPending && (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                )}
                Send verification code
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="space-y-1 text-xs">
              <p className="text-muted-foreground">
                Enter the 6-digit verification code sent to{" "}
                <span className="font-mono font-bold text-foreground">{maskedPhone}</span>.
              </p>
            </div>

            {/* 6-Digit OTP Input */}
            <div className="py-2">
              <OtpInput
                value={otp}
                onChange={(val) => {
                  setOtp(val);
                  setErrorMessage(null);
                }}
                onComplete={(val) => {
                  if (!isPending && expiresIn > 0) {
                    handleVerifyAndComplete(val);
                  }
                }}
                disabled={isPending}
                isInvalid={Boolean(errorMessage)}
              />
            </div>

            {/* Timer and Resend Row */}
            <div className="flex items-center justify-between text-xs px-1">
              <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                <KeyRound className="h-3.5 w-3.5 text-muted-foreground" />
                {expiresIn > 0 ? (
                  <span>
                    Expires in: <strong className="text-foreground">{formatTimer(expiresIn)}</strong>
                  </span>
                ) : (
                  <span className="text-destructive font-semibold">Code expired</span>
                )}
              </div>

              {resendAfter > 0 ? (
                <span className="text-[11px] text-muted-foreground font-medium">
                  Resend in {resendAfter}s
                </span>
              ) : (
                <button
                  type="button"
                  onClick={handleSendOtp}
                  disabled={isPending || requestOtpMutation.isPending}
                  className="text-xs font-semibold text-primary hover:underline flex items-center gap-1 cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className="h-3 w-3" />
                  Resend Code
                </button>
              )}
            </div>

            {errorMessage && (
              <div className="p-2.5 rounded-lg border border-destructive/30 bg-destructive/10 text-destructive text-xs flex items-start gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span className="leading-snug">{errorMessage}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onClose}
                disabled={isPending}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => handleVerifyAndComplete()}
                disabled={isPending || otp.length !== 6 || expiresIn === 0}
                className="text-xs gap-1.5"
              >
                {completeMutation.isPending ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  "Verify & Complete"
                )}
              </Button>
            </div>
          </>
        )}
      </div>
    </Dialog>
  );
}
