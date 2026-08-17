"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { UserSession } from "@/lib/permissions";
import { setToken, removeToken } from "@/lib/auth/token";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import {
  LoginResponseData,
  ActivationOtpSendData,
  ActivationOtpVerifyData,
  ActivationPasswordData,
} from "@/features/auth/types/auth.types";
import {
  setActivationToken,
  clearAllActivationTokens,
} from "@/features/auth/utils/activation-storage";
import {
  AuthApiError,
  getAuthMe,
  loginApi,
  sendOtpApi,
  verifyOtpApi,
  activateChangePasswordApi,
  logoutApi,
} from "../api/auth.api";

export { AuthApiError };

export function useAuth() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const [isBootstrapping, setIsBootstrapping] = useState(true);

  // Active User session query
  const { data: user, isLoading: isQueryLoading, isError } = useQuery<UserSession | null>({
    queryKey: ["auth-user"],
    queryFn: getAuthMe,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (!isQueryLoading) {
      setIsBootstrapping(false);
    }
  }, [isQueryLoading]);

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: (credentials: Record<string, string>): Promise<LoginResponseData> =>
      loginApi(credentials),
    onSuccess: (data) => {
      if (data.requireActivation) {
        setActivationToken(data.activationToken);
        router.push("/activate/otp");
        return;
      }

      if (data.accessToken) {
        setToken(data.accessToken);
        clearAllActivationTokens();
        queryClient.invalidateQueries({ queryKey: ["auth-user"] });
        router.push("/dashboard");
      }
    },
  });

  // Send OTP Mutation
  const sendOtpMutation = useMutation({
    mutationFn: (activationToken: string): Promise<ActivationOtpSendData> =>
      sendOtpApi(activationToken),
  });

  // Verify OTP Mutation
  const verifyOtpMutation = useMutation({
    mutationFn: ({
      activationToken,
      otp,
    }: {
      activationToken: string;
      otp: string;
    }): Promise<ActivationOtpVerifyData> =>
      verifyOtpApi({ activationToken, otp }),
  });

  // Change Password & Activate Mutation
  const activateChangePasswordMutation = useMutation({
    mutationFn: ({
      passwordChangeToken,
      password,
    }: {
      passwordChangeToken: string;
      password: string;
    }): Promise<ActivationPasswordData> =>
      activateChangePasswordApi({ passwordChangeToken, password }),
    onSuccess: (data) => {
      const accessToken = data.accessToken;
      if (accessToken) {
        setToken(accessToken);
        clearAllActivationTokens();
        queryClient.invalidateQueries({ queryKey: ["auth-user"] });
      }
    },
  });

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: logoutApi,
    onSuccess: () => {
      removeToken();
      clearAllActivationTokens();
      queryClient.setQueryData(["auth-user"], null);
      router.push("/login");
    },
  });

  return {
    user: user || null,
    isAuthenticated: !!user,
    isLoading: isQueryLoading || isBootstrapping,
    isError,
    login: loginMutation.mutateAsync,
    isLoggingIn: loginMutation.isPending,
    logout: logoutMutation.mutate,
    isLoggingOut: logoutMutation.isPending,
    sendOtp: sendOtpMutation.mutateAsync,
    isSendingOtp: sendOtpMutation.isPending,
    verifyOtp: verifyOtpMutation.mutateAsync,
    isVerifyingOtp: verifyOtpMutation.isPending,
    activateChangePassword: activateChangePasswordMutation.mutateAsync,
    isActivatingChangePassword: activateChangePasswordMutation.isPending,
  };
}
