"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Scissors, AlertCircle, Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const loginSchema = z.object({
  email: z.string().min(1, "Email is required").email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const { login, isLoggingIn } = useAuth();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (data: LoginFormValues) => {
    setErrorMsg(null);
    try {
      await login({
        email: data.email,
        password: data.password,
      });
    } catch (err: any) {
      setErrorMsg(
        err?.response?.data?.message || 
        "Invalid email or password. Please try again."
      );
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md">
        <Card className="border border-border/80 shadow-xl shadow-slate-100/10 dark:shadow-black/20">
          <CardHeader className="space-y-3 flex flex-col items-center p-8">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-md shadow-primary/10">
              <Scissors className="h-6 w-6" />
            </div>
            <div className="text-center space-y-1">
              <CardTitle className="text-2xl font-bold tracking-tight">Welcome back</CardTitle>
              <CardDescription className="text-sm text-muted-foreground">
                Sign in to your Unisex Parlour ERP account
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
                  Email Address
                </label>
                <Input
                  type="email"
                  placeholder="name@example.com"
                  className={errors.email ? "border-destructive focus-visible:ring-destructive" : ""}
                  {...register("email")}
                />
                {errors.email && (
                  <p className="text-xs text-destructive font-medium">{errors.email.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Password
                  </label>
                  <a href="#" className="text-xs text-primary font-medium hover:underline">
                    Forgot password?
                  </a>
                </div>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    className={errors.password ? "border-destructive pr-10 focus-visible:ring-destructive" : "pr-10"}
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
              </div>

              <Button
                type="submit"
                disabled={isLoggingIn}
                className="w-full h-11 text-sm font-semibold rounded-lg bg-primary hover:bg-primary/95 text-primary-foreground shadow-md shadow-primary/10 transition-all cursor-pointer mt-2"
              >
                {isLoggingIn ? (
                  <span className="flex items-center gap-2 justify-center">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                    Signing in...
                  </span>
                ) : (
                  "Sign in"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
