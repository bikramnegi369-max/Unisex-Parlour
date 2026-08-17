"use client";

import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Lock, AlertCircle, Eye, EyeOff, CheckCircle2, Check, X } from "lucide-react";
import { useAuth, AuthApiError } from "@/features/auth/hooks/useAuth";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  getPasswordChangeToken,
  clearAllActivationTokens,
} from "@/features/auth/utils/activation-storage";
import {
  passwordSchema,
  type PasswordFormValues,
} from "@/features/auth/schemas/auth.schema";

export { passwordSchema, type PasswordFormValues };

export default function PasswordPage() {
  const { activateChangePassword, isActivatingChangePassword } = useAuth();
  const [passwordChangeToken, setPasswordChangeTokenState] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isCheckingToken, setIsCheckingToken] = useState(true);
  const [isSuccess, setIsSuccess] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const token = getPasswordChangeToken();
    if (!token) {
      router.replace("/login");
    } else {
      setPasswordChangeTokenState(token);
      setIsCheckingToken(false);
    }
  }, [router]);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  const watchedPassword = watch("password") || "";

  const getRequirementsState = (pwd: string) => [
    { label: "At least 8 characters", met: pwd.length >= 8 },
    { label: "One uppercase letter", met: /[A-Z]/.test(pwd) },
    { label: "One lowercase letter", met: /[a-z]/.test(pwd) },
    { label: "One number", met: /[0-9]/.test(pwd) },
    { label: "One special character", met: /[^a-zA-Z0-9]/.test(pwd) },
  ];

  const requirements = getRequirementsState(watchedPassword);
  const satisfiedCount = requirements.filter((r) => r.met).length;

  const calculateStrength = () => {
    if (!watchedPassword) return { score: 0, label: "", color: "bg-border" };
    if (satisfiedCount <= 2) return { score: 1, label: "Weak", color: "bg-destructive" };
    if (satisfiedCount <= 4) return { score: 2, label: "Medium", color: "bg-amber-500" };
    return { score: 3, label: "Strong", color: "bg-emerald-500" };
  };

  const strength = calculateStrength();

  const onSubmit = async (data: PasswordFormValues) => {
    if (!passwordChangeToken) return;
    setErrorMsg(null);

    try {
      await activateChangePassword({
        passwordChangeToken,
        password: data.password,
      });

      setIsSuccess(true);
      setTimeout(() => {
        router.push("/dashboard");
      }, 1500);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to update password.";
      setErrorMsg(msg);
      if (err instanceof AuthApiError && err.status === 401) {
        clearAllActivationTokens();
        router.replace("/login");
      }
    }
  };

  if (isCheckingToken) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="relative flex min-h-screen items-center justify-center bg-background px-4 py-12 sm:px-6 lg:px-8 overflow-hidden">
        <div className="w-full max-w-md z-10 text-center space-y-4">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500 ring-8 ring-emerald-500/5 animate-in zoom-in-50 duration-300">
            <CheckCircle2 className="h-10 w-10" />
          </div>
          <h2 className="text-2xl font-bold text-foreground">Account activated successfully</h2>
          <p className="text-sm text-muted-foreground">
            Your Salon ERP account is ready. Taking you to your dashboard...
          </p>
        </div>
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
              <Lock className="h-6 w-6" />
            </div>
            <div className="text-center space-y-1.5">
              <CardTitle className="text-2xl font-bold tracking-tight text-foreground">
                Create your password
              </CardTitle>
              <CardDescription className="text-sm text-muted-foreground">
                Choose a secure password for your Salon ERP account.
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="px-8 pb-8">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              {errorMsg && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm leading-relaxed animate-in fade-in duration-200">
                  <AlertCircle className="h-5 w-5 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  New Password
                </label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    className={
                      errors.password
                        ? "border-destructive pr-10 focus-visible:ring-destructive"
                        : "bg-background/40 dark:bg-slate-950/40 border-border/80 dark:border-white/5 pr-10"
                    }
                    disabled={isActivatingChangePassword}
                    {...register("password")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-xs text-destructive font-medium">{errors.password.message}</p>
                )}

                {/* Password strength indicator and criteria checklist */}
                {watchedPassword.length > 0 && (
                  <div className="space-y-2 pt-2">
                    <div className="flex justify-between items-center text-xs font-medium">
                      <span className="text-muted-foreground">Password strength</span>
                      <span
                        className={
                          strength.label === "Weak"
                            ? "text-destructive font-semibold"
                            : strength.label === "Medium"
                            ? "text-amber-500 font-semibold"
                            : "text-emerald-500 font-semibold"
                        }
                      >
                        {strength.label}
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden flex gap-1">
                      <div
                        className={`h-full transition-all duration-300 ${
                          strength.score >= 1 ? strength.color : "bg-transparent"
                        } w-1/3`}
                      />
                      <div
                        className={`h-full transition-all duration-300 ${
                          strength.score >= 2 ? strength.color : "bg-transparent"
                        } w-1/3`}
                      />
                      <div
                        className={`h-full transition-all duration-300 ${
                          strength.score >= 3 ? strength.color : "bg-transparent"
                        } w-1/3`}
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 pt-1.5 text-xs text-muted-foreground">
                      {requirements.map((req, idx) => (
                        <div key={idx} className="flex items-center gap-1.5">
                          {req.met ? (
                            <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                          ) : (
                            <X className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" />
                          )}
                          <span className={req.met ? "text-foreground font-medium" : "text-muted-foreground"}>
                            {req.label}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Confirm Password
                </label>
                <div className="relative">
                  <Input
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="••••••••"
                    className={
                      errors.confirmPassword
                        ? "border-destructive pr-10 focus-visible:ring-destructive"
                        : "bg-background/40 dark:bg-slate-950/40 border-border/80 dark:border-white/5 pr-10"
                    }
                    disabled={isActivatingChangePassword}
                    {...register("confirmPassword")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="text-xs text-destructive font-medium">
                    {errors.confirmPassword.message}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                disabled={isActivatingChangePassword}
                className="w-full h-11 text-sm font-semibold rounded-lg bg-gradient-to-r from-primary to-indigo-600 hover:from-primary/95 hover:to-indigo-600/95 text-primary-foreground shadow-md hover:shadow-lg active:scale-[0.98] transition-all duration-200 cursor-pointer mt-2"
              >
                {isActivatingChangePassword ? (
                  <span className="flex items-center gap-2 justify-center">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                    Activating Account...
                  </span>
                ) : (
                  "Activate Account"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
