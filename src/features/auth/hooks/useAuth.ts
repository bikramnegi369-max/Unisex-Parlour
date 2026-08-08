"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/axios";
import { UserSession } from "@/lib/permissions";
import { setToken, removeToken, getToken } from "@/lib/auth/token";
import { useRouter } from "next/navigation";
import axios from "axios";
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

export class AuthApiError extends Error {
  readonly status: number;
  readonly code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "AuthApiError";
    this.status = status;
    this.code = code;
  }
}

export function useAuth() {
  const queryClient = useQueryClient();
  const router = useRouter();

  // Active User session query
  const { data: user, isLoading, isError } = useQuery<UserSession | null>({
    queryKey: ["auth-user"],
    queryFn: async () => {
      const token = getToken();
      if (!token) {
        return null;
      }
      try {
        const { data } = await apiClient.get("/auth/me");
        return data.data || data;
      } catch (err) {
        const errorMessage =
          axios.isAxiosError(err) && err.response?.data?.message
            ? err.response.data.message
            : "Failed to fetch user session";
        throw new Error(errorMessage);
      }
    },
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: async (credentials: Record<string, string>): Promise<LoginResponseData> => {
      try {
        const { data } = await apiClient.post("/auth/login", credentials);
        return data.data || data;
      } catch (err) {
        const errorMessage =
          axios.isAxiosError(err) && err.response?.data?.message
            ? err.response.data.message
            : "Invalid email or password. Please try again.";
        throw new Error(errorMessage);
      }
    },
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
    mutationFn: async (activationToken: string): Promise<ActivationOtpSendData> => {
      try {
        const { data } = await apiClient.post(
          "/auth/activate/otp/send",
          {},
          {
            authContext: "activation",
            headers: {
              Authorization: `Bearer ${activationToken}`,
            },
          }
        );
        return data.data || data;
      } catch (err) {
        if (axios.isAxiosError(err)) {
          const status = err.response?.status || 500;
          if (status === 401) {
            throw new AuthApiError(
              "Your activation session has expired. Please sign in again.",
              401
            );
          }
          if (status === 429) {
            throw new AuthApiError(
              err.response?.data?.message || "Please wait before requesting another code.",
              429
            );
          }
          if (err.response?.data?.message) {
            throw new AuthApiError(err.response.data.message, status);
          }
          throw new AuthApiError("Failed to send verification code. Please try again.", status);
        }
        throw new AuthApiError("Failed to send verification code. Please try again.", 500);
      }
    },
  });

  // Verify OTP Mutation
  const verifyOtpMutation = useMutation({
    mutationFn: async ({
      activationToken,
      otp,
    }: {
      activationToken: string;
      otp: string;
    }): Promise<ActivationOtpVerifyData> => {
      try {
        const { data } = await apiClient.post(
          "/auth/activate/otp/verify",
          { otp },
          {
            authContext: "activation",
            headers: {
              Authorization: `Bearer ${activationToken}`,
            },
          }
        );
        return data.data || data;
      } catch (err) {
        if (axios.isAxiosError(err)) {
          const status = err.response?.status || 500;
          if (status === 400) {
            throw new AuthApiError(
              err.response?.data?.message || "That verification code is incorrect or has expired.",
              400
            );
          }
          if (status === 401) {
            throw new AuthApiError(
              "Your activation session has expired. Please sign in again.",
              401
            );
          }
          if (status === 429) {
            throw new AuthApiError(
              err.response?.data?.message || "Too many incorrect attempts. Please request a new code.",
              429
            );
          }
          if (err.response?.data?.message) {
            throw new AuthApiError(err.response.data.message, status);
          }
          throw new AuthApiError("OTP verification failed.", status);
        }
        throw new AuthApiError("OTP verification failed.", 500);
      }
    },
  });

  // Change Password & Activate Mutation
  const activateChangePasswordMutation = useMutation({
    mutationFn: async ({
      passwordChangeToken,
      password,
    }: {
      passwordChangeToken: string;
      password: string;
    }): Promise<ActivationPasswordData> => {
      try {
        const { data } = await apiClient.post(
          "/auth/activate/change-password",
          { password },
          {
            authContext: "password-change",
            headers: {
              Authorization: `Bearer ${passwordChangeToken}`,
            },
          }
        );
        return data.data || data;
      } catch (err) {
        if (axios.isAxiosError(err)) {
          const status = err.response?.status || 500;
          if (status === 401) {
            throw new AuthApiError(
              "Your password setup session has expired. Please start again.",
              401
            );
          }
          if (err.response?.data?.message) {
            throw new AuthApiError(err.response.data.message, status);
          }
          throw new AuthApiError("Password activation failed.", status);
        }
        throw new AuthApiError("Password activation failed.", 500);
      }
    },
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
    mutationFn: async () => {
      try {
        await apiClient.post("/auth/logout");
      } catch {
        // Silent catch if API is unreachable
      }
    },
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
    isLoading,
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
