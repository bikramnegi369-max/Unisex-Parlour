"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { KeyRound, AlertCircle, RefreshCw, ArrowLeft, Clock } from "lucide-react";
import { useAuth, AuthApiError } from "@/features/auth/hooks/useAuth";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { OtpInput } from "@/features/auth/components/OtpInput";
import {
  getActivationToken,
  clearActivationToken,
  setPasswordChangeToken,
  clearAllActivationTokens,
} from "@/features/auth/utils/activation-storage";
import { verifyOtpSchema } from "@/features/auth/schemas/auth.schema";

export default function OtpPage() {
  const { sendOtp, isSendingOtp, verifyOtp, isVerifyingOtp } = useAuth();
  const [activationToken, setActivationTokenState] = useState<string | null>(() => getActivationToken());
  const [otp, setOtp] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);
  const [isCheckingToken, setIsCheckingToken] = useState(() => !getActivationToken());

  // Timers dynamically initialized from backend response
  const [resendCooldown, setResendCooldown] = useState<number>(0);
  const [expiryTime, setExpiryTime] = useState<number>(0);

  const router = useRouter();
  const hasAutoSentRef = useRef(false);

  const handleSendOtp = useCallback(async (tokenOverride?: string) => {
    const activeToken = tokenOverride || activationToken;
    if (!activeToken) return;

    setErrorMsg(null);
    setInfoMsg(null);

    try {
      const response = await sendOtp(activeToken);
      setInfoMsg("A 6-digit verification code has been sent to your registered contact.");

      // Set timers dynamically from backend response values
      if (response?.resendAfter) {
        setResendCooldown(response.resendAfter);
      } else {
        setResendCooldown(60); // Default fallback
      }

      if (response?.expiresIn) {
        setExpiryTime(response.expiresIn);
      } else {
        setExpiryTime(300); // Default fallback
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to send verification code.";
      setErrorMsg(msg);
      if (err instanceof AuthApiError && err.status === 401) {
        clearAllActivationTokens();
        router.replace("/login");
      }
    }
  }, [activationToken, sendOtp, router]);

  // Check token existence
  useEffect(() => {
    const token = getActivationToken();
    if (!token) {
      router.replace("/login");
    }
  }, [router]);

  // One-time auto-send guard for initial load
  useEffect(() => {
    if (activationToken && !hasAutoSentRef.current) {
      hasAutoSentRef.current = true;
      handleSendOtp(activationToken);
    }
  }, [activationToken, handleSendOtp]);

  const handleVerify = async (codeToVerify?: string) => {
    const targetOtp = codeToVerify || otp;
    if (!activationToken) return;

    const parseResult = verifyOtpSchema.safeParse({
      otp: targetOtp,
      activationToken,
    });

    if (!parseResult.success) {
      const issue = parseResult.error.issues[0];
      setErrorMsg(issue ? issue.message : "Invalid verification code.");
      return;
    }

    setErrorMsg(null);
    setInfoMsg(null);

    try {
      const response = await verifyOtp({
        activationToken,
        otp: targetOtp,
      });

      if (response.passwordChangeToken) {
        clearActivationToken();
        setPasswordChangeToken(response.passwordChangeToken);
        router.push("/activate/password");
      } else {
        setErrorMsg("Failed to obtain password change authorization.");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Verification failed.";
      setErrorMsg(msg);
      if (err instanceof AuthApiError && err.status === 401) {
        clearAllActivationTokens();
        router.replace("/login");
      }
    }
  };

  const handleBackToLogin = () => {
    clearAllActivationTokens();
    router.push("/login");
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  if (isCheckingToken) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background px-4 py-12 sm:px-6 lg:px-8 overflow-hidden">
      {/* Modern dot grid pattern */}
      <div className="absolute inset-0 -z-20 h-full w-full bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] dark:bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none" />

      {/* Ambient glows */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 -z-10 h-[450px] w-[450px] rounded-full bg-primary/10 dark:bg-primary/5 blur-[100px] pointer-events-none" />

      <div className="w-full max-w-md z-10">
        <Card className="relative overflow-hidden border border-border/80 dark:border-white/10 bg-gradient-to-b from-card to-card/95 dark:from-slate-900/90 dark:to-slate-950/95 shadow-2xl transition-all duration-300">
          <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-primary/50 to-transparent" />

          <CardHeader className="space-y-3 flex flex-col items-center p-8">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-indigo-600 text-primary-foreground shadow-lg ring-4 ring-primary/10 dark:ring-primary/5">
              <KeyRound className="h-6 w-6" />
            </div>
            <div className="text-center space-y-1.5">
              <CardTitle className="text-2xl font-bold tracking-tight text-foreground">
                Verify your account
              </CardTitle>
              <CardDescription className="text-sm text-muted-foreground">
                We sent a 6-digit verification code to your registered contact.
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="px-8 pb-8 space-y-6">
            {errorMsg && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm leading-relaxed animate-in fade-in duration-200">
                <AlertCircle className="h-5 w-5 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {infoMsg && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-500 text-sm leading-relaxed animate-in fade-in duration-200">
                <span>{infoMsg}</span>
              </div>
            )}

            <div className="space-y-4">
              <OtpInput
                value={otp}
                onChange={setOtp}
                onComplete={(code) => handleVerify(code)}
                disabled={isVerifyingOtp}
                isInvalid={!!errorMsg}
              />

              {expiryTime > 0 && (
                <div className="flex items-center justify-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" />
                  <span>Expires in {formatTimer(expiryTime)}</span>
                </div>
              )}
            </div>

            <Button
              type="button"
              onClick={() => handleVerify()}
              disabled={isVerifyingOtp || otp.length !== 6}
              className="w-full h-11 text-sm font-semibold rounded-lg bg-gradient-to-r from-primary to-indigo-600 hover:from-primary/95 hover:to-indigo-600/95 text-primary-foreground shadow-md hover:shadow-lg active:scale-[0.98] transition-all duration-200 cursor-pointer disabled:opacity-50"
            >
              {isVerifyingOtp ? (
                <span className="flex items-center gap-2 justify-center">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                  Verifying Code...
                </span>
              ) : (
                "Verify Code"
              )}
            </Button>

            <div className="flex flex-col items-center justify-center gap-3 pt-2">
              <div className="text-center text-xs text-muted-foreground">
                Didn&apos;t receive the code?
              </div>

              {resendCooldown > 0 ? (
                <span className="text-xs font-medium text-muted-foreground">
                  Resend code in {formatTimer(resendCooldown)}
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => handleSendOtp()}
                  disabled={isSendingOtp || isVerifyingOtp}
                  className="inline-flex items-center gap-1.5 text-xs text-primary font-semibold hover:underline cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${isSendingOtp ? "animate-spin" : ""}`} />
                  Resend verification code
                </button>
              )}

              <button
                type="button"
                onClick={handleBackToLogin}
                className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground font-medium transition-colors pt-2 cursor-pointer"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back to sign in
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
