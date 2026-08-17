import { apiClient } from "@/lib/api/axios";
import { UserSession } from "@/lib/permissions";
import { getToken } from "@/lib/auth/token";
import { refreshAccessToken } from "@/lib/auth/refresh";
import axios from "axios";
import {
  LoginResponseData,
  ActivationOtpSendData,
  ActivationOtpVerifyData,
  ActivationPasswordData,
} from "@/features/auth/types/auth.types";

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

/**
 * Fetches current authenticated user session (/auth/me), performing a silent token refresh if needed.
 */
export async function getAuthMe(): Promise<UserSession | null> {
  let token = getToken();
  if (!token) {
    // Silent bootstrap check via refresh token HTTP-only cookie
    try {
      token = await refreshAccessToken();
    } catch {
      return null;
    }
  }
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
}

/**
 * Authenticates user credentials (/auth/login).
 */
export async function loginApi(credentials: Record<string, string>): Promise<LoginResponseData> {
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
}

/**
 * Triggers activation OTP sending (/auth/activate/otp/send).
 */
export async function sendOtpApi(activationToken: string): Promise<ActivationOtpSendData> {
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
}

/**
 * Verifies activation OTP code (/auth/activate/otp/verify).
 */
export async function verifyOtpApi({
  activationToken,
  otp,
}: {
  activationToken: string;
  otp: string;
}): Promise<ActivationOtpVerifyData> {
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
}

/**
 * Completes password change during activation (/auth/activate/change-password).
 */
export async function activateChangePasswordApi({
  passwordChangeToken,
  password,
}: {
  passwordChangeToken: string;
  password: string;
}): Promise<ActivationPasswordData> {
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
}

/**
 * Logs out user session (/auth/logout).
 */
export async function logoutApi(): Promise<void> {
  try {
    await apiClient.post("/auth/logout");
  } catch {
    // Silent catch if API is unreachable
  }
}
