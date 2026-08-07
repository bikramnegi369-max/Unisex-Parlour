"use client";

import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { KeyRound, AlertCircle, RefreshCw } from "lucide-react";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const otpSchema = z.object({
  otp: z.string().min(1, "OTP is required").regex(/^\d+$/, "OTP must be numeric"),
});

type OtpFormValues = z.infer<typeof otpSchema>;

export default function OtpPage() {
  const { sendOtp, isSendingOtp, verifyOtp, isVerifyingOtp } = useAuth();
  const [activationToken, setActivationToken] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);
  const [isCheckingToken, setIsCheckingToken] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (typeof window !== "undefined") {
      const token = sessionStorage.getItem("erp_activation_token");
      if (!token) {
        router.push("/login");
      } else {
        setActivationToken(token);
        setIsCheckingToken(false);
      }
    }
  }, [router]);

  // Send the OTP automatically on initial load when token is found
  useEffect(() => {
    if (activationToken) {
      handleResendOtp(activationToken);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activationToken]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<OtpFormValues>({
    resolver: zodResolver(otpSchema),
    defaultValues: {
      otp: "",
    },
  });

  const handleResendOtp = async (tokenOverride?: string) => {
    const activeToken = tokenOverride || activationToken;
    if (!activeToken) return;

    setErrorMsg(null);
    setInfoMsg(null);
    try {
      await sendOtp(activeToken);
      setInfoMsg("Activation OTP sent to your registered contact channel.");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to send OTP.");
    }
  };

  const onSubmit = async (data: OtpFormValues) => {
    if (!activationToken) return;
    setErrorMsg(null);
    setInfoMsg(null);

    try {
      const response = await verifyOtp({
        activationToken,
        otp: data.otp,
      });
      const passwordToken = response.passwordChangeToken;
      if (passwordToken) {
        sessionStorage.setItem("erp_password_change_token", passwordToken);
        // Clear activation token as we transition
        sessionStorage.removeItem("erp_activation_token");
        router.push("/activate/password");
      } else {
        setErrorMsg("Failed to obtain password change token.");
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "OTP verification failed.");
    }
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
                Activate Account
              </CardTitle>
              <CardDescription className="text-sm text-muted-foreground">
                Please enter the verification code sent to your account
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="px-8 pb-8">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              {errorMsg && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm leading-relaxed">
                  <AlertCircle className="h-5 w-5 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {infoMsg && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-500 text-sm leading-relaxed">
                  <span>{infoMsg}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Verification OTP
                </label>
                <Input
                  type="text"
                  placeholder="e.g. 123456"
                  className={errors.otp ? "border-destructive focus-visible:ring-destructive" : "bg-background/40 dark:bg-slate-950/40 border-border/80 dark:border-white/5"}
                  disabled={isVerifyingOtp}
                  {...register("otp")}
                />
                {errors.otp && (
                  <p className="text-xs text-destructive font-medium">{errors.otp.message}</p>
                )}
              </div>

              <Button
                type="submit"
                disabled={isVerifyingOtp}
                className="w-full h-11 text-sm font-semibold rounded-lg bg-gradient-to-r from-primary to-indigo-600 hover:from-primary/95 hover:to-indigo-600/95 text-primary-foreground shadow-md hover:shadow-lg active:scale-[0.98] transition-all duration-200 cursor-pointer mt-2"
              >
                {isVerifyingOtp ? (
                  <span className="flex items-center gap-2 justify-center">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                    Verifying...
                  </span>
                ) : (
                  "Verify Code"
                )}
              </Button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => handleResendOtp()}
                  disabled={isSendingOtp || isVerifyingOtp}
                  className="inline-flex items-center gap-1.5 text-xs text-primary font-semibold hover:underline cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`h-3 w-3 ${isSendingOtp ? "animate-spin" : ""}`} />
                  Resend Verification OTP
                </button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
